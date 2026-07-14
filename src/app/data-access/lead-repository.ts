import { inject, InjectionToken } from '@angular/core';
import { LeadConfirmResult, LeadSubmission, LeadSubmitResult } from '../models/lead.model';
import { SupabaseLeadRepository } from './supabase-lead-repository';

/**
 * Persistenz-Grenze des Lead-Funnels (Welle 1). Reines Backend-Feature: der einzige
 * Schreibpfad ist die Edge Function `lead-submit` (Validierung, Honeypot,
 * Rate-Limit, Insert via service_role, Double-Opt-in-Mail). Das Frontend spricht
 * ausschließlich gegen dieses Interface.
 *
 * Ohne konfiguriertes Supabase wird das Lead-Formular gar nicht gerendert
 * (FeatureAccessService.canSubmitLeads() = false), sodass dieses Repository dann
 * nie aufgerufen wird – ein „Null-Repository" ist daher nicht nötig.
 */
export interface LeadRepository {
  /** Sendet eine Anfrage an die Edge Function `lead-submit`. */
  submit(input: LeadSubmission): Promise<LeadSubmitResult>;
  /** Bestätigt eine Anfrage per Token (RPC `confirm_lead`, idempotent). */
  confirm(token: string): Promise<LeadConfirmResult>;
}

export const LEAD_REPOSITORY = new InjectionToken<LeadRepository>('LEAD_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(SupabaseLeadRepository)
});
