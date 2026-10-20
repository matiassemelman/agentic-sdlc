import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { endpointsOf, scopesOf } from "./jira-scopes.ts";

describe("jira scopes", () => {
  it("finds every call jira.ts makes, including the account lookup that needs its own scope", () => {
    const endpoints = endpointsOf(readFileSync(join(import.meta.dirname, "jira.ts"), "utf8"));
    expect(endpoints).toContainEqual({ method: "GET", path: "/myself" });
    expect(endpoints).toContainEqual({ method: "POST", path: "/issue/{}/transitions" });
    expect(endpoints).toContainEqual({ method: "GET", path: "/issue/{}/comment" });
    expect(endpoints.length).toBeGreaterThanOrEqual(12);
  });

  it("reads the classic scopes from the spec, and flags a call the spec does not have", () => {
    const spec = { paths: { "/rest/api/3/myself": { get: { security: [{ OAuth2: ["read:jira-user"] }] } } } };
    expect(scopesOf(spec, [{ method: "GET", path: "/myself" }, { method: "GET", path: "/nowhere" }])).toEqual([
      { endpoint: { method: "GET", path: "/myself" }, scopes: ["read:jira-user"] },
      { endpoint: { method: "GET", path: "/nowhere" }, scopes: null },
    ]);
  });
});
