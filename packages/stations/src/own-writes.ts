import type { RecordApi } from "./factory.ts";
import { relabeled, type RunIssue } from "./github.ts";

/**
 * GitHub's issue list lags behind writes: right after the factory closes a run, the list can still show
 * it open, and a run it just opened can be missing. The factory looks again right after it acts, so this
 * keeps the runs it wrote in this process, as it left them, and lays them over what the list shows.
 */
export function readOwnWrites(record: RecordApi): RecordApi {
  const written = new Map<number, RunIssue>();
  const listed = new Map<number, RunIssue>();
  const keep = (number: number, change: (run: RunIssue) => RunIssue) => {
    const run = written.get(number) ?? listed.get(number);
    if (run) written.set(number, change(run));
  };

  return {
    comment: (number, body) => record.comment(number, body),
    comments: (number) => record.comments(number),
    dispatch: (workflow, inputs) => record.dispatch(workflow, inputs),
    async runs(filter) {
      const runs = await record.runs(filter);
      for (const run of runs) listed.set(run.number, run);
      const merged = new Map(runs.map((r) => [r.number, written.get(r.number) ?? r]));
      for (const run of written.values()) merged.set(run.number, run);
      return [...merged.values()].filter("open" in filter ? (r) => r.open : (r) => r.createdAt >= filter.since);
    },
    async create(issue) {
      const run = await record.create(issue);
      written.set(run.number, { ...run, labels: [...run.labels] });
      return run;
    },
    async relabel(number, change) {
      await record.relabel(number, change);
      keep(number, (run) => ({ ...run, labels: relabeled(run.labels, change) }));
    },
    async close(number, reason) {
      await record.close(number, reason);
      keep(number, (run) => ({ ...run, open: false }));
    },
  };
}
