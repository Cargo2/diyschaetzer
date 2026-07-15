/**
 * Dynamische Übersetzungs-Keys für den Bereich Zusammenfassung
 * (summary-page, room-summary-contractor, cost-comparison, premium-export-button).
 *
 * Zweck: Keys, die zur Laufzeit über Variablen gerendert werden – z. B.
 * `...Object.values(LABEL_MAP)` oder `value | t` mit einem Variablen-Wert – und
 * die der Literal-Scan der Coverage-Spec (`'…' | t` / `t('…')`) NICHT sieht.
 *
 * Damit die Orphan-Prüfung solche Keys nicht als tot meldet, werden sie hier
 * gepflegt und von der Coverage-Spec in ihr `DYNAMIC_KEYS`-Array übernommen.
 * Jedes Übersetzungspaket pflegt NUR sein eigenes Modul.
 */
export const DYNAMIC_KEYS_SUMMARY: readonly string[] = [];
