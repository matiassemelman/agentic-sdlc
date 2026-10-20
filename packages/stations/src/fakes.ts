// In-memory stand-ins for the board (Jira) and the record (GitHub), shared by the tests.
import { adfText, type Adf } from "./adf.ts";
import { STATUS } from "./board.ts";
import { keyOf, type IssueComment, type RunIssue } from "./github.ts";
import type { Card, CardComment, Move } from "./jira.ts";

let tick = 0;
/** Timestamps that always move forward, so histories sort the way they happened. */
export const stamp = () => new Date(Date.UTC(2026, 9, 20, 12, 0, tick++)).toISOString();

type Stored = { card: Card; moves: Move[]; comments: CardComment[]; links: string[] };

export class FakeBoard {
  readonly cards = new Map<string, Stored>();
  readonly factory = { accountId: "factory-id", displayName: "Factory" };
  private next = 1;
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
    return [...this.cards.values()]
      .map((s) => s.card)
      .filter((c) => (label ? c.labels.includes(label) && c.status !== STATUS.done : c.status !== STATUS.backlog && c.status !== STATUS.done))
      .map((c) => ({ ...c }));
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
  async statuses() {
    return this.statusNames;
  }
  async create({ summary, labels }: { project: string; summary: string; labels: string[] }) {
    const key = `SD-${this.next++}`;
    this.cards.set(key, { card: { key, summary, status: STATUS.backlog, labels, created: stamp() }, moves: [], comments: [], links: [] });
    return key;
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
  notes(key: string) {
    return this.cards.get(key)!.comments.map((c) => c.text);
  }
}

type Issue = RunIssue & { body: string; comments: IssueComment[]; closedAs?: string };

export class FakeRecord {
  readonly issues: Issue[] = [];
  private next = 10;

  async runs(filter: { open: true } | { since: string }) {
    const runs = this.issues.filter((i) => i.labels.includes("run"));
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
  async relabel(number: number, { add = [], remove = [] }: { add?: string[]; remove?: string[] }) {
    const issue = this.get(number);
    issue.labels = [...issue.labels.filter((l) => !remove.includes(l)), ...add.filter((l) => !issue.labels.includes(l))];
  }
  async close(number: number, reason: string) {
    Object.assign(this.get(number), { open: false, closedAs: reason });
  }
  async retitle(number: number, title: string) {
    Object.assign(this.get(number), { title, key: keyOf(title) });
  }
  get(number: number) {
    const issue = this.issues.find((i) => i.number === number);
    if (!issue) throw new Error(`no issue #${number}`);
    return issue;
  }
}
