import { describe, expect, it } from "vitest";
import { admit, MAX_RUNS_PER_DAY } from "./admission.ts";

describe("admit", () => {
  it("takes an order when the factory is idle and under the daily limit", () => {
    expect(admit({ activeRuns: [], runsLast24h: MAX_RUNS_PER_DAY - 1 })).toEqual({ ok: true });
  });

  it("refuses while another run is active, naming it", () => {
    expect(admit({ activeRuns: [7], runsLast24h: 0 })).toEqual({ ok: false, reason: expect.stringContaining("#7") });
  });

  it("refuses at the daily limit", () => {
    expect(admit({ activeRuns: [], runsLast24h: MAX_RUNS_PER_DAY }).ok).toBe(false);
  });
});
