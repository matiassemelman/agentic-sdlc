// The spec station, as GitHub Actions runs it:
//   node packages/stations/src/run-spec.ts --ticket guest-filter --issue 12 --out out
// Writes spec-comment.md and envelope.json, or error.md (and exits 1) when the station fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { tokensOf } from "./prices.ts";
import { specSchema } from "./spec.ts";
import { runSpecStation, StationError, type ModelCall } from "./spec-station.ts";

const { values } = parseArgs({
  options: { ticket: { type: "string" }, issue: { type: "string" }, out: { type: "string", default: "out" } },
});
const issue = Number(values.issue);
if (!values.ticket || !Number.isInteger(issue) || issue < 1) {
  console.error("Usage: run-spec.ts --ticket <id> --issue <number> [--out <dir>]");
  process.exit(2);
}

const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
const call: ModelCall = async ({ model, system, user }) => {
  const message = await client.messages.parse({
    model,
    max_tokens: 4096,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
    output_config: { format: jsonSchemaOutputFormat(specSchema) },
  });
  return { output: message.parsed_output, tokens: tokensOf(message.usage), stopReason: message.stop_reason };
};

const out = resolve(values.out);
mkdirSync(out, { recursive: true });
try {
  const root = resolve(import.meta.dirname, "../../..");
  const { envelope, comment } = await runSpecStation({ root, ticketId: values.ticket, issue, call });
  writeFileSync(join(out, "spec-comment.md"), comment);
  writeFileSync(join(out, "envelope.json"), `${JSON.stringify(envelope, null, 2)}\n`);
  const t = envelope.meta.tokens;
  console.log(`Spec written: ${envelope.spec.criteria.length} criteria, ${t.input + t.cacheRead + t.cacheWrite} tokens in, ${t.output} out, $${envelope.meta.costUsd.toFixed(3)}`);
} catch (error) {
  // Only messages written for people go into the issue; anything else is logged here and summarised there.
  const message = error instanceof StationError ? error.message : "The spec station failed; see the workflow log.";
  writeFileSync(join(out, "error.md"), `${message}\n`);
  console.error(error);
  process.exit(1);
}
