import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { ContractorDirectoryEntry } from '../models/contractor-directory.model';
import type { ContractorDirectoryRepository } from './contractor-directory-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer Zeile aus der RPC `list_active_contractors`. */
interface ContractorDirectoryRow {
  company_name: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
  lead_room_types: string[] | null;
}

/**
 * Supabase-Adapter des Betriebe-Verzeichnisses (Nutzerauftrag 12.07.2026). Ruft
 * ausschließlich die SECURITY-DEFINER-RPC `list_active_contractors` auf, die nur
 * Marketing-Felder aktiver Premium-Betriebe zur PLZ liefert (anon-callbar). Kein
 * direkter Tabellenzugriff – `company_profiles` ist für anon nicht lesbar.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseContractorDirectoryRepository
  implements ContractorDirectoryRepository
{
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async listActiveContractors(postalCode: string): Promise<ContractorDirectoryEntry[]> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('list_active_contractors', {
      p_postal_code: postalCode
    });
    if (error) {
      throw error;
    }
    return ((data as ContractorDirectoryRow[] | null) ?? []).map((row) => this.map(row));
  }

  private map(row: ContractorDirectoryRow): ContractorDirectoryEntry {
    return {
      companyName: row.company_name ?? '',
      city: row.city ?? '',
      phone: row.phone ?? '',
      website: row.website ?? '',
      leadRoomTypes: row.lead_room_types ?? []
    };
  }
}
