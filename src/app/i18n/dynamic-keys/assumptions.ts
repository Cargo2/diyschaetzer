/**
 * Dynamische Übersetzungs-Keys für den Bereich Annahmen-Editor
 * (components/summary-assumptions).
 *
 * Zweck: Keys, die zur Laufzeit über Variablen gerendert werden – z. B.
 * `...Object.values(LABEL_MAP)` oder `value | t` mit einem Variablen-Wert – und
 * die der Literal-Scan der Coverage-Spec (`'…' | t` / `t('…')`) NICHT sieht.
 *
 * Damit die Orphan-Prüfung solche Keys nicht als tot meldet, werden sie hier
 * gepflegt und von der Coverage-Spec in ihr `DYNAMIC_KEYS`-Array übernommen.
 * Jedes Übersetzungspaket pflegt NUR sein eigenes Modul.
 *
 * Herkunft: `group.label` (editableAssumptionGroups/professionalPriceGroups),
 * `assumptionStatus()`, `installationTypeOptions[].label`, sowie die
 * label/value-Maps von `summaryItems`/`preparationItems`/`scopeItems`
 * (SummaryItem[], über die Methoden sinkLabel/vanityLabel/.../extrasLabel
 * gebaut und in der Zusammenfassung als `item.label`/`item.value | t` gerendert).
 */
export const DYNAMIC_KEYS_ASSUMPTIONS: readonly string[] = [
  // --- Gruppen-/Sektionsnamen (group.label) ---
  'Allgemein',
  'Laufmeter',
  'Stückzahlen',
  'Abdichtung',
  'Profi-Einheitspreise',

  // --- Status-Labels (assumptionStatus()) ---
  'Nicht relevant',
  'Manuell geändert',
  'Aus deinen Angaben',
  'Geschätzt',

  // --- installationTypeOptions[].label ---
  'Vorwandelement',
  'Standmontage',
  'Vorwandelement mit Strom',

  // --- summaryItems: Labels ---
  'Raum',
  'Raumtyp',
  'Bereich',
  'Innenbereich',
  'Fliesenbereich',
  'Fliesenqualität',
  'Boden-Fliesengröße',
  'Wand-Fliesengröße',
  'Waschplatz',
  'Unterschrank',
  'Dusche / Badewanne',
  'Extras',

  // --- preparationItems: Labels ---
  'Alter Belag vorhanden',
  'Rückbau alter Beläge',
  'Alte Sanitärobjekte entfernen',
  'Vorhandener Untergrund geeignet',
  'Kleine Ausbesserungen',
  'Ausgleichsmasse',
  'Ausgleich / Nivellierung',
  'Entsorgung alter Fliesen/Beläge',

  // --- scopeItems: Labels ---
  'Fliesenmaterial enthalten',
  'Verlegematerial enthalten',
  'Abdichtung enthalten',
  'Fliesensockel enthalten',
  'Werkzeug/Zubehör enthalten',
  'Entsorgung enthalten',
  'Untergrundausgleich enthalten',

  // --- Werte aus Label-Methoden (item.value) ---
  'Eben und tragfähig',
  'Noch nicht ausgewählt',
  'Keine Auswahl'
];
