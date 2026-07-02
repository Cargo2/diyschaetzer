import { inject, InjectionToken } from '@angular/core';
import { ExportDocumentData } from '../models/export-document.model';
import { SupabaseSharedOfferRepository } from './supabase-shared-offer-repository';

/**
 * Persistenz-Grenze für geteilte Angebote (Phase 13). Das Erstellen setzt eine
 * angemeldete Profi-Session voraus; das Laden per Token ist öffentlich (anonym).
 * Gespeichert wird das neutrale Exportdokument (Snapshot), damit die read-only
 * Ansicht ohne Neuberechnung/Zugriff auf interne Modelle rendert.
 */
export interface SharedOfferRepository {
  /** Speichert eine Momentaufnahme und gibt den öffentlichen Token (UUID) zurück. */
  create(data: ExportDocumentData): Promise<string>;
  /** Lädt die Momentaufnahme zum Token oder `null`, wenn es keine gibt. */
  load(token: string): Promise<ExportDocumentData | null>;
}

export const SHARED_OFFER_REPOSITORY = new InjectionToken<SharedOfferRepository>(
  'SHARED_OFFER_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseSharedOfferRepository)
  }
);
