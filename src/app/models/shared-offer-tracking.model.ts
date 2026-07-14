import { ExportDocumentData } from './export-document.model';

/**
 * Tracking-Momentaufnahme eines geteilten Angebots (Owner-Sicht, RLS-scoped).
 * Aufrufe werden serverseitig gedrosselt gezählt (`ping_shared_offer`), die
 * Annahme ist set-once (`accept_shared_offer`).
 */
export interface SharedOfferTracking {
  token: string;
  createdAt: string;
  viewedAt: string | null;
  viewCount: number;
  acceptedAt: string | null;
  acceptedByName: string;
}

/**
 * Öffentliche read-only Ansicht eines geteilten Angebots (per Token). Enthält das
 * eingefrorene Exportdokument plus den aktuellen Annahme-Status.
 */
export interface SharedOfferPage {
  data: ExportDocumentData;
  acceptedAt: string | null;
  acceptedByName: string;
}
