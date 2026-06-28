import { RoomType } from './bathroom-wizard.model';

/**
 * Eine SEO-Themen-Kostenseite (Phase 17 – Sichtbarkeit/SEO). Jede Seite zielt auf
 * eine konkrete Suchabsicht (z. B. „Badezimmer fliesen Kosten") und führt mit einem
 * antwort-zuerst-Text + echtem Praxisbeispiel in den Rechner – dort wird der passende
 * `RoomType` vorbelegt (CTA `/raum-anlegen?raum=<roomType>`).
 *
 * Inhalt kommt aus Markdown (`src/content/kosten/<slug>.md`) und wird per
 * `tools/generate-ratgeber.mts` zu fertigem HTML gerendert – wie der Ratgeber.
 * Die FAQ werden aus dem `## Häufige Fragen`-Abschnitt des Bodys extrahiert und
 * speisen zusätzlich das FAQPage-JSON-LD.
 */
export interface CostPageFaqItem {
  /** Frage. */
  question: string;
  /** Antwort als reiner Text (für JSON-LD). */
  answer: string;
}

export interface CostPage {
  /** URL-Slug = Dateiname ohne Endung; Route /kosten/<slug>. */
  slug: string;
  /** Raumtyp, der im Rechner vorbelegt wird; `null` = keine Vorbelegung. */
  roomType: RoomType | null;
  /** H1 der Seite + <title>. */
  title: string;
  /** Meta-Description + Teaser. */
  description: string;
  /** Aus Markdown gerendertes Artikel-HTML (inkl. sichtbarer FAQ). */
  html: string;
  /** Aus dem Body extrahierte Frage/Antwort-Paare fürs FAQPage-JSON-LD. */
  faq: CostPageFaqItem[];
  /** Beschriftung des CTA-Buttons in den Rechner. */
  ctaLabel: string;
}
