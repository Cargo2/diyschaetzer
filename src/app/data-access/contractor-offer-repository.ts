import { inject, InjectionToken } from '@angular/core';
import { ContractorOffer } from '../models/contractor-offer.model';
import { SupabaseContractorOfferRepository } from './supabase-contractor-offer-repository';

/**
 * Persistenz-Grenze für das editierte Profi-Angebot (Phase 13). Reines
 * Backend-Feature (nur angemeldete Profis), daher kein localStorage-Fallback.
 * Das Frontend spricht ausschließlich gegen dieses Interface.
 */
export interface ContractorOfferRepository {
  /** Alle Angebote/Versionen eines Projekts (aufsteigend nach Version). */
  listByProject(projectId: string): Promise<ContractorOffer[]>;
  /**
   * Anzahl ALLER gespeicherten Angebote/Versionen des angemeldeten Profis
   * (projektübergreifend) – Basis für die Free-Limit-Anzeige (max. 3), die den
   * serverseitigen Trigger spiegelt.
   */
  countMine(): Promise<number>;
  /** Speichert (upsert über die Angebots-`id`) ein Angebot. */
  save(offer: ContractorOffer): Promise<void>;
  /** Löscht ein Angebot/eine Version anhand ihrer `id`. */
  delete(offerId: string): Promise<void>;
}

export const CONTRACTOR_OFFER_REPOSITORY =
  new InjectionToken<ContractorOfferRepository>('CONTRACTOR_OFFER_REPOSITORY', {
    providedIn: 'root',
    factory: () => inject(SupabaseContractorOfferRepository)
  });
