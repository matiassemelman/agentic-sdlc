import { describe, expect, it } from "vitest";
import { costUsd, tokensOf } from "./prices.ts";

describe("costUsd", () => {
  it("bills each kind of token at its own price", () => {
    // Opus 5.5: 10k input at $4, 1k output at $20, 2k cache read at $0.20, 1k cache write at $5 (per million).
    const tokens = { input: 10_000, output: 1_000, cacheRead: 2_000, cacheWrite: 1_000 };
    expect(costUsd("claude-opus-5-5", tokens)).toBeCloseTo(0.04 + 0.02 + 0.0004 + 0.005, 10);
  });

  it("refuses a model with no known price", () => {
    expect(() => costUsd("claude-unknown", { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 })).toThrow(/No price/);
  });

  it("reads missing cache counts as zero", () => {
    expect(tokensOf({ input_tokens: 5, output_tokens: 3, cache_read_input_tokens: null })).toEqual({ input: 5, output: 3, cacheWrite: 0, cacheRead: 0 });
  });
});
