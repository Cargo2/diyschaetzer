import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  PROFILE_PRICE_FIELD_PATHS,
  ProfileAssumptionDefaults
} from '../config/profile-price-fields';
import type { ProfileAssumptionDefaultsRepository } from './profile-assumption-defaults-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform der relevanten Spalte aus company_profiles. */
interface DefaultsRow {
  assumption_defaults: Record<string, unknown> | null;
}

/**
 * Supabase-Adapter für die Profil-Standardannahmen (Phase 13). Liest/schreibt
 * nur die jsonb-Spalte `assumption_defaults` der eigenen company_profiles-Zeile
 * (owner-scoped über RLS). Partielle Upserts lassen die übrigen Spalten unberührt.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseProfileAssumptionDefaultsRepository
  implements ProfileAssumptionDefaultsRepository
{
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

  async load(): Promise<ProfileAssumptionDefaults> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return {};
    }
    const { data, error } = await client
      .from('company_profiles')
      .select('assumption_defaults')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return this.sanitize((data as DefaultsRow | null)?.assumption_defaults ?? {});
  }

  async save(defaults: ProfileAssumptionDefaults): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Speichern nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client
      .from('company_profiles')
      .upsert({ id: userId, assumption_defaults: this.sanitize(defaults) });
    if (error) {
      throw error;
    }
  }

  /** Nur bekannte Pfade mit endlichen Zahlen übernehmen (robust gegen Altstand/Manipulation). */
  private sanitize(raw: Record<string, unknown>): ProfileAssumptionDefaults {
    const result: ProfileAssumptionDefaults = {};
    for (const path of PROFILE_PRICE_FIELD_PATHS) {
      const value = raw[path];
      if (typeof value === 'number' && Number.isFinite(value)) {
        result[path] = value;
      }
    }
    return result;
  }
}
