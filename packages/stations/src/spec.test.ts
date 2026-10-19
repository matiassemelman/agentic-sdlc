import { describe, expect, it } from "vitest";
import { exampleSpec } from "./fixtures.ts";
import { validateSpec } from "./spec.ts";

describe("validateSpec", () => {
  it("accepts a well-formed spec", () => {
    expect(validateSpec(exampleSpec())).toEqual([]);
  });

  it("requires criteria numbered AC-1, AC-2, ... in order", () => {
    const spec = exampleSpec();
    spec.criteria[1].id = "AC-3";
    expect(validateSpec(spec)).toContain("criterion 2 is AC-3; expected AC-2");
  });

  it("requires 2 to 8 criteria", () => {
    const spec = exampleSpec();
    spec.criteria = spec.criteria.slice(0, 1);
    expect(validateSpec(spec)).toContain("has 1 criteria; needs 2 to 8");
  });

  it("keeps the change inside apps/hotel", () => {
    for (const file of [".github/workflows/gates.yml", "apps/hotel/../factory/x.ts", "apps/hotelx/a.ts", "apps/hotel/"]) {
      const spec = exampleSpec();
      spec.files = [file];
      expect(validateSpec(spec)).toContain(`file ${file} is outside apps/hotel/`);
    }
  });

  it("rejects empty and overlong text", () => {
    const spec = exampleSpec();
    spec.criteria[0].then = " ";
    spec.title = "x".repeat(81);
    expect(validateSpec(spec)).toEqual(expect.arrayContaining(["AC-1 then is empty", "title is longer than 80 characters"]));
  });

  it("requires each criterion to name a unit or e2e test", () => {
    const spec = exampleSpec();
    (spec.criteria[0] as { test: string }).test = "manual";
    expect(validateSpec(spec)).toContain("AC-1 test is manual; expected unit or e2e");
  });

  it("rejects duplicate files", () => {
    const spec = exampleSpec();
    spec.files = ["apps/hotel/lib/rooms.ts", "apps/hotel/lib/rooms.ts"];
    expect(validateSpec(spec)).toContain("files has duplicates");
  });
});
