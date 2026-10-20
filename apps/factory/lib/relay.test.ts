import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { cardToWake, signed, wake } from "./relay";

const secret = "a webhook secret";
const sign = (body: string, key = secret) => `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
const event = (patch: object = {}) =>
  JSON.stringify({
    webhookEvent: "jira:issue_updated",
    user: { accountId: "guest-id" },
    issue: { key: "SD-3" },
    changelog: { items: [{ field: "status", fromString: "Backlog", toString: "Ready" }] },
    ...patch,
  });

describe("the relay", () => {
  it("accepts only Jira's signature over the exact body", () => {
    const body = event();
    expect(signed(secret, body, sign(body))).toBe(true);
    expect(signed(secret, `${body} `, sign(body))).toBe(false);
    expect(signed(secret, body, sign(body, "another secret"))).toBe(false);
    expect(signed(secret, body, null)).toBe(false);
    expect(signed("", body, sign(body, ""))).toBe(false);
  });

  it("wakes the factory for a status change in its space", () => {
    expect(cardToWake(event(), { project: "SD", factory: "factory-id" })).toBe("SD-3");
  });

  it("ignores other spaces, other changes and the factory's own moves", () => {
    const options = { project: "SD", factory: "factory-id" };
    expect(cardToWake(event({ issue: { key: "OPS-3" } }), options)).toBeNull();
    expect(cardToWake(event({ issue: { key: "SDX-3" } }), options)).toBeNull();
    expect(cardToWake(event({ changelog: { items: [{ field: "summary" }] } }), options)).toBeNull();
    expect(cardToWake(event({ webhookEvent: "comment_created" }), options)).toBeNull();
    expect(cardToWake(event({ user: { accountId: "factory-id" } }), options)).toBeNull();
    expect(cardToWake("not json", options)).toBeNull();
  });

  it("dispatches the Board workflow on main with the card as its input", async () => {
    const sent: { url: string; init: RequestInit }[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return Response.json({ workflow_run_id: 1, html_url: "https://github.com/o/r/actions/runs/1" });
    }) as typeof fetch;
    const result = await wake({ token: "t", repo: "o/r", key: "SD-3" }, fetchFn);
    expect(result).toEqual({ ok: true, status: 200, runUrl: "https://github.com/o/r/actions/runs/1" });
    expect(sent[0].url).toBe("https://api.github.com/repos/o/r/actions/workflows/board.yml/dispatches");
    expect(JSON.parse(String(sent[0].init.body))).toEqual({ ref: "main", inputs: { key: "SD-3" }, return_run_details: true });
  });
});
