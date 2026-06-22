import { inject, InjectionToken } from '@angular/core';
import { ProfileAssumptionDefaults } from '../config/profile-price-fields';
import { SupabaseProfileAssumptionDefaultsRepository } from './supabase-profile-assumption-defaults-repository';

/**
 * Persistenz-Grenze für die Profil-Standardannahmen (Phase 13). Liegt in der
 * `company_profiles`-Zeile (jsonb-Spalte), wird aber bewusst getrennt vom
 * Firmenprofil geladen/gespeichert, da der AssumptionService nur die Defaults
 * (gecacht, synchron) braucht.
 */
export interface ProfileAssumptionDefaultsRepository {
  load(): Promise<ProfileAssumptionDefaults>;
  save(defaults: ProfileAssumptionDefaults): Promise<void>;
}

export const PROFILE_ASSUMPTION_DEFAULTS_REPOSITORY =
  new InjectionToken<ProfileAssumptionDefaultsRepository>(
    'PROFILE_ASSUMPTION_DEFAULTS_REPOSITORY',
    {
      providedIn: 'root',
      factory: () => inject(SupabaseProfileAssumptionDefaultsRepository)
    }
  );
