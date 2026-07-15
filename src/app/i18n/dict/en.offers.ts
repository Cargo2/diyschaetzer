// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Hinweis: 'Angebote'/'Rechnungen'/'Firmenprofil'/'Premium freischalten' sind bereits über
// en.shell.ts (Navigation) übersetzt, 'PLZ'/'Ort'/'E-Mail'/'IBAN'/'USt-IdNr.'/'Pflicht für
// XRechnung'/'%'/'MwSt.' bereits über en.konto.ts – hier NICHT erneut definieren.
export const EN_OFFERS: Record<string, string> = {
  // --- Nachrichten (TS) ---
  'Limit erreicht – lösche ein Angebot oder schalte Premium frei.':
    'Limit reached – delete an offer or unlock Premium.',
  'Angebot gespeichert.': 'Offer saved.',
  'Speichern fehlgeschlagen. Bitte erneut versuchen.': 'Saving failed. Please try again.',
  'Löschen fehlgeschlagen. Bitte erneut versuchen.': 'Deleting failed. Please try again.',
  'Teilen fehlgeschlagen. Bitte erneut versuchen.': 'Sharing failed. Please try again.',
  'Link konnte nicht gelöscht werden. Bitte erneut versuchen.':
    'The link could not be deleted. Please try again.',
  'Rechnung konnte nicht erstellt werden. Bitte erneut versuchen.':
    'The invoice could not be created. Please try again.',
  'Anzahlungsrechnung konnte nicht erstellt werden. Bitte erneut versuchen.':
    'The deposit invoice could not be created. Please try again.',

  // --- Status-/Einheiten-Labels (dynamisch: statusOptions/unitOptions, DYNAMIC_KEYS) ---
  Entwurf: 'Draft',
  Versendet: 'Sent',
  Angenommen: 'Accepted',
  pauschal: 'lump sum',
  'm²': 'm²',
  lfm: 'lin. m',
  Stück: 'pc',
  'Std.': 'hr',

  // --- Seite / Projektverwaltung ---
  'Wähle ein Projekt, erzeuge daraus eine Schätzung und passe die Positionen an. Die Handwerkerleistung steht im Vordergrund; Material erscheint als kompakte Sammelposition.':
    'Choose a project, generate an estimate from it and adjust the line items. Contractor labor is the focus; material appears as one compact line item.',
  'Projekte werden geladen …': 'Loading projects …',
  Projekte: 'Projects',
  'Name des neuen Projekts': 'Name of the new project',
  'Neues Projekt': 'New project',
  'Raum/Räume': 'room(s)',
  Ausgewählt: 'Selected',
  Auswählen: 'Select',
  'Sicher?': 'Are you sure?',
  'Ja, löschen': 'Yes, delete',
  Abbrechen: 'Cancel',
  Löschen: 'Delete',

  // --- Angebotskopf / Aktionen ---
  'Schätzung:': 'Estimate:',
  von: 'of',
  'Angeboten (Free)': 'offers (Free)',
  'Gespeicherter Stand': 'Saved state',
  'Nicht gespeichert': 'Not saved',
  'Aus Projekt aktualisieren': 'Update from project',
  'Speichern …': 'Saving …',
  Speichern: 'Save',
  'PDF herunterladen': 'Download PDF',
  'Link wird erstellt …': 'Creating link …',
  'Teilen-Link erstellen': 'Create share link',
  'Nur aktive Pflichtpositionen werden übernommen': 'Only active mandatory line items are transferred',
  'Speichere zuerst das Angebot': 'Save the offer first',
  'Rechnung wird erstellt …': 'Creating invoice …',
  'Als Rechnung übernehmen': 'Transfer as invoice',

  // --- Versionen ---
  'Noch keine gespeicherte Version.': 'No saved version yet.',
  '+ Neue Version': '+ New version',
  'Neue Version auf dieser Basis erstellen': 'Create new version based on this one',
  'Version löschen?': 'Delete version?',
  Ja: 'Yes',
  Nein: 'No',
  'Diese Version löschen': 'Delete this version',

  // --- Meldungen / Teilen / Tracking ---
  'Das Projekt hat sich seit dem gespeicherten Angebot geändert.':
    'The project has changed since the saved offer.',
  '– deine Anpassungen bleiben erhalten.': '– your changes are kept.',
  'Öffentlicher Link (read-only):': 'Public link (read-only):',
  Kopieren: 'Copy',
  'Geteilt am': 'Shared on',
  'Zuletzt angesehen am': 'Last viewed on',
  Aufrufe: 'views',
  'Angenommen von': 'Accepted by',
  am: 'on',

  // --- Bearbeiten-Sperre (geteilt / angenommen) ---
  'Dieses Angebot ist geteilt. Zum Bearbeiten muss der geteilte Link gelöscht werden.':
    'This offer is shared. To edit it, the shared link must be deleted.',
  'Link löschen & bearbeiten': 'Delete link & edit',
  'Der Kunde kann den Link danach nicht mehr öffnen; die Ansichts-Statistik geht verloren. Wirklich löschen?':
    'The customer will no longer be able to open the link; the view statistics will be lost. Really delete?',
  'Dieses Angebot wurde angenommen und ist unveränderlich. Erstelle für Änderungen eine neue Version.':
    'This offer has been accepted and is immutable. Create a new version to make changes.',

  // --- Ohne Räume / Angebotskopf-Felder ---
  'Dieses Projekt hat noch keine Räume. Lege zuerst über den Wizard Räume an – danach kannst du hier die Schätzung erzeugen und bearbeiten.':
    'This project has no rooms yet. First add rooms via the wizard – then you can generate and edit the estimate here.',
  'Kunde / Empfänger': 'Customer / recipient',
  'Name des Kunden': 'Customer name',
  Anschrift: 'Address',
  'Straße Nr.': 'Street No.',
  'PLZ Ort': 'Postal code city',
  Angebotsnummer: 'Offer number',
  'z. B. 2026-042': 'e.g. 2026-042',
  Angebotsdatum: 'Offer date',
  'Gültig bis': 'Valid until',
  Status: 'Status',
  'Versions-Bezeichnung': 'Version label',
  'z. B. nach Kundengespräch': 'e.g. after customer discussion',
  'Einleitungstext (optional)': 'Intro text (optional)',

  // --- Positionstabelle ---
  'Pos.': 'Item',
  'Nach oben': 'Move up',
  'Nach unten': 'Move down',
  'Gruppe löschen': 'Delete group',
  Pos: 'Item',
  Bezeichnung: 'Description',
  Menge: 'Quantity',
  Einheit: 'Unit',
  Einheitspreis: 'Unit price',
  Gesamt: 'Total',
  Bedarf: 'Optional',
  Aktiv: 'Active',
  'Beschreibung (optional)': 'Description (optional)',
  'Bedarfsposition (nicht in der Summe)': 'Optional line item (not included in the total)',
  'Position nach oben': 'Move item up',
  'Position nach unten': 'Move item down',
  'Position löschen': 'Delete item',
  '+ Position': '+ Item',

  // --- Katalog-Bausteine (R2-C) ---
  '+ aus Katalog…': '+ from catalog…',
  'Aus Vorlagen einfügen…': 'Insert from templates…',
  'Als Vorlage speichern': 'Save as template',

  // --- Kalkulationsoptionen / Summen ---
  'Material je Raum ausweisen': 'Show material per room',
  Materialaufschlag: 'Material surcharge',
  Nachlass: 'Discount',
  '+ Gruppe hinzufügen': '+ Add group',
  Nettobetrag: 'Net amount',
  'Zwischensumme netto': 'Net subtotal',
  'zzgl.': 'plus',
  Gesamtsumme: 'Grand total',

  // --- Anzahlungsrechnung ---
  Anzahlungsrechnung: 'Deposit invoice',
  Anteil: 'Share',
  'Anzahlungsrechnung erstellen': 'Create deposit invoice',

  // --- Schlusstext / Mobile ---
  'Schlusstext (optional)': 'Closing text (optional)',
  'Zahlungsbedingungen, Ausführungszeitraum, Gewährleistung … z. B.: Zahlbar innerhalb von 14 Tagen ohne Abzug. Ausführung nach Absprache.':
    'Payment terms, execution period, warranty … e.g.: Payable within 14 days without deduction. Work carried out by arrangement.'
};
