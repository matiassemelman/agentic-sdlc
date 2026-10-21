import rooms from "@/data/rooms.json";

export type Room = {
  id: string;
  name: string;
  view: string;
  pricePerNight: number;
  maxGuests: number;
  sizeM2: number;
  beds: string;
  description: string;
};

/** A fresh copy each call, so a caller that sorts or edits rooms never changes them for everyone. */
export function getRooms(): Room[] {
  return rooms.map((room) => ({ ...room }));
}

export type RoomSort = "ours" | "price-asc";

/** A sorted copy: "ours" is the order of rooms.json, "price-asc" the lowest euro price first. Ties keep the incoming order. */
export function sortRooms(list: Room[], sort: RoomSort): Room[] {
  const ours = new Map(rooms.map((room, i) => [room.id, i]));
  const position = (room: Room) => ours.get(room.id) ?? Infinity;
  const key = (room: Room) => (sort === "price-asc" ? room.pricePerNight : position(room));
  return [...list].sort((a, b) => key(a) - key(b) || 0);
}

export function guestsLabel(maxGuests: number): string {
  return maxGuests === 1 ? "1 guest" : `Up to ${maxGuests} guests`;
}
