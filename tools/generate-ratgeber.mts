/**
 * Generiert aus den Markdown-Beiträgen in src/content/ratgeber/*.md das TS-Modul
 * src/app/content/ratgeber-articles.ts (Frontmatter + gerendertes HTML).
 *
 * Ausführen:  npm run generate:ratgeber   (bzw. npx tsx tools/generate-ratgeber.mts)
 *
 * Neuen Beitrag anlegen = neue .md-Datei + dieses Skript laufen lassen. Angulars
 * esbuild-Build kann Markdown nicht direkt globben, daher dieser Codegen-Schritt
 * (analog tools/generate-catalog-seed.mts).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import type { RatgeberArticle } from '../src/app/models/ratgeber.model';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '../src/content/ratgeber');
const outPath = resolve(here, '../src/app/content/ratgeber-articles.ts');

/** Minimaler Frontmatter-Parser für unsere eigenen, einfachen Felder. */
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    throw new Error('Kein Frontmatter-Block (--- … ---) gefunden.');
  }
  const meta: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([a-zA-Z]+):\s*(.*)$/.exec(line.trim());
    if (kv) {
      meta[kv[1]] = kv[2].trim();
    }
  }
  return { meta, body: match[2] };
}

function unquote(value: string): string {
  return value.replace(/^["']|["']$/g, '').trim();
}

function parseTags(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((t) => unquote(t))
    .filter(Boolean);
}

function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const files = readdirSync(contentDir)
  .filter((name) => name.endsWith('.md'))
  .sort();

const articles: RatgeberArticle[] = files.map((file) => {
  const raw = readFileSync(resolve(contentDir, file), 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const slug = file.replace(/\.md$/, '');
  const title = unquote(meta['title'] ?? '');
  const description = unquote(meta['description'] ?? '');
  if (!title || !description) {
    throw new Error(`${file}: title und description sind im Frontmatter Pflicht.`);
  }
  const html = marked.parse(body, { async: false }) as string;
  return {
    slug,
    title,
    description,
    date: unquote(meta['date'] ?? ''),
    tags: parseTags(meta['tags']),
    html,
    readingMinutes: readingMinutes(html)
  };
});

// Neueste zuerst (für die Übersicht).
articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title, 'de')));

const out = `// AUTO-GENERIERT von tools/generate-ratgeber.mts – NICHT von Hand bearbeiten.
// Quelle: src/content/ratgeber/*.md  ·  Neu generieren: npm run generate:ratgeber
import type { RatgeberArticle } from '../models/ratgeber.model';

export const RATGEBER_ARTICLES: RatgeberArticle[] = ${JSON.stringify(articles, null, 2)};
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, out, 'utf8');
console.log(`Ratgeber: ${articles.length} Beitrag/Beiträge → ${outPath}`);
