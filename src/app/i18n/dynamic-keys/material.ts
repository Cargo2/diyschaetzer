import {
  ARTICLE_TYPE_LABELS,
  REQUIREMENT_LABELS
} from '../../pages/material-list/material-list.component';

/**
 * Dynamische Übersetzungs-Keys für den Bereich Materialliste/Projektliste.
 *
 * Zweck: Keys, die zur Laufzeit über Variablen gerendert werden – z. B.
 * `...Object.values(LABEL_MAP)` oder `value | t` mit einem Variablen-Wert – und
 * die der Literal-Scan der Coverage-Spec (`'…' | t` / `t('…')`) NICHT sieht.
 *
 * Damit die Orphan-Prüfung solche Keys nicht als tot meldet, werden sie hier
 * gepflegt und von der Coverage-Spec in ihr `DYNAMIC_KEYS`-Array übernommen.
 * Jedes Übersetzungspaket pflegt NUR sein eigenes Modul.
 *
 * `articleTypeLabel()`/`requirementLabel()` in `MaterialListComponent` übersetzen
 * `ARTICLE_TYPE_LABELS[value]`/`REQUIREMENT_LABELS[value]` (Variable, kein Literal) –
 * die deutschen Anzeigetexte werden hier per `Object.values()` registriert. Der Wert
 * `'Entsorgung'` (waste_disposal) und `'Optional'` (optional) sind bereits über
 * `pl.wizard.ts`/`en.wizard.ts` abgedeckt (kein Duplikat, aber weiterhin gültige Keys).
 */
export const DYNAMIC_KEYS_MATERIAL: readonly string[] = [
  ...Object.values(ARTICLE_TYPE_LABELS),
  ...Object.values(REQUIREMENT_LABELS)
];
