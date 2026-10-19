---
id: usd-prices
title: Prices in euros or US dollars
context:
  - apps/hotel/data/rooms.json
  - apps/hotel/lib/format.ts
  - apps/hotel/lib/format.test.ts
  - apps/hotel/components/RoomList.tsx
  - apps/hotel/e2e/home.spec.ts
---
Many visitors think in US dollars.

Let the visitor switch every price on the page between euros and US dollars. Euros stay the default.

Use a fixed rate kept in the repository: 1 EUR = 1.1225 USD, the European Central Bank reference rate of 19 October 2026. Near the switch, say that dollar prices are approximate and converted at that rate. Show dollar prices in whole dollars.
