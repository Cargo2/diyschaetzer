export type ExportDocumentType =
  | 'cost_estimate'
  | 'room_summary'
  | 'project_summary'
  | 'material_list'
  | 'project_material_list'
  | 'professional_comparison'
  | 'contractor_offer';

export interface ExportDocumentTotals {
  netTotal?: number;
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
}

/** Eine Positionsgruppe im Angebots-Export (z. B. „Pos. 1 Bad OG" mit Zwischensumme). */
export interface ExportOfferGroup {
  positionLabel: string | null;
  title: string;
  rows: ExportOfferRow[];
  subtotal: number | null;
}

export interface ExportBrandingData {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  supportEmail: string | null;
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
}

export const ESTIMATE_EXPORT_LEGAL_NOTICE =
  'Diese Auswertung ist eine unverbindliche Kostenschätzung und ersetzt kein geprüftes Angebot eines Fachbetriebs.';
