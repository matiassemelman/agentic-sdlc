// Atlassian Document Format: the JSON that Jira comments and descriptions are written in.
// Only the few nodes the factory needs: paragraphs, headings, bullet lists, rules, and text marks.

type Mark = { type: "strong" } | { type: "code" } | { type: "link"; attrs: { href: string } };
export type Inline = { type: "text"; text: string; marks?: Mark[] } | { type: "hardBreak" };
export type Block =
  | { type: "paragraph"; content: Inline[] }
  | { type: "heading"; attrs: { level: number }; content: Inline[] }
  | { type: "bulletList"; content: { type: "listItem"; content: Block[] }[] }
  | { type: "rule" };
export type Adf = { type: "doc"; version: 1; content: Block[] };

// Jira refuses an empty text node, so empty strings are dropped.
export const text = (value: string, ...marks: Mark[]): Inline[] => (value ? [{ type: "text", text: value, ...(marks.length ? { marks } : {}) }] : []);
export const strong = (value: string) => text(value, { type: "strong" });
export const code = (value: string) => text(value, { type: "code" });
export const link = (value: string, href: string) => text(value, { type: "link", attrs: { href } });
export const lineBreak: Inline = { type: "hardBreak" };

export const paragraph = (...parts: (Inline | Inline[])[]): Block => ({ type: "paragraph", content: parts.flat() });
export const heading = (level: number, value: string): Block => ({ type: "heading", attrs: { level }, content: text(value) });
export const bullets = (items: Inline[][]): Block => ({
  type: "bulletList",
  content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
});
export const rule: Block = { type: "rule" };
export const doc = (...content: Block[]): Adf => ({ type: "doc", version: 1, content });

/** Inline markdown the tickets use: `code` and **bold**. Everything else stays plain text. */
export function inline(markdown: string): Inline[] {
  return markdown
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/)
    .flatMap((part) => (part.startsWith("`") && part.endsWith("`") && part.length > 1 ? code(part.slice(1, -1)) : part.startsWith("**") && part.endsWith("**") && part.length > 3 ? strong(part.slice(2, -2)) : text(part)));
}

/** A ticket's markdown body as ADF: paragraphs and "- " bullet lists. */
export function markdownBlocks(markdown: string): Block[] {
  return markdown
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((line) => line.startsWith("- "))) return bullets(lines.map((line) => inline(line.slice(2))));
      return paragraph(lines.flatMap((line, i) => (i ? [lineBreak, ...inline(line)] : inline(line))));
    });
}

type Node = { type?: string; text?: string; content?: Node[] };

/** The plain text of an ADF document, one line per block: what a person reads, without the formatting. */
export function adfText(node: Node | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const inner = (node.content ?? []).map(adfText);
  const isInline = (node.content ?? []).every((child) => child.type === "text" || child.type === "hardBreak");
  return inner.join(isInline ? "" : "\n");
}
