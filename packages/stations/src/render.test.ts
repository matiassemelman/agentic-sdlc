import { describe, expect, it } from "vitest";
import { exampleSpec } from "./fixtures.ts";
import { readSpecComment, renderSpecComment, type Envelope } from "./render.ts";

const envelope = (): Envelope => ({
  version: 1,
  spec: exampleSpec(),
  meta: { issue: 12, ticket: "guest-filter", model: "claude-opus-5-5", tokens: { input: 1200, output: 900, cacheWrite: 3000, cacheRead: 0 }, costUsd: 0.0378, seconds: 14.2 },
});

describe("spec comment", () => {
  it("reads back exactly what it wrote, with its hash", () => {
    const result = readSpecComment(renderSpecComment(envelope()));
    expect(result).toMatchObject({ ok: true, envelope: envelope() });
    if (result.ok) expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("shows the criteria, the assumptions and how to approve", () => {
    const comment = renderSpecComment(envelope());
    expect(comment).toContain("### Spec for #12: Filter rooms by number of guests");
    expect(comment).toContain("**AC-2** (e2e)  \nGiven the rooms in rooms.json  \nWhen the visitor chooses 3 guests  \nThen exactly Bellver and Badia show");
    expect(comment).toContain("approving the spec approves these");
    expect(comment).toContain("4,200 tokens in (0 from cache) · 900 out · $0.038 · 14 s");
    expect(comment).toContain("move the run's card from Spec review to Build to approve it");
  });

  it("says on a board run's comment that the spec gate decides", () => {
    const comment = renderSpecComment({ ...envelope(), meta: { ...envelope().meta, card: "SD-1" } });
    expect(comment).toContain("The spec gate decides next: it approves a clear spec, or sends it to SD-1 in Spec review for a person.");
    expect(comment).not.toContain("move SD-1 from Spec review to Build");
  });

  it("refuses a comment whose visible text was edited", () => {
    const edited = renderSpecComment(envelope()).replace("exactly Bellver and Badia show", "every room shows");
    expect(readSpecComment(edited)).toEqual({ ok: false, reason: expect.stringContaining("was changed") });
  });

  it("refuses data that does not match its hash", () => {
    const other = envelope();
    other.spec.title = "Something else";
    const forged = renderSpecComment(envelope()).replace(/data=\S+/, `data=${Buffer.from(JSON.stringify(other)).toString("base64")}`);
    expect(readSpecComment(forged)).toEqual({ ok: false, reason: "the spec data does not match its hash" });
  });

  it("tolerates the Windows line endings GitHub may return", () => {
    expect(readSpecComment(renderSpecComment(envelope()).replace(/\n/g, "\r\n")).ok).toBe(true);
  });

  it("refuses a comment with no spec in it", () => {
    expect(readSpecComment("Looks good to me")).toEqual({ ok: false, reason: "no spec marker at the end of the comment" });
  });
});
