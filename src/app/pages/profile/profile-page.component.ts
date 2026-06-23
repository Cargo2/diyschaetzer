import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PROFILE_PRICE_FIELDS,
  ProfileAssumptionDefaults
} from '../../config/profile-price-fields';
import { CompanyProfile, emptyCompanyProfile } from '../../models/company-profile.model';
import { CompanyProfileService } from '../../services/company-profile.service';
import { ContractorBrandingService } from '../../services/contractor-branding.service';
import { ProfileAssumptionDefaultsService } from '../../services/profile-assumption-defaults.service';

/**
 * Profi-Profil (Phase 13). Nur über den contractorGuard erreichbar:
 * Firmenstammdaten + Standard-Preise (Profil-Default-Annahmen).
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.css'
})
export class ProfilePageComponent implements OnInit {
  private readonly companyProfile = inject(CompanyProfileService);
  private readonly branding = inject(ContractorBrandingService);
  private readonly profileDefaults = inject(ProfileAssumptionDefaultsService);

  readonly loading = signal(true);

  // Firmenstammdaten
  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  profile: CompanyProfile = emptyCompanyProfile();

  // Standard-Preise (Profil-Default-Annahmen)
  readonly priceFields = PROFILE_PRICE_FIELDS;
  priceValues: Record<string, number | null> = {};
  readonly savingPrices = signal(false);
  readonly priceErrorMsg = signal<string | null>(null);
  readonly priceSuccessMsg = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.allSettled([this.loadProfile(), this.loadPrices()]);
    this.loading.set(false);
  }

  async save(): Promise<void> {
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.saving.set(true);
    try {
      await this.companyProfile.save(this.profile);
      // Branding-Cache auffrischen, damit der geänderte Firmenname sofort im Export erscheint.
      await this.branding.refresh();
      this.successMsg.set('Firmenprofil gespeichert.');
    } catch {
      this.errorMsg.set('Speichern fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      this.saving.set(false);
    }
  }

  async savePrices(): Promise<void> {
    this.priceErrorMsg.set(null);
    this.priceSuccessMsg.set(null);
    this.savingPrices.set(true);
    try {
      const defaults: ProfileAssumptionDefaults = {};
      for (const field of this.priceFields) {
        const value = this.priceValues[field.path];
        if (typeof value === 'number' && Number.isFinite(value)) {
          defaults[field.path] = value;
        }
      }
      await this.profileDefaults.save(defaults);
      this.priceSuccessMsg.set('Standard-Preise gespeichert.');
    } catch {
      this.priceErrorMsg.set('Speichern der Standard-Preise fehlgeschlagen.');
    } finally {
      this.savingPrices.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    try {
      this.profile = await this.companyProfile.load();
    } catch {
      this.errorMsg.set('Das Firmenprofil konnte nicht geladen werden.');
    }
  }

  private async loadPrices(): Promise<void> {
    try {
      await this.profileDefaults.refresh();
      const saved = this.profileDefaults.current();
      const values: Record<string, number | null> = {};
      for (const field of this.priceFields) {
        const value = saved[field.path];
        values[field.path] = typeof value === 'number' ? value : null;
      }
      this.priceValues = values;
    } catch {
      this.priceErrorMsg.set('Die Standard-Preise konnten nicht geladen werden.');
    }
  }
}
