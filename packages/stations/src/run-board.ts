// The factory's single entry, as GitHub Actions runs it after any change on the board:
//   node packages/stations/src/run-board.ts [--key SD-3] [--out out]
// The key only says which card woke the factory up; it reconciles the whole board either way.
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { specModelCall } from "./anthropic.ts";
import { clients, maintainer, required } from "./env.ts";
import { reconcile } from "./factory.ts";

const { values } = parseArgs({ options: { key: { type: "string" }, out: { type: "string", default: "out" } } });
const hint = values.key?.trim() || undefined;
if (hint && !/^[A-Z][A-Z0-9]*-\d+$/.test(hint)) {
  console.error(`Not a card key: ${hint}`);
  process.exit(2);
}

const lines: string[] = [];
const log = (line: string) => {
  console.log(line);
  lines.push(`- ${line}`);
};
const summary = () => {
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Board${hint ? ` (woken by ${hint})` : ""}\n\n${lines.join("\n") || "Nothing to do."}\n`);
};

const out = resolve(values.out);
mkdirSync(out, { recursive: true });
try {
  const { board, record, project } = clients();
  const specs = await reconcile(
    { root: resolve(import.meta.dirname, "../../.."), project, board, record, call: specModelCall(), runUrl: required("RUN_URL"), maintainer: maintainer(), log },
    hint,
  );
  for (const envelope of specs) writeFileSync(join(out, `envelope-${envelope.meta.issue}.json`), `${JSON.stringify(envelope, null, 2)}\n`);
  summary();
} catch (error) {
  log(`Stopped: ${String(error)}`);
  summary();
  console.error(error);
  process.exit(1);
}
