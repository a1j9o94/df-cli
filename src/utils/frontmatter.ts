import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function parseFrontmatter<T = Record<string, unknown>>(
  content: string,
): { data: T; body: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {} as T, body: content };
  }
  const data = parseYaml(match[1]) as T;
  const body = match[2];
  return { data, body };
}

export function serializeFrontmatter(
  data: Record<string, unknown>,
  body: string,
): string {
  const yaml = stringifyYaml(data).trimEnd();
  return `---\n${yaml}\n---\n\n${body}`;
}
