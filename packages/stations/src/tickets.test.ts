import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { listTicketIds, loadTicket, parseTicket } from "./tickets.ts";

const root = resolve(import.meta.dirname, "../../..");

describe("tickets", () => {
  it("has the three prepared tickets, each with context files that exist", () => {
    expect(listTicketIds(root)).toEqual(["guest-filter", "stay-total", "usd-prices"]);
    for (const id of listTicketIds(root)) {
      const ticket = loadTicket(root, id);
      expect(ticket.body.length).toBeGreaterThan(50);
      for (const path of ticket.context) expect(existsSync(join(root, path)), path).toBe(true);
    }
  });

  it("refuses ids that could leave the tickets folder", () => {
    expect(() => loadTicket(root, "../AGENTS")).toThrow(/Unknown ticket/);
    expect(() => loadTicket(root, "no-such-ticket")).toThrow(/Unknown ticket/);
  });

  it("reads the front matter and the request", () => {
    const ticket = parseTicket("---\nid: demo\ntitle: A demo\ncontext:\n  - apps/hotel/lib/rooms.ts\n---\n\nDo the thing.\n");
    expect(ticket).toEqual({ id: "demo", title: "A demo", context: ["apps/hotel/lib/rooms.ts"], body: "Do the thing." });
  });

  it("refuses a ticket without context files", () => {
    expect(() => parseTicket("---\nid: demo\ntitle: A demo\n---\nDo it.")).toThrow(/context/);
  });
});
