import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** One of the fixed tickets in `tickets/`. Its text is the only request a run starts from. */
export type Ticket = { id: string; title: string; context: string[]; body: string };
/** An epic in `tickets/epics/`: prepared tickets filed together, in the order they are built. */
export type Epic = { id: string; title: string; tickets: string[]; body: string };

const ID = /^[a-z][a-z0-9-]*$/;

/** A front matter block between --- lines: one-line fields, and lists of `  - item` lines under a bare field. */
function frontMatter(text: string, what: string): { fields: Record<string, string>; lists: Record<string, string[]>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, "\n"));
  if (!match) throw new Error(`${what} starts with a front matter block between --- lines`);
  const [, head, body] = match;
  const fields: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  let list: string[] | undefined;
  for (const line of head.split("\n")) {
    const item = /^ {2}- (\S+)$/.exec(line);
    if (item && list) {
      list.push(item[1]);
      continue;
    }
    const field = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!field) throw new Error(`Unreadable front matter line: ${line}`);
    list = field[2] ? undefined : (lists[field[1]] = []);
    if (field[2]) fields[field[1]] = field[2];
  }
  return { fields, lists, body: body.trim() };
}

/** Reads a ticket file: a front matter block with id, title and a context list, then the request. */
export function parseTicket(text: string): Ticket {
  const { fields, lists, body } = frontMatter(text, "A ticket");
  const { id, title } = fields;
  const context = lists.context ?? [];
  if (!id || !ID.test(id)) throw new Error(`Ticket id must match ${ID}`);
  if (!title) throw new Error("A ticket needs a title");
  if (context.length === 0) throw new Error("A ticket needs at least one context file");
  return { id, title, context, body };
}

export function listTicketIds(root: string): string[] {
  return readdirSync(join(root, "tickets"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -3))
    .sort();
}

export function loadTicket(root: string, id: string): Ticket {
  if (!ID.test(id)) throw new Error(`Unknown ticket: ${id}`);
  const path = join(root, "tickets", `${id}.md`);
  if (!existsSync(path)) throw new Error(`Unknown ticket: ${id}`);
  const ticket = parseTicket(readFileSync(path, "utf8"));
  if (ticket.id !== id) throw new Error(`tickets/${id}.md declares id ${ticket.id}`);
  return ticket;
}

/** Reads an epic file: a front matter block with id, title and its tickets in order, then the idea. */
export function parseEpic(text: string): Epic {
  const { fields, lists, body } = frontMatter(text, "An epic");
  const { id, title } = fields;
  const tickets = lists.tickets ?? [];
  if (!id || !ID.test(id)) throw new Error(`Epic id must match ${ID}`);
  if (!title) throw new Error("An epic needs a title");
  if (tickets.length === 0) throw new Error("An epic needs at least one of the tickets");
  return { id, title, tickets, body };
}

/** Each ticket an epic names has its file, and belongs to that epic alone, once. */
export function checkEpics(epics: Epic[], ticketIds: string[]): void {
  const owner = new Map<string, string>();
  for (const epic of epics)
    for (const id of epic.tickets) {
      if (!ticketIds.includes(id)) throw new Error(`Epic ${epic.id} names ${id}, which has no tickets/${id}.md`);
      if (owner.has(id)) throw new Error(`${id} is in epic ${owner.get(id)} and again in epic ${epic.id}`);
      owner.set(id, epic.id);
    }
}

/** The epics in `tickets/epics/`, by id, checked against the tickets. */
export function listEpics(root: string): Epic[] {
  const dir = join(root, "tickets", "epics");
  if (!existsSync(dir)) return [];
  const epics = readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => {
      const epic = parseEpic(readFileSync(join(dir, name), "utf8"));
      if (`${epic.id}.md` !== name) throw new Error(`tickets/epics/${name} declares id ${epic.id}`);
      return epic;
    });
  checkEpics(epics, listTicketIds(root));
  return epics;
}
