// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Projekt-Zusammenfassung (pages/project-overview) + Menüeintrag (App-Shell).
// Hinweis: Fast alle Strings der Seite sind bereits über andere Dictionaries abgedeckt
// und werden hier bewusst NICHT erneut definiert (keine Duplikate über Dateien hinweg):
// 'Anzahl Räume'/'Gesamtfläche'/'DIY-Kosten'/'Fliesenleger-Kosten'/'Mögliche Ersparnis'/
// 'Fliesen inkl. Verschnitt'/'Summe Einzelräume'/'davon −'/'gespart, weil …'/
// 'Werkzeugkosten einmalig'/'gespeicherte Räume'/'Noch keine Räume gespeichert.'/
// 'Fläche'/'Gespeicherte Räume'/'Einzelne Kalkulationen'/'Projektkosten' (en.material.ts),
// 'Kostenvergleich'/'Eigenleistung vs. Fliesenleger'/'Eigenleistung'/'Fliesenleger'/
// 'Puffer'/'Materialkosten gesamt'/'Gesamt inkl. MwSt.'/'Das entspricht ca.'/
// '% der geschätzten Profi-Kosten.'/'Bitte beachten'/'Hinweise und Risiken' (en.summary.ts),
// 'Gesamt' (en.offers.ts), 'Raum' (en.assumptions.ts), 'Raum anlegen'/'m²' (en.shell.ts/en.konto.ts).
// Profi-Positionen-Sektion: 'Leistungspositionsmodell'/'Position'/'optional'/
// '% MwSt. (Leistung + Material)'/'Gesamtschätzung Fliesenleger'/'Material laut Auswahl'
// (en.summary.ts), 'Menge'/'Einheit'/'Einheitspreis'/'Nettobetrag'/'zzgl.'/Einheiten (en.offers.ts).
export const EN_PROJECT: Record<string, string> = {
  'Projekt-Zusammenfassung': 'Project summary',
  'Projekt-Zusammenfassung als PDF': 'Project summary as PDF',
  'Projekt-Zusammenfassung als Excel': 'Project summary as Excel',
  'Profi-Leistungspositionen': 'Professional service items',
  'Netto gesamt (Leistung + Material)': 'Net total (service + material)',
  'MwSt. gesamt': 'Total VAT'
};
