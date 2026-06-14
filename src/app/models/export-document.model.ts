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
  type: 'text' | 'table' | 'summary_cards' | 'warnings' | 'line_items';
  content: unknown;
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
