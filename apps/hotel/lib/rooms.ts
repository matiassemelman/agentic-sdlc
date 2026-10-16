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

export function getRooms(): Room[] {
  return rooms;
}

export function guestsLabel(maxGuests: number): string {
  return maxGuests === 1 ? "1 guest" : `Up to ${maxGuests} guests`;
}
