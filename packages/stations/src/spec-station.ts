import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MODELS } from "./models.ts";
import { costUsd, type TokenCount } from "./prices.ts";
import { buildSpecPrompt } from "./prompt.ts";
import { renderSpecComment, type Envelope } from "./render.ts";
import { validateSpec, type Spec } from "./spec.ts";
import { loadTicket } from "./tickets.ts";

/** One model call with a structured output. The real one is in run-spec.ts; tests pass a fake. */
export type ModelCall = (request: { model: string; system: string; user: string }) => Promise<{
  output: unknown;
  tokens: TokenCount;
  stopReason: string | null;
}>;

/** A station failure a person can read: it goes into the issue as is. */
export class StationError extends Error {}

export async function runSpecStation({ root, ticketId, issue, card, call, clock = () => performance.now() }: {
  root: string;
  ticketId: string;
  issue: number;
  /** The run's card on the board, if it has one. */
  card?: string;
  call: ModelCall;
  clock?: () => number;
}): Promise<{ envelope: Envelope; comment: string }> {
  const ticket = loadTicket(root, ticketId);
  const read = (path: string) => readFileSync(join(root, path), "utf8");
  const { system, user } = buildSpecPrompt({
    skill: read(".claude/skills/write-spec/SKILL.md"),
    agents: read("AGENTS.md"),
    ticket,
    issue,
    files: ticket.context.map((path) => ({ path, text: read(path) })),
  });

  const model = MODELS.spec;
  const started = clock();
  const result = await call({ model, system, user });
  const seconds = (clock() - started) / 1000;

  if (result.stopReason === "max_tokens") throw new StationError("The spec was cut off: the model reached its output limit.");
  if (result.stopReason === "refusal") throw new StationError("The model declined to write this spec.");
  if (!result.output || typeof result.output !== "object") throw new StationError("The model returned no spec.");
  const spec = result.output as Spec;
  const problems = validateSpec(spec);
  if (problems.length) throw new StationError(`The spec did not pass validation:\n${problems.map((p) => `- ${p}`).join("\n")}`);

  const envelope: Envelope = {
    version: 1,
    spec,
    meta: { issue, ...(card ? { card } : {}), ticket: ticket.id, model, tokens: result.tokens, costUsd: costUsd(model, result.tokens), seconds },
  };
  return { envelope, comment: renderSpecComment(envelope) };
}
