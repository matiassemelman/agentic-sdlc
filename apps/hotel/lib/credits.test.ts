import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pictures from "@/data/picture-credits.json";
import { credits } from "./credits";

describe("credits", () => {
  it("credits every picture file the record lists, and each file exists", () => {
    expect(credits).toHaveLength(pictures.length);
    for (const p of pictures) expect(existsSync(new URL(`../${p.file}`, import.meta.url))).toBe(true);
  });

  it("names the creator and links the source page and the licence", () => {
    for (const c of credits) {
      expect(c.creator).not.toBe("");
      expect(c.page).toMatch(/^https:\/\//);
      expect(c.licenceUrl).toMatch(/^https:\/\/creativecommons\.org\//);
    }
  });
});
