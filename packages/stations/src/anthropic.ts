import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { tokensOf } from "./prices.ts";
import { specSchema } from "./spec.ts";
import { StationError, type ModelCall } from "./spec-station.ts";

/** What a person reads when the model call itself fails, by HTTP status. The key never appears. */
export function modelFailure(status: number | undefined): string {
  if (status === 401 || status === 403) return "The model call was refused: the factory's Anthropic API key is missing or not valid.";
  if (status === 429) return "The model call hit a rate or spending limit. Move the card back to Ready to try again later.";
  if (status !== undefined && status >= 500) return `The model service failed (${status}). Move the card back to Ready to try again.`;
  if (status === undefined) return "The model service could not be reached. Move the card back to Ready to try again.";
  return `The model call failed (${status}).`;
}

type Answer = { content: { type: string; text?: string }[]; stop_reason: string | null; usage: Parameters<typeof tokensOf>[0] };

/**
 * The structured output, read from all of the answer's text blocks together. Not the SDK's
 * `messages.parse`: it parses each text block on its own and throws before the stop reason can say why
 * the JSON is broken. An answer cut off at the output limit, or a refusal, goes to the station, which
 * reads the stop reason first; any other broken answer says what came back.
 */
export function answerOf(message: Answer): Awaited<ReturnType<ModelCall>> {
  const blocks = message.content.flatMap((b) => (b.type === "text" && b.text !== undefined ? [b.text] : []));
  const text = blocks.join("");
  const tokens = tokensOf(message.usage);
  try {
    return { output: JSON.parse(text), tokens, stopReason: message.stop_reason };
  } catch {
    if (message.stop_reason === "max_tokens" || message.stop_reason === "refusal") return { output: null, tokens, stopReason: message.stop_reason };
    throw new StationError(
      `The model's answer was not valid JSON (stop reason ${message.stop_reason}, ${text.length} characters in ${blocks.length} text ` +
        `block${blocks.length === 1 ? "" : "s"}, ${tokens.output.toLocaleString("en")} tokens out).`,
    );
  }
}

/** The spec station's real model call: Opus with a structured output and a cached system prompt. */
export function specModelCall(): ModelCall {
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  const { type, schema } = jsonSchemaOutputFormat(specSchema);
  return async ({ model, system, user }) => {
    let message: Anthropic.Message;
    try {
      message = await client.messages.create({
        model,
        max_tokens: 8192,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
        output_config: { format: { type, schema } },
      });
    } catch (error) {
      if (error instanceof Anthropic.APIConnectionError) throw new StationError(modelFailure(undefined));
      if (error instanceof Anthropic.APIError) throw new StationError(modelFailure(error.status));
      throw error;
    }
    return answerOf(message);
  };
}
