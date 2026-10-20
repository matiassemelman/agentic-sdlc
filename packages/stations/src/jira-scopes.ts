// The API token scopes the factory needs, read from Jira's official API spec for every endpoint that
// jira.ts calls. Run it before asking a person for a token, and after adding a call:
//   node packages/stations/src/jira-scopes.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SPEC = "https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json";

export type Endpoint = { method: string; path: string };

/** The method and path of every call in jira.ts, with ${...} parts and query strings normalised away. */
export function endpointsOf(source: string): Endpoint[] {
  const found = new Map<string, Endpoint>();
  for (const [, method, raw] of source.matchAll(/"(GET|POST|PUT|PATCH|DELETE)",\s*(`[^`]*`|"[^"]*")/g)) {
    const path = raw.slice(1, -1).split("?")[0].replace(/\$\{[^}]*\}/g, "{}");
    found.set(`${method} ${path}`, { method, path });
  }
  return [...found.values()];
}

type Spec = { paths: Record<string, Record<string, { security?: Record<string, string[]>[] }>> };

/** The classic scopes the spec lists for each endpoint; null when the spec has no such endpoint. */
export function scopesOf(spec: Spec, endpoints: Endpoint[]): { endpoint: Endpoint; scopes: string[] | null }[] {
  const normalise = (path: string) => path.replace(/^\/rest\/api\/3/, "").replace(/\{[^}]*\}/g, "{}");
  const byPath = new Map(Object.entries(spec.paths).map(([path, ops]) => [normalise(path), ops]));
  return endpoints.map((endpoint) => {
    const op = byPath.get(endpoint.path)?.[endpoint.method.toLowerCase()];
    return { endpoint, scopes: op ? (op.security ?? []).flatMap((s) => s.OAuth2 ?? []) : null };
  });
}

if (import.meta.main) {
  const endpoints = endpointsOf(readFileSync(join(import.meta.dirname, "jira.ts"), "utf8"));
  const spec = (await (await fetch(SPEC)).json()) as Spec;
  const rows = scopesOf(spec, endpoints);
  for (const { endpoint, scopes } of rows) console.log(`${endpoint.method.padEnd(6)} ${endpoint.path.padEnd(40)} ${scopes ? scopes.join(", ") : "NOT IN THE SPEC"}`);
  console.log(`\nToken scopes: ${[...new Set(rows.flatMap((r) => r.scopes ?? []))].sort().join(", ")}`);
  if (rows.some((r) => !r.scopes)) process.exit(1);
}
