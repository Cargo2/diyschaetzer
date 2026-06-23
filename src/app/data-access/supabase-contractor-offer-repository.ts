import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { ContractorOffer } from '../models/contractor-offer.model';
import type { ContractorOfferRepository } from './contractor-offer-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer `contractor_offers`-Zeile. */
interface ContractorOfferRow {
  project_id: string;
  owner_id: string;
  offer_data: ContractorOffer;
}

/**
 * Supabase-Adapter für das Profi-Angebot (Phase 13). Owner-scoped über RLS; die
 * `owner_id` wird aus der angemeldeten Session abgeleitet (nicht aus Eingaben).
 * Das Leistungsverzeichnis liegt als jsonb-Blob `offer_data`.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseContractorOfferRepository implements ContractorOfferRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  private async currentUserId(): Promise<string | null> {
    const { data } = await this.requireClient().auth.getUser();
    return data.user?.id ?? null;
  }

  async load(projectId: string): Promise<ContractorOffer | null> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return null;
    }
    const { data, error } = await client
      .from('contractor_offers')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data ? (data as ContractorOfferRow).offer_data : null;
  }

  async save(offer: ContractorOffer): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Speichern nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('contractor_offers').upsert({
      project_id: offer.projectId,
      owner_id: userId,
      offer_data: offer
    });
    if (error) {
      throw error;
    }
  }
}
