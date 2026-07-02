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
  /** Standard-Einleitungstext, füllt ein neu erzeugtes Angebot vor. */
  offerIntroText: string;
  /** Standard-Schlusstext (Zahlung/Ausführung), füllt ein neu erzeugtes Angebot vor. */
  offerOutroText: string;
  /** Standard-Materialaufschlag in % für neu erzeugte Angebote. */
  materialSurchargePercent: number;
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
    offerIntroText: '',
    offerOutroText: '',
    materialSurchargePercent: 0
  };
}
