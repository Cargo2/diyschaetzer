/**
 * Profi-Feedback (Phase 13, Profi-Modus). Angemeldete Profis senden
 * Verbesserungsvorschläge; gespeichert in `contractor_feedback`, lesbar nur für
 * Admins (Admin-UI). Bewusst schlank: Kategorie + Freitext.
 */

/** Auswählbare Kategorien im Feedback-Formular (Wert = DB-Spalte `category`). */
export const FEEDBACK_CATEGORIES = [
  { value: 'idea', label: 'Idee / Verbesserung' },
  { value: 'bug', label: 'Fehler / Problem' },
  { value: 'other', label: 'Sonstiges' }
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]['value'];

/** Eingabe aus dem Profi-Formular. */
export interface FeedbackSubmission {
  category: FeedbackCategory;
  message: string;
}

/** Lesbares Label zu einem Kategorie-Wert (Fallback: der Rohwert). */
export function feedbackCategoryLabel(value: string): string {
  return FEEDBACK_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
