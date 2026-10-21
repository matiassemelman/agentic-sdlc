/** A spec as the spec station returns it. Criterion ids (AC-1, AC-2, ...) are reused by tests, the eval and the panel. */
export type Criterion = { id: string; given: string; when: string; then: string; test: "unit" | "e2e" };
export type Spec = {
  title: string;
  summary: string;
  criteria: Criterion[];
  emptyStates: { when: string; show: string }[];
  assumptions: string[];
  outOfScope: string[];
  files: string[];
};

const text = (description: string) => ({ type: "string", description }) as const;
const list = (description: string) => ({ type: "array", description, items: { type: "string" } }) as const;

/** The limits validateSpec enforces. The schema's descriptions state them, since the model reads only those. */
const LIMITS = { title: 80, field: 400, summary: 700, criteria: [2, 8], files: [1, 12], items: 8 } as const;

/** The JSON schema the model must follow (structured outputs). Limits the schema cannot express live in validateSpec. */
export const specSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "criteria", "emptyStates", "assumptions", "outOfScope", "files"],
  properties: {
    title: text(`The change in a few words, as the visitor would name it. At most ${LIMITS.title} characters.`),
    summary: text(`One short paragraph: what changes for the visitor, in plain words. At most ${LIMITS.summary} characters.`),
    criteria: {
      type: "array",
      description: `${LIMITS.criteria[0]} to ${LIMITS.criteria[1]} acceptance criteria, numbered AC-1, AC-2, ... in order.`,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "given", "when", "then", "test"],
        properties: {
          id: text("AC-1 for the first criterion, AC-2 for the second, and so on."),
          given: text("The starting situation, with concrete values."),
          when: text("The one thing the visitor (or the code) does."),
          then: text("The observable result, with exact expected values."),
          test: { type: "string", enum: ["unit", "e2e"], description: "unit for logic in lib/, e2e for what a visitor sees." },
        },
      },
    },
    emptyStates: {
      type: "array",
      description: "What the page shows when the change leaves a list or a result empty or invalid. Empty only if nothing can be empty.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["when", "show"],
        properties: { when: text("The situation."), show: text("The exact text or state the visitor sees.") },
      },
    },
    assumptions: list(
      `Choices the spec makes where the ticket is silent. The product owner approves these too. At most ${LIMITS.items}: ` +
        "the choices that change what the visitor sees or what a test asserts.",
    ),
    outOfScope: list(`What a reader might expect from this ticket that the change will not do. At most ${LIMITS.items}.`),
    files: list(`${LIMITS.files[0]} to ${LIMITS.files[1]} files under apps/hotel/ the change will add or modify, tests included.`),
  },
} as const;

const FILE = /^apps\/hotel\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;

/**
 * Every problem with a spec that the schema cannot catch, by weight. A hard one means the spec cannot be
 * built. A soft one means the ticket left too much open: a person may still accept the spec as it is.
 */
export function validateSpec(spec: Spec): { hard: string[]; soft: string[] } {
  const problems: string[] = [];
  const soft: string[] = [];
  const filled = (value: string, name: string, max: number = LIMITS.field) => {
    if (!value.trim()) problems.push(`${name} is empty`);
    else if (value.length > max) problems.push(`${name} is longer than ${max} characters`);
  };

  filled(spec.title, "title", LIMITS.title);
  if (spec.title.includes("\n")) problems.push("title has a line break");
  filled(spec.summary, "summary", LIMITS.summary);

  const [minCriteria, maxCriteria] = LIMITS.criteria;
  if (spec.criteria.length < minCriteria || spec.criteria.length > maxCriteria)
    problems.push(`has ${spec.criteria.length} criteria; needs ${minCriteria} to ${maxCriteria}`);
  spec.criteria.forEach((c, i) => {
    const expected = `AC-${i + 1}`;
    if (c.id !== expected) problems.push(`criterion ${i + 1} is ${c.id}; expected ${expected}`);
    filled(c.given, `${expected} given`);
    filled(c.when, `${expected} when`);
    filled(c.then, `${expected} then`);
    // The SDK's schema transform turns this enum into a hint, so it is checked here.
    if (c.test !== "unit" && c.test !== "e2e") problems.push(`${expected} test is ${c.test}; expected unit or e2e`);
  });

  spec.emptyStates.forEach((s, i) => {
    filled(s.when, `empty state ${i + 1} when`);
    filled(s.show, `empty state ${i + 1} show`);
  });
  // Soft problems go to a person as they are, so they read as plain words.
  const lists = [
    ["assumptions", spec.assumptions, "choices the ticket leaves open"],
    ["outOfScope", spec.outOfScope, "things left out of scope"],
  ] as const;
  for (const [name, items, what] of lists) {
    if (items.length > LIMITS.items) soft.push(`${items.length} ${what} (the limit is ${LIMITS.items})`);
    items.forEach((item, i) => filled(item, `${name} ${i + 1}`));
  }

  const [minFiles, maxFiles] = LIMITS.files;
  if (spec.files.length < minFiles || spec.files.length > maxFiles)
    problems.push(`lists ${spec.files.length} files; needs ${minFiles} to ${maxFiles}`);
  for (const file of spec.files)
    if (!FILE.test(file) || file.split("/").includes("..")) problems.push(`file ${file} is outside apps/hotel/`);
  if (new Set(spec.files).size !== spec.files.length) problems.push("files has duplicates");

  return { hard: problems, soft };
}
