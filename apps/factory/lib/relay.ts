import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Checks Jira's signature on a webhook: X-Hub-Signature is "sha256=<hex>", the HMAC of the raw body
 * with the secret set on the webhook. Anything else is refused.
 */
export function signed(secret: string, body: string, header: string | null): boolean {
  const match = /^sha256=([0-9a-f]{64})$/i.exec(header ?? "");
  if (!secret || !match) return false;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest();
  const given = Buffer.from(match[1], "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

type JiraEvent = {
  webhookEvent?: string;
  user?: { accountId?: string };
  issue?: { key?: string };
  changelog?: { items?: { field?: string }[] };
};

const KEY = /^([A-Z][A-Z0-9]*)-\d+$/;

/**
 * The card worth waking the factory for, or null: a status change in the factory's space, made by
 * someone other than the factory. The factory checks the board itself, so this only filters noise.
 */
export function cardToWake(body: string, { project, factory }: { project: string; factory?: string }): string | null {
  let event: JiraEvent;
  try {
    event = JSON.parse(body) as JiraEvent;
  } catch {
    return null;
  }
  const key = event.issue?.key ?? "";
  if (event.webhookEvent !== "jira:issue_updated" || KEY.exec(key)?.[1] !== project) return null;
  if (!event.changelog?.items?.some((item) => item.field === "status")) return null;
  if (factory && event.user?.accountId === factory) return null;
  return key;
}

/** Dispatches the factory's Board workflow on main with the card as a hint. */
export async function wake(
  { token, repo, key }: { token: string; repo: string; key: string },
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number; runUrl?: string }> {
  const response = await fetchFn(`https://api.github.com/repos/${repo}/actions/workflows/board.yml/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main", inputs: { key }, return_run_details: true }),
  });
  const details = response.status === 200 ? ((await response.json()) as { html_url?: string }) : undefined;
  return { ok: response.ok, status: response.status, runUrl: details?.html_url };
}
