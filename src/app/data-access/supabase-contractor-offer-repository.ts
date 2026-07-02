import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { ContractorOffer } from '../models/contractor-offer.model';
import type { ContractorOfferRepository } from './contractor-offer-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer `contractor_offers`-Zeile. */
interface ContractorOfferRow {
  id: string;
  project_id: string;
  owner_id: string;
  offer_data: ContractorOffer;
  version: number;
  status: string;
  label: string;
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

  async listByProject(projectId: string): Promise<ContractorOffer[]> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return [];
    }
    const { data, error } = await client
      .from('contractor_offers')
      .select('*')
      .eq('project_id', projectId)
      .order('version', { ascending: true });
    if (error) {
      throw error;
    }
    return ((data as ContractorOfferRow[]) ?? []).map((row) => this.map(row));
  }

  async save(offer: ContractorOffer): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Speichern nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('contractor_offers').upsert({
      id: offer.id,
      project_id: offer.projectId,
      owner_id: userId,
      offer_data: offer,
      version: offer.version ?? 1,
      status: offer.status ?? 'draft',
      label: offer.label ?? ''
    });
    if (error) {
      throw error;
    }
  }

  async delete(offerId: string): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Löschen nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('contractor_offers').delete().eq('id', offerId);
    if (error) {
      throw error;
    }
  }

  /** DB-Zeile → Angebot; Spalten (id/version/status/label) sind maßgeblich. */
  private map(row: ContractorOfferRow): ContractorOffer {
    return {
      ...row.offer_data,
      id: row.id,
      projectId: row.project_id,
      version: row.version,
      status: row.status as ContractorOffer['status'],
      label: row.label
    };
  }
}
