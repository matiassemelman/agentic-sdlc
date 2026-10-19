---
id: guest-filter
title: Filter rooms by number of guests
context:
  - apps/hotel/data/rooms.json
  - apps/hotel/lib/rooms.ts
  - apps/hotel/components/Stage.tsx
  - apps/hotel/components/RoomList.tsx
  - apps/hotel/e2e/home.spec.ts
---
Visitors who travel together want to see only the rooms that fit them.

Let the visitor choose how many guests are staying, from 1 to 6, and show only the rooms that sleep at least that many. Before the visitor chooses, every room shows.
