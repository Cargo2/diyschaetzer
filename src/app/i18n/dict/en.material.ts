// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Materialliste (pages/material-list) + projektweite Liste (pages/project-summary).
// Hinweis: Einige Keys sind bereits über andere Dictionaries abgedeckt und werden hier
// bewusst NICHT erneut definiert (keine Duplikate über Dateien hinweg):
// 'Materialliste'/'Projekt-Dashboard'/'Zusammenfassung'/'Raum anlegen' (en.shell.ts),
// 'Außenbereich'/'Optional'/'Entsorgung' (en.wizard.ts), 'von'/'Menge'/'Löschen' (en.offers.ts),
// 'm²'/'%'/'Stück' (en.konto.ts/en.offers.ts), 'Innenbereich'/'Hinweise' (en.assumptions.ts),
// 'Berechnungsgrundlage'/'Fliesenmenge & Verschnitt'/'Zu fliesende Fläche'/'Verschnitt'/
// 'Inkl. Verschnitt'/'Fliesenformat'/'Benötigte Fliesen'/'Materialkosten gesamt'/
// 'Fliesenleger'/'Position'/'Bestehende Räume kannst du weiter bearbeiten.'/
// 'Weiteren Raum hinzufügen' (en.summary.ts – identische Tabellen-/Berechnungstexte).
export const EN_MATERIAL: Record<string, string> = {
  // --- material-list: Kopf ---
  'Material und Werkzeug nach Arbeitsschritten': 'Materials and tools by work step',
  'Die Mengen sind nachvollziehbare Richtwerte aus deinen Wizard-Angaben. Prüfe Gebinde und Herstellerverbrauch vor dem Einkauf.':
    'The quantities are traceable estimates based on your wizard inputs. Check package sizes and manufacturer consumption before buying.',
  'Aktuelle Materialkosten': 'Current material costs',
  'Preise aus dem hinterlegten Materialkatalog': 'Prices from the stored material catalog',
  'Materialliste als PDF exportieren': 'Export material list as PDF',
  'Materialliste als Excel exportieren': 'Export material list as Excel',

  // --- material-list: Steuerung (Toggle/Reset) ---
  'Materialliste anpassen': 'Adjust material list',
  'Optionale Materialien berücksichtigen': 'Include optional materials',
  'Wenn deaktiviert, werden optionale Materialien aus der Kostenschätzung entfernt.':
    'If disabled, optional materials are removed from the cost estimate.',
  'Materialliste zurücksetzen': 'Reset material list',

  // --- material-list: Projektübersicht (Kennzahlen) ---
  Projektübersicht: 'Project overview',
  Fliesenfläche: 'Tile area',
  'Mit Verschnitt': 'Incl. waste allowance',
  'Aktive Positionen': 'Active line items',
  'Entfernte Positionen': 'Removed line items',
  'Hinweise zur Materialberechnung': 'Notes on material calculation',

  // --- material-list: Fliesenmenge & Verschnitt (Berechnungsgrundlage-Panel) ---
  Verschnittfläche: 'Waste area',
  'Fliesenmenge inkl. Verschnitt': 'Tile quantity incl. waste',
  'Fläche pro Fliese': 'Area per tile',
  'Tatsächliche Fläche nach Stückzahl': 'Actual area by tile count',
  'Fliesenmaterial ist im Leistungsumfang ausgeschlossen. Die Menge wird nur zur Orientierung angezeigt.':
    'Tile material is excluded from the scope of work. The quantity is shown for reference only.',

  // --- material-list: Material-Sektionen / Positionen ---
  Artikel: 'items',
  'Aus Materialliste entfernen': 'Remove from material list',
  'aus Materialliste entfernen': 'remove from material list',
  'Zur Materialliste hinzufügen': 'Add to material list',
  'zur Materialliste hinzufügen': 'add to material list',
  'Durch Toggle ausgeschlossen': 'Excluded via toggle',
  'Aus Berechnung entfernt': 'Removed from calculation',
  'Nach Bedarf': 'As needed',
  Einzelpreis: 'Unit price',
  Berechnung: 'Calculation',
  'Verwendet in': 'Used in',
  'Produkt ansehen': 'View product',
  'Noch kein Preis': 'No price yet',

  // --- material-list / project-summary: Shop-Angebote (Affiliate-Chips) ---
  'Anzeige – Affiliate-Werbung, Links führen zu Partner-Shops':
    'Ad – affiliate advertising, links lead to partner shops',
  Anzeige: 'Ad',
  Bei: 'At',
  'ansehen (Anzeige, öffnet neuen Tab)': 'view (ad, opens new tab)',
  ansehen: 'view',

  // --- material-list: ARTICLE_TYPE_LABELS ---
  Hauptmaterial: 'Main material',
  Verbrauchsmaterial: 'Consumable material',
  Werkzeug: 'Tool',
  Schutzausrüstung: 'Protective equipment',
  Zubehör: 'Accessories',

  // --- material-list: REQUIREMENT_LABELS ---
  Erforderlich: 'Required',
  'Bedingt erforderlich': 'Conditionally required',
  Empfohlen: 'Recommended',

  // --- material-list: gesperrter Zustand (kein Raum vorhanden) ---
  'Materialliste noch nicht verfügbar': 'Material list not yet available',
  'Bitte lege zuerst einen Raum an.': 'Please add a room first.',
  'Danach berechnen wir Materialmengen und Kosten aus deinen Angaben.':
    'Then we calculate material quantities and costs from your inputs.',

  // --- project-summary: Kopf ---
  'gespeicherte Räume': 'saved rooms',
  'Neuen Raum anlegen': 'Add new room',
  'Noch keine Räume gespeichert.': 'No rooms saved yet.',
  'Lege deinen ersten Raum an, damit Projektkosten und Materialien berechnet werden können.':
    'Add your first room so project costs and materials can be calculated.',

  // --- project-summary: Projektkosten-Kennzahlen ---
  Projektkosten: 'Project costs',
  Gesamtfläche: 'Total area',
  'DIY-Kosten': 'DIY costs',
  'Fliesenleger-Kosten': 'Tiler costs',
  'Mögliche Ersparnis': 'Potential savings',
  Materialkosten: 'Material costs',
  'Werkzeugkosten einmalig': 'Tool costs (one-time)',
  'Summe Einzelräume': 'Sum of individual rooms',
  'davon −': 'of which −',
  'gespart, weil Werkzeuge projektweit nur einmal gerechnet werden.':
    'saved, because tools are calculated only once for the whole project.',
  'Fliesen inkl. Verschnitt': 'Tiles incl. waste',
  'Anzahl Räume': 'Number of rooms',

  // --- project-summary: Einzelne Kalkulationen (Raumkarten) ---
  'Gespeicherte Räume': 'Saved rooms',
  'Einzelne Kalkulationen': 'Individual calculations',
  'Hinweise für': 'Notes for',
  anzeigen: 'show',
  Fläche: 'Area',
  Bearbeiten: 'Edit',
  Duplizieren: 'Duplicate',

  // --- project-summary: Projektweite Materialübersicht ---
  'Projektweite Materialübersicht': 'Project-wide material overview',
  'Materialbedarf aller Räume': 'Material requirements for all rooms',
  bestellt: 'ordered',
  'Materialliste schließen': 'Close material list',
  'Projekt-Materialliste anzeigen': 'Show project material list',
  'Werkzeug einmalig': 'Tools (one-time)',
  Verbrauchsmaterialien: 'Consumables',
  Hauptmaterialien: 'Main materials',

  // --- project-summary: Projekt-Materialliste (Tabelle) ---
  Bestellt: 'Ordered',
  Wo: 'Where',
  Pakete: 'Packages',
  Räume: 'Rooms',
  Kosten: 'Costs',
  'als bestellt markieren': 'mark as ordered',

  // --- project-summary: Nächste Schritte ---
  'Nächste Schritte': 'Next steps',
  'Projekt weiterführen': 'Continue project',
  'Ergänze Räume oder prüfe die projektweiten Materialien und eine Einzelraum-Zusammenfassung.':
    'Add rooms or review the project-wide materials and a single-room summary.',
  'Projekt-Materialliste prüfen': 'Review project material list',
  'Zusammenfassung prüfen': 'Review summary',
  'Projekt-Materialliste als PDF': 'Project material list as PDF',
  'Projekt-Materialliste als Excel': 'Project material list as Excel',

  // --- project-summary: Raum löschen (confirm-Dialog) ---
  'Möchtest du diesen Raum wirklich löschen?': 'Do you really want to delete this room?'
};
