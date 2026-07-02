import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { CompanyProfile } from '../models/company-profile.model';
import type { CompanyProfileRepository } from './company-profile-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer `company_profiles`-Zeile. */
interface CompanyProfileRow {
  id: string;
  company_name: string;
  contact_name: string;
  street: string;
  postal_code: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  vat_id: string;
  offer_intro_text: string;
  offer_outro_text: string;
  material_surcharge_percent: number;
}

/**
 * Supabase-Adapter für das Firmenprofil (Phase 13). Owner-scoped über RLS; die
 * `id` wird aus der angemeldeten Session abgeleitet (nicht aus Nutzereingaben).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseCompanyProfileRepository implements CompanyProfileRepository {
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

  async load(): Promise<CompanyProfile | null> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return null;
    }
    const { data, error } = await client
      .from('company_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data ? this.map(data as CompanyProfileRow) : null;
  }

  async save(profile: CompanyProfile): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Speichern nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('company_profiles').upsert({
      id: userId,
      company_name: profile.companyName,
      contact_name: profile.contactName,
      street: profile.street,
      postal_code: profile.postalCode,
      city: profile.city,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      vat_id: profile.vatId,
      offer_intro_text: profile.offerIntroText,
      offer_outro_text: profile.offerOutroText,
      material_surcharge_percent: profile.materialSurchargePercent
    });
    if (error) {
      throw error;
    }
  }

  private map(row: CompanyProfileRow): CompanyProfile {
    return {
      companyName: row.company_name,
      contactName: row.contact_name,
      street: row.street,
      postalCode: row.postal_code,
      city: row.city,
      phone: row.phone,
      email: row.email,
      website: row.website,
      vatId: row.vat_id,
      offerIntroText: row.offer_intro_text ?? '',
      offerOutroText: row.offer_outro_text ?? '',
      materialSurchargePercent: Number(row.material_surcharge_percent ?? 0)
    };
  }
}
