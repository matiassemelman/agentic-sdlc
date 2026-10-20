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

export function guestsLabel(maxGuests: number): string {
  return maxGuests === 1 ? "1 guest" : `Up to ${maxGuests} guests`;
}
