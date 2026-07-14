import { inject, InjectionToken } from '@angular/core';
import { LeadProjectSnapshot, LeadStatus, LeadTimeframe } from '../../../models/lead.model';
import { SupabaseAdminLeadsRepository } from './supabase-admin-leads-repository';

/** Eine Zeile der Admin-Lead-Liste (admin_list_leads()). */
export interface AdminLeadEntry {
  id: string;
  createdAt: string;
  name: string;
  postalCode: string;
  email: string;
  phone: string | null;
  timeframe: LeadTimeframe;
  message: string | null;
  projectSnapshot: LeadProjectSnapshot | null;
  consentVersion: string;
  consentAt: string;
  status: LeadStatus;
  confirmedAt: string | null;
  assignedContractorIds: string[];
}

/**
 * Lese-/Verwaltungs-Grenze der Admin-Lead-Ansicht (Welle 1). Alle Pfade laufen über
 * SECURITY DEFINER-Funktionen (is_admin()-gated): admin_list_leads(),
 * admin_set_lead_status(), admin_delete_lead() (DSGVO), admin_assign_lead()
 * (≤ 3 Betriebe, nur bei bestätigtem Lead).
 */
export interface AdminLeadsRepository {
  listLeads(): Promise<AdminLeadEntry[]>;
  setStatus(id: string, status: LeadStatus): Promise<void>;
  delete(id: string): Promise<void>;
  assign(leadId: string, contractorIds: string[]): Promise<void>;
}

export const ADMIN_LEADS_REPOSITORY = new InjectionToken<AdminLeadsRepository>(
  'ADMIN_LEADS_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseAdminLeadsRepository)
  }
);
