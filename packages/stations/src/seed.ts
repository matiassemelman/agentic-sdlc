import * as adf from "./adf.ts";
import { STATUS, stationOf } from "./board.ts";
import type { GitHub } from "./github.ts";
import type { Jira } from "./jira.ts";
import { readSpecComment, specAdf } from "./render.ts";
import { listTicketIds, loadTicket, type Ticket } from "./tickets.ts";

type SeedBoard = Pick<Jira, "cardUrl" | "search" | "create" | "move" | "comment" | "link">;
type SeedRecord = Pick<GitHub, "issue" | "comments" | "retitle" | "comment">;

/** A prepared ticket's card: its text for people to read, and a note that agents read the repository's copy. */
export function ticketCard(ticket: Ticket): { summary: string; description: adf.Adf; labels: string[] } {
  return {
    summary: ticket.title,
    description: adf.doc(
      ...adf.markdownBlocks(ticket.body),
      adf.rule,
      adf.paragraph(
        adf.text("A prepared ticket. The factory reads its text from "),
        adf.code(`tickets/${ticket.id}.md`),
        adf.text(" in the repository; an edit here never reaches an agent. To start it, move the card to Ready."),
      ),
    ),
    labels: [`ticket:${ticket.id}`],
  };
}

/** Puts every prepared ticket in Backlog, unless the board already has an open card for it. */
export async function seedPrepared({ root, board, project }: { root: string; board: SeedBoard; project: string }): Promise<string[]> {
  const created: string[] = [];
  for (const id of listTicketIds(root)) {
    const open = await board.search(`project = "${project}" AND labels = "ticket:${id}" AND status != "${STATUS.done}"`);
    if (open.length) continue;
    created.push(await board.create({ project, ...ticketCard(loadTicket(root, id)) }));
  }
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
  await board.comment(key, specAdf(read.envelope, run));
  await record.retitle(number, `${key}: ${run.title}`);
  await record.comment(number, `This run now has a card on the board: [${key}](${board.cardUrl(key)}). The spec is approved or rejected there.`);
  return key;
}
