export const MAX_RUNS_PER_DAY = 20;

export type Admission = { ok: true } | { ok: false; reason: string };

/** Whether the factory takes a new order: one run at a time, and at most MAX_RUNS_PER_DAY in 24 hours. */
export function admit({ activeRuns, runsLast24h }: { activeRuns: number[]; runsLast24h: number }): Admission {
  if (activeRuns.length > 0)
    return { ok: false, reason: `The factory is busy with run #${activeRuns[0]}. One run at a time.` };
  if (runsLast24h >= MAX_RUNS_PER_DAY)
    return { ok: false, reason: `The factory already ran ${runsLast24h} times in the last 24 hours (limit ${MAX_RUNS_PER_DAY}).` };
  return { ok: true };
}
