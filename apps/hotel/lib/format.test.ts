import { describe, expect, it } from "vitest";
import { formatPrice, formatPricePerGuest } from "./format";
import { getRooms } from "./rooms";

describe("formatPrice", () => {
  it("converts whole euros to whole US dollars at the fixed rate", () => {
    expect(formatPrice(210, "USD")).toBe("$236");
    expect(formatPrice(185, "USD")).toBe("$208");
    expect(formatPrice(260, "USD")).toBe("$292");
    expect(formatPrice(120, "USD")).toBe("$135");
  });

  it("formats euros the same with no currency or with euros given", () => {
    expect(formatPrice(210)).toBe("€210");
    expect(formatPrice(1260)).toBe("€1,260");
    expect(formatPrice(210, "EUR")).toBe("€210");
    expect(formatPrice(1260, "EUR")).toBe("€1,260");
    // Euros are one choice among currencies: asking for dollars must not give the euro text.
    expect(formatPrice(210, "USD")).not.toBe(formatPrice(210, "EUR"));
  });
});

describe("formatPricePerGuest", () => {
  const perGuest = (id: string, currency?: "EUR" | "USD") => {
    const room = getRooms().find((r) => r.id === id)!;
    return formatPricePerGuest(room.pricePerNight, room.maxGuests, currency);
  };

  it("AC-1: divides the euro price by the most guests, rounded once", () => {
    expect(perGuest("la-seu", "EUR")).toBe("€105");
    expect(perGuest("bellver", "EUR")).toBe("€62");
    expect(perGuest("badia", "EUR")).toBe("€65");
    expect(perGuest("la-seu")).toBe("€105");
  });

  it("AC-2: converts and divides before rounding once in US dollars", () => {
    expect(perGuest("la-seu", "USD")).toBe("$118");
    expect(perGuest("bellver", "USD")).toBe("$69");
    expect(perGuest("badia", "USD")).toBe("$73");
  });

  it("AC-3: gives nothing for a room that sleeps one guest", () => {
    expect(perGuest("tramuntana", "EUR")).toBeUndefined();
    expect(perGuest("tramuntana", "USD")).toBeUndefined();
  });
});
