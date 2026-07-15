// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Annahmen-Editor (components/summary-assumptions).
// Hinweis: Wörter wie 'Ja'/'Nein'/'Noch unklar'/'Stück'/'Raumgröße'/'Untergrund'/
// die Wizard-Options-Labels (Einzelwaschtisch, Standard-Duschkabine, Wand-WC, ...) und
// Raumtyp-Namen (Bad, Küche, ...) sind bereits über en.wizard.ts/en.offers.ts übersetzt –
// hier NICHT erneut definieren.
export const EN_ASSUMPTIONS: Record<string, string> = {
  // --- Abschnitts-Überschriften ---
  'Gewählte Optionen': 'Selected options',
  Leistungsumfang: 'Scope of work',
  'Noch zu klären': 'Still to clarify',
  Hinweise: 'Notes',
  Flächenübersicht: 'Area overview',
  'Live aus Badgroesse, Waenden und Aussparungen berechnet':
    'Calculated live from bathroom size, walls and openings',
  Bodenflaeche: 'Floor area',
  'Erfasste Waende': 'Walls entered',
  Wandflaechen: 'Wall areas',
  'Gesamt zu fliesende Flaeche': 'Total area to be tiled',
  gefliest: 'tiled',
  'Bearbeitbare Annahmen': 'Editable assumptions',
  'Diese Werte beeinflussen Materialmengen und Kosten. Du kannst sie bei Bedarf anpassen.':
    'These values affect material quantities and costs. You can adjust them if needed.',
  'Alle Annahmen zurücksetzen': 'Reset all assumptions',
  Raumdetails: 'Room details',
  'Maße und Ausstattungswerte, die aus deinen Angaben abgeleitet wurden':
    'Dimensions and fixture values derived from your inputs',
  'Bereich 4': 'Section 4',
  'JSON-Ausgabe': 'JSON output',

  // --- Gruppen-/Sektionsnamen (dynamisch: group.label) ---
  Allgemein: 'General',
  Laufmeter: 'Linear meters',
  Stückzahlen: 'Piece counts',
  Abdichtung: 'Waterproofing',
  'Profi-Einheitspreise': 'Contractor unit prices',
  'Profi Einheitspreise': 'Contractor unit prices',
  'Die Profi-Einheitspreise sind Annahmen für eine unverbindliche Kostenschätzung und ersetzen kein geprüftes Angebot.':
    'The contractor unit prices are assumptions for a non-binding cost estimate and do not replace a reviewed quote.',
  Zurücksetzen: 'Reset',
  'Preisannahmen für die unverbindliche Profi-Kostenschätzung':
    'Price assumptions for the non-binding contractor cost estimate',
  'Diese Einheitspreise sind bearbeitbare Annahmen und ersetzen kein geprüftes Handwerkerangebot.':
    "These unit prices are editable assumptions and do not replace a reviewed tradesperson's quote.",

  // --- Status-Labels (assumptionStatus(), dynamisch) ---
  'Nicht relevant': 'Not relevant',
  'Manuell geändert': 'Manually changed',
  'Aus deinen Angaben': 'From your inputs',
  Geschätzt: 'Estimated',

  // --- Bestätigungsdialog (TS, this.i18n.t()) ---
  'Alle manuell geänderten Berechnungsannahmen zurücksetzen?':
    'Reset all manually changed calculation assumptions?',

  // --- Raumdetails-Karten (Fliesen/Badewanne/Dusche/Waschtisch/WC/Heizung) ---
  Fliesen: 'Tiles',
  'Richtwert, kann angepasst werden': 'Reference value, can be adjusted',
  'Preis pro m²': 'Price per m²',
  Badewanne: 'Bathtub',
  Lange: 'Length',
  Breite: 'Width',
  Dusche: 'Shower',
  Waschtisch: 'Washbasin',
  'Anzahl Waschplätze': 'Number of wash stations',
  WC: 'Toilet',
  Installationsart: 'Installation type',
  Heizung: 'Heating',
  Handtuchheizkorper: 'Towel radiator',
  'Abgeleitet aus Zusatzausstattung und Heizung':
    'Derived from additional fixtures and heating',
  'Spiegel-Stromanschlüsse': 'Mirror power connections',
  'Wandleuchten-Anschlüsse': 'Wall light connections',
  'Lüftungs-Öffnungen': 'Ventilation openings',

  // --- installationTypeOptions (dynamisch: option.label) ---
  Vorwandelement: 'Pre-wall element',
  Standmontage: 'Floor-standing installation',
  'Vorwandelement mit Strom': 'Pre-wall element with power',

  // --- JSON-Feedback (TS, this.i18n.t()) ---
  'JSON wurde in die Zwischenablage kopiert.': 'JSON was copied to the clipboard.',
  'Kopieren war im Browser nicht moglich.': 'Copying was not possible in the browser.',
  'JSON kopieren': 'Copy JSON',

  // --- summaryItems/preparationItems/scopeItems: Labels (dynamisch: item.label) ---
  Raum: 'Room',
  Raumtyp: 'Room type',
  Bereich: 'Zone',
  Innenbereich: 'Indoor area',
  Fliesenbereich: 'Tiling area',
  Fliesenqualität: 'Tile quality',
  'Boden-Fliesengröße': 'Floor tile size',
  'Wand-Fliesengröße': 'Wall tile size',
  Waschplatz: 'Wash area',
  Unterschrank: 'Vanity cabinet',
  'Dusche / Badewanne': 'Shower / bathtub',
  Extras: 'Extras',
  'Alter Belag vorhanden': 'Existing old covering',
  'Rückbau alter Beläge': 'Removal of old coverings',
  'Alte Sanitärobjekte entfernen': 'Remove old sanitary fixtures',
  'Vorhandener Untergrund geeignet': 'Existing substrate suitable',
  'Kleine Ausbesserungen': 'Minor repairs',
  Ausgleichsmasse: 'Leveling compound',
  'Ausgleich / Nivellierung': 'Leveling',
  'Entsorgung alter Fliesen/Beläge': 'Disposal of old tiles/coverings',
  'Fliesenmaterial enthalten': 'Tile material included',
  'Verlegematerial enthalten': 'Installation material included',
  'Abdichtung enthalten': 'Waterproofing included',
  'Fliesensockel enthalten': 'Tile baseboards included',
  'Werkzeug/Zubehör enthalten': 'Tools/accessories included',
  'Entsorgung enthalten': 'Disposal included',
  'Untergrundausgleich enthalten': 'Substrate leveling included',

  // --- summaryItems/preparationItems: Values (dynamisch: item.value / Methodenrückgabe) ---
  'Eben und tragfähig': 'Level and load-bearing',
  'Noch nicht ausgewählt': 'Not yet selected',
  'Keine Auswahl': 'No selection'
};
