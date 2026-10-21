import { describe, expect, it } from "vitest";
import { agentReport, commandName, type Message } from "./agent-report.ts";

// The shape of claude-code-action's execution file: the Agent SDK's messages, the result last.
const bash = (command: string) => ({ type: "tool_use", name: "Bash", input: { command } });
const messages: Message[] = [
  { type: "system", subtype: "init" },
  { type: "assistant", message: { content: [{ type: "text", text: "Reading the spec." }, { type: "tool_use", name: "Read", input: { file_path: ".factory/envelope.json" } }] } },
  { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "1", content: "SECRET-LOOKING OUTPUT" }] } },
  { type: "assistant", message: { content: [bash("pnpm test"), bash("pnpm --filter hotel exec playwright test e2e/home.spec.ts")] } },
  { type: "assistant", message: { content: [bash("node packages/stations/src/run-evidence.ts --spec .factory/envelope.json --out evidence")] } },
  { type: "assistant", message: { content: [bash("node packages/stations/src/run-evidence.ts --spec .factory/envelope.json --out evidence")] } },
  { type: "result", subtype: "success", duration_ms: 800_000, duration_api_ms: 480_000, num_turns: 41, total_cost_usd: 2.345 },
];

describe("where the build agent's time went", () => {
  it("splits the time between the model and the tools, with the cost and what ran how often", () => {
    expect(agentReport(messages, "19")).toEqual([
      "run #19: agent 800 s, 41 turns, $2.35: model 480 s (60%), tools 320 s (40%)",
      "run #19: agent ran 2× run-evidence, 1× Read, 1× pnpm test, 1× playwright test",
    ]);
  });

  it("prints no text and no tool output", () => {
    expect(agentReport(messages, "19").join("\n")).not.toMatch(/SECRET|Reading the spec/);
  });

  it("says so when the agent was stopped before its result", () => {
    expect(agentReport(messages.slice(0, -1), "19")[0]).toBe("run #19: agent left no result (it was stopped before it finished)");
  });

  it("names commands by what they run", () => {
    expect(commandName("node .claude/skills/design-taste-frontend/scripts/lint.mjs apps/hotel/app")).toBe("design lint");
    expect(commandName("pnpm --filter hotel exec vitest run lib/format.test.ts")).toBe("vitest");
    expect(commandName("git diff --stat")).toBe("git diff");
  });
});
