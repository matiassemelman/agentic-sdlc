import { adfText, type Adf } from "./adf.ts";
import { HttpError, send, type Fetch, type Wait } from "./http.ts";

/** A card on the board, with the fields the factory reads. */
export type Card = { key: string; summary: string; status: string; labels: string[]; created: string };
/** One status change from a card's history: who moved it, from where, to where. */
export type Move = { at: string; by: string; byName: string; from: string; to: string };
export type CardComment = { id: string; author: string; created: string; updated: string; text: string };

type RawIssue = { key: string; fields: { summary: string; status: { name: string }; labels: string[]; created: string } };
const FIELDS = "summary,status,labels,created";

/** The work type the factory creates cards with. Team-managed spaces name it in the site's language. */
export const CARD_TYPE = /^(task|tarea)$/i;

const toCard = (issue: RawIssue): Card => ({
  key: issue.key,
  summary: issue.fields.summary,
  status: issue.fields.status.name,
  labels: issue.fields.labels,
  created: issue.fields.created,
});

/**
 * The board, through Jira's REST API v3, as the Factory account. A scoped API token only works
 * through api.atlassian.com with the site's cloud id, not through the site's own address.
 */
export class Jira {
  readonly site: string;
  private readonly base: string;
  private readonly auth: string;
  private readonly http: { fetch: Fetch; wait?: Wait };

  constructor(
    { cloudId, email, token, site }: { cloudId: string; email: string; token: string; site: string },
    http: { fetch: Fetch; wait?: Wait } = { fetch },
  ) {
    this.site = site.replace(/\/$/, "");
    this.base = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    this.auth = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
    this.http = http;
  }

  cardUrl(key: string): string {
    return `${this.site}/browse/${key}`;
  }

  private call<T>(what: string, method: string, path: string, body?: unknown): Promise<T> {
    return send<T>(this.http, "Jira", what, `${this.base}${path}`, {
      method,
      headers: {
        authorization: this.auth,
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /**
   * The account the token belongs to: the factory's own identity on the board. Its locale matters:
   * Jira translates built-in status names (Done, Ready) into the reader's language.
   */
  async me(): Promise<{ accountId: string; displayName: string; locale?: string }> {
    return this.call("reading the factory's account", "GET", "/myself");
  }

  /** A card, or null when it does not exist (or was deleted). */
  async card(key: string): Promise<Card | null> {
    try {
      return toCard(await this.call<RawIssue>(`reading ${key}`, "GET", `/issue/${encodeURIComponent(key)}?fields=${FIELDS}`));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  async search(jql: string): Promise<Card[]> {
    const cards: Card[] = [];
    let token: string | undefined;
    do {
      const page = await this.call<{ issues: RawIssue[]; nextPageToken?: string }>("searching the board", "POST", "/search/jql", {
        jql,
        fields: FIELDS.split(","),
        maxResults: 100,
        ...(token ? { nextPageToken: token } : {}),
      });
      cards.push(...page.issues.map(toCard));
      token = page.nextPageToken;
    } while (token);
    return cards;
  }

  /** The card's status changes, oldest first. */
  async moves(key: string): Promise<Move[]> {
    const moves: Move[] = [];
    for (let startAt = 0; ; ) {
      const page = await this.call<{
        values: { created: string; author?: { accountId: string; displayName: string }; items: { field: string; fromString: string; toString: string }[] }[];
        isLast: boolean;
      }>(`reading the history of ${key}`, "GET", `/issue/${encodeURIComponent(key)}/changelog?startAt=${startAt}&maxResults=100`);
      for (const change of page.values)
        for (const item of change.items)
          if (item.field === "status")
            moves.push({ at: change.created, by: change.author?.accountId ?? "", byName: change.author?.displayName ?? "someone", from: item.fromString, to: item.toString });
      if (page.isLast || page.values.length === 0) return moves.sort((a, b) => a.at.localeCompare(b.at));
      startAt += page.values.length;
    }
  }

  /** Moves a card to a status by name, through whichever transition leads there. */
  async move(key: string, status: string): Promise<void> {
    const { transitions } = await this.call<{ transitions: { id: string; to: { name: string } }[] }>(
      `reading the moves open to ${key}`,
      "GET",
      `/issue/${encodeURIComponent(key)}/transitions`,
    );
    const transition = transitions.find((t) => t.to.name === status);
    if (!transition) throw new Error(`${key} cannot move to ${status}: the board's workflow has no transition there`);
    await this.call(`moving ${key} to ${status}`, "POST", `/issue/${encodeURIComponent(key)}/transitions`, { transition: { id: transition.id } });
  }

  async comment(key: string, body: Adf): Promise<void> {
    await this.call(`commenting on ${key}`, "POST", `/issue/${encodeURIComponent(key)}/comment`, { body });
  }

  async comments(key: string): Promise<CardComment[]> {
    const page = await this.call<{ comments: { id: string; author?: { accountId: string }; created: string; updated: string; body: Adf }[] }>(
      `reading the comments of ${key}`,
      "GET",
      `/issue/${encodeURIComponent(key)}/comment?orderBy=created&maxResults=100`,
    );
    return page.comments.map((c) => ({ id: c.id, author: c.author?.accountId ?? "", created: c.created, updated: c.updated, text: adfText(c.body) }));
  }

  /** Adds a link to the card. The same url twice updates the link instead of adding another. */
  async link(key: string, url: string, title: string): Promise<void> {
    await this.call(`linking ${key}`, "POST", `/issue/${encodeURIComponent(key)}/remotelink`, { globalId: url, object: { url, title } });
  }

  /** Each work type of the space with the status names its workflow uses, as this account reads them. */
  async statusesByType(project: string): Promise<{ type: string; subtask: boolean; statuses: string[] }[]> {
    const types = await this.call<{ name: string; subtask: boolean; statuses: { name: string }[] }[]>(
      `reading the statuses of ${project}`,
      "GET",
      `/project/${encodeURIComponent(project)}/statuses`,
    );
    return types.map((t) => ({ type: t.name, subtask: t.subtask, statuses: t.statuses.map((s) => s.name) }));
  }

  /** Creates a card in the space's first status (Backlog). Returns its key. */
  async create({ project, summary, description, labels }: { project: string; summary: string; description: Adf; labels: string[] }): Promise<string> {
    type IssueType = { id: string; name: string; subtask: boolean; hierarchyLevel: number };
    const page = await this.call<{ issueTypes?: IssueType[]; createMetaIssueType?: IssueType[] }>(
      `reading the work types of ${project}`,
      "GET",
      `/issue/createmeta/${encodeURIComponent(project)}/issuetypes`,
    );
    const standard = (page.createMetaIssueType ?? page.issueTypes ?? []).filter((t) => !t.subtask && t.hierarchyLevel === 0);
    const type = standard.find((t) => CARD_TYPE.test(t.name)) ?? standard[0];
    if (!type) throw new Error(`${project} has no standard work type to create cards with`);
    const created = await this.call<{ key: string }>(`creating a card in ${project}`, "POST", "/issue", {
      fields: { project: { key: project }, issuetype: { id: type.id }, summary, description, labels },
    });
    return created.key;
  }
}
