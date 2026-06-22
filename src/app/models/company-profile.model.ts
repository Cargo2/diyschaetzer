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
    vatId: ''
  };
}
