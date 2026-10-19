import { admit } from "./admission.ts";
import { loadTicket } from "./tickets.ts";

export type OrderPlan = { ok: true; title: string; body: string } | { ok: false; reason: string };

/** Decides whether an order is taken and, if so, the run's issue: the ticket's fixed text and who ordered it. */
export function planOrder({ root, ticketId, activeRuns, runsLast24h, actor, runUrl }: {
  root: string;
  ticketId: string;
  activeRuns: number[];
  runsLast24h: number;
  actor: string;
  runUrl: string;
}): OrderPlan {
  const ticket = loadTicket(root, ticketId);
  const admission = admit({ activeRuns, runsLast24h });
  if (!admission.ok) return admission;
  const body =
    `${ticket.body}\n\n---\n` +
    `<sub>Ordered by @${actor} with the [Order a ticket](${runUrl}) workflow. ` +
    `Fixed ticket text: \`tickets/${ticket.id}.md\`. Next station: the spec.</sub>\n`;
  return { ok: true, title: ticket.title, body };
}
