import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompanyProfile, emptyCompanyProfile } from '../../models/company-profile.model';
import { CompanyProfileService } from '../../services/company-profile.service';
import { ContractorBrandingService } from '../../services/contractor-branding.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Kuratierte Länderliste für „Land des Firmensitzes" (Aufgabe X1). Nur Betriebe mit
 * Sitz in Deutschland brauchen eine XRechnung – die Auswahl steuert die
 * XRechnung-Pflichtfeld-Kennzeichnung im Firmenprofil und in den Rechnungen.
 */
export const COUNTRY_OPTIONS: { label: string; value: string }[] = [
  { label: 'Deutschland', value: 'DE' },
  { label: 'Österreich', value: 'AT' },
  { label: 'Schweiz', value: 'CH' },
  { label: 'Polen', value: 'PL' },
  { label: 'Tschechien', value: 'CZ' },
  { label: 'Niederlande', value: 'NL' },
  { label: 'Belgien', value: 'BE' },
  { label: 'Frankreich', value: 'FR' },
  { label: 'Luxemburg', value: 'LU' },
  { label: 'Dänemark', value: 'DK' }
];

/**
 * Konto → „Firmenprofil" (contractorGuard). Enthält NUR die Firmenstammdaten
 * (Name, Anschrift, Kontakt, USt-IdNr.). Der Firmenname erscheint als Kopf-/
 * Fußzeile im Export; nach dem Speichern wird der Branding-Cache aufgefrischt.
 *
 * Lädt/speichert das vollständige {@link CompanyProfile}; die auf anderen
 * Konto-Unterseiten gepflegten Felder (Preise/Angebots-Vorlagen/Lead-Empfang)
 * bleiben dabei unverändert erhalten, da sie frisch aus der DB übernommen werden.
 */
@Component({
  selector: 'app-konto-firmenprofil',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './konto-firmenprofil.component.html',
  styleUrl: './profile-page.component.css'
})
export class KontoFirmenprofilComponent implements OnInit {
  private readonly companyProfile = inject(CompanyProfileService);
  private readonly branding = inject(ContractorBrandingService);
  private readonly i18n = inject(I18nService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  profile: CompanyProfile = emptyCompanyProfile();
  readonly countryOptions = COUNTRY_OPTIONS;

  /**
   * Live-reaktiv auf das aktuell gewählte Formularland (nicht das gespeicherte
   * Profil): steuert, ob die XRechnung-Pflichtfeld-Sternchen angezeigt werden.
   * Leer/undefined gilt als Deutschland (Altbestand vor Migration 0023).
   */
  isGermanCompany(): boolean {
    const code = (this.profile.countryCode ?? '').trim().toUpperCase();
    return code === '' || code === 'DE';
  }

  async ngOnInit(): Promise<void> {
    try {
      this.profile = await this.companyProfile.load();
    } catch {
      this.errorMsg.set(this.i18n.t('Das Firmenprofil konnte nicht geladen werden.'));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.saving.set(true);
    try {
      await this.companyProfile.save(this.profile);
      // Branding-Cache auffrischen, damit der geänderte Firmenname sofort im Export erscheint.
      await this.branding.refresh();
      this.successMsg.set(this.i18n.t('Firmenprofil gespeichert.'));
    } catch {
      this.errorMsg.set(this.i18n.t('Speichern fehlgeschlagen. Bitte versuche es erneut.'));
    } finally {
      this.saving.set(false);
    }
  }
}
