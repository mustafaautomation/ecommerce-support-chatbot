import fs from "node:fs";
import path from "node:path";

export type Article = {
  slug: string;
  title: string;
  sections: { heading: string; body: string }[];
};

export type KbFile = {
  file: string;
  slug: string;
  title: string;
  section: string;
  body: string;
};

function kbDir(): string {
  return path.join(process.cwd(), "kb");
}

function parseFile(file: string, raw: string): KbFile {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Missing front matter in kb/${file}`);
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const split = line.indexOf(":");
    if (split === -1) continue;
    meta[line.slice(0, split).trim()] = line.slice(split + 1).trim();
  }
  return {
    file,
    slug: meta.slug,
    title: meta.title,
    section: meta.section,
    body: match[2].trim(),
  };
}

export function loadKbFiles(): KbFile[] {
  return fs
    .readdirSync(kbDir())
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => parseFile(file, fs.readFileSync(path.join(kbDir(), file), "utf8")));
}

function groupArticles(files: KbFile[]): Article[] {
  const order: string[] = [];
  const bySlug = new Map<string, Article>();
  for (const file of files) {
    let article = bySlug.get(file.slug);
    if (!article) {
      article = { slug: file.slug, title: file.title, sections: [] };
      bySlug.set(file.slug, article);
      order.push(file.slug);
    }
    article.sections.push({ heading: file.section, body: file.body });
  }
  return order.map((slug) => bySlug.get(slug)!);
}

export const KB_FILES = loadKbFiles();
export const ARTICLES: Article[] = groupArticles(KB_FILES);

export function articleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

export function articleText(slug: string): string {
  const article = articleBySlug(slug);
  if (!article) return "";
  return article.sections.map((section) => section.body).join(" ");
}
