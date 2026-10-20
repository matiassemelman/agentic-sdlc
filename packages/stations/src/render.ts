import { canonicalJson, sha256 } from "./hash.ts";
import type { TokenCount } from "./prices.ts";
import type { Spec } from "./spec.ts";
import { validateSpec } from "./spec.ts";

export type SpecMeta = { issue: number; ticket: string; model: string; tokens: TokenCount; costUsd: number; seconds: number };
/** What the spec comment carries: the spec and how it was made. The approval is bound to its hash. */
export type Envelope = { version: 1; spec: Spec; meta: SpecMeta };

const MARKER = /\n<!-- factory:spec v1 sha256=([0-9a-f]{64}) data=([A-Za-z0-9+/=]+) -->$/;

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const bullets = (items: string[]) => items.map((item) => `- ${item}`).join("\n");

export function specHash(envelope: Envelope): string {
  return sha256(canonicalJson(envelope));
}

/** The issue comment a person reads and approves. The same envelope always renders the same text. */
export function renderSpecComment(envelope: Envelope): string {
  const { spec, meta } = envelope;
  const t = meta.tokens;
  const sections = [
    `### Spec for #${meta.issue}: ${spec.title}`,
    spec.summary,
    "**Acceptance criteria**",
    spec.criteria
      .map((c) => `**${c.id}** (${c.test})  \nGiven ${c.given}  \nWhen ${c.when}  \nThen ${c.then}`)
      .join("\n\n"),
  ];
  if (spec.emptyStates.length)
    sections.push("**Empty states**", bullets(spec.emptyStates.map((s) => `${s.when}: ${s.show}`)));
  if (spec.assumptions.length)
    sections.push("**Assumptions** (the ticket does not say; approving the spec approves these)", bullets(spec.assumptions));
  if (spec.outOfScope.length) sections.push("**Out of scope**", bullets(spec.outOfScope));
  sections.push("**Files likely to change**", bullets(spec.files.map((f) => `\`${f}\``)));
  sections.push(
    "---",
    `<sub>Spec station · ${meta.model} · ${thousands(t.input + t.cacheWrite + t.cacheRead)} tokens in ` +
      `(${thousands(t.cacheRead)} from cache) · ${thousands(t.output)} out · $${meta.costUsd.toFixed(3)} · ` +
      `${Math.round(meta.seconds)} s. Approve with the label \`spec:approved\` or reject with \`spec:rejected\`.</sub>`,
  );
  const data = Buffer.from(canonicalJson(envelope), "utf8").toString("base64");
  return `${sections.join("\n\n")}\n<!-- factory:spec v1 sha256=${specHash(envelope)} data=${data} -->`;
}

export type ReadResult = { ok: true; envelope: Envelope; sha256: string } | { ok: false; reason: string };

/**
 * Reads a spec comment back and checks it was not changed: the hash must match the data, and the
 * visible text must be exactly what the data renders to.
 */
export function readSpecComment(body: string): ReadResult {
  const text = body.replace(/\r\n/g, "\n").trimEnd();
  const marker = MARKER.exec(text);
  if (!marker) return { ok: false, reason: "no spec marker at the end of the comment" };
  let envelope: Envelope;
  try {
    envelope = JSON.parse(Buffer.from(marker[2], "base64").toString("utf8")) as Envelope;
  } catch {
    return { ok: false, reason: "the spec data is not readable" };
  }
  if (envelope?.version !== 1 || !envelope.spec || !envelope.meta) return { ok: false, reason: "unknown spec format" };
  const hash = specHash(envelope);
  if (hash !== marker[1]) return { ok: false, reason: "the spec data does not match its hash" };
  if (renderSpecComment(envelope) !== text) return { ok: false, reason: "the comment text was changed after the spec station wrote it" };
  const problems = validateSpec(envelope.spec);
  if (problems.length) return { ok: false, reason: `the spec is not valid: ${problems.join("; ")}` };
  return { ok: true, envelope, sha256: hash };
}
