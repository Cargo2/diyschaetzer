import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompanyProfile, emptyCompanyProfile } from '../../models/company-profile.model';
import { CompanyProfileService } from '../../services/company-profile.service';

/**
 * Profi-Firmenprofil (Phase 13, Block 1). Nur über den contractorGuard
 * erreichbar. Lädt das bestehende Profil und speichert Änderungen.
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
      this.successMsg.set('Firmenprofil gespeichert.');
    } catch {
      this.errorMsg.set('Speichern fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      this.saving.set(false);
    }
  }
}
