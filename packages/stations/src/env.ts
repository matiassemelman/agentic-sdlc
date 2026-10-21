import { GitHub } from "./github.ts";
import { Jira } from "./jira.ts";

/** Reads a required setting from the environment; the workflow sets these from the `factory` environment. */
export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}: set it in the factory environment (variables or secrets).`);
  return value;
}

/** The Maintainer's Jira account id: cards that need a person are assigned to it. Optional. */
export const maintainer = () => process.env.JIRA_MAINTAINER_ID?.trim() || undefined;

/** The board and the record, as the workflow configures them. */
export function clients(): { board: Jira; record: GitHub; project: string } {
  return {
    board: new Jira({ cloudId: required("JIRA_CLOUD_ID"), email: required("JIRA_EMAIL"), token: required("JIRA_API_TOKEN"), site: required("JIRA_SITE") }),
    record: new GitHub({ token: required("GITHUB_TOKEN"), repo: required("GITHUB_REPOSITORY") }),
    project: required("JIRA_PROJECT"),
  };
}
