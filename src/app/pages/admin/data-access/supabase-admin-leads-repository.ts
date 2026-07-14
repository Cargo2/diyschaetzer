import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../data-access/supabase-client';
import { LeadProjectSnapshot, LeadStatus, LeadTimeframe } from '../../../models/lead.model';
import type { AdminLeadEntry, AdminLeadsRepository } from './admin-leads-repository';

/** Rohform einer admin_list_leads()-Zeile. */
interface AdminLeadRow {
  id: string;
  created_at: string;
  name: string;
  postal_code: string;
  email: string;
  phone: string | null;
  timeframe: LeadTimeframe;
  message: string | null;
  project_snapshot: LeadProjectSnapshot | null;
  consent_version: string;
  consent_at: string;
  status: LeadStatus;
  confirmed_at: string | null;
  assigned_contractor_ids: string[] | null;
}

/**
 * Supabase-Adapter der Admin-Lead-Ansicht (Welle 1). Ruft die is_admin()-gated
 * SECURITY DEFINER-Funktionen; für Nicht-Admins kommt eine leere Menge zurück
 * bzw. schreibende Aufrufe werden serverseitig abgewiesen.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAdminLeadsRepository implements AdminLeadsRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async listLeads(): Promise<AdminLeadEntry[]> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('admin_list_leads');
    if (error) {
      throw error;
    }
    return ((data ?? []) as AdminLeadRow[]).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      postalCode: row.postal_code,
      email: row.email,
      phone: row.phone,
      timeframe: row.timeframe,
      message: row.message,
      projectSnapshot: row.project_snapshot,
      consentVersion: row.consent_version,
      consentAt: row.consent_at,
      status: row.status,
      confirmedAt: row.confirmed_at,
      assignedContractorIds: row.assigned_contractor_ids ?? []
    }));
  }

  async setStatus(id: string, status: LeadStatus): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('admin_set_lead_status', {
      p_id: id,
      p_status: status
    });
    if (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('admin_delete_lead', { p_id: id });
    if (error) {
      throw error;
    }
  }

  async assign(leadId: string, contractorIds: string[]): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('admin_assign_lead', {
      p_lead_id: leadId,
      p_contractor_ids: contractorIds
    });
    if (error) {
      throw error;
    }
  }
}
