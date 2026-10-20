/**
 * USD per million tokens, from Anthropic's pricing page (checked 2026-10-15). A cache write costs
 * 1.25 times the input price (5-minute cache). Haiku's prices hold for prompts up to 100k tokens.
 */
export const PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
};

/** Tokens of one call, split the way they are billed. `input` excludes cached tokens. */
export type TokenCount = { input: number; output: number; cacheWrite: number; cacheRead: number };

export function tokensOf(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}): TokenCount {
  return {
    input: usage.input_tokens,
    output: usage.output_tokens,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
  };
}

export function costUsd(model: string, tokens: TokenCount): number {
  const price = PRICES[model];
  if (!price) throw new Error(`No price for model ${model}`);
  const perToken = (perMillion: number) => perMillion / 1_000_000;
  return (
    tokens.input * perToken(price.input) +
    tokens.output * perToken(price.output) +
    tokens.cacheWrite * perToken(price.cacheWrite) +
    tokens.cacheRead * perToken(price.cacheRead)
  );
}
