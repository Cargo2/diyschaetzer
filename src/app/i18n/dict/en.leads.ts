// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Lead-Formular (components/lead-form) + Handwerkerverzeichnis
// (components/contractor-directory).
// Hinweis: 'PLZ'/'E-Mail'/'Website' sind bereits über en.konto.ts übersetzt – hier
// NICHT erneut definieren.
export const EN_LEADS: Record<string, string> = {
  // --- Lead-Formular: Kopf ---
  'Angebote von Fliesenlegern erhalten': 'Get quotes from tiling contractors',
  'Kostenlos passende Fachbetriebe anfragen': 'Request matching contractors for free',
  'Wir geben deine Anfrage an': 'We pass your request to',
  'bis zu 3 passende Fliesenleger-Betriebe': 'up to 3 matching tiling contractors',
  'weiter – unverbindlich und kostenlos. Die Eckdaten deines Raums hängen wir automatisch an.':
    'on – free of charge and with no obligation. We automatically attach the key details of your room.',

  // --- Erfolgsmeldung (Double-Opt-in) ---
  'Fast geschafft – bitte E-Mail bestätigen.': 'Almost done – please confirm your email.',
  'Wir haben dir eine E-Mail geschickt. Bestätige darin deine Anfrage, damit wir sie an passende Betriebe weitergeben dürfen. Ohne Bestätigung wird nichts weitergegeben.':
    "We've sent you an email. Confirm your request in it so we can pass it on to matching contractors. Without confirmation, nothing will be forwarded.",

  // --- Formularfelder ---
  'Bitte dieses Feld leer lassen': 'Please leave this field empty',
  Name: 'Name',
  Pflichtfeld: 'Required field',
  'Telefon (optional)': 'Phone (optional)',
  'Gewünschter Zeitraum': 'Desired timeframe',
  'Nachricht (optional)': 'Message (optional)',
  'Besonderheiten, Wünsche, Erreichbarkeit …': 'Special requirements, preferences, availability …',

  // --- Einwilligungstext (Consent) ---
  'Ich willige ein, dass fliesen-kosten meine Angaben (Name, PLZ, E-Mail, Telefonnummer) und die Projektdaten aus dem Rechner an bis zu 3 passende Fliesenleger-Betriebe weitergibt, damit diese mich zwecks Angebotserstellung kontaktieren. Ich kann diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Details und Widerrufskontakt: ':
    'I consent to fliesen-kosten sharing my details (name, postal code, email, phone number) and the project data from the calculator with up to 3 matching tiling contractors so they can contact me to prepare a quote. I can withdraw this consent at any time with effect for the future. Details and contact for withdrawal: ',
  Datenschutzerklärung: 'Privacy Policy',

  // --- Buttons/Status ---
  'Wird gesendet …': 'Sending …',
  'Anfrage absenden': 'Submit request',

  // --- Zeitraum-Optionen (LEAD_TIMEFRAME_OPTIONS, dynamisch) ---
  'So bald wie möglich': 'As soon as possible',
  'In 1–3 Monaten': 'In 1–3 months',
  'In 3–6 Monaten': 'In 3–6 months',
  'Zeitlich noch flexibel': 'Timing still flexible',

  // --- Fehlermeldungen (LEAD_SUBMIT_ERROR_MESSAGES, dynamisch) ---
  'Bitte prüfe deine Eingaben (Name, PLZ, E-Mail) und setze die Einwilligung, dann erneut absenden.':
    'Please check your details (name, postal code, email) and confirm your consent, then submit again.',
  'Für diese E-Mail-Adresse liegen bereits mehrere Anfragen vor. Bitte versuche es später erneut.':
    'There are already several requests for this email address. Please try again later.',
  'Die Anfrage konnte gerade nicht verschickt werden (Bestätigungsmail nicht verfügbar). Bitte versuche es später noch einmal.':
    'The request could not be sent right now (confirmation email unavailable). Please try again later.',
  'Das hat leider nicht geklappt. Bitte versuche es in einigen Minuten erneut.':
    "Unfortunately that didn't work. Please try again in a few minutes.",

  // --- Handwerker-Verzeichnis (contractor-directory) ---
  'Fachbetriebe finden': 'Find contractors',
  'Betriebe in deiner Region': 'Contractors in your area',
  'Gib deine Postleitzahl ein und sieh Premium-Fachbetriebe, die in deinem Gebiet Fliesen verlegen. Die PLZ übernehmen wir gleich in die Anfrage unten.':
    "Enter your postal code to see premium contractors who tile in your area. We'll carry the postal code straight into the request below.",
  Postleitzahl: 'Postal code',
  'Suche …': 'Searching …',
  'Betriebe anzeigen': 'Show contractors',
  'Die Betriebe konnten nicht geladen werden. Bitte versuche es erneut.':
    'The contractors could not be loaded. Please try again.',
  'Noch kein Premium-Betrieb in deiner Region – stelle trotzdem eine Anfrage.':
    'No premium contractor in your area yet – submit a request anyway.'
};
