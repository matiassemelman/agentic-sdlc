---
id: stay-total
title: Total price of a stay, with the tourist tax
context:
  - apps/hotel/data/rooms.json
  - apps/hotel/lib/rooms.ts
  - apps/hotel/lib/format.ts
  - apps/hotel/lib/format.test.ts
  - apps/hotel/components/RoomList.tsx
---
Visitors want to know what a stay costs before they write to us.

For each room, let the visitor enter the check-in and check-out dates and the number of adults and children, and show the total for the stay: the room's nightly price for each night, plus the Balearic tourist-stay tax.

The tax, for Hotel Mirador as a 4-star hotel (source: Govern de les Illes Balears, ITS calculator at illessostenibles.travel, checked 2026-10-19):

- €3.00 per adult per night for nights from 1 May to 31 October, and €0.75 for nights from 1 November to 30 April.
- Guests under 16 pay no tax.
- From the ninth night of the same stay, the tax for each night is halved.
- 10% VAT is added to the tax.
