/**
 * Firmenprofil eines Profis (contractor), Phase 13. Basis für gebrandetes PDF
 * und – als spätere Erweiterung – Profil-Standardannahmen.
 */
export interface CompanyProfile {
  companyName: string;
  contactName: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  /** USt-IdNr. */
  vatId: string;
  /** Steuernummer (falls keine USt-IdNr. vorliegt) – für Rechnung/XRechnung. */
  taxNumber: string;
  /** IBAN für die Zahlungsdaten auf Rechnung/XRechnung. */
  iban: string;
  /** BIC (optional) für die Zahlungsdaten. */
  bic: string;
  /** Name der Bank (optional) für die Zahlungsdaten. */
  bankName: string;
  /** Standard-Einleitungstext, füllt ein neu erzeugtes Angebot vor. */
  offerIntroText: string;
  /** Standard-Schlusstext (Zahlung/Ausführung), füllt ein neu erzeugtes Angebot vor. */
  offerOutroText: string;
  /** Standard-Materialaufschlag in % für neu erzeugte Angebote. */
  materialSurchargePercent: number;

  // ── Lead-Empfangsdaten (additiv, Migration 0018) ──────────────────────────
  /** Empfang von Lead-Anfragen aktiv. */
  leadsActive: boolean;
  /** PLZ-Gebiete (Präfixe), in denen der Betrieb Anfragen erhalten möchte. */
  leadZipAreas: string[];
  /** Bevorzugte Raumarten (RoomType-Werte). */
  leadRoomTypes: string[];
  /** Gewünschte maximale Anzahl Leads pro Monat. */
  leadMaxPerMonth: number;
  /** Bevorzugter Kontaktkanal für weitergegebene Anfragen. */
  leadContactChannel: 'email' | 'phone';
}

/** Leeres Firmenprofil (alle Felder leer) als Formular-/Lade-Default. */
export function emptyCompanyProfile(): CompanyProfile {
  return {
    companyName: '',
    contactName: '',
    street: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    vatId: '',
    taxNumber: '',
    iban: '',
    bic: '',
    bankName: '',
    offerIntroText: '',
    offerOutroText: '',
    materialSurchargePercent: 0,
    leadsActive: false,
    leadZipAreas: [],
    leadRoomTypes: [],
    leadMaxPerMonth: 5,
    leadContactChannel: 'email'
  };
}
