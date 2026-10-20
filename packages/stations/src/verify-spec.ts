// Checks a spec comment before its approval counts:
//   node packages/stations/src/verify-spec.ts comment.md
// Prints the spec's sha256 and exits 0, or prints why it cannot be approved and exits 1.
import { readFileSync } from "node:fs";
import { readSpecComment } from "./render.ts";

const file = process.argv[2];
if (!file) {
  console.error("Usage: verify-spec.ts <comment-file>");
  process.exit(2);
}
const result = readSpecComment(readFileSync(file, "utf8"));
if (!result.ok) {
  console.log(result.reason);
  process.exit(1);
}
console.log(result.sha256);
