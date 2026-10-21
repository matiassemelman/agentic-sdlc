---
id: price-per-guest
title: Price per guest for each room
context:
  - apps/hotel/data/rooms.json
  - apps/hotel/lib/format.ts
  - apps/hotel/lib/format.test.ts
  - apps/hotel/components/RoomList.tsx
  - apps/hotel/e2e/home.spec.ts
---
Visitors who travel together compare what each of them would pay.

Next to each room's nightly price, show what it comes to for each guest when the room is full: the nightly price divided by the most guests the room sleeps, in the currency the visitor chose, rounded once to a whole euro or dollar. A room for one guest shows no price per guest.
