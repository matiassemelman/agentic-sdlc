import { describe, expect, it } from "vitest";
import { adfText, doc, inline, markdownBlocks, paragraph, text } from "./adf.ts";
import { modelFailure } from "./anthropic.ts";
import { exampleSpec } from "./fixtures.ts";
import { keyOf } from "./github.ts";
import { SHOWN_SHA, specAdf, specHash, type Envelope } from "./render.ts";

const envelope = (): Envelope => ({
  version: 1,
  spec: exampleSpec(),
  meta: { issue: 12, card: "SD-3", ticket: "guest-filter", model: "claude-opus-5-5", tokens: { input: 1200, output: 900, cacheWrite: 0, cacheRead: 3000 }, costUsd: 0.0306, seconds: 21.4 },
});

describe("ADF", () => {
  it("turns a ticket's markdown into paragraphs, bullet lists and marks", () => {
    const blocks = markdownBlocks("First line\nsecond line.\n\n- one `code`\n- **two**");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "bulletList"]);
    expect(adfText(doc(...blocks))).toBe("First line\nsecond line.\none code\ntwo");
    expect(inline("a `b` c")).toEqual([{ type: "text", text: "a " }, { type: "text", text: "b", marks: [{ type: "code" }] }, { type: "text", text: " c" }]);
  });

  it("never writes an empty text node, which Jira refuses", () => {
    expect(paragraph(text(""), inline("**x**")).type).toBe("paragraph");
    expect(JSON.stringify(doc(paragraph(text(""), inline("``"))))).not.toContain('"text":""');
  });

  it("shows the spec on the card with the hash the approval checks", () => {
    const shown = adfText(specAdf(envelope(), { url: "https://github.com/o/r/issues/12", number: 12 }, { escalated: true }));
    expect(shown).toContain("AC-2 (e2e)\nGiven the rooms in rooms.json\nWhen the visitor chooses 3 guests\nThen exactly Bellver and Badia show");
    expect(shown).toContain("To approve this spec, move the card to Build. To reject it, move it to Done.");
    expect(shown).toContain("4,200 tokens in (3,000 from cache) · 900 out · $0.031 · 21 s · run #12 on GitHub");
    expect(SHOWN_SHA.exec(shown)?.[1]).toBe(specHash(envelope()));
  });
});

describe("names and messages", () => {
  it("reads the card key at the start of a run's title", () => {
    expect(keyOf("SD-12: Filter rooms by number of guests")).toBe("SD-12");
    expect(keyOf("Filter rooms by number of guests")).toBeNull();
  });

  it("explains a failed model call without showing the key", () => {
    expect(modelFailure(401)).toContain("API key is missing or not valid");
    expect(modelFailure(529)).toContain("Move the card back to Ready");
    expect(modelFailure(undefined)).toContain("could not be reached");
  });
});

describe("text in card comments", () => {
  it("reads nested blocks one per line", () => {
    expect(adfText(doc(paragraph(text("a")), paragraph(text("b"))))).toBe("a\nb");
  });
});
