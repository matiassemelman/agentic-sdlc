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

/** The spec station's real model call: Opus with a structured output and a cached system prompt. */
export function specModelCall(): ModelCall {
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  return async ({ model, system, user }) => {
    try {
      const message = await client.messages.parse({
        model,
        max_tokens: 4096,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
        output_config: { format: jsonSchemaOutputFormat(specSchema) },
      });
      return { output: message.parsed_output, tokens: tokensOf(message.usage), stopReason: message.stop_reason };
    } catch (error) {
      if (error instanceof Anthropic.APIConnectionError) throw new StationError(modelFailure(undefined));
      if (error instanceof Anthropic.APIError) throw new StationError(modelFailure(error.status));
      throw error;
    }
  };
}
