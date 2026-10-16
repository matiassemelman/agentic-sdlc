# Hotel Mirador

A fictional four-room hotel in Santa Catalina, Palma de Mallorca: the product this software factory builds and changes.

- Rooms: `data/rooms.json` (no database).
- Logic: `lib/`, with unit tests beside each module (`pnpm test`).
- Visitor-facing behaviour: `e2e/` (Playwright; `pnpm e2e` runs a local production build, `E2E_BASE_URL` points it at a deployment).
- Design: taste-skill v2, direction "split stage"; tokens in `app/globals.css`.
