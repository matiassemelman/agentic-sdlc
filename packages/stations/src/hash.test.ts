import { describe, expect, it } from "vitest";
import { canonicalJson, sha256 } from "./hash.ts";

describe("canonicalJson", () => {
  it("sorts keys at every level and keeps array order", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, 1], c: null } })).toBe('{"a":{"c":null,"d":[2,1]},"b":1}');
  });

  it("gives equal values the same hash whatever their key order", () => {
    expect(sha256(canonicalJson({ x: 1, y: 2 }))).toBe(sha256(canonicalJson({ y: 2, x: 1 })));
  });
});
