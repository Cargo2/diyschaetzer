import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../data-access/supabase-client';
import { LeadProjectSnapshot, LeadTimeframe } from '../../../models/lead.model';
import type {
  ContractorLeadEntry,
  ContractorLeadsRepository
} from './contractor-leads-repository';

/** Rohform einer contractor_list_assigned_leads()-Zeile. */
interface ContractorLeadRow {
  id: string;
  assigned_at: string;
  name: string;
  postal_code: string;
  email: string;
  phone: string | null;
  timeframe: LeadTimeframe;
  message: string | null;
  project_snapshot: LeadProjectSnapshot | null;
}

/**
 * Supabase-Adapter der Contractor-Anfragen (Welle 1). Ruft die SECURITY DEFINER-
 * Funktion `contractor_list_assigned_leads()`; für Nicht-Contractors bzw. ohne
 * Zuteilung kommt eine leere Liste zurück (Absicherung in der Funktion selbst).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseContractorLeadsRepository implements ContractorLeadsRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async listAssignedLeads(): Promise<ContractorLeadEntry[]> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('contractor_list_assigned_leads');
    if (error) {
      throw error;
    }
    return ((data ?? []) as ContractorLeadRow[]).map((row) => ({
      id: row.id,
      assignedAt: row.assigned_at,
      name: row.name,
      postalCode: row.postal_code,
      email: row.email,
      phone: row.phone,
      timeframe: row.timeframe,
      message: row.message,
      projectSnapshot: row.project_snapshot
    }));
  }
}
