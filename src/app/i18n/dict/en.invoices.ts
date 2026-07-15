// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Hinweis: Positions-/Summenlabels ('Pos'/'Bezeichnung'/'Menge'/'Einheit'/'Einheitspreis'/
// 'Gesamt'/'Aktiv'/'Nachlass'/'Nettobetrag'/'Zwischensumme netto'/'zzgl.'/'Status'/'Ja'/'Nein'/
// 'Sicher?'/'Löschen'/'Gespeicherter Stand'/'Nicht gespeichert'/'Speichern'/'Speichern …'/
// 'PDF herunterladen'/'Einleitungstext (optional)'/'Schlusstext (optional)'/'Firmenprofil'/
// unitOptions-Labels) sind identisch mit dem Angebots-Editor und bereits über en.offers.ts
// übersetzt – hier NICHT erneut definieren. 'PLZ'/'Ort'/'E-Mail'/'IBAN'/'USt-IdNr.'/
// 'Ansprechpartner'/'Telefon'/'Firmenname'/'Pflicht für XRechnung' kommen aus en.konto.ts.
export const EN_INVOICES: Record<string, string> = {
  // --- Nachrichten (TS) ---
  'Rechnung gespeichert.': 'Invoice saved.',
  'Diese Rechnungsnummer ist bereits vergeben. Bitte wähle eine andere Nummer.':
    'This invoice number is already in use. Please choose a different number.',
  'Firmendaten aus dem Profil übernommen. Zum Sichern bitte „Speichern".':
    'Company details applied from the profile. Click "Save" to store them.',
  'Firmendaten konnten nicht geladen werden. Bitte erneut versuchen.':
    'The company details could not be loaded. Please try again.',

  // --- Status-Label (dynamisch, DYNAMIC_KEYS) ---
  Bezahlt: 'Paid',

  // --- Bezahlt-Lock / Premium-Nur-Lese / Archiv-Hinweis (B1) ---
  'Diese Rechnung ist bezahlt und unveränderlich.': 'This invoice is paid and can no longer be changed.',
  'Bezahlt markieren? Die Rechnung ist danach unveränderlich.':
    'Mark as paid? The invoice becomes unchangeable afterwards.',
  'Ohne Premium-Abo sind Rechnungen schreibgeschützt. Deine Daten bleiben erhalten — Ansehen, PDF/XML und Datenexport sind weiterhin möglich.':
    'Without a Premium subscription, invoices are read-only. Your data is retained — viewing, PDF/XML and data export remain available.',
  'Hinweis: Es gibt keine Langzeitarchivierung. Die gesetzliche Aufbewahrung (§ 147 AO / GoBD) obliegt dir — exportiere Rechnungen regelmäßig in dein Archiv- oder Buchhaltungssystem.':
    'Note: there is no long-term archiving. Statutory retention (Sec. 147 German Fiscal Code / GoBD) is your responsibility — export invoices regularly into your archiving or accounting system.',
  'Mehr in der Anleitung': 'More in the guide',

  // --- Seite / Liste ---
  'Rechnungen entstehen aus einem gespeicherten Angebot über': 'Invoices are created from a saved offer via',
  '. Hier verwaltest du sie, lädst PDF und XRechnung (XML) herunter und passt Pflichtangaben (§ 14 UStG) an.':
    '. Here you manage them, download PDF and XRechnung (XML), and adjust mandatory details (Sec. 14 German VAT Act).',
  'Rechnungen werden geladen …': 'Loading invoices …',
  'Deine Rechnungen': 'Your invoices',
  'Noch keine Rechnungen. Öffne ein gespeichertes Angebot unter „Angebote" und wähle „Als Rechnung übernehmen".':
    'No invoices yet. Open a saved offer under "Offers" and choose "Transfer as invoice".',
  'Zu den Angeboten': 'Go to offers',

  // --- Gruppierte Liste / Rechnungskette ---
  'Weitere Rechnungen': 'Other invoices',
  'Σ gestellt': 'Σ billed',
  'Als bezahlt markieren': 'Mark as paid',
  Rest: 'Remaining',

  // --- Accordion der Rechnungskette (Gruppenzeile: Status + Auf-/Zuklappen) ---
  'Teilweise bezahlt': 'Partially paid',
  Offen: 'Open',
  'Rechnungen ausklappen': 'Expand invoices',
  'Rechnungen einklappen': 'Collapse invoices',

  // --- Rechnungsarten (Badge, expliziter switch → Literal-Scan) ---
  Anzahlung: 'Deposit',
  Abschlag: 'Interim',
  Schlussrechnung: 'Final invoice',

  // --- Schlussrechnungs-Karte (angerechnete Abschläge) ---
  'Angerechnete Abschlagsrechnungen': 'Credited interim invoices',
  'enthaltene USt': 'incl. VAT',
  Restbetrag: 'Remaining amount',
  'Guthaben zugunsten des Kunden': 'Credit in favour of the customer',
  'Eingefroren bei Erstellung. Zum Ändern: Schlussrechnung löschen, Abschläge anpassen, neu erstellen.':
    'Frozen at creation. To change: delete the final invoice, adjust the interim payments, then recreate it.',

  // --- Editor-Kopf ---
  Rechnung: 'Invoice',
  'XRechnung (XML)': 'XRechnung (XML)',
  'Für die XRechnung fehlen:': 'Missing for the XRechnung:',
  'XRechnung (XML) herunterladen': 'Download XRechnung (XML)',
  'XRechnung ist nur für Betriebe mit Sitz in Deutschland verfügbar.':
    'XRechnung is only available for businesses based in Germany.',
  'Die E-Mail des Kunden braucht XRechnung für die elektronische Zustellung (BT-49).':
    'XRechnung needs the customer email for electronic delivery (BT-49).',
  'Fehlende Absender-/Bank-/Steuerdaten (z. B. IBAN) im': 'Missing sender/bank/tax details (e.g. IBAN) in the',
  'ergänzen und dann hier „Firmendaten aus Profil aktualisieren" klicken.':
    'add them, then click "Update company details from profile" here.',

  // --- Rechnungskopf-Felder ---
  Rechnungsempfänger: 'Invoice recipient',
  'Name / Firma': 'Name / company',
  Kundenname: 'Customer name',
  'Straße & Nr.': 'Street & no.',
  Land: 'Country',
  'kunde@beispiel.de': 'customer@example.com',
  'Elektronische Adresse des Empfängers – Pflichtangabe der XRechnung (BT-49).':
    'Electronic address of the recipient – mandatory XRechnung field (BT-49).',
  Rechnungsdaten: 'Invoice details',
  Rechnungsnummer: 'Invoice number',
  Rechnungsdatum: 'Invoice date',
  'Zahlbar bis': 'Due date',
  Leistungsdatum: 'Service date',
  'Leistungszeitraum von': 'Service period from',
  bis: 'to',
  'Käuferreferenz / Leitweg-ID (BT-10)': 'Buyer reference / routing ID (BT-10)',
  'n/a (bei Behörden: Leitweg-ID)': 'n/a (for public authorities: routing ID)',
  'Pflichtfeld der XRechnung. Bei öffentlichen Auftraggebern die Leitweg-ID eintragen, sonst „n/a".':
    'Mandatory XRechnung field. Enter the routing ID for public sector clients, otherwise "n/a".',
  'Sieht nach einer Leitweg-ID aus, entspricht aber nicht dem üblichen Format (z. B. 04011000-1234512345-06).':
    'Looks like a routing ID, but does not match the usual format (e.g. 04011000-1234512345-06).',
  'Pflicht für die XRechnung (XML).': 'Required for the XRechnung (XML).',

  // --- Absender-Snapshot ---
  'Absender-/Steuer-/Bankdaten stammen aus deinem': 'Sender/tax/bank details come from your',
  'und sind als Snapshot in dieser Rechnung gespeichert:': 'and are stored as a snapshot in this invoice:',
  'Steuernr.': 'Tax no.',
  'Absender-/Steuer-/Bankdaten aus dem aktuellen Firmenprofil in diese Rechnung übernehmen':
    'Apply sender/tax/bank details from the current company profile to this invoice',
  'Wird übernommen …': 'Applying …',
  'Firmendaten aus Profil aktualisieren': 'Update company details from profile',

  // --- Texte / Positionen / Summen ---
  'Sehr geehrte …, für die ausgeführten Arbeiten berechne ich Ihnen:':
    'Dear Sir or Madam, for the work carried out I am charging you:',
  Rechnungsbetrag: 'Invoice amount',
  '0 % MwSt.: Auf PDF und XRechnung wird automatisch der § 19-Hinweis (Kleinunternehmerregelung) ausgewiesen.':
    '0% VAT: the PDF and XRechnung automatically show the Sec. 19 notice (small business exemption).',
  'Zahlungsbedingungen, Dank … z. B.: Zahlbar innerhalb von 14 Tagen ohne Abzug auf das unten genannte Konto.':
    'Payment terms, thanks … e.g.: Payable within 14 days without deduction to the account stated below.',

  // --- XRechnung-Pflichtfeldnamen (Modell, dynamisch gerendert – DYNAMIC_KEYS) ---
  'Straße (Absender)': 'Street (sender)',
  'PLZ (Absender)': 'Postal code (sender)',
  'Ort (Absender)': 'City (sender)',
  'Steuernummer oder USt-IdNr.': 'Tax number or VAT ID',
  'Leistungsdatum oder Leistungszeitraum': 'Service date or service period',
  'Zahlungsziel (Fälligkeit)': 'Payment term (due date)',
  'Käuferreferenz (BT-10)': 'Buyer reference (BT-10)',
  'Straße (Kunde)': 'Street (customer)',
  'PLZ (Kunde)': 'Postal code (customer)',
  'Ort (Kunde)': 'City (customer)',
  'E-Mail des Kunden (Pflicht für XRechnung-Versand)': 'Customer email (required for XRechnung delivery)',
  'Mindestens eine aktive Position': 'At least one active line item',

  // --- Datenexport (B2: ZIP – PDFs + XRechnung-XML + CSV) ---
  Datenexport: 'Data export',
  'Exportiere Rechnungen als ZIP — PDFs, XRechnung-XML und CSV-Übersicht — für dein Archiv- oder Buchhaltungssystem.':
    'Export invoices as a ZIP — PDFs, XRechnung XML and a CSV overview — for your archiving or accounting system.',
  'Zeitraum von': 'Period from',
  'Zeitraum bis': 'Period to',
  'Nummer von': 'Number from',
  'Nummer bis': 'Number to',
  'ZIP exportieren': 'Export ZIP',
  'Export läuft …': 'Export running …',
  'Rechnungen exportiert.': 'invoices exported.',
  'Keine Rechnungen im gewählten Bereich.': 'No invoices in the selected range.',
  'Export fehlgeschlagen. Bitte erneut versuchen.': 'Export failed. Please try again.'
};
