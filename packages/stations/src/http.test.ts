import { describe, expect, it } from "vitest";
import { HttpError, send, type Fetch } from "./http.ts";

function server(...replies: (Response | Error)[]) {
  const seen: string[] = [];
  const fetch: Fetch = async (url) => {
    seen.push(String(url));
    const reply = replies.shift()!;
    if (reply instanceof Error) throw reply;
    return reply;
  };
  const waits: number[] = [];
  return { http: { fetch, wait: async (ms: number) => void waits.push(ms) }, seen, waits };
}

describe("send", () => {
  it("retries a server error and returns the JSON that follows", async () => {
    const { http, seen } = server(new Response("bad gateway", { status: 502 }), Response.json({ ok: 1 }));
    expect(await send(http, "GitHub", "labelling #8", "https://x/y", {})).toEqual({ ok: 1 });
    expect(seen).toHaveLength(2);
  });

  it("waits as long as Retry-After asks on a rate limit", async () => {
    const { http, waits } = server(new Response("", { status: 429, headers: { "retry-after": "7" } }), new Response(null, { status: 204 }));
    expect(await send(http, "Jira", "moving SD-1", "https://x/y", {})).toBeUndefined();
    expect(waits).toEqual([7000]);
  });

  it("retries a dropped connection", async () => {
    const { http } = server(new TypeError("fetch failed"), Response.json([]));
    expect(await send(http, "Jira", "searching", "https://x/y", {})).toEqual([]);
  });

  it("does not retry a client error, and says what failed", async () => {
    const { http, seen } = server(new Response('{"errorMessages":["Issue does not exist"]}', { status: 404 }));
    const error = await send(http, "Jira", "reading SD-9", "https://x/y", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 404, message: expect.stringContaining("Jira returned 404 while reading SD-9") });
    expect(seen).toHaveLength(1);
  });

  it("gives up after three attempts", async () => {
    const { http, seen } = server(...[1, 2, 3].map(() => new Response("", { status: 503 })));
    await expect(send(http, "GitHub", "commenting", "https://x/y", {})).rejects.toThrow("GitHub returned 503 while commenting");
    expect(seen).toHaveLength(3);
  });
});
