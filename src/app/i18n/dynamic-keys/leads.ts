/**
 * Dynamische Übersetzungs-Keys für den Bereich Lead-Formular/Handwerkerverzeichnis
 * (components/lead-form, components/contractor-directory).
 *
 * Zweck: Keys, die zur Laufzeit über Variablen gerendert werden – z. B.
 * `...Object.values(LABEL_MAP)` oder `value | t` mit einem Variablen-Wert – und
 * die der Literal-Scan der Coverage-Spec (`'…' | t` / `t('…')`) NICHT sieht.
 *
 * Damit die Orphan-Prüfung solche Keys nicht als tot meldet, werden sie hier
 * gepflegt und von der Coverage-Spec in ihr `DYNAMIC_KEYS`-Array übernommen.
 * Jedes Übersetzungspaket pflegt NUR sein eigenes Modul.
 *
 * Herkunft: `consentTextPrefix` (Slice von `LEAD_CONSENT_TEXT`, models/lead.model.ts),
 * `errorMessage()` (LEAD_SUBMIT_ERROR_MESSAGES-Werte), `timeframeOptions[].label`
 * (LEAD_TIMEFRAME_OPTIONS) – alle über `this.i18n.t(variable)`/`option.label | t`
 * gerendert, nicht als Template-Literal.
 */
export const DYNAMIC_KEYS_LEADS: readonly string[] = [
  // --- consentTextPrefix (Slice von LEAD_CONSENT_TEXT) ---
  'Ich willige ein, dass fliesen-kosten meine Angaben (Name, PLZ, E-Mail, Telefonnummer) und die Projektdaten aus dem Rechner an bis zu 3 passende Fliesenleger-Betriebe weitergibt, damit diese mich zwecks Angebotserstellung kontaktieren. Ich kann diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Details und Widerrufskontakt: ',

  // --- timeframeOptions[].label (LEAD_TIMEFRAME_OPTIONS) ---
  'So bald wie möglich',
  'In 1–3 Monaten',
  'In 3–6 Monaten',
  'Zeitlich noch flexibel',

  // --- errorMessage() (LEAD_SUBMIT_ERROR_MESSAGES) ---
  'Bitte prüfe deine Eingaben (Name, PLZ, E-Mail) und setze die Einwilligung, dann erneut absenden.',
  'Für diese E-Mail-Adresse liegen bereits mehrere Anfragen vor. Bitte versuche es später erneut.',
  'Die Anfrage konnte gerade nicht verschickt werden (Bestätigungsmail nicht verfügbar). Bitte versuche es später noch einmal.',
  'Das hat leider nicht geklappt. Bitte versuche es in einigen Minuten erneut.'
];
