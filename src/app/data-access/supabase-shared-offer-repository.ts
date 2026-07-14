import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { ExportDocumentData } from '../models/export-document.model';
import { SharedOfferPage, SharedOfferTracking } from '../models/shared-offer-tracking.model';
import type { SharedOfferRepository } from './shared-offer-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/**
 * Supabase-Adapter für geteilte Angebote (Phase 13). Erstellen ist owner-scoped
 * (RLS, `owner_id` aus der Session); Laden läuft über die öffentliche SECURITY
 * DEFINER-Funktion `get_shared_offer`/`get_shared_offer_page` (Punktabfrage per
 * Token, keine Enumeration). Tracking/Annahme laufen über weitere Definer-RPCs.
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

  private async requireUserId(client: SupabaseClient): Promise<string> {
    const { data: user } = await client.auth.getUser();
    const userId = user.user?.id;
    if (!userId) {
      throw new Error('Teilen nicht möglich: keine angemeldete Session.');
    }
    return userId;
  }

  async create(data: ExportDocumentData): Promise<string> {
    const client = this.requireClient();
    const userId = await this.requireUserId(client);
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

  async createForOffer(offerId: string, data: ExportDocumentData): Promise<string> {
    const client = this.requireClient();
    const userId = await this.requireUserId(client);

    // Stabiler Token je Angebot: existiert bereits ein Share, nur `data` aktualisieren
    // (Token/Tracking/Annahme bleiben erhalten); sonst neu anlegen. Zweistufig, weil
    // der Unique-Index partiell ist (kein onConflict-Target für Alt-Zeilen ohne offer_id).
    const { data: existing, error: selectError } = await client
      .from('shared_offers')
      .select('id')
      .eq('owner_id', userId)
      .eq('offer_id', offerId)
      .maybeSingle();
    if (selectError) {
      throw selectError;
    }

    if (existing) {
      const token = (existing as { id: string }).id;
      const { error: updateError } = await client
        .from('shared_offers')
        .update({ data })
        .eq('id', token);
      if (updateError) {
        throw updateError;
      }
      return token;
    }

    const { data: row, error: insertError } = await client
      .from('shared_offers')
      .insert({ owner_id: userId, offer_id: offerId, data })
      .select('id')
      .single();
    if (insertError) {
      throw insertError;
    }
    return (row as { id: string }).id;
  }

  async loadPage(token: string): Promise<SharedOfferPage | null> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('get_shared_offer_page', { p_token: token });
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    const row = data as {
      data: ExportDocumentData;
      accepted_at: string | null;
      accepted_by_name: string | null;
    };
    return {
      data: row.data,
      acceptedAt: row.accepted_at ?? null,
      acceptedByName: row.accepted_by_name ?? ''
    };
  }

  async pingView(token: string): Promise<void> {
    const client = this.client;
    if (!client) {
      return;
    }
    try {
      await client.rpc('ping_shared_offer', { p_token: token });
    } catch {
      // Aufruf-Zählung ist unkritisch – Fehler bewusst schlucken.
    }
  }

  async accept(
    token: string,
    name: string
  ): Promise<{ acceptedAt: string; acceptedByName: string } | null> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('accept_shared_offer', {
      p_token: token,
      p_name: name
    });
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    const row = data as { accepted_at: string | null; accepted_by_name: string | null };
    return {
      acceptedAt: row.accepted_at ?? '',
      acceptedByName: row.accepted_by_name ?? ''
    };
  }

  async getTrackingForOffer(offerId: string): Promise<SharedOfferTracking | null> {
    const client = this.requireClient();
    const userId = await this.requireUserId(client);
    const { data, error } = await client
      .from('shared_offers')
      .select('id, created_at, viewed_at, view_count, accepted_at, accepted_by_name')
      .eq('owner_id', userId)
      .eq('offer_id', offerId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    const row = data as {
      id: string;
      created_at: string;
      viewed_at: string | null;
      view_count: number | null;
      accepted_at: string | null;
      accepted_by_name: string | null;
    };
    return {
      token: row.id,
      createdAt: row.created_at,
      viewedAt: row.viewed_at ?? null,
      viewCount: row.view_count ?? 0,
      acceptedAt: row.accepted_at ?? null,
      acceptedByName: row.accepted_by_name ?? ''
    };
  }
}
