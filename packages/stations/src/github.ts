import { send, type Fetch, type Wait } from "./http.ts";

/** A run's issue on GitHub. Its title starts with the key of its card on the board. */
export type RunIssue = { number: number; title: string; key: string | null; labels: string[]; open: boolean; createdAt: string; url: string };
export type IssueComment = { author: string; body: string };
/** A run's pull request, open or not, and the commit its gates ran on. */
export type Pull = { number: number; url: string; state: "open" | "merged" | "closed"; sha: string };
/** A check GitHub Actions reported on a commit. */
export type Check = { name: string; status: string; conclusion: string | null };

const KEY = /^([A-Z][A-Z0-9]*-\d+): /;

/** The labels after a relabel: the kept ones in their order, then the added ones. */
export const relabeled = (labels: string[], { add = [], remove = [] }: { add?: string[]; remove?: string[] }) => [
  ...labels.filter((l) => !remove.includes(l)),
  ...add.filter((l) => !labels.includes(l)),
];

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

  /** Starts a workflow on main. A dispatch is the one event GITHUB_TOKEN may start a workflow with. */
  async dispatch(workflow: string, inputs: Record<string, string>): Promise<void> {
    await this.call(`starting ${workflow}`, "POST", `/actions/workflows/${workflow}/dispatches`, { ref: "main", inputs });
  }

  /** The open pull requests from a branch of this repository. */
  async pulls(branch: string): Promise<{ number: number; url: string }[]> {
    const owner = this.repo.split("/")[0];
    const raw = await this.call<{ number: number; html_url: string }[]>(`looking for a PR from ${branch}`, "GET", `/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}`);
    return raw.map((p) => ({ number: p.number, url: p.html_url }));
  }

  /** The newest pull request from a branch of this repository, open, merged or closed; null when there is none. */
  async pull(branch: string): Promise<Pull | null> {
    const owner = this.repo.split("/")[0];
    const raw = await this.call<{ number: number; html_url: string; state: string; merged_at: string | null; head: { sha: string } }[]>(
      `reading the PR from ${branch}`,
      "GET",
      `/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=10`,
    );
    const pr = raw.sort((a, b) => b.number - a.number)[0];
    if (!pr) return null;
    return { number: pr.number, url: pr.html_url, state: pr.merged_at ? "merged" : pr.state === "open" ? "open" : "closed", sha: pr.head.sha };
  }

  /** The latest run of each check GitHub Actions reported on a commit; other apps' checks are left out. */
  async checks(sha: string): Promise<Check[]> {
    const raw = await this.call<{ check_runs: { name: string; status: string; conclusion: string | null; app?: { slug: string } }[] }>(
      `reading the checks of ${sha.slice(0, 7)}`,
      "GET",
      `/commits/${sha}/check-runs?filter=latest&per_page=100`,
    );
    return raw.check_runs.filter((c) => c.app?.slug === "github-actions").map((c) => ({ name: c.name, status: c.status, conclusion: c.conclusion }));
  }

  async openPull({ title, branch, body, draft }: { title: string; branch: string; body: string; draft: boolean }): Promise<{ number: number; url: string }> {
    const raw = await this.call<{ number: number; html_url: string }>(`opening the PR from ${branch}`, "POST", "/pulls", { title, head: branch, base: "main", body, draft });
    return { number: raw.number, url: raw.html_url };
  }
}
