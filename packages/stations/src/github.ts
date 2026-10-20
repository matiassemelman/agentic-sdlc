import { send, type Fetch, type Wait } from "./http.ts";

/** A run's issue on GitHub. Its title starts with the key of its card on the board. */
export type RunIssue = { number: number; title: string; key: string | null; labels: string[]; open: boolean; createdAt: string; url: string };
export type IssueComment = { author: string; body: string };

const KEY = /^([A-Z][A-Z0-9]*-\d+): /;

/** The card key a run's title starts with, or null for a run opened before the board existed. */
export function keyOf(title: string): string | null {
  return KEY.exec(title)?.[1] ?? null;
}

type RawIssue = { number: number; title: string; labels: { name: string }[]; state: string; created_at: string; html_url: string; pull_request?: unknown };

const toRun = (issue: RawIssue): RunIssue => ({
  number: issue.number,
  title: issue.title,
  key: keyOf(issue.title),
  labels: issue.labels.map((l) => l.name),
  open: issue.state === "open",
  createdAt: issue.created_at,
  url: issue.html_url,
});

/** The run issues and their comments and labels: the factory's record on GitHub. */
export class GitHub {
  private readonly token: string;
  private readonly repo: string;
  private readonly http: { fetch: Fetch; wait?: Wait };

  constructor({ token, repo }: { token: string; repo: string }, http: { fetch: Fetch; wait?: Wait } = { fetch }) {
    this.token = token;
    this.repo = repo;
    this.http = http;
  }

  private call<T>(what: string, method: string, path: string, body?: unknown): Promise<T> {
    return send<T>(this.http, "GitHub", what, `https://api.github.com/repos/${this.repo}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Run issues, newest first: the open ones, or every run created since a moment. */
  async runs(filter: { open: true } | { since: string }): Promise<RunIssue[]> {
    const state = "open" in filter ? "open" : "all";
    const since = "since" in filter ? `&since=${encodeURIComponent(filter.since)}` : "";
    const issues = await this.call<RawIssue[]>("listing runs", "GET", `/issues?labels=run&state=${state}&per_page=100${since}`);
    const runs = issues.filter((i) => !i.pull_request).map(toRun);
    return "since" in filter ? runs.filter((r) => r.createdAt >= filter.since) : runs;
  }

  async issue(number: number): Promise<RunIssue> {
    return toRun(await this.call<RawIssue>(`reading issue #${number}`, "GET", `/issues/${number}`));
  }

  async create({ title, body, labels }: { title: string; body: string; labels: string[] }): Promise<RunIssue> {
    return toRun(await this.call<RawIssue>("opening the run issue", "POST", "/issues", { title, body, labels }));
  }

  async comment(number: number, body: string): Promise<void> {
    await this.call(`commenting on #${number}`, "POST", `/issues/${number}/comments`, { body });
  }

  async comments(number: number): Promise<IssueComment[]> {
    const raw = await this.call<{ user: { login: string }; body: string }[]>(`reading the comments of #${number}`, "GET", `/issues/${number}/comments?per_page=100`);
    return raw.map((c) => ({ author: c.user.login, body: c.body }));
  }

  async relabel(number: number, { add = [], remove = [] }: { add?: string[]; remove?: string[] }): Promise<void> {
    if (add.length) await this.call(`labelling #${number}`, "POST", `/issues/${number}/labels`, { labels: add });
    for (const name of remove) {
      try {
        await this.call(`unlabelling #${number}`, "DELETE", `/issues/${number}/labels/${encodeURIComponent(name)}`);
      } catch (error) {
        // The label is already gone: that is the state we want.
        if (!(error instanceof Error && "status" in error && error.status === 404)) throw error;
      }
    }
  }

  async close(number: number, reason: "completed" | "not_planned"): Promise<void> {
    await this.call(`closing #${number}`, "PATCH", `/issues/${number}`, { state: "closed", state_reason: reason });
  }

  async retitle(number: number, title: string): Promise<void> {
    await this.call(`renaming #${number}`, "PATCH", `/issues/${number}`, { title });
  }
}
