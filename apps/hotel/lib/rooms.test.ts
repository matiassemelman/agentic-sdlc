import { describe, expect, it } from "vitest";
import { getRooms, guestsLabel } from "./rooms";
import { views } from "./views";

describe("rooms", () => {
  it("has four rooms with unique ids", () => {
    const ids = getRooms().map((r) => r.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it("gives every room a view picture", () => {
    for (const room of getRooms()) expect(views[room.view]).toBeDefined();
  });

  it("hands each caller its own copy", () => {
    const first = getRooms();
    first[0].pricePerNight = 0;
    first.pop();
    expect(getRooms()).toHaveLength(4);
    expect(getRooms()[0].pricePerNight).toBeGreaterThan(0);
  });

  it("labels capacity in words", () => {
    expect(guestsLabel(1)).toBe("1 guest");
    expect(guestsLabel(3)).toBe("Up to 3 guests");
  });
});
