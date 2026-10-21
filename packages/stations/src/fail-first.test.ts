import { describe, expect, it } from "vitest";
import { acTestsIn, evidenceMarkdown, failFirstTable, judge, playwrightOutcomes, screenshotsIn, vitestOutcomes, type AcTest } from "./fail-first.ts";

const unit: AcTest = { id: "AC-1", file: "apps/hotel/lib/stay.test.ts", kind: "unit" };
const e2e: AcTest = { id: "AC-2", file: "apps/hotel/e2e/stay.spec.ts", kind: "e2e" };
const outcomes = (o: Record<string, "passed" | "failed">) => new Map(Object.entries(o));

describe("fail-first", () => {
  it("finds the criteria a test file names, unit or e2e by the file", () => {
    const source = `it("AC-1: three nights", () => {});\nit('helper', () => {});\ntest.only(\`AC-12: say "Any"\`, async () => {});`;
    expect(acTestsIn("apps/hotel/lib/stay.test.ts", source).map((t) => [t.id, t.kind])).toEqual([["AC-1", "unit"], ["AC-12", "unit"]]);
    expect(acTestsIn("apps/hotel/e2e/stay.spec.ts", source)[0].kind).toBe("e2e");
  });

  it("counts a test file that cannot load on the base code as red for every criterion it names", () => {
    const report = { testResults: [{ name: "/tmp/base/apps/hotel/lib/stay.test.ts", status: "failed", assertionResults: [] }] };
    expect(vitestOutcomes(report, [unit]).get("AC-1")).toBe("failed");
  });

  it("reads Playwright's nested suites, and a spec that failed in one project fails", () => {
    const report = { suites: [{ title: "stay.spec.ts", suites: [{ title: "", specs: [{ title: "AC-2: shows the total", ok: false }] }] }] };
    expect(playwrightOutcomes(report).get("AC-2")).toBe("failed");
  });

  it("passes when every criterion's test is red on the base code and green with the change", () => {
    const result = judge([unit, e2e], outcomes({ "AC-1": "failed", "AC-2": "failed" }), outcomes({ "AC-1": "passed", "AC-2": "passed" }), [
      { id: "AC-1", test: "unit" },
      { id: "AC-2", test: "e2e" },
    ]);
    expect(result.problems).toEqual([]);
    expect(failFirstTable(result)).toContain("| AC-1 | unit · `apps/hotel/lib/stay.test.ts` | ❌ failed | ✅ passed |");
  });

  it("calls out a test that passes on the base code, one that fails with the change, and a criterion without a test", () => {
    const { problems } = judge([unit, e2e], outcomes({ "AC-1": "passed" }), outcomes({ "AC-1": "passed", "AC-2": "failed" }), [
      { id: "AC-1", test: "unit" },
      { id: "AC-2", test: "e2e" },
      { id: "AC-3", test: "unit" },
    ]);
    expect(problems).toEqual([
      "AC-1 passes on the base code too: it would pass even if the change were wrong.",
      "AC-2 fails with the change.",
      "AC-2 did not run on the base code, so nothing shows it can fail.",
      "AC-3 has no test.",
    ]);
  });

  it("keeps each e2e criterion's screenshots by project, and shows them under the table", () => {
    const attachments = (path: string) => [{ attachments: [{ name: "trace" }, { name: "screenshot", path }] }];
    const report = {
      suites: [
        {
          title: "stay.spec.ts",
          specs: [
            { title: "AC-2: shows the total", ok: true, tests: [{ projectName: "desktop", results: attachments("/t/d.png") }, { projectName: "small-iphone", results: attachments("/t/p.png") }] },
            { title: "a helper check", ok: true, tests: [{ projectName: "desktop", results: attachments("/t/x.png") }] },
          ],
        },
      ],
    };
    const shots = screenshotsIn(report);
    expect(shots).toEqual([
      { id: "AC-2", project: "desktop", path: "/t/d.png" },
      { id: "AC-2", project: "small-iphone", path: "/t/p.png" },
    ]);
    const md = evidenceMarkdown(judge([e2e], outcomes({ "AC-2": "failed" }), outcomes({ "AC-2": "passed" })), shots, "https://raw.example/run-16/");
    expect(md).toContain("![AC-2 on small-iphone](https://raw.example/run-16/AC-2-small-iphone.png)");
  });

  it("asks for criterion ids when no test names one", () => {
    expect(judge([], new Map(), new Map()).problems[0]).toMatch(/^No test names a criterion/);
  });
});
