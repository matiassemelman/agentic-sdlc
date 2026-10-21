import { describe, expect, it } from "vitest";
import { answerOf } from "./anthropic.ts";
import { StationError } from "./spec-station.ts";

const usage = { input_tokens: 6000, output_tokens: 1000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
const text = (t: string) => ({ type: "text" as const, text: t });

describe("reading the spec model's answer", () => {
  it("joins a structured output that arrives in more than one text block", () => {
    const answer = answerOf({ content: [text('{"title":"Total'), text(' price"}')], stop_reason: "end_turn", usage });
    expect(answer.output).toEqual({ title: "Total price" });
  });

  it("leaves an answer cut off at the output limit to the station, with its stop reason", () => {
    const answer = answerOf({ content: [text('{"title":"Total pr')], stop_reason: "max_tokens", usage });
    expect(answer).toMatchObject({ output: null, stopReason: "max_tokens" });
  });

  it("says what came back when a finished answer is not JSON", () => {
    const read = () => answerOf({ content: [text('{"title":"Total pr')], stop_reason: "end_turn", usage });
    expect(read).toThrow(StationError);
    expect(read).toThrow("The model's answer was not valid JSON (stop reason end_turn, 18 characters in 1 text block, 1,000 tokens out).");
  });
});
