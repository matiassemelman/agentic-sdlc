/**
 * Model routing: which model each station calls. Judgment (spec, eval, review) goes to Opus; the
 * executor that writes code is chosen by the benchmark (docs/design.md, "Model routing").
 */
export const MODELS = {
  spec: "claude-opus-5-5",
} as const;
