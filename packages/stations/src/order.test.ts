import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { planOrder } from "./order.ts";

const root = resolve(import.meta.dirname, "../../..");
const order = { root, ticketId: "usd-prices", activeRuns: [], runsLast24h: 0, actor: "someone", runUrl: "https://github.com/o/r/actions/runs/1" };

describe("planOrder", () => {
  it("opens the run with the ticket's fixed text and who ordered it", () => {
    const plan = planOrder(order);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.title).toBe("Prices in euros or US dollars");
    expect(plan.body).toContain("1 EUR = 1.1225 USD");
    expect(plan.body).toContain("Ordered by @someone");
    expect(plan.body).not.toContain("---\nid:");
  });

  it("passes on the admission's refusal", () => {
    expect(planOrder({ ...order, activeRuns: [4] })).toEqual({ ok: false, reason: expect.stringContaining("#4") });
  });

  it("refuses a ticket that does not exist before anything else", () => {
    expect(() => planOrder({ ...order, ticketId: "free-text" })).toThrow(/Unknown ticket/);
  });
});
