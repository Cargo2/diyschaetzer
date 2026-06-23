import { inject, InjectionToken } from '@angular/core';
import { ContractorOffer } from '../models/contractor-offer.model';
import { SupabaseContractorOfferRepository } from './supabase-contractor-offer-repository';

/**
 * Persistenz-Grenze für das editierte Profi-Angebot (Phase 13). Reines
 * Backend-Feature (nur angemeldete Profis), daher kein localStorage-Fallback.
 * Das Frontend spricht ausschließlich gegen dieses Interface.
 */
export interface ContractorOfferRepository {
  /** Lädt das gespeicherte Angebot zum Projekt oder `null`, wenn keines existiert. */
  load(projectId: string): Promise<ContractorOffer | null>;
  /** Speichert (upsert) das Angebot zum Projekt. */
  save(offer: ContractorOffer): Promise<void>;
}

export const CONTRACTOR_OFFER_REPOSITORY =
  new InjectionToken<ContractorOfferRepository>('CONTRACTOR_OFFER_REPOSITORY', {
    providedIn: 'root',
    factory: () => inject(SupabaseContractorOfferRepository)
  });
