import { cardToWake, signed, wake } from "@/lib/relay";

/**
 * Jira's webhook lands here. A signed status change in the factory's space wakes the Board workflow;
 * everything else gets a 200 so Jira does not retry it. A failed dispatch answers 502, so Jira tries
 * again later (it retries 5xx up to five times).
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (!signed(process.env.JIRA_WEBHOOK_SECRET ?? "", body, request.headers.get("x-hub-signature"))) {
    return Response.json({ error: "bad signature" }, { status: 401 });
  }
  const key = cardToWake(body, { project: process.env.JIRA_PROJECT ?? "", factory: process.env.FACTORY_ACCOUNT_ID });
  if (!key) return Response.json({ woke: null });

  const result = await wake({ token: process.env.GITHUB_DISPATCH_TOKEN ?? "", repo: process.env.GITHUB_REPOSITORY ?? "", key });
  if (!result.ok) {
    console.error(`Dispatching the Board workflow for ${key} failed: ${result.status}`);
    return Response.json({ error: "dispatch failed" }, { status: 502 });
  }
  return Response.json({ woke: key, run: result.runUrl ?? null });
}
