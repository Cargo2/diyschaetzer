// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Hinweis: die Konto-Seitentitel ('Firmenprofil', 'Eigene Preise', 'Anfragen empfangen')
// sind bereits über en.shell.ts (Navigation) übersetzt – hier NICHT erneut definieren.
export const EN_KONTO: Record<string, string> = {
  // --- Firmenprofil ---
  Dein: 'Your',
  Firmenname: 'Company name',
  'erscheint als Kopf- und Fußzeile auf deinen Export-Dateien (PDF/Excel). Die übrigen Angaben dienen als Grundlage für deine Profi-Angebote.':
    'appears as the header and footer on your export files (PDF/Excel). The other details form the basis for your professional quotes.',
  'Profil wird geladen …': 'Loading profile …',
  'Pflicht für XRechnung': 'Required for XRechnung (e-invoice)',
  Ansprechpartner: 'Contact person',
  'Pflicht für XRechnung, sofern kein Firmenname angegeben ist':
    'Required for XRechnung, unless a company name is provided',
  'Straße & Hausnummer': 'Street & house number',
  PLZ: 'Postal code',
  Ort: 'City',
  'Land des Firmensitzes': 'Country of company headquarters',
  Telefon: 'Phone',
  'E-Mail': 'Email',
  Website: 'Website',
  'USt-IdNr.': 'VAT ID',
  'Pflicht für XRechnung, sofern keine Steuernummer angegeben ist':
    'Required for XRechnung, unless a tax number is provided',
  'Zahlungsdaten für Rechnungen': 'Payment details for invoices',
  'Diese Angaben erscheinen auf deinen Rechnungen (PDF + XRechnung). Ohne USt-IdNr. genügt die Steuernummer; IBAN/BIC sind die Zahlungsdaten für deine Kunden.':
    'These details appear on your invoices (PDF + XRechnung). Without a VAT ID, the tax number is sufficient; IBAN/BIC are the payment details for your customers.',
  Steuernummer: 'Tax number',
  'z. B. 151/815/08151': 'e.g. 151/815/08151',
  'Pflicht für XRechnung, sofern keine USt-IdNr. angegeben ist':
    'Required for XRechnung, unless a VAT ID is provided',
  IBAN: 'IBAN',
  BIC: 'BIC',
  Bank: 'Bank',
  'Pflicht für die XRechnung (elektronischer Rechnungsversand) – das Profil bleibt auch ohne diese Angaben speicherbar, sie werden erst beim XRechnung-Export benötigt.':
    'Required for XRechnung (electronic invoicing) – the profile can still be saved without these details; they are only needed for the XRechnung export.',
  'Speichern …': 'Saving …',
  Speichern: 'Save',
  'Das Firmenprofil konnte nicht geladen werden.': 'The company profile could not be loaded.',
  'Speichern fehlgeschlagen. Bitte versuche es erneut.': 'Saving failed. Please try again.',
  'Firmenprofil gespeichert.': 'Company profile saved.',

  // --- Länderauswahl (COUNTRY_OPTIONS) ---
  Deutschland: 'Germany',
  Österreich: 'Austria',
  Schweiz: 'Switzerland',
  Polen: 'Poland',
  Tschechien: 'Czechia',
  Niederlande: 'Netherlands',
  Belgien: 'Belgium',
  Frankreich: 'France',
  Luxemburg: 'Luxembourg',
  Dänemark: 'Denmark',

  // --- Eigene Preise ---
  'Hinterlege deine eigenen Einheitspreise und den Fliesen-Richtwert. Sie gelten als Standard in jeder Raumkalkulation. Leer lassen = System-Standard (als Platzhalter angezeigt). In der einzelnen Kalkulation geänderte Werte haben weiterhin Vorrang.':
    'Enter your own unit prices and the tile reference price. They apply as the default in every room calculation. Leave blank = system default (shown as a placeholder). Values changed in an individual calculation still take precedence.',
  'Preise werden geladen …': 'Loading prices …',
  'Standard-Preise speichern': 'Save default prices',

  // --- PROFILE_PRICE_FIELDS: label ---
  'Fliesen-Richtwert': 'Tile reference price',
  'Baustelle einrichten': 'Site setup',
  'Bodenfliesen Standard': 'Floor tiles, standard',
  'Bodenfliesen Großformat': 'Floor tiles, large format',
  'Wandfliesen verlegen': 'Laying wall tiles',
  Flächenabdichtung: 'Surface waterproofing',
  'Dichtband setzen': 'Fitting sealing tape',
  'Dichtecken setzen': 'Fitting sealing corners',
  'Dichtmanschetten setzen': 'Fitting sealing sleeves',
  'Installationslöcher herstellen': 'Drilling installation holes',
  'Kleine Spachtelarbeiten': 'Minor filler work',
  'Ausgleichsmasse einbringen': 'Applying leveling compound',
  'Profile setzen': 'Fitting profiles',
  'Silikonfugen herstellen': 'Applying silicone joints',
  'Sockel setzen': 'Fitting skirting',
  'MwSt.': 'VAT',

  // --- PROFILE_PRICE_FIELDS: unit ---
  '€/m²': '€/m²',
  EUR: 'EUR',
  'EUR/m²': 'EUR/m²',
  'EUR/lfm': 'EUR/lin.m',
  'EUR/Stück': 'EUR/pc',
  '%': '%',

  'Standard-Preise gespeichert.': 'Default prices saved.',
  'Speichern der Standard-Preise fehlgeschlagen.': 'Saving the default prices failed.',
  'Die Standard-Preise konnten nicht geladen werden.': 'The default prices could not be loaded.',

  // --- Anfragen empfangen ---
  'Lege deine': 'Set your',
  'Angebots-Textvorlagen': 'offer text templates',
  'fest und steuere, ob und für welche Gebiete/Raumarten du bestätigte Interessenten-Anfragen erhalten möchtest.':
    'and control whether and for which areas/room types you want to receive confirmed prospect inquiries.',
  'Einstellungen werden geladen …': 'Loading settings …',
  'Angebots-Vorlagen': 'Offer templates',
  'füllen jedes': 'pre-fill every',
  'neu erzeugte': 'newly created',
  'Angebot vor (pro Angebot weiterhin überschreibbar).': 'offer (still overwritable per offer).',
  'Standard-Einleitungstext': 'Default intro text',
  'Sehr geehrte …, vielen Dank für Ihre Anfrage. Für die genannten Arbeiten biete ich Ihnen an:':
    'Dear Sir or Madam, thank you for your inquiry. For the work described, I am pleased to offer you:',
  'Standard-Schlusstext': 'Default closing text',
  'Zahlbar innerhalb von 14 Tagen ohne Abzug. Ausführung nach Absprache. Wir freuen uns auf Ihren Auftrag.':
    'Payable within 14 days without deduction. Work carried out by arrangement. We look forward to your order.',
  'Standard-Materialaufschlag (%)': 'Default material surcharge (%)',
  'Lead-Anfragen empfangen': 'Receiving lead inquiries',
  'lege fest, ob und für welche Gebiete/Raumarten du bestätigte Interessenten-Anfragen erhalten möchtest. Wird mit „Speichern" übernommen.':
    'decide whether and for which areas/room types you want to receive confirmed prospect inquiries. Applied when you click "Save".',
  'Anfragen aktiv empfangen': 'Actively receive inquiries',
  'PLZ-Gebiete (mit Komma trennen, z. B. 96117, 960, 91)': 'Postal code areas (comma-separated, e.g. 96117, 960, 91)',
  Raumarten: 'Room types',
  'Max. Anfragen / Monat': 'Max. inquiries / month',
  Kontaktkanal: 'Contact channel',
  'Die Einstellungen konnten nicht geladen werden.': 'The settings could not be loaded.',
  'Einstellungen gespeichert.': 'Settings saved.'
};
