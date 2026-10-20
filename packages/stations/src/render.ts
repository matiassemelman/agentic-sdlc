import * as adf from "./adf.ts";
import { canonicalJson, sha256 } from "./hash.ts";
import type { TokenCount } from "./prices.ts";
import type { Spec } from "./spec.ts";
import { validateSpec } from "./spec.ts";

/** How a spec was made. `card` is the board card of the run; runs from before the board have none. */
export type SpecMeta = { issue: number; card?: string; ticket: string; model: string; tokens: TokenCount; costUsd: number; seconds: number };
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
    `<sub>${stationLine(meta)}. ${howToDecide(meta)}</sub>`,
  );
  const data = Buffer.from(canonicalJson(envelope), "utf8").toString("base64");
  return `${sections.join("\n\n")}\n<!-- factory:spec v1 sha256=${specHash(envelope)} data=${data} -->`;
}

function howToDecide(meta: SpecMeta): string {
  return meta.card
    ? `Decide on the board: move ${meta.card} from Spec review to Build to approve it, or to Done to reject it.`
    : "Decide on the board: move the run's card from Spec review to Build to approve it, or to Done to reject it.";
}

function stationLine(meta: SpecMeta): string {
  const t = meta.tokens;
  return (
    `Spec station · ${meta.model} · ${thousands(t.input + t.cacheWrite + t.cacheRead)} tokens in (${thousands(t.cacheRead)} from cache) · ` +
    `${thousands(t.output)} out · $${meta.costUsd.toFixed(3)} · ${Math.round(meta.seconds)} s`
  );
}

/** The card shows this line; the approval reads it back to check the card shows the spec on the run issue. */
export const SHOWN_SHA = /^Spec sha256: ([0-9a-f]{64})$/m;

/** The same spec as a comment on the card, where the product owner reads and decides. */
export function specAdf(envelope: Envelope, run: { url: string; number: number }): adf.Adf {
  const { spec, meta } = envelope;
  const { strong, text, inline, lineBreak } = adf;
  const list = (items: string[]) => adf.bullets(items.map((item) => inline(item)));
  const blocks: adf.Block[] = [
    adf.heading(3, `Spec: ${spec.title}`),
    adf.paragraph(inline(spec.summary)),
    adf.heading(4, "Acceptance criteria"),
    ...spec.criteria.map((c) =>
      adf.paragraph(strong(c.id), text(` (${c.test})`), lineBreak, strong("Given "), inline(c.given), lineBreak, strong("When "), inline(c.when), lineBreak, strong("Then "), inline(c.then)),
    ),
  ];
  if (spec.emptyStates.length) blocks.push(adf.heading(4, "Empty states"), adf.bullets(spec.emptyStates.map((s) => [...inline(s.when), ...text(": "), ...inline(s.show)])));
  if (spec.assumptions.length) blocks.push(adf.heading(4, "Assumptions (the ticket does not say; approving the spec approves these)"), list(spec.assumptions));
  if (spec.outOfScope.length) blocks.push(adf.heading(4, "Out of scope"), list(spec.outOfScope));
  blocks.push(adf.heading(4, "Files likely to change"), adf.bullets(spec.files.map((f) => adf.code(f))));
  blocks.push(
    adf.rule,
    adf.paragraph(strong("To approve this spec, move the card to Build. To reject it, move it to Done.")),
    adf.paragraph(text(`${stationLine(meta)} · `), adf.link(`run #${run.number} on GitHub`, run.url)),
    adf.paragraph(text(`Spec sha256: ${specHash(envelope)}`)),
  );
  return adf.doc(...blocks);
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
