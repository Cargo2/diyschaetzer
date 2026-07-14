import { inject, InjectionToken } from '@angular/core';
import { ExportDocumentData } from '../models/export-document.model';
import { SharedOfferPage, SharedOfferTracking } from '../models/shared-offer-tracking.model';
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

  /**
   * Speichert/aktualisiert die Momentaufnahme für ein konkretes Angebot und liefert
   * den **stabilen** Token (ein Share-Eintrag je `offerId`). Existiert bereits ein
   * Eintrag, wird nur `data` aktualisiert (Token/Tracking/Annahme bleiben erhalten).
   */
  createForOffer(offerId: string, data: ExportDocumentData): Promise<string>;
  /** Lädt die read-only Ansicht (Dokument + Annahme-Status) per Token, öffentlich. */
  loadPage(token: string): Promise<SharedOfferPage | null>;
  /** Zählt einen Aufruf (serverseitig gedrosselt); Fehler werden geschluckt. */
  pingView(token: string): Promise<void>;
  /** Set-once Annahme durch den Empfänger; liefert den aktuellen Annahme-Stand. */
  accept(
    token: string,
    name: string
  ): Promise<{ acceptedAt: string; acceptedByName: string } | null>;
  /** Owner-scoped Tracking zum eigenen Angebots-Share (RLS) oder `null`. */
  getTrackingForOffer(offerId: string): Promise<SharedOfferTracking | null>;
}

export const SHARED_OFFER_REPOSITORY = new InjectionToken<SharedOfferRepository>(
  'SHARED_OFFER_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseSharedOfferRepository)
  }
);
