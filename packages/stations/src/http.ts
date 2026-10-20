/** A failed call to GitHub or Jira, worded so a person can tell what failed. */
export class HttpError extends Error {
  readonly service: string;
  readonly status: number;
  constructor(service: string, status: number, what: string, detail: string) {
    super(`${service} returned ${status || "no response"} while ${what}${detail ? `: ${detail.slice(0, 300)}` : ""}`);
    this.service = service;
    this.status = status;
  }
}

export type Fetch = typeof fetch;
export type Wait = (ms: number) => Promise<void>;
export const sleep: Wait = (ms) => new Promise((done) => setTimeout(done, ms));

/** Statuses worth another try: rate limits and server errors. */
const RETRY = new Set([408, 425, 429, 500, 502, 503, 504]);
const ATTEMPTS = 3;

/**
 * Sends one request and returns its JSON (undefined for an empty body). Rate limits, server errors and
 * dropped connections are retried twice, after Retry-After or a short back-off; anything else throws
 * an HttpError at once. A retried POST may land twice, so callers keep what they post idempotent.
 */
export async function send<T>(
  { fetch, wait = sleep }: { fetch: Fetch; wait?: Wait },
  service: string,
  what: string,
  url: string,
  init: RequestInit,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      if (attempt >= ATTEMPTS) throw new HttpError(service, 0, what, String(error));
      await wait(1000 * attempt);
      continue;
    }
    if (response.ok) {
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    }
    if (!RETRY.has(response.status) || attempt >= ATTEMPTS) {
      throw new HttpError(service, response.status, what, (await response.text()).replace(/\s+/g, " ").trim());
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 1000 * 2 ** attempt);
  }
}
