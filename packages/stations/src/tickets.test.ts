import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkEpics, listEpics, listTicketIds, loadTicket, parseEpic, parseTicket } from "./tickets.ts";

const root = resolve(import.meta.dirname, "../../..");

describe("tickets", () => {
  it("has the five prepared tickets, each with context files that exist", () => {
    expect(listTicketIds(root)).toEqual(["guest-filter", "price-per-guest", "room-order", "stay-total", "usd-prices"]);
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

describe("epics", () => {
  it("has the compare-rooms epic, its tickets in the order they are built", () => {
    expect(listEpics(root)).toEqual([
      { id: "compare-rooms", title: "Make the rooms easier to compare", tickets: ["room-order", "price-per-guest"], body: expect.stringContaining("compare") },
    ]);
  });

  it("reads the front matter, keeping the tickets in their order", () => {
    const epic = parseEpic("---\nid: demo\ntitle: A demo\ntickets:\n  - second\n  - first\n---\n\nThe idea.\n");
    expect(epic).toEqual({ id: "demo", title: "A demo", tickets: ["second", "first"], body: "The idea." });
  });

  it("refuses an epic without tickets", () => {
    expect(() => parseEpic("---\nid: demo\ntitle: A demo\n---\nThe idea.")).toThrow(/tickets/);
  });

  it("refuses an epic that names a ticket with no file", () => {
    const epic = { id: "demo", title: "A demo", tickets: ["room-order", "no-such-ticket"], body: "" };
    expect(() => checkEpics([epic], ["room-order"])).toThrow(/no-such-ticket/);
  });

  it("refuses a ticket in two epics, or twice in one", () => {
    const one = { id: "one", title: "One", tickets: ["room-order"], body: "" };
    const two = { id: "two", title: "Two", tickets: ["room-order"], body: "" };
    expect(() => checkEpics([one, two], ["room-order"])).toThrow(/room-order/);
    expect(() => checkEpics([{ ...one, tickets: ["room-order", "room-order"] }], ["room-order"])).toThrow(/room-order/);
  });
});
