import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { exampleSpec } from "./fixtures.ts";
import { readSpecComment } from "./render.ts";
import { runSpecStation, StationError, type ModelCall } from "./spec-station.ts";

const root = resolve(import.meta.dirname, "../../..");
const tokens = { input: 2000, output: 800, cacheWrite: 0, cacheRead: 6000 };

function fakeModel(output: unknown, stopReason = "end_turn") {
  const requests: Parameters<ModelCall>[0][] = [];
  const call: ModelCall = async (request) => {
    requests.push(request);
    return { output, tokens, stopReason };
  };
  return { call, requests };
}

describe("spec station", () => {
  it("asks Opus with the skill, AGENTS.md, the ticket and its context files", async () => {
    const { call, requests } = fakeModel(exampleSpec());
    await runSpecStation({ root, ticketId: "guest-filter", issue: 3, call });
    const [request] = requests;
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.system).toContain("# Write the spec for a ticket");
    expect(request.system).not.toContain("description: Write the spec");
    expect(request.system).toContain("# AGENTS.md");
    expect(request.user).toContain("# Ticket #3: Filter rooms by number of guests");
    expect(request.user).toContain("## apps/hotel/data/rooms.json");
    expect(request.user).toContain('"id": "tramuntana"');
  });

  it("writes a comment that the approval accepts, with its cost", async () => {
    const times = [1000, 13500];
    const { call } = fakeModel(exampleSpec());
    const { comment, envelope } = await runSpecStation({ root, ticketId: "guest-filter", issue: 3, call, clock: () => times.shift()! });
    expect(readSpecComment(comment).ok).toBe(true);
    expect(envelope.meta).toMatchObject({ issue: 3, ticket: "guest-filter", seconds: 12.5 });
    expect(envelope.meta.costUsd).toBeCloseTo((2000 * 4 + 800 * 20 + 6000 * 0.2) / 1e6, 10);
  });

  it("never passes on a spec that fails validation", async () => {
    const spec = exampleSpec();
    spec.files = [".github/workflows/gates.yml"];
    const { call } = fakeModel(spec);
    await expect(runSpecStation({ root, ticketId: "guest-filter", issue: 3, call })).rejects.toThrow(StationError);
  });

  it("fails clearly when the output was cut off", async () => {
    const { call } = fakeModel(null, "max_tokens");
    await expect(runSpecStation({ root, ticketId: "guest-filter", issue: 3, call })).rejects.toThrow(/output limit/);
  });
});
