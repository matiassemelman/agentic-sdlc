import { describe, expect, it } from "vitest";
import { exampleSpec, unclearSpec } from "./fixtures.ts";
import { specSchema, validateSpec } from "./spec.ts";

describe("specSchema", () => {
  // Seen live on 2026-10-20: KAN-2's spec had more than 8 assumptions, a limit the model was never told.
  it("tells the model every limit validateSpec enforces on a list", () => {
    const { criteria, assumptions, outOfScope, files } = specSchema.properties;
    expect(criteria.description).toContain("2 to 8");
    expect(assumptions.description).toContain("At most 8");
    expect(outOfScope.description).toContain("At most 8");
    expect(files.description).toContain("1 to 12");
  });
});

describe("validateSpec", () => {
  it("accepts a well-formed spec", () => {
    expect(validateSpec(exampleSpec())).toEqual({ hard: [], soft: [] });
  });

  it("counts too many assumptions or out-of-scope items as soft: a person may accept them", () => {
    const spec = unclearSpec();
    spec.outOfScope = Array.from({ length: 9 }, (_, i) => `Not ${i + 1}.`);
    expect(validateSpec(spec)).toEqual({ hard: [], soft: ["9 choices the ticket leaves open (the limit is 8)", "9 things left out of scope (the limit is 8)"] });
  });

  it("requires criteria numbered AC-1, AC-2, ... in order", () => {
    const spec = exampleSpec();
    spec.criteria[1].id = "AC-3";
    expect(validateSpec(spec).hard).toContain("criterion 2 is AC-3; expected AC-2");
  });

  it("requires 2 to 8 criteria", () => {
    const spec = exampleSpec();
    spec.criteria = spec.criteria.slice(0, 1);
    expect(validateSpec(spec).hard).toContain("has 1 criteria; needs 2 to 8");
  });

  it("keeps the change inside apps/hotel", () => {
    for (const file of [".github/workflows/gates.yml", "apps/hotel/../factory/x.ts", "apps/hotelx/a.ts", "apps/hotel/"]) {
      const spec = exampleSpec();
      spec.files = [file];
      expect(validateSpec(spec).hard).toContain(`file ${file} is outside apps/hotel/`);
    }
  });

  it("rejects empty and overlong text", () => {
    const spec = exampleSpec();
    spec.criteria[0].then = " ";
    spec.title = "x".repeat(81);
    expect(validateSpec(spec).hard).toEqual(expect.arrayContaining(["AC-1 then is empty", "title is longer than 80 characters"]));
  });

  it("requires each criterion to name a unit or e2e test", () => {
    const spec = exampleSpec();
    (spec.criteria[0] as { test: string }).test = "manual";
    expect(validateSpec(spec).hard).toContain("AC-1 test is manual; expected unit or e2e");
  });

  it("rejects duplicate files", () => {
    const spec = exampleSpec();
    spec.files = ["apps/hotel/lib/rooms.ts", "apps/hotel/lib/rooms.ts"];
    expect(validateSpec(spec).hard).toContain("files has duplicates");
  });
});
