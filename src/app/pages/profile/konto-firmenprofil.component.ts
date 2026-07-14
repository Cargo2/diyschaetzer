import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompanyProfile, emptyCompanyProfile } from '../../models/company-profile.model';
import { CompanyProfileService } from '../../services/company-profile.service';
import { ContractorBrandingService } from '../../services/contractor-branding.service';

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
  imports: [FormsModule],
  templateUrl: './konto-firmenprofil.component.html',
  styleUrl: './profile-page.component.css'
})
export class KontoFirmenprofilComponent implements OnInit {
  private readonly companyProfile = inject(CompanyProfileService);
  private readonly branding = inject(ContractorBrandingService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  profile: CompanyProfile = emptyCompanyProfile();

  async ngOnInit(): Promise<void> {
    try {
      this.profile = await this.companyProfile.load();
    } catch {
      this.errorMsg.set('Das Firmenprofil konnte nicht geladen werden.');
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
      this.successMsg.set('Firmenprofil gespeichert.');
    } catch {
      this.errorMsg.set('Speichern fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      this.saving.set(false);
    }
  }
}
