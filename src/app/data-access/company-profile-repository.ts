import { inject, InjectionToken } from '@angular/core';
import { CompanyProfile } from '../models/company-profile.model';
import { SupabaseCompanyProfileRepository } from './supabase-company-profile-repository';

/**
 * Persistenz-Grenze für das Firmenprofil (Phase 13). Reines Backend-Feature
 * (nur für angemeldete Profis), daher kein localStorage-Fallback. Das Frontend
 * spricht ausschließlich gegen dieses Interface (austauschbares Backend).
 */
export interface CompanyProfileRepository {
  /** Lädt das Firmenprofil des angemeldeten Nutzers oder `null`, wenn keines existiert. */
  load(): Promise<CompanyProfile | null>;
  /** Speichert (upsert) das Firmenprofil des angemeldeten Nutzers. */
  save(profile: CompanyProfile): Promise<void>;
}

/**
 * Default ist der Supabase-Adapter – ein Offline-Variant gibt es bewusst nicht,
 * da das Feature eine angemeldete Session voraussetzt. Tests überschreiben das
 * Token mit einem Fake.
 */
export const COMPANY_PROFILE_REPOSITORY = new InjectionToken<CompanyProfileRepository>(
  'COMPANY_PROFILE_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseCompanyProfileRepository)
  }
);
