import { describe, expect, it } from "vitest";
import { getRooms, guestsLabel, sortRooms, type Room } from "./rooms";
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

  it("AC-1: sorts the rooms with the lowest price first", () => {
    const sorted = sortRooms(getRooms(), "price-asc");
    expect(sorted.map((r) => r.id)).toEqual(["tramuntana", "bellver", "la-seu", "badia"]);
    expect(sorted.map((r) => r.pricePerNight)).toEqual([120, 185, 210, 260]);
    expect(getRooms()[0].id).toBe("la-seu");
  });

  it("AC-2: gives back our order, the order of rooms.json", () => {
    const byPrice = sortRooms(getRooms(), "price-asc");
    expect(sortRooms(byPrice, "ours").map((r) => r.id)).toEqual(["la-seu", "bellver", "badia", "tramuntana"]);
    expect(sortRooms(getRooms(), "ours").map((r) => r.id)).toEqual(["la-seu", "bellver", "badia", "tramuntana"]);
  });

  it("AC-3: keeps the order of rooms with the same price, and an empty list empty", () => {
    const [a, b] = getRooms();
    const twins: Room[] = [
      { ...a, id: "first", pricePerNight: 100 },
      { ...b, id: "second", pricePerNight: 100 },
    ];
    expect(sortRooms(twins, "price-asc").map((r) => r.id)).toEqual(["first", "second"]);
    expect(sortRooms([...twins].reverse(), "price-asc").map((r) => r.id)).toEqual(["second", "first"]);
    expect(sortRooms([], "price-asc")).toEqual([]);
    expect(sortRooms([], "ours")).toEqual([]);
  });

  it("labels capacity in words", () => {
    expect(guestsLabel(1)).toBe("1 guest");
    expect(guestsLabel(3)).toBe("Up to 3 guests");
  });
});
