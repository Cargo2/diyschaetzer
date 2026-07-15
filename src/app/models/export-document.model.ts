export type ExportDocumentType =
  | 'cost_estimate'
  | 'room_summary'
  | 'project_summary'
  | 'material_list'
  | 'project_material_list'
  | 'professional_comparison'
  | 'contractor_offer'
  | 'contractor_invoice';

export interface ExportDocumentTotals {
  netTotal?: number;
  /** Nachlass in % (nur informativ fürs Label). */
  discountPercent?: number;
  /** Nachlassbetrag (als negativer Wert dargestellt). */
  discountAmount?: number;
  /** Nettobetrag nach Nachlass. */
  netAfterDiscount?: number;
  vatPercent?: number;
  vatAmount?: number;
  grossTotal?: number;
  diyTotal?: number;
  professionalTotal?: number;
  materialTotal?: number;
}

export interface ExportDocumentSection {
  id: string;
  title: string;
  type: 'text' | 'table' | 'summary_cards' | 'warnings' | 'line_items' | 'offer';
  content: unknown;
}

/** Eine Zeile in einer Angebots-Positionsgruppe (Leistungsverzeichnis-Export). */
export interface ExportOfferRow {
  number: string;
  label: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  /** Bedarfsposition: mit Preis ausgewiesen, aber nicht in der Summe. */
  isOptional?: boolean;
}

/** Eine Positionsgruppe im Angebots-Export (z. B. „Pos. 1 Bad OG" mit Zwischensumme). */
export interface ExportOfferGroup {
  positionLabel: string | null;
  title: string;
  rows: ExportOfferRow[];
  subtotal: number | null;
}

/**
 * Eine angerechnete Abschlags-/Anzahlungsrechnung im Anrechnungsblock einer
 * Schlussrechnung (§ 14 Abs. 5 S. 2 UStG). Anzeigefertig: `date` ist bereits
 * de-DE-formatiert, `gross`/`vatContained` sind die eingefrorenen Beträge der
 * Vor-Rechnung.
 */
export interface ExportSettlementRow {
  invoiceNumber: string;
  /** Deutsche Beschriftung der Rechnungsart (Anzahlung/Abschlag). */
  kindLabel: string;
  /** Rechnungsdatum der Vor-Rechnung (bereits de-DE-formatiert). */
  date: string;
  /** Eingefrorener Bruttobetrag der Vor-Rechnung (positiv; als Abzug dargestellt). */
  gross: number;
  /** Darin enthaltene USt (§ 14 Abs. 5 S. 2 – Pflichtangabe). */
  vatContained: number;
}

/**
 * Anrechnungsblock einer Schlussrechnung: die bereits gestellten Abschläge/
 * Anzahlungen und der verbleibende Restbetrag. Nur bei
 * `documentType: 'contractor_invoice'` und `kind: 'final'` gesetzt.
 */
export interface ExportSettlement {
  rows: ExportSettlementRow[];
  /** Summe der angerechneten Teilentgelte (brutto). */
  settledGross: number;
  /** Verbleibender Restbetrag (brutto); negativ = Guthaben zugunsten des Kunden. */
  payableGross: number;
}

export interface ExportBrandingData {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  supportEmail: string | null;
  /** Kompakte Absenderzeile (Anschrift/Kontakt) des Fachbetriebs – nur im Angebot. */
  contactLine?: string | null;
}

/** Kopfdaten eines Profi-Angebots (Empfänger + Angebotsmeta) für den Export-Header. */
export interface ExportOfferMeta {
  customerName: string;
  customerAddress: string;
  offerNumber: string;
  offerDate: string;
  validUntil: string;
}

/**
 * Kopf-/Pflichtdaten einer Rechnung (§ 14 UStG) für den PDF-Export
 * (nur bei `documentType: 'contractor_invoice'`).
 */
export interface ExportInvoiceMeta {
  invoiceNumber: string;
  invoiceDate: string;
  /** Leistungsdatum (leer, wenn Zeitraum genutzt wird). */
  serviceDate: string;
  servicePeriodStart: string;
  servicePeriodEnd: string;
  dueDate: string;
  buyerReference: string;
  status: string;
  // Verkäufer (Absender)
  sellerName: string;
  sellerAddressLines: string[];
  sellerVatId: string;
  sellerTaxNumber: string;
  sellerContactLines: string[];
  // Käufer (Empfänger)
  customerName: string;
  customerAddressLines: string[];
  // Zahlung
  iban: string;
  bic: string;
  bankName: string;
}

export interface ExportDocumentData {
  documentType: ExportDocumentType;
  title: string;
  subtitle: string | null;
  projectName: string | null;
  roomName: string | null;
  createdAt: string;
  sections: ExportDocumentSection[];
  totals: ExportDocumentTotals;
  legalNotice: string | null;
  branding?: ExportBrandingData;
  /** Angebotskopf (nur bei `documentType: 'contractor_offer'`). */
  offerMeta?: ExportOfferMeta;
  /** Rechnungskopf/Pflichtangaben (nur bei `documentType: 'contractor_invoice'`). */
  invoiceMeta?: ExportInvoiceMeta;
  /** Anrechnungsblock (nur bei Schlussrechnung mit angerechneten Abschlägen). */
  settlement?: ExportSettlement;
  /** Einleitungstext über den Sektionen. */
  introText?: string | null;
  /** Schlusstext unter den Summen. */
  outroText?: string | null;
  /** Steuerhinweis (z. B. § 19 UStG bei 0 % MwSt.), unter den Summen. */
  taxNote?: string | null;
}

export const ESTIMATE_EXPORT_LEGAL_NOTICE =
  'Diese Auswertung ist eine unverbindliche Kostenschätzung und ersetzt kein geprüftes Angebot eines Fachbetriebs.';

/** Rechtshinweis für das vom Fachbetrieb selbst erstellte Angebot. */
export const OFFER_EXPORT_LEGAL_NOTICE =
  'Freibleibendes Angebot, gültig vorbehaltlich Zwischenverkauf. Alle Preise verstehen sich netto zzgl. der gesetzlichen Mehrwertsteuer, sofern nicht anders angegeben.';

/** Rechtshinweis für die vom Fachbetrieb erstellte Rechnung. */
export const INVOICE_EXPORT_LEGAL_NOTICE =
  'Rechnung gemäß § 14 UStG. Bitte geben Sie bei Zahlung die Rechnungsnummer als Verwendungszweck an.';
