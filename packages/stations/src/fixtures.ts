import type { Spec } from "./spec.ts";

/** A valid spec for the guest-filter ticket, shared by the tests. */
export function exampleSpec(): Spec {
  return {
    title: "Filter rooms by number of guests",
    summary: "Visitors choose how many guests are staying and see only the rooms that sleep that many.",
    criteria: [
      { id: "AC-1", given: "the page has just loaded", when: "the visitor has not chosen a number of guests", then: "all four rooms show", test: "e2e" },
      { id: "AC-2", given: "the rooms in rooms.json", when: "the visitor chooses 3 guests", then: "exactly Bellver and Badia show", test: "e2e" },
      { id: "AC-3", given: "rooms sleeping 2, 3, 4 and 1", when: "fitting rooms are asked for 4 guests", then: "only the room sleeping 4 is returned", test: "unit" },
    ],
    emptyStates: [{ when: "the visitor chooses 5 or 6 guests", show: "No room sleeps that many guests." }],
    assumptions: ["The choice is a select with the values 1 to 6."],
    outOfScope: ["Remembering the choice between visits."],
    files: ["apps/hotel/lib/rooms.ts", "apps/hotel/lib/rooms.test.ts", "apps/hotel/components/RoomList.tsx", "apps/hotel/e2e/home.spec.ts"],
  };
}
