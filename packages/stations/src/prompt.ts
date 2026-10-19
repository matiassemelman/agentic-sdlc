import type { Ticket } from "./tickets.ts";

export type ContextFile = { path: string; text: string };

const FENCE: Record<string, string> = { ts: "ts", tsx: "tsx", json: "json", css: "css", md: "md" };

/** Drops a skill's front matter, which is for the agent runtime, not for the model. */
export function skillBody(skill: string): string {
  return skill.replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
}

/**
 * The spec station's prompt. The system part (skill + AGENTS.md) is the same for every run, so it can
 * be cached; the user part is the ticket and the code it starts from.
 */
export function buildSpecPrompt({ skill, agents, ticket, issue, files }: {
  skill: string;
  agents: string;
  ticket: Ticket;
  issue: number;
  files: ContextFile[];
}): { system: string; user: string } {
  const system = `${skillBody(skill)}\n\n# The repository's AGENTS.md\n\n${agents.trim()}`;
  const code = files
    .map((f) => `## ${f.path}\n\n\`\`\`${FENCE[f.path.split(".").pop() ?? ""] ?? ""}\n${f.text.trimEnd()}\n\`\`\``)
    .join("\n\n");
  const user = `# Ticket #${issue}: ${ticket.title}\n\n${ticket.body}\n\n# The code this change starts from\n\n${code}`;
  return { system, user };
}
