import { inject, Injectable } from '@angular/core';
import { FunctionsHttpError, SupabaseClient } from '@supabase/supabase-js';
import {
  LeadConfirmResult,
  LeadSubmission,
  LeadSubmitError,
  LeadSubmitResult
} from '../models/lead.model';
import type { LeadRepository } from './lead-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/**
 * Supabase-Adapter des Lead-Funnels (Welle 1). Submit läuft ausschließlich über die
 * Edge Function `lead-submit` (kein direkter Tabellenzugriff – `leads` hat keine
 * Insert-Policy für anon/authenticated). Die Bestätigung nutzt die SECURITY
 * DEFINER-RPC `confirm_lead`.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseLeadRepository implements LeadRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async submit(input: LeadSubmission): Promise<LeadSubmitResult> {
    const client = this.requireClient();
    const { error } = await client.functions.invoke('lead-submit', {
      body: {
        name: input.name,
        postalCode: input.postalCode,
        email: input.email,
        phone: input.phone,
        timeframe: input.timeframe,
        message: input.message,
        consent: input.consent,
        projectSnapshot: input.projectSnapshot,
        website: input.website
      }
    });
    if (!error) {
      return { ok: true };
    }
    return { ok: false, reason: await this.mapSubmitError(error) };
  }

  async confirm(token: string): Promise<LeadConfirmResult> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('confirm_lead', { p_token: token });
    if (error) {
      return 'error';
    }
    return data === true ? 'confirmed' : 'invalid';
  }

  /** Übersetzt den HTTP-Status der Edge Function in eine differenzierte UI-Ursache. */
  private async mapSubmitError(error: unknown): Promise<LeadSubmitError> {
    if (error instanceof FunctionsHttpError) {
      const status = error.context?.status;
      if (status === 400) {
        return 'validation';
      }
      if (status === 409) {
        return 'rate_limited';
      }
      if (status === 503) {
        return 'mail_unavailable';
      }
    }
    return 'unknown';
  }
}
