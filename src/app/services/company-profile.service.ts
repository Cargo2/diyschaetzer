import { inject, Injectable } from '@angular/core';
import { COMPANY_PROFILE_REPOSITORY } from '../data-access/company-profile-repository';
import { CompanyProfile, emptyCompanyProfile } from '../models/company-profile.model';

/**
 * Dünne Fassade über das {@link COMPANY_PROFILE_REPOSITORY}: lädt/speichert das
 * Firmenprofil des angemeldeten Profis. Das Formular hält der Seiten-Component.
 */
@Injectable({ providedIn: 'root' })
export class CompanyProfileService {
  private readonly repository = inject(COMPANY_PROFILE_REPOSITORY);

  /** Geladenes Firmenprofil oder ein leeres, falls noch keines existiert. */
  async load(): Promise<CompanyProfile> {
    return (await this.repository.load()) ?? emptyCompanyProfile();
  }

  async save(profile: CompanyProfile): Promise<void> {
    await this.repository.save(profile);
  }
}
