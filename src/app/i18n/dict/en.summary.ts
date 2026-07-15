// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Zusammenfassung (summary-page, room-summary-contractor, cost-comparison,
// premium-export-button).
// Hinweis: Einige generische Keys ('Stück', 'Menge', 'Einheit', 'Einheitspreis',
// 'Gesamt', 'Nettobetrag', 'Link wird erstellt …', 'Kopieren', 'Raum anlegen', 'zzgl.')
// sind bereits über en.offers.ts/en.shell.ts abgedeckt – hier bewusst NICHT erneut
// definiert (keine Duplikate über Dateien hinweg).
export const EN_SUMMARY: Record<string, string> = {
  // --- summary-page: Kopf / Raum speichern ---
  'Raum-Zusammenfassung als PDF exportieren': 'Export room summary as PDF',
  'Lokales Projekt': 'Local project',
  'Änderungen speichern': 'Save changes',
  'Raum speichern': 'Save room',
  'Maximal erreicht:': 'Limit reached:',
  'Bestehende Räume kannst du weiter bearbeiten.': 'You can keep editing existing rooms.',
  'Änderungen wurden gespeichert.': 'Changes have been saved.',
  'Raum wurde gespeichert.': 'Room has been saved.',
  'Weiteren Raum hinzufügen': 'Add another room',
  'Zum Projekt-Dashboard': 'To project dashboard',
  'Materialliste dieses Raumes prüfen': "Check this room's material list",

  // --- summary-page: DIY-Kostenschätzung ---
  'Zusammenfassung DIY': 'DIY summary',
  'DIY-Kostenschätzung & Materialübersicht': 'DIY cost estimate & material overview',
  Berechnungsgrundlage: 'Calculation basis',
  'Fliesenmenge & Verschnitt': 'Tile quantity & waste',
  'Zu fliesende Fläche': 'Area to be tiled',
  Verschnitt: 'Waste allowance',
  'Inkl. Verschnitt': 'Incl. waste',
  Fliesenformat: 'Tile format',
  'Benötigte Fliesen': 'Tiles needed',
  'Fläche nach Stückzahl': 'Area by tile count',
  'Aktuelle Auswahl': 'Current selection',
  'DIY-Materialkosten': 'DIY material costs',
  'Aktive Materialpositionen': 'Active material items',
  'Deaktivierte Materialpositionen': 'Deactivated material items',
  'Materialkosten gesamt': 'Total material costs',
  'Materialliste bearbeiten': 'Edit material list',

  // --- summary-page: Kostenvergleich DIY vs. Fliesenleger ---
  Kostenvergleich: 'Cost comparison',
  'Eigenleistung vs. Fliesenleger': 'DIY vs. professional tiler',
  Ersparnis: 'savings',
  Eigenleistung: 'DIY',
  'Material & Zubehör': 'Material & accessories',
  Puffer: 'Buffer',
  Fliesenleger: 'Professional tiler',
  'Leistungspositionen netto': 'Net service items',
  'Material laut Auswahl': 'Material as selected',
  'Gesamt inkl. MwSt.': 'Total incl. VAT',
  'Ohne Fliesenmaterial': 'Without tile material',
  'Das entspricht ca.': 'This corresponds to approx.',
  '% der geschätzten Profi-Kosten.': '% of the estimated professional cost.',

  // --- summary-page: Kalkulation teilen ---
  'Kalkulation teilen': 'Share calculation',
  'Read-only-Link erzeugen': 'Create read-only link',
  'Teilen-Link erzeugen': 'Create share link',
  'Zum Teilen bitte': 'To share, please',
  anmelden: 'sign in',
  '– ein geteilter Link speichert eine eingefrorene Momentaufnahme dieser Kalkulation.':
    '– a shared link stores a frozen snapshot of this calculation.',
  'Kopiert ✓': 'Copied ✓',
  'Jeder mit diesem Link sieht eine schreibgeschützte Ansicht – ohne deine übrigen Projektdaten.':
    'Anyone with this link sees a read-only view – without the rest of your project data.',

  // --- summary-page / room-summary-contractor: Profi-Angebotspositionen (Tabelle) ---
  Leistungspositionsmodell: 'Service item model',
  'Profi-Angebotspositionen': 'Professional offer items',
  'Profi-Kalkulation als PDF exportieren': 'Export professional calculation as PDF',
  Position: 'Item',
  optional: 'optional',
  'nicht eingerechnet': 'not included',
  '% MwSt. (Leistung + Material)': '% VAT (service + material)',
  'Gesamtschätzung Fliesenleger': 'Total estimate professional tiler',
  'Aufteilung der Materialkosten': 'Breakdown of material costs',
  'Keine aktiven Materialkosten': 'No active material costs',
  Berechnungsbasis: 'Calculation basis',
  Annahmen: 'Assumptions',
  'Bitte beachten': 'Please note',
  'Hinweise und Risiken': 'Notes and risks',
  'Die Zusammenfassung erscheint erst, wenn du den finalen Button im Wizard drückst.':
    'The summary only appears once you press the final button in the wizard.',
  'Der Teilen-Link konnte nicht erstellt werden. Bitte erneut versuchen.':
    'The share link could not be created. Please try again.',

  // --- room-summary-contractor: Angebot / Projekt speichern ---
  'Fliesenleger-Kalkulation als PDF exportieren': 'Export tiler calculation as PDF',
  'Angebot / Projekt': 'Offer / project',
  'In welches Angebot speichern?': 'Save into which offer?',
  '+ Neues Angebot': '+ New offer',
  'Name des neuen Angebots': 'Name of the new offer',
  'Neues Angebot': 'New offer',
  'Raum wurde im Angebot „': 'Room was saved in offer "',
  '" gespeichert.': '".',
  'Fliesenleger-Leistungspositionen': 'Tiler service items',
  'Ohne Fliesenmaterial kalkuliert.': 'Calculated without tile material.',

  // --- premium-export-button ---
  'PDF wird erstellt …': 'Creating PDF …',
  'Excel wird erstellt …': 'Creating Excel …',
  'Es liegen noch keine Daten zum Export vor.': 'No data available for export yet.',
  '{format}-Export ist für deinen Zugang nicht verfügbar.':
    '{format} export is not available for your access.',
  '{format} konnte nicht erstellt werden. Bitte erneut versuchen.':
    '{format} could not be created. Please try again.',

  // --- CostComparisonService: COST_GROUPS-Labels (dynamisch, group.label | t) ---
  Fliesenmaterial: 'Tile material',
  Verlegematerial: 'Installation material',
  Abdichtung: 'Waterproofing',
  Untergrundvorbereitung: 'Substrate preparation',
  'Werkzeug & Schutz': 'Tools & protection',
  Entsorgung: 'Disposal',
  Sonstiges: 'Other',

  // --- CostComparisonService: eigene Warnungen (dynamisch, warning | t) ---
  'Die Materialliste wurde angepasst. Entfernte Positionen sind nicht in der aktuellen Schätzung enthalten.':
    'The material list has been adjusted. Removed items are not included in the current estimate.',
  'Fliesenmaterial wurde im Wizard ausgeschlossen und wird im Vergleich nicht eingerechnet.':
    'Tile material was excluded in the wizard and is not included in the comparison.',

  // --- CostComparisonService: savings.label (dynamisch) ---
  'Mögliche Ersparnis durch Eigenleistung': 'Possible savings through DIY',
  'Keine rechnerische Ersparnis': 'No calculated savings',

  // --- CostComparisonService: eigene Assumptions (dynamisch, assumption | t) ---
  'DIY-Puffer: 10 %': 'DIY buffer: 10%',
  'Profi-Materialkosten enthalten keine DIY-Werkzeuge, PSA oder Dokumentation.':
    'Professional material costs do not include DIY tools, PPE, or documentation.',

  // --- RoomLimitService.hint (dynamisch, außerhalb dieses Scopes) ---
  'Als Heimwerker kannst du bis zu 5 Räume pro Projekt anlegen.':
    'As a DIY user you can create up to 5 rooms per project.',

  // --- CROSS_DOMAIN_PROJECT_HINT (dynamisch, außerhalb dieses Scopes) ---
  'Dein lokal gespeichertes Projekt bleibt auf diesem Gerät unter fliesen-kosten.de verfügbar.':
    'Your locally saved project remains available on this device at fliesen-kosten.de.'
};
