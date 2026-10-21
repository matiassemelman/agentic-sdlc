import * as adf from "./adf.ts";
import { STATUS, stationOf } from "./board.ts";
import type { GitHub } from "./github.ts";
import { CARD_TYPE, type Jira } from "./jira.ts";
import { readSpecComment, specAdf } from "./render.ts";
import { listEpics, listTicketIds, loadTicket, type Epic, type Ticket } from "./tickets.ts";

type SeedBoard = Pick<Jira, "cardUrl" | "search" | "create" | "move" | "comment" | "link">;
type SeedRecord = Pick<GitHub, "issue" | "comments" | "retitle" | "comment">;

/**
 * Whether the board can run the factory: the work type cards are made of uses every status in STATUS by
 * name. Jira translates its built-in statuses into the reader's language, so a factory account that
 * reads Jira in another language misses some; the report says so instead of only listing them.
 */
export function checkBoard(types: { type: string; subtask: boolean; statuses: string[] }[], locale = ""): { ok: boolean; report: string[] } {
  const card = types.find((t) => !t.subtask && CARD_TYPE.test(t.type));
  if (!card) return { ok: false, report: [`The space has no Task work type. It has: ${types.map((t) => t.type).join(", ")}.`] };
  const missing = Object.values(STATUS).filter((s) => !card.statuses.includes(s));
  const report: string[] = [];
  const english = !locale || locale.toLowerCase().startsWith("en");
  if (!english) report.push(`The factory's account reads Jira in ${locale}, and Jira translates its built-in statuses for it. Set that account's language to English.`);
  if (missing.length) report.push(`The ${card.type} workflow lacks these statuses: ${missing.join(", ")}. It has: ${card.statuses.join(", ")}.`);
  else report.push(`The ${card.type} workflow has all ${Object.values(STATUS).length} statuses.`);
  return { ok: missing.length === 0, report };
}

/** A prepared ticket's card: its text for people to read, and a note that agents read the repository's copy. */
export function ticketCard(ticket: Ticket, epic?: Epic): { summary: string; description: adf.Adf; labels: string[] } {
  const start = epic
    ? ` It is one of the ${epic.tickets.length} tickets of the epic "${epic.title}": moving it to Ready queues the others of the epic behind it.`
    : " To start it, move the card to Ready.";
  return {
    summary: ticket.title,
    description: adf.doc(
      ...adf.markdownBlocks(ticket.body),
      adf.rule,
      adf.paragraph(
        adf.text("A prepared ticket. The factory reads its text from "),
        adf.code(`tickets/${ticket.id}.md`),
        adf.text(` in the repository; an edit here never reaches an agent.${start}`),
      ),
    ),
    labels: [`ticket:${ticket.id}`],
  };
}

/** An epic's card: the idea, and the order its tickets are built in. */
export function epicCard(epic: Epic): { summary: string; description: adf.Adf; labels: string[] } {
  return {
    summary: epic.title,
    description: adf.doc(
      ...adf.markdownBlocks(epic.body),
      adf.rule,
      adf.paragraph(
        adf.text("An epic of prepared tickets, from "),
        adf.code(`tickets/epics/${epic.id}.md`),
        adf.text(`, built in this order: ${epic.tickets.join(", ")}. Moving any of its cards to Ready queues the others behind it.`),
      ),
    ),
    labels: [`epic:${epic.id}`],
  };
}

/**
 * Puts every prepared ticket in Backlog, unless the board already has an open card for it. An epic's tickets
 * go first, under the epic's card and in the epic's order, so their keys keep that order.
 */
export async function seedPrepared({ root, board, project }: { root: string; board: SeedBoard; project: string }): Promise<string[]> {
  const created: string[] = [];
  const open = async (label: string) => (await board.search(`project = "${project}" AND labels = "${label}" AND status != "${STATUS.done}"`))[0]?.key;
  const add = async (id: string, epic?: { card: string; epic: Epic }) => {
    if (await open(`ticket:${id}`)) return;
    created.push(await board.create({ project, ...ticketCard(loadTicket(root, id), epic?.epic), ...(epic ? { parent: epic.card } : {}) }));
  };
  const epics = listEpics(root);
  for (const epic of epics) {
    let card = await open(`epic:${epic.id}`);
    if (!card) created.push((card = await board.create({ project, ...epicCard(epic), epic: true })));
    for (const id of epic.tickets) await add(id, { card, epic });
  }
  const filed = new Set(epics.flatMap((e) => e.tickets));
  for (const id of listTicketIds(root).filter((id) => !filed.has(id))) await add(id);
  return created;
}

/**
 * Gives a run opened before the board its card: a card in Spec review that shows the run's spec, and
 * the card's key at the start of the run's title. The approval then happens on the board.
 */
export async function adoptRun({ root, board, record, project, number }: { root: string; board: SeedBoard; record: SeedRecord; project: string; number: number }): Promise<string> {
  const run = await record.issue(number);
  if (!run.open || !run.labels.includes("run")) throw new Error(`#${number} is not an open run`);
  if (run.key) throw new Error(`#${number} already has a card: ${run.key}`);
  if (stationOf(run.labels) !== "station:spec-approval") throw new Error(`#${number} is not waiting for its spec to be approved`);
  const posted = (await record.comments(number)).filter((c) => c.author === "github-actions[bot]" && c.body.includes("<!-- factory:spec v1")).at(-1);
  const read = posted ? readSpecComment(posted.body) : ({ ok: false, reason: "no spec" } as const);
  if (!read.ok) throw new Error(`#${number} has no valid spec: ${read.reason}`);

  const key = await board.create({ project, ...ticketCard(loadTicket(root, read.envelope.meta.ticket)) });
  await board.move(key, STATUS.specReview);
  await board.link(key, run.url, `Run #${number} on GitHub`);
  await board.comment(key, specAdf(read.envelope, run, { escalated: true }));
  await record.retitle(number, `${key}: ${run.title}`);
  await record.comment(number, `This run now has a card on the board: [${key}](${board.cardUrl(key)}). The spec is approved or rejected there.`);
  return key;
}
