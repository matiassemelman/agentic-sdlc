// In-memory stand-ins for the board (Jira) and the record (GitHub), shared by the tests.
import { adfText, type Adf } from "./adf.ts";
import { STATUS } from "./board.ts";
import { keyOf, relabeled, type Check, type IssueComment, type Pull, type RunIssue } from "./github.ts";
import type { Card, CardComment, Move } from "./jira.ts";

let tick = 0;
/** Timestamps that always move forward, so histories sort the way they happened. */
export const stamp = () => new Date(Date.UTC(2026, 9, 20, 12, 0, tick++)).toISOString();

type Stored = { card: Card; moves: Move[]; comments: CardComment[]; links: string[]; assignee?: string; epic?: boolean };

export class FakeBoard {
  readonly cards = new Map<string, Stored>();
  readonly factory = { accountId: "factory-id", displayName: "Factory" };
  private next = 1;
  private index?: Card[];
  statusNames: string[] = Object.values(STATUS);

  cardUrl(key: string) {
    return `https://example.atlassian.net/browse/${key}`;
  }
  async me() {
    return this.factory;
  }
  async card(key: string) {
    const stored = this.cards.get(key);
    return stored ? { ...stored.card, labels: [...stored.card.labels] } : null;
  }
  async search(jql: string) {
    const label = /labels = "([^"]+)"/.exec(jql)?.[1];
    const parent = /parent = "([^"]+)"/.exec(jql)?.[1];
    const matches = (c: Card) =>
      parent ? c.parent === parent : label ? c.labels.includes(label) && c.status !== STATUS.done : c.status !== STATUS.backlog && c.status !== STATUS.done;
    return (this.index ?? [...this.cards.values()].map((s) => s.card)).filter(matches).map((c) => ({ ...c }));
  }
  async moves(key: string) {
    return this.cards.get(key)!.moves.map((m) => ({ ...m }));
  }
  async move(key: string, status: string) {
    this.drag(key, status, this.factory.accountId, this.factory.displayName);
  }
  async comment(key: string, body: Adf) {
    const at = stamp();
    this.cards.get(key)!.comments.push({ id: String(this.next++), author: this.factory.accountId, created: at, updated: at, text: adfText(body) });
  }
  async comments(key: string) {
    return this.cards.get(key)!.comments.map((c) => ({ ...c }));
  }
  async link(key: string, url: string) {
    this.cards.get(key)!.links.push(url);
  }
  async assign(key: string, accountId: string) {
    this.cards.get(key)!.assignee = accountId;
  }
  assignee(key: string) {
    return this.cards.get(key)!.assignee;
  }
  async statusesByType() {
    return [{ type: "Task", subtask: false, statuses: this.statusNames }];
  }
  async create({ summary, labels, parent, epic }: { project: string; summary: string; labels: string[]; parent?: string; epic?: boolean }) {
    const key = `SD-${this.next++}`;
    const card: Card = { key, summary, status: STATUS.backlog, labels, created: stamp(), ...(parent ? { parent } : {}) };
    this.cards.set(key, { card, moves: [], comments: [], links: [], ...(epic ? { epic } : {}) });
    return key;
  }

  /** Jira's JQL search is not read-after-write consistent: from now on it answers with the cards as they are now. */
  freezeSearch() {
    this.index = [...this.cards.values()].map((s) => ({ ...s.card, labels: [...s.card.labels] }));
  }

  /** A person (or the factory) drags a card; the history records who. */
  drag(key: string, status: string, by = "guest-id", byName = "Guest") {
    const stored = this.cards.get(key)!;
    if (!this.statusNames.includes(status)) throw new Error(`${key} cannot move to ${status}`);
    stored.moves.push({ at: stamp(), by, byName, from: stored.card.status, to: status });
    stored.card.status = status;
  }
  status(key: string) {
    return this.cards.get(key)!.card.status;
  }
  /** The key of the first card with this label, as in `keyFor("ticket:guest-filter")`. */
  keyFor(label: string) {
    return [...this.cards.values()].find((s) => s.card.labels.includes(label))!.card.key;
  }
  notes(key: string) {
    return this.cards.get(key)!.comments.map((c) => c.text);
  }
}

type Issue = RunIssue & { body: string; comments: IssueComment[]; closedAs?: string };

export class FakeRecord {
  readonly issues: Issue[] = [];
  readonly dispatched: { workflow: string; inputs: Record<string, string> }[] = [];
  /** Pull requests by branch, and the checks on each commit, as GitHub would report them. */
  readonly pullsByBranch = new Map<string, Pull>();
  readonly checksBySha = new Map<string, Check[]>();
  private next = 10;
  private listing?: Issue[];

  async runs(filter: { open: true } | { since: string }) {
    const runs = (this.listing ?? this.issues).filter((i) => i.labels.includes("run"));
    return ("open" in filter ? runs.filter((i) => i.open) : runs.filter((i) => i.createdAt >= filter.since)).map((i) => ({ ...i, labels: [...i.labels] }));
  }
  async issue(number: number) {
    return { ...this.get(number) };
  }
  async create({ title, body, labels }: { title: string; body: string; labels: string[] }) {
    const number = this.next++;
    const issue: Issue = { number, title, key: keyOf(title), labels: [...labels], open: true, createdAt: stamp(), url: `https://github.com/o/r/issues/${number}`, body, comments: [] };
    this.issues.push(issue);
    return { ...issue };
  }
  async comment(number: number, body: string) {
    this.get(number).comments.push({ author: "github-actions[bot]", body });
  }
  async comments(number: number) {
    return this.get(number).comments.map((c) => ({ ...c }));
  }
  async relabel(number: number, change: { add?: string[]; remove?: string[] }) {
    const issue = this.get(number);
    issue.labels = relabeled(issue.labels, change);
  }
  async close(number: number, reason: string) {
    Object.assign(this.get(number), { open: false, closedAs: reason });
  }
  async dispatch(workflow: string, inputs: Record<string, string>) {
    this.dispatched.push({ workflow, inputs });
  }
  async retitle(number: number, title: string) {
    Object.assign(this.get(number), { title, key: keyOf(title) });
  }
  async pull(branch: string) {
    const pull = this.pullsByBranch.get(branch);
    return pull ? { ...pull } : null;
  }
  async checks(sha: string) {
    return (this.checksBySha.get(sha) ?? []).map((c) => ({ ...c }));
  }
  /** GitHub's issue list lags behind writes: from now on it answers with the issues as they are now. */
  freezeListing() {
    this.listing = structuredClone(this.issues);
  }
  get(number: number) {
    const issue = this.issues.find((i) => i.number === number);
    if (!issue) throw new Error(`no issue #${number}`);
    return issue;
  }
}
