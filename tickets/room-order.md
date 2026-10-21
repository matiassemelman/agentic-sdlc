---
id: room-order
title: Sort the rooms by price
context:
  - apps/hotel/data/rooms.json
  - apps/hotel/lib/rooms.ts
  - apps/hotel/lib/rooms.test.ts
  - apps/hotel/components/RoomList.tsx
  - apps/hotel/e2e/home.spec.ts
---
Visitors who compare rooms often look at the price first.

Let the visitor see the rooms in our order or with the lowest price first, with two buttons like the currency switch: "Our order" and "Lowest price first". Our order stays the default, and the choice lasts while the page is open.
