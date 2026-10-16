import { describe, expect, it } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("formats whole euros without decimals", () => {
    expect(formatPrice(210)).toBe("€210");
    expect(formatPrice(1260)).toBe("€1,260");
  });
});
