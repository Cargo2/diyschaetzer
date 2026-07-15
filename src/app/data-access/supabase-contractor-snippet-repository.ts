import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  ContractorSnippet,
  ContractorSnippetKind,
  normalizeContractorSnippet
} from '../models/contractor-snippet.model';
import type { ContractorSnippetRepository } from './contractor-snippet-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer `contractor_snippets`-Zeile. */
interface ContractorSnippetRow {
  id: string;
  owner_id: string;
  kind: string;
  label: string;
  data: unknown;
  sort_order: number;
  created_at: string;
}

/**
 * Supabase-Adapter für die Angebots-Bausteine (Phase R2). Owner-scoped über RLS;
 * die `owner_id` wird aus der angemeldeten Session abgeleitet (nicht aus Eingaben).
 * Die Nutzdaten liegen als jsonb-Blob `data`.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseContractorSnippetRepository implements ContractorSnippetRepository {
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

  async listMine(): Promise<ContractorSnippet[]> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return [];
    }
    const { data, error } = await client
      .from('contractor_snippets')
      .select('*')
      .order('kind', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      throw error;
    }
    return ((data as ContractorSnippetRow[]) ?? []).map((row) => this.map(row));
  }

  async save(snippet: ContractorSnippet): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Speichern nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('contractor_snippets').upsert({
      id: snippet.id,
      owner_id: userId,
      kind: snippet.kind,
      label: snippet.label,
      data: snippet.data,
      sort_order: snippet.sortOrder
    });
    if (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Löschen nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('contractor_snippets').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }

  /** DB-Zeile → Baustein; defensiv normalisiert, Spalten (id/kind/label/…) sind maßgeblich. */
  private map(row: ContractorSnippetRow): ContractorSnippet {
    return normalizeContractorSnippet({
      id: row.id,
      kind: row.kind as ContractorSnippetKind,
      label: row.label,
      data: row.data as ContractorSnippet['data'],
      sortOrder: row.sort_order,
      createdAt: row.created_at
    });
  }
}
