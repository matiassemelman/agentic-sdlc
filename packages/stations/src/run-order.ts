// Admission and the run's issue text, as GitHub Actions runs it:
//   node packages/stations/src/run-order.ts --ticket guest-filter --active '[3]' --recent 2 --actor someone --run-url <url> --out out
// Writes issue-title.txt and issue.md, or refusal.md (and exits 1) when the factory cannot take the order.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { planOrder } from "./order.ts";

const { values } = parseArgs({
  options: {
    ticket: { type: "string" },
    active: { type: "string", default: "[]" },
    recent: { type: "string", default: "0" },
    actor: { type: "string" },
    "run-url": { type: "string" },
    out: { type: "string", default: "out" },
  },
});
const activeRuns: unknown = JSON.parse(values.active);
const runsLast24h = Number(values.recent);
if (!values.ticket || !values.actor || !values["run-url"] || !Array.isArray(activeRuns) || !Number.isInteger(runsLast24h)) {
  console.error("Usage: run-order.ts --ticket <id> --active <json array> --recent <n> --actor <login> --run-url <url> [--out <dir>]");
  process.exit(2);
}

const out = resolve(values.out);
mkdirSync(out, { recursive: true });
const plan = planOrder({
  root: resolve(import.meta.dirname, "../../.."),
  ticketId: values.ticket,
  activeRuns: activeRuns.map(Number),
  runsLast24h,
  actor: values.actor,
  runUrl: values["run-url"],
});
if (!plan.ok) {
  writeFileSync(join(out, "refusal.md"), `${plan.reason}\n`);
  console.error(plan.reason);
  process.exit(1);
}
writeFileSync(join(out, "issue-title.txt"), plan.title);
writeFileSync(join(out, "issue.md"), plan.body);
console.log(`Order taken: ${plan.title}`);
