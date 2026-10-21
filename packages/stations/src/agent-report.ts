// Where the build agent's time went, from claude-code-action's execution file, as build.yml runs it:
//   node packages/stations/src/agent-report.ts --run 19 "$RUNNER_TEMP/claude-execution-output.json"
// It prints times, counts and command names only, never the agent's text or a tool's output: the repository's
// logs are public.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";

// Open types: the SDK messages carry more fields than the report reads.
type Block = { type: string; name?: string; input?: Record<string, unknown>; [field: string]: unknown };
export type Message = {
  type: string;
  message?: { content?: Block[] | string };
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
  total_cost_usd?: number;
  [field: string]: unknown;
};

/** A Bash command by what it runs, so repeated runs of the same check count together. */
export function commandName(command: string): string {
  const evidence = /run-evidence\.ts/.test(command);
  if (evidence) return "run-evidence";
  if (/design-taste-frontend\/scripts\/lint\.mjs/.test(command)) return "design lint";
  if (/playwright test/.test(command)) return "playwright test";
  if (/vitest/.test(command)) return "vitest";
  return command.trim().split(/\s+/).slice(0, 2).join(" ");
}

/** The agent's run in two or three lines: total, model and tool time, cost, and what it ran how often. */
export function agentReport(messages: Message[], run: string): string[] {
  const result = messages.findLast((m) => m.type === "result");
  const model = messages.find((m) => m.type === "system" && typeof m.model === "string")?.model as string | undefined;
  const counts = new Map<string, number>();
  for (const m of messages) {
    if (m.type !== "assistant" || !Array.isArray(m.message?.content)) continue;
    for (const block of m.message.content) {
      if (block.type !== "tool_use" || !block.name) continue;
      const name = block.name === "Bash" && typeof block.input?.command === "string" ? commandName(block.input.command) : block.name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  const lines: string[] = [];
  if (result?.duration_ms) {
    const total = result.duration_ms / 1000;
    const api = (result.duration_api_ms ?? 0) / 1000;
    const pct = (s: number) => `${Math.round((100 * s) / total)}%`;
    lines.push(
      `run #${run}: agent${model ? ` (${model})` : ""} ${Math.round(total)} s, ${result.num_turns ?? "?"} turns, $${(result.total_cost_usd ?? 0).toFixed(2)}: ` +
        `model ${Math.round(api)} s (${pct(api)}), tools ${Math.round(total - api)} s (${pct(total - api)})`,
    );
  } else lines.push(`run #${run}: agent left no result (it was stopped before it finished)`);
  const ran = [...counts].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${n}× ${name}`);
  if (ran.length) lines.push(`run #${run}: agent ran ${ran.join(", ")}`);
  return lines;
}

if (import.meta.main) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { run: { type: "string", default: "?" } } });
  const file = positionals[0];
  const lines = file && existsSync(file) ? agentReport(JSON.parse(readFileSync(file, "utf8")) as Message[], values.run) : [`run #${values.run}: agent left no execution file`];
  for (const line of lines) console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.map((l) => `- ${l}`).join("\n")}\n`);
}
