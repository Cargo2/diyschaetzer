/**
 * Lead-Funnel (Welle 1). Ein Interessent fordert am Wizard-Ende ein Angebot an;
 * die Anfrage wird nach E-Mail-Bestätigung (Double-Opt-in) an bis zu 3
 * Fliesenleger-Betriebe weitergegeben.
 *
 * DSGVO-Kernstück: Ohne aktive Einwilligung wird KEIN Lead gespeichert. Der
 * Einwilligungstext + die Version werden serverseitig fixiert und mit dem Lead
 * gespeichert; der Client zeigt WÖRTLICH denselben Text an (nur Anzeige).
 */

/** Gewünschter Umsetzungszeitraum (Wert = DB-`timeframe`-Check der Lead-Migration). */
export type LeadTimeframe = 'asap' | '1_3_months' | '3_6_months' | 'open';

/** Auswahloptionen im Formular (deutsche Labels). */
export const LEAD_TIMEFRAME_OPTIONS: ReadonlyArray<{ value: LeadTimeframe; label: string }> = [
  { value: 'asap', label: 'So bald wie möglich' },
  { value: '1_3_months', label: 'In 1–3 Monaten' },
  { value: '3_6_months', label: 'In 3–6 Monaten' },
  { value: 'open', label: 'Zeitlich noch flexibel' }
];

export const LEAD_TIMEFRAME_LABELS: Record<LeadTimeframe, string> = {
  asap: 'So bald wie möglich',
  '1_3_months': 'In 1–3 Monaten',
  '3_6_months': 'In 3–6 Monaten',
  open: 'Zeitlich noch flexibel'
};

/** Status eines Leads (Wert = DB-`status`-Check der Lead-Migration). */
export type LeadStatus = 'pending_confirmation' | 'confirmed' | 'distributed' | 'expired';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  pending_confirmation: 'Unbestätigt',
  confirmed: 'Bestätigt',
  distributed: 'Weitergegeben',
  expired: 'Abgelaufen'
};

/**
 * Einwilligungs-Version. Muss mit CONSENT_VERSION der Edge Function `lead-submit`
 * übereinstimmen – gespeichert wird immer die Server-Fassung.
 */
export const LEAD_CONSENT_VERSION = 'v1-2026-07';

/**
 * Einwilligungstext v1-2026-07 – WÖRTLICH identisch zur Edge Function `lead-submit`
 * (CONSENT_TEXT). Wird hier nur angezeigt; die serverseitige Fassung ist die
 * gespeicherte Wahrheit.
 */
export const LEAD_CONSENT_TEXT =
  'Ich willige ein, dass fliesen-kosten meine Angaben (Name, PLZ, E-Mail, Telefonnummer) ' +
  'und die Projektdaten aus dem Rechner an bis zu 3 passende Fliesenleger-Betriebe ' +
  'weitergibt, damit diese mich zwecks Angebotserstellung kontaktieren. Ich kann diese ' +
  'Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Details und ' +
  'Widerrufskontakt: Datenschutzerklärung.';

/**
 * Kompakter, personenfreier Auszug der Rechner-Ergebnisse, der der Anfrage als
 * SNAPSHOT (kein Live-Verweis) beigelegt wird. Enthält bewusst KEINE
 * personenbezogenen Daten – nur die Eckdaten des kalkulierten Raums.
 */
export interface LeadProjectSnapshot {
  roomName: string;
  roomType: string;
  areaM2: number;
  diyTotal: number;
  professionalTotal: number;
}

/** Eingabe des Lead-Formulars (inkl. Honeypot). */
export interface LeadSubmission {
  name: string;
  postalCode: string;
  email: string;
  phone: string | null;
  timeframe: LeadTimeframe;
  message: string | null;
  consent: boolean;
  projectSnapshot: LeadProjectSnapshot;
  /** Honeypot-Feld – bei echten Nutzern immer leer. */
  website: string;
}

/**
 * Ergebnis eines Submit-Versuchs. Bewusst als diskriminierte Union (statt Exception),
 * damit die UI differenzierte Meldungen (400/409/503) zeigen kann.
 */
export type LeadSubmitResult =
  | { ok: true }
  | { ok: false; reason: LeadSubmitError };

export type LeadSubmitError =
  /** 400 – Validierung/Einwilligung fehlgeschlagen. */
  | 'validation'
  /** 409 – Rate-Limit (zu viele Anfragen je E-Mail/24 h). */
  | 'rate_limited'
  /** 503 – Bestätigungsmail nicht konfiguriert/versendbar; Lead NICHT gespeichert. */
  | 'mail_unavailable'
  /** Netzwerk-/Unbekannter Fehler. */
  | 'unknown';

/** Ergebnis der Double-Opt-in-Bestätigung. */
export type LeadConfirmResult = 'confirmed' | 'invalid' | 'error';

/**
 * Formatiert einen Projekt-Snapshot in anzeigbare Label/Wert-Paare (Admin- und
 * Contractor-Ansicht). Fehlt der Snapshot, kommt eine leere Liste zurück.
 */
export function formatLeadSnapshot(
  snapshot: LeadProjectSnapshot | null | undefined
): ReadonlyArray<{ label: string; value: string }> {
  if (!snapshot) {
    return [];
  }
  const euro = (value: number): string =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  const area = (value: number): string =>
    `${new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)} m²`;
  return [
    { label: 'Raum', value: snapshot.roomName },
    { label: 'Raumtyp', value: snapshot.roomType },
    { label: 'Zu fliesende Fläche', value: area(snapshot.areaM2) },
    { label: 'DIY-Schätzung', value: euro(snapshot.diyTotal) },
    { label: 'Fliesenleger-Schätzung', value: euro(snapshot.professionalTotal) }
  ];
}

/** Deutsche Fehlermeldungen für die Submit-Zustände (UI). */
export const LEAD_SUBMIT_ERROR_MESSAGES: Record<LeadSubmitError, string> = {
  validation:
    'Bitte prüfe deine Eingaben (Name, PLZ, E-Mail) und setze die Einwilligung, dann erneut absenden.',
  rate_limited:
    'Für diese E-Mail-Adresse liegen bereits mehrere Anfragen vor. Bitte versuche es später erneut.',
  mail_unavailable:
    'Die Anfrage konnte gerade nicht verschickt werden (Bestätigungsmail nicht verfügbar). Bitte versuche es später noch einmal.',
  unknown: 'Das hat leider nicht geklappt. Bitte versuche es in einigen Minuten erneut.'
};
