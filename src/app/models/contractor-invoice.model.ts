import {
  ContractorOffer,
  ContractorOfferSection,
  offerDiscountAmount,
  offerGrossTotal,
  offerNetAfterDiscount,
  offerNetTotal,
  offerVatAmount
} from './contractor-offer.model';

/** Bearbeitungsstand einer Rechnung (Anzeige-Badge, kein Workflow-Zwang). */
export type ContractorInvoiceStatus = 'draft' | 'sent' | 'paid';

/** Deutsche Beschriftung je Status (für die UI). */
export const CONTRACTOR_INVOICE_STATUS_LABELS: Record<ContractorInvoiceStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  paid: 'Bezahlt'
};

/**
 * Minimaler **struktureller** Verkäufer-Typ: genau die Firmenprofil-Felder, die für
 * den Rechnungs-Verkäufer-Snapshot gelesen werden. Bewusst strukturell (kein Import
 * von {@link CompanyProfile}), damit der Rechnungscode nicht an der additiven
 * Modell-Erweiterung `taxNumber`/`iban`/`bic`/`bankName` (Migration 0021) hängt.
 * Ein vollständiges `CompanyProfile` ist zuweisungskompatibel (alle Felder optional).
 */
export interface InvoiceSellerSource {
  companyName?: string;
  contactName?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  /** Land des Firmensitzes (ISO 3166-1 alpha-2). Steuert die XRechnung-Pflicht. */
  countryCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  /** USt-IdNr. */
  vatId?: string;
  /** Steuernummer (Fallback, wenn keine USt-IdNr. vorliegt). */
  taxNumber?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
}

/**
 * Verkäuferdaten (Fachbetrieb) als **Snapshot** in der Rechnung eingefroren –
 * so bleiben Anschrift/Steuer-/Bankdaten der Rechnung auch dann korrekt, wenn
 * das Firmenprofil später geändert wird (§ 14 UStG: Rechnung ist ein Dokument).
 */
export interface ContractorInvoiceSeller {
  companyName: string;
  contactName: string;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  phone: string;
  email: string;
  website: string;
  /** USt-IdNr. (bevorzugt für die XRechnung PartyTaxScheme). */
  vatId: string;
  /** Steuernummer (Fallback, wenn keine USt-IdNr. vorliegt). */
  taxNumber: string;
  iban: string;
  bic: string;
  bankName: string;
}

/** Käuferanschrift – strukturiert (Pflicht für die XRechnung PostalAddress). */
export interface ContractorInvoiceCustomer {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  /** E-Mail des Käufers (BT-49 Buyer electronic address, PEPPOL-EN16931-R010). */
  email: string;
}

/**
 * Eine Rechnung, aus einem gespeicherten Angebot abgeleitet und danach frei
 * editierbar (gleiches Positions-/Editor-Muster wie {@link ContractorOffer}).
 * Positionen liegen als {@link ContractorOfferSection}[] (strukturgleich); die
 * Summen werden **abgeleitet** ({@link invoiceNetTotal} etc.), nie gespeichert.
 */
export interface ContractorInvoice {
  /** Eindeutige Rechnungs-ID (PK in der DB). */
  id?: string;
  /** Herkunftsprojekt (informativ, kein harter FK-Zwang). */
  projectId?: string | null;
  /** Herkunftsangebot (informativ; Angebot darf später gelöscht werden). */
  offerId?: string | null;
  /** Projektname (Untertitel im PDF/Dateiname). */
  projectName: string;
  /** Rechnungsnummer `RE-<JJJJ>-<lfd>` – fortlaufend-einmalig je Betrieb (§ 14). */
  invoiceNumber: string;
  /** Rechnungsdatum (ISO `yyyy-mm-dd`). */
  invoiceDate: string;
  /** Leistungsdatum (ISO); alternativ Zeitraum – eines ist Pflicht (§ 14). */
  serviceDate?: string;
  /** Leistungszeitraum Beginn (ISO). */
  servicePeriodStart?: string;
  /** Leistungszeitraum Ende (ISO). */
  servicePeriodEnd?: string;
  /** Zahlungsziel (ISO); Default +14 Tage. */
  dueDate: string;
  /** Leitweg-ID/Käuferreferenz (BT-10, XRechnung-Pflicht; Default `n/a`). */
  buyerReference: string;
  status: ContractorInvoiceStatus;
  vatPercent: number;
  /** Nachlass in % auf den Nettobetrag (0 = ohne). */
  discountPercent?: number;
  sections: ContractorOfferSection[];
  /** Rechnungsempfänger (strukturiert). */
  customer: ContractorInvoiceCustomer;
  /** Eingefrorener Verkäufer-Snapshot aus dem Firmenprofil. */
  seller: ContractorInvoiceSeller;
  /** Einleitungstext über dem Leistungsverzeichnis. */
  introText?: string;
  /** Schlusstext unter den Summen. */
  outroText?: string;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Heutiges Datum als ISO `yyyy-mm-dd`. */
export function invoiceTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** ISO-Datum in `days` Tagen ab heute (für das Default-Zahlungsziel). */
export function invoiceDueDateIso(days = 14, from: Date = new Date()): string {
  const date = new Date(from.getTime());
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Adaptiert eine Rechnung auf die Angebots-Form, damit die **geteilten**
 * Summen-/Nummerierungs-Helfer des Angebots (`offerNetTotal`, `offerLineNumber`,
 * …) unverändert wiederverwendet werden – eine einzige Quelle der Wahrheit.
 */
export function invoiceAsOffer(invoice: ContractorInvoice): ContractorOffer {
  return {
    projectId: invoice.projectId ?? '',
    projectName: invoice.projectName,
    vatPercent: toNumber(invoice.vatPercent),
    discountPercent: toNumber(invoice.discountPercent),
    sections: invoice.sections,
    customer: { name: invoice.customer.name, address: '' }
  } as ContractorOffer;
}

/** Nettobetrag über alle Gruppen (vor Nachlass). */
export function invoiceNetTotal(invoice: ContractorInvoice): number {
  return offerNetTotal(invoiceAsOffer(invoice));
}

/** Nachlassbetrag. 0, wenn kein Nachlass. */
export function invoiceDiscountAmount(invoice: ContractorInvoice): number {
  return offerDiscountAmount(invoiceAsOffer(invoice));
}

/** Nettobetrag nach Abzug des Nachlasses (Bemessungsgrundlage der MwSt.). */
export function invoiceNetAfterDiscount(invoice: ContractorInvoice): number {
  return offerNetAfterDiscount(invoiceAsOffer(invoice));
}

/** MwSt.-Betrag auf den Nettobetrag nach Nachlass. */
export function invoiceVatAmount(invoice: ContractorInvoice): number {
  return offerVatAmount(invoiceAsOffer(invoice));
}

/** Bruttosumme (Netto nach Nachlass + MwSt.) = zahlbarer Betrag. */
export function invoiceGrossTotal(invoice: ContractorInvoice): number {
  return offerGrossTotal(invoiceAsOffer(invoice));
}

/** Leerer Verkäufer-Snapshot (Formular-/Lade-Default). */
export function emptyInvoiceSeller(): ContractorInvoiceSeller {
  return {
    companyName: '',
    contactName: '',
    street: '',
    postalCode: '',
    city: '',
    countryCode: 'DE',
    phone: '',
    email: '',
    website: '',
    vatId: '',
    taxNumber: '',
    iban: '',
    bic: '',
    bankName: ''
  };
}

/** Leere Käuferanschrift (Formular-/Lade-Default). */
export function emptyInvoiceCustomer(): ContractorInvoiceCustomer {
  return { name: '', street: '', postalCode: '', city: '', countryCode: 'DE', email: '' };
}

/** Füllt fehlende (optionale) Felder einer geladenen Rechnung mit Defaults. */
export function normalizeContractorInvoice(invoice: ContractorInvoice): ContractorInvoice {
  return {
    ...invoice,
    id: invoice.id ?? '',
    projectId: invoice.projectId ?? null,
    offerId: invoice.offerId ?? null,
    projectName: invoice.projectName ?? '',
    invoiceNumber: invoice.invoiceNumber ?? '',
    invoiceDate: invoice.invoiceDate ?? invoiceTodayIso(),
    serviceDate: invoice.serviceDate ?? '',
    servicePeriodStart: invoice.servicePeriodStart ?? '',
    servicePeriodEnd: invoice.servicePeriodEnd ?? '',
    dueDate: invoice.dueDate ?? invoiceDueDateIso(),
    buyerReference: invoice.buyerReference ?? 'n/a',
    status: invoice.status ?? 'draft',
    vatPercent: toNumber(invoice.vatPercent),
    discountPercent: toNumber(invoice.discountPercent),
    introText: invoice.introText ?? '',
    outroText: invoice.outroText ?? '',
    customer: { ...emptyInvoiceCustomer(), ...invoice.customer },
    seller: { ...emptyInvoiceSeller(), ...invoice.seller },
    sections: (invoice.sections ?? []).map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({ ...line, isOptional: line.isOptional ?? false }))
    }))
  };
}

/**
 * Bereinigt numerische Eingaben vor Persistenz/Export: leere Felder (`null`) und
 * `NaN` aus den Zahleneingaben werden zu `0`.
 */
export function sanitizeContractorInvoice(invoice: ContractorInvoice): ContractorInvoice {
  return {
    ...invoice,
    vatPercent: toNumber(invoice.vatPercent),
    discountPercent: toNumber(invoice.discountPercent),
    sections: invoice.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        quantity: toNumber(line.quantity),
        unitPrice: toNumber(line.unitPrice)
      }))
    }))
  };
}

function isFilled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Aufgabe X1: Nur Betriebe mit Sitz in Deutschland müssen eine XRechnung liefern.
 * Ein leeres/fehlendes Länderkürzel gilt als Deutschland (Altbestand vor Migration
 * `0023_company_profile_country`, wo `countryCode` noch nicht gepflegt war).
 */
export function isGermanInvoiceSeller(seller: ContractorInvoiceSeller): boolean {
  const code = (seller.countryCode ?? '').trim().toUpperCase();
  return code === '' || code === 'DE';
}

/** § 14 UStG / XRechnung: Leistungsdatum ODER vollständiger Leistungszeitraum. */
export function hasXRechnungServiceDate(invoice: ContractorInvoice): boolean {
  return (
    isFilled(invoice.serviceDate) ||
    (isFilled(invoice.servicePeriodStart) && isFilled(invoice.servicePeriodEnd))
  );
}

function hasBillableLine(invoice: ContractorInvoice): boolean {
  return invoice.sections.some((section) =>
    section.lines.some((line) => line.isActive && line.isOptional !== true)
  );
}

/**
 * Fehlende Verkäufer-Pflichtfelder für eine valide XRechnung (EN 16931 /
 * XRechnung 3.0, KoSIT-Schematron: BR-DE-01 IBAN, BR-DE-2 Steuernummer bzw.
 * USt-IdNr., BR-DE-5/6/7 Kontakt) – deutsche Bezeichnungen für die UI.
 * Der Kontaktname (BR-DE-5) gilt als erfüllt, wenn Ansprechpartner ODER
 * Firmenname vorliegt. Quelle ist der Firmenprofil-Snapshot der Rechnung.
 */
export function listMissingXRechnungSellerFields(seller: ContractorInvoiceSeller): string[] {
  const missing: string[] = [];
  if (!isFilled(seller.companyName)) {
    missing.push('Firmenname');
  }
  if (!isFilled(seller.street)) {
    missing.push('Straße (Absender)');
  }
  if (!isFilled(seller.postalCode)) {
    missing.push('PLZ (Absender)');
  }
  if (!isFilled(seller.city)) {
    missing.push('Ort (Absender)');
  }
  if (!isFilled(seller.iban)) {
    missing.push('IBAN');
  }
  if (!isFilled(seller.vatId) && !isFilled(seller.taxNumber)) {
    missing.push('Steuernummer oder USt-IdNr.');
  }
  if (!isFilled(seller.contactName) && !isFilled(seller.companyName)) {
    missing.push('Ansprechpartner');
  }
  if (!isFilled(seller.phone)) {
    missing.push('Telefon');
  }
  if (!isFilled(seller.email)) {
    missing.push('E-Mail');
  }
  return missing;
}

/**
 * Alle fehlenden Pflichtfelder für eine valide XRechnung (Verkäufer +
 * Rechnungskopf + Käufer + Positionen). Leere Liste = Download freigeben.
 * Die MwSt. spielt keine Rolle: Für § 19 (0 %) gelten dieselben Regeln.
 */
export function listMissingXRechnungFields(invoice: ContractorInvoice): string[] {
  const missing = listMissingXRechnungSellerFields(invoice.seller);
  if (!isFilled(invoice.invoiceNumber)) {
    missing.push('Rechnungsnummer');
  }
  if (!isFilled(invoice.invoiceDate)) {
    missing.push('Rechnungsdatum');
  }
  if (!hasXRechnungServiceDate(invoice)) {
    missing.push('Leistungsdatum oder Leistungszeitraum');
  }
  if (!isFilled(invoice.dueDate)) {
    missing.push('Zahlungsziel (Fälligkeit)');
  }
  if (!isFilled(invoice.buyerReference)) {
    missing.push('Käuferreferenz (BT-10)');
  }
  if (!isFilled(invoice.customer.name)) {
    missing.push('Kundenname');
  }
  if (!isFilled(invoice.customer.street)) {
    missing.push('Straße (Kunde)');
  }
  if (!isFilled(invoice.customer.postalCode)) {
    missing.push('PLZ (Kunde)');
  }
  if (!isFilled(invoice.customer.city)) {
    missing.push('Ort (Kunde)');
  }
  if (!isFilled(invoice.customer.email)) {
    missing.push('E-Mail des Kunden (Pflicht für XRechnung-Versand)');
  }
  if (!hasBillableLine(invoice)) {
    missing.push('Mindestens eine aktive Position');
  }
  return missing;
}

/**
 * Grobe Formstruktur einer Leitweg-ID: Grobadressierung (2–12 Ziffern) –
 * Feinadressierung (1–30 alphanumerische Zeichen) – zweistellige Prüfziffer,
 * z. B. `04011000-1234512345-06`.
 */
const LEITWEG_ID_PATTERN = /^\d{2,12}-[A-Za-z0-9]{1,30}-\d{2}$/;

/**
 * Soft-Validierung für die Käuferreferenz (BT-10): erkennt Werte, die wie eine
 * **beabsichtigte** Leitweg-ID aussehen (enthalten Ziffern und Bindestriche),
 * aber nicht dem üblichen Leitweg-ID-Format entsprechen. Dient nur einem
 * Warnhinweis im Editor – blockt den Export nicht, da B2B-Rechnungen keine
 * echte Leitweg-ID brauchen (dafür genügt „n/a" oder eine freie Referenz).
 */
export function isLikelyMalformedLeitwegId(value: string): boolean {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a') {
    return false;
  }
  const looksIntended = /\d/.test(trimmed) && trimmed.includes('-');
  return looksIntended && !LEITWEG_ID_PATTERN.test(trimmed);
}
