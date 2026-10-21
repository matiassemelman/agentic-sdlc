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

/** The guest numbers the filter offers. */
export const GUEST_CHOICES = [1, 2, 3, 4, 5, 6];

/** The rooms that sleep at least `guests`, in their order; all of them when no number is given. */
export function filterRooms(rooms: Room[], guests?: number): Room[] {
  return guests === undefined ? rooms : rooms.filter((room) => room.maxGuests >= guests);
}

export function guestCountLabel(guests: number): string {
  return guests === 1 ? "1 guest" : `${guests} guests`;
}

export function guestsLabel(maxGuests: number): string {
  return maxGuests === 1 ? "1 guest" : `Up to ${maxGuests} guests`;
}
