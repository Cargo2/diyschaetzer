/**
 * Generiert aus den Markdown-Inhalten die TS-Module:
 *   - src/content/ratgeber/*.md  → src/app/content/ratgeber-articles.ts
 *   - src/content/kosten/*.md    → src/app/content/cost-pages.ts
 * und schreibt public/sitemap.xml (Startseite, Ratgeber, Kostenseiten, Rechtstexte).
 *
 * Ausführen:  npm run generate:ratgeber   (bzw. npx tsx tools/generate-ratgeber.mts)
 *
 * Neuen Beitrag/Kostenseite anlegen = neue .md-Datei + dieses Skript laufen lassen.
 * Angulars esbuild-Build kann Markdown nicht direkt globben, daher dieser Codegen-
 * Schritt (analog tools/generate-catalog-seed.mts).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import type { Tokens } from 'marked';
import type { RatgeberArticle } from '../src/app/models/ratgeber.model';
import type { CostPage, CostPageFaqItem } from '../src/app/models/cost-page.model';
import { absoluteUrl, SITE_URL } from '../src/app/config/site.config';

/**
 * Externe Links (http/https) bekommen automatisch `rel="sponsored nofollow noopener"`
 * und `target="_blank"` – wichtig für Affiliate-/Shop-Links (Amazon-Partnerprogramm,
 * SEO). Interne Links (`/…`) bleiben unverändert. `rel`/`target` überleben Angulars
 * `[innerHTML]`-Sanitizer (beide in dessen Attribut-Allowlist).
 */
marked.use({
  renderer: {
    link(token) {
      const href = token.href ?? '';
      const title = token.title ? ` title="${token.title}"` : '';
      const inner = this.parser.parseInline(token.tokens);
      const external = /^https?:\/\//i.test(href);
      const attrs = external ? ' target="_blank" rel="sponsored nofollow noopener"' : '';
      return `<a href="${href}"${title}${attrs}>${inner}</a>`;
    }
  }
});

const here = dirname(fileURLToPath(import.meta.url));
const ratgeberDir = resolve(here, '../src/content/ratgeber');
const kostenDir = resolve(here, '../src/content/kosten');
const ratgeberOutPath = resolve(here, '../src/app/content/ratgeber-articles.ts');
const kostenOutPath = resolve(here, '../src/app/content/cost-pages.ts');
const sitemapPath = resolve(here, '../public/sitemap.xml');

/**
 * Statische, indexierbare Inhaltsseiten (ohne Rechner/Admin/Login/Login-pflichtige).
 * Impressum und Datenschutz bewusst NICHT enthalten – sie sind auf `noindex` gesetzt
 * (siehe SeoService-Aufrufe), gehören also nicht in die Sitemap.
 */
const STATIC_PATHS = [
  '/',
  '/ratgeber',
  '/kontakt',
  '/vorlage/angebot-fliesen-muster',
  '/vorlage/fliesen-verlegen-material-werkzeug'
];

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

/** Inline-Markdown grob zu reinem Text (für JSON-LD-Antworten). */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // Links → Linktext
    .replace(/[*_`]/g, '') // Emphase/Code
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrahiert die FAQ aus dem Body: ab der ersten `## …Häufige Fragen…`-Überschrift
 * jede `### Frage` mit dem folgenden Absatztext als Antwort, bis zur nächsten
 * H2-Überschrift. So bleibt die FAQ EINMAL im Markdown (sichtbar + JSON-LD).
 */
function extractFaq(body: string): CostPageFaqItem[] {
  const tokens = marked.lexer(body);
  const faq: CostPageFaqItem[] = [];
  let inFaq = false;
  let current: CostPageFaqItem | null = null;
  for (const token of tokens) {
    if (token.type === 'heading') {
      const heading = token as Tokens.Heading;
      if (heading.depth <= 2) {
        if (inFaq) {
          break; // Ende des FAQ-Abschnitts
        }
        inFaq = /häufige fragen|faq/i.test(heading.text);
        continue;
      }
      if (inFaq && heading.depth === 3) {
        current = { question: stripInlineMarkdown(heading.text), answer: '' };
        faq.push(current);
      }
    } else if (inFaq && current && token.type === 'paragraph') {
      const paragraph = token as Tokens.Paragraph;
      const text = stripInlineMarkdown(paragraph.text);
      current.answer = current.answer ? `${current.answer} ${text}` : text;
    }
  }
  return faq.filter((item) => item.question && item.answer);
}

/** Liest .md-Dateien eines Verzeichnisses; überspringt `_`-Präfix und README.md. */
function readContentFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_') && name !== 'README.md')
    .sort();
}

// --- Ratgeber --------------------------------------------------------------
const ratgeberFiles = readContentFiles(ratgeberDir);
const articles: RatgeberArticle[] = ratgeberFiles.map((file) => {
  const raw = readFileSync(resolve(ratgeberDir, file), 'utf8');
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
    readingMinutes: readingMinutes(html),
    faq: extractFaq(body)
  };
});
articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title, 'de')));

const ratgeberOut = `// AUTO-GENERIERT von tools/generate-ratgeber.mts – NICHT von Hand bearbeiten.
// Quelle: src/content/ratgeber/*.md  ·  Neu generieren: npm run generate:ratgeber
import type { RatgeberArticle } from '../models/ratgeber.model';

export const RATGEBER_ARTICLES: RatgeberArticle[] = ${JSON.stringify(articles, null, 2)};
`;
mkdirSync(dirname(ratgeberOutPath), { recursive: true });
writeFileSync(ratgeberOutPath, ratgeberOut, 'utf8');
console.log(`Ratgeber: ${articles.length} Beitrag/Beiträge → ${ratgeberOutPath}`);

// --- Kostenseiten ----------------------------------------------------------
const kostenFiles = readContentFiles(kostenDir);
const costPages: CostPage[] = kostenFiles.map((file) => {
  const raw = readFileSync(resolve(kostenDir, file), 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const slug = file.replace(/\.md$/, '');
  const title = unquote(meta['title'] ?? '');
  const description = unquote(meta['description'] ?? '');
  if (!title || !description) {
    throw new Error(`${file}: title und description sind im Frontmatter Pflicht.`);
  }
  const roomTypeRaw = unquote(meta['roomType'] ?? '');
  return {
    slug,
    roomType: roomTypeRaw && roomTypeRaw !== 'none' ? (roomTypeRaw as CostPage['roomType']) : null,
    title,
    description,
    html: marked.parse(body, { async: false }) as string,
    faq: extractFaq(body),
    ctaLabel: unquote(meta['ctaLabel'] ?? '') || 'Kosten jetzt berechnen'
  };
});
costPages.sort((a, b) => a.title.localeCompare(b.title, 'de'));

const kostenOut = `// AUTO-GENERIERT von tools/generate-ratgeber.mts – NICHT von Hand bearbeiten.
// Quelle: src/content/kosten/*.md  ·  Neu generieren: npm run generate:ratgeber
import type { CostPage } from '../models/cost-page.model';

export const COST_PAGES: CostPage[] = ${JSON.stringify(costPages, null, 2)};
`;
writeFileSync(kostenOutPath, kostenOut, 'utf8');
console.log(`Kostenseiten: ${costPages.length} Seite(n) → ${kostenOutPath}`);

// --- sitemap.xml -----------------------------------------------------------
const urls: { loc: string; lastmod?: string }[] = [
  ...STATIC_PATHS.map((path) => ({ loc: absoluteUrl(path) })),
  ...costPages.map((page) => ({ loc: absoluteUrl(`/kosten/${page.slug}`) })),
  ...articles.map((article) => ({
    loc: absoluteUrl(`/ratgeber/${article.slug}`),
    lastmod: article.date || undefined
  }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`
  )
  .join('\n')}
</urlset>
`;
mkdirSync(dirname(sitemapPath), { recursive: true });
writeFileSync(sitemapPath, sitemap, 'utf8');
console.log(`Sitemap: ${urls.length} URLs → ${sitemapPath} (Basis: ${SITE_URL})`);
