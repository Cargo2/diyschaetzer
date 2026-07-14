import { inject, InjectionToken } from '@angular/core';
import { LeadProjectSnapshot, LeadTimeframe } from '../../../models/lead.model';
import { SupabaseContractorLeadsRepository } from './supabase-contractor-leads-repository';

/** Eine dem Profi zugeteilte, weitergegebene Anfrage. */
export interface ContractorLeadEntry {
  id: string;
  assignedAt: string;
  name: string;
  postalCode: string;
  email: string;
  phone: string | null;
  timeframe: LeadTimeframe;
  message: string | null;
  projectSnapshot: LeadProjectSnapshot | null;
}

/**
 * Lese-Grenze der Contractor-Anfragen (Welle 1). Liest AUSSCHLIESSLICH über die
 * SECURITY DEFINER-Funktion `contractor_list_assigned_leads()`, die serverseitig
 * auf `auth.uid()` und `status='distributed'` filtert. Kein Schreibpfad.
 */
export interface ContractorLeadsRepository {
  listAssignedLeads(): Promise<ContractorLeadEntry[]>;
}

export const CONTRACTOR_LEADS_REPOSITORY = new InjectionToken<ContractorLeadsRepository>(
  'CONTRACTOR_LEADS_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseContractorLeadsRepository)
  }
);
