// Prepares the board, as the Seed board workflow runs it:
//   node packages/stations/src/run-seed.ts              check the columns, add the prepared tickets to Backlog
//   node packages/stations/src/run-seed.ts --adopt 8    also give run #8 (opened before the board) its card
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { STATUS } from "./board.ts";
import { clients } from "./env.ts";
import { adoptRun, seedPrepared } from "./seed.ts";

const { values } = parseArgs({ options: { adopt: { type: "string" } } });
const adopt = values.adopt ? Number(values.adopt) : undefined;
if (adopt !== undefined && (!Number.isInteger(adopt) || adopt < 1)) {
  console.error("Usage: run-seed.ts [--adopt <run issue number>]");
  process.exit(2);
}

const report = (text: string) => {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
};

const { board, record, project } = clients();
const me = await board.me();
report(`### Seed board\n\nActing as ${me.displayName} (account id ${me.accountId}) on ${project}.`);

const present = await board.statuses(project);
const missing = Object.values(STATUS).filter((s) => !present.includes(s));
if (missing.length) {
  report(`The board lacks these statuses: ${missing.join(", ")}. It has: ${present.join(", ")}.`);
  process.exit(1);
}
report("All ten statuses are there.");

const root = resolve(import.meta.dirname, "../../..");
const created = await seedPrepared({ root, board, project });
report(created.length ? `Prepared tickets added to Backlog: ${created.join(", ")}.` : "The prepared tickets were already on the board.");
if (adopt) report(`Run #${adopt} now has its card: ${await adoptRun({ root, board, record, project, number: adopt })}.`);
