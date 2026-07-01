/**
 * Ein Frage/Antwort-Paar aus dem `## Häufige Fragen`-Abschnitt eines Beitrags.
 * Speist das FAQPage-JSON-LD (analog zu den Kostenseiten).
 */
export interface RatgeberFaqItem {
  /** Frage. */
  question: string;
  /** Antwort als reiner Text (für JSON-LD). */
  answer: string;
}

/**
 * Ein Ratgeber-Beitrag (Phase 16 – SEO/Ratgeber). Wird aus einer Markdown-Datei
 * (`src/content/ratgeber/<slug>.md`) per `tools/generate-ratgeber.mts` erzeugt;
 * der Body liegt als fertiges, gerendertes HTML vor.
 */
export interface RatgeberArticle {
  /** URL-Slug = Dateiname ohne Endung; Route /ratgeber/<slug>. */
  slug: string;
  /** Titel (H1 + <title> + Listeneintrag). */
  title: string;
  /** Meta-Description + Teaser in der Übersicht. */
  description: string;
  /** Veröffentlichungsdatum (ISO, YYYY-MM-DD). */
  date: string;
  /** Schlagworte für Filter/Verwandtes. */
  tags: string[];
  /** Aus Markdown gerendertes Artikel-HTML. */
  html: string;
  /** Grobe Lesezeit in Minuten (aus der Wortzahl geschätzt). */
  readingMinutes: number;
  /** Aus dem Body extrahierte Frage/Antwort-Paare fürs FAQPage-JSON-LD. */
  faq: RatgeberFaqItem[];
}
