import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { ExportDocumentData } from '../models/export-document.model';
import type { SharedOfferRepository } from './shared-offer-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/**
 * Supabase-Adapter für geteilte Angebote (Phase 13). Erstellen ist owner-scoped
 * (RLS, `owner_id` aus der Session); Laden läuft über die öffentliche SECURITY
 * DEFINER-Funktion `get_shared_offer` (Punktabfrage per Token, keine Enumeration).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseSharedOfferRepository implements SharedOfferRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async create(data: ExportDocumentData): Promise<string> {
    const client = this.requireClient();
    const { data: user } = await client.auth.getUser();
    const userId = user.user?.id;
    if (!userId) {
      throw new Error('Teilen nicht möglich: keine angemeldete Session.');
    }
    const { data: row, error } = await client
      .from('shared_offers')
      .insert({ owner_id: userId, data })
      .select('id')
      .single();
    if (error) {
      throw error;
    }
    return (row as { id: string }).id;
  }

  async load(token: string): Promise<ExportDocumentData | null> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('get_shared_offer', { p_token: token });
    if (error) {
      throw error;
    }
    return (data as ExportDocumentData | null) ?? null;
  }
}
