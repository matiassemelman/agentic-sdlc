import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** One of the fixed tickets in `tickets/`. Its text is the only request a run starts from. */
export type Ticket = { id: string; title: string; context: string[]; body: string };

const ID = /^[a-z][a-z0-9-]*$/;

/** Reads a ticket file: a front matter block with id, title and a context list, then the request. */
export function parseTicket(text: string): Ticket {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text.replace(/\r\n/g, "\n"));
  if (!match) throw new Error("A ticket starts with a front matter block between --- lines");
  const [, head, body] = match;
  const fields: Record<string, string> = {};
  const context: string[] = [];
  let inContext = false;
  for (const line of head.split("\n")) {
    const item = /^ {2}- (\S+)$/.exec(line);
    if (item && inContext) {
      context.push(item[1]);
      continue;
    }
    const field = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!field) throw new Error(`Unreadable front matter line: ${line}`);
    inContext = field[1] === "context";
    if (!inContext) fields[field[1]] = field[2];
  }
  const { id, title } = fields;
  if (!id || !ID.test(id)) throw new Error(`Ticket id must match ${ID}`);
  if (!title) throw new Error("A ticket needs a title");
  if (context.length === 0) throw new Error("A ticket needs at least one context file");
  return { id, title, context, body: body.trim() };
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
