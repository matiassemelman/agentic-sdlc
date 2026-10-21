import { describe, expect, it } from "vitest";
import { formatPrice } from "./format";

describe("formatPrice", () => {
  it("AC-1: converts whole euros to whole US dollars at the fixed rate", () => {
    expect(formatPrice(210, "USD")).toBe("$236");
    expect(formatPrice(185, "USD")).toBe("$208");
    expect(formatPrice(260, "USD")).toBe("$292");
    expect(formatPrice(120, "USD")).toBe("$135");
  });

  it("AC-2: formats euros the same with no currency or with euros given", () => {
    expect(formatPrice(210)).toBe("€210");
    expect(formatPrice(1260)).toBe("€1,260");
    expect(formatPrice(210, "EUR")).toBe("€210");
    expect(formatPrice(1260, "EUR")).toBe("€1,260");
    // Euros are one choice among currencies: asking for dollars must not give the euro text.
    expect(formatPrice(210, "USD")).not.toBe(formatPrice(210, "EUR"));
  });
});
