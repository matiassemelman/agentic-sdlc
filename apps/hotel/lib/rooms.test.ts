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

  it("labels capacity in words", () => {
    expect(guestsLabel(1)).toBe("1 guest");
    expect(guestsLabel(3)).toBe("Up to 3 guests");
  });
});
