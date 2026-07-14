import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CompanyProfile, emptyCompanyProfile } from '../../models/company-profile.model';
import {
  ROOM_TYPE_DEFAULT_NAMES,
  RoomType
} from '../../models/bathroom-wizard.model';
import { CompanyProfileService } from '../../services/company-profile.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Konto → „Anfragen empfangen" (contractorGuard + {@link leadSubscriptionGuard}:
 * nur mit aktivem Lead-Abo erreichbar). Bündelt die Angebots-Textvorlagen
 * (Einleitungs-/Schlusstext, Materialaufschlag) UND die Lead-Empfangs-Einstellungen
 * (PLZ-Gebiete, Raumarten, Max/Monat, Kontaktkanal, aktiv).
 *
 * Lädt/speichert das vollständige {@link CompanyProfile}; die auf den anderen
 * Konto-Unterseiten gepflegten Firmenstammdaten bleiben unverändert erhalten.
 */
@Component({
  selector: 'app-konto-anfragen-empfang',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './konto-anfragen-empfang.component.html',
  styleUrl: './profile-page.component.css'
})
export class KontoAnfragenEmpfangComponent implements OnInit {
  private readonly companyProfile = inject(CompanyProfileService);
  private readonly i18n = inject(I18nService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  profile: CompanyProfile = emptyCompanyProfile();

  // Lead-Empfangsdaten. PLZ-Gebiete als Komma-Eingabe, beim Speichern geparst.
  readonly roomTypeOptions = (Object.keys(ROOM_TYPE_DEFAULT_NAMES) as RoomType[]).map(
    (value) => ({ value, label: ROOM_TYPE_DEFAULT_NAMES[value] })
  );
  leadZipAreasInput = '';

  async ngOnInit(): Promise<void> {
    try {
      this.profile = await this.companyProfile.load();
      this.leadZipAreasInput = this.profile.leadZipAreas.join(', ');
    } catch {
      this.errorMsg.set(this.i18n.t('Die Einstellungen konnten nicht geladen werden.'));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.saving.set(true);
    try {
      this.profile.leadZipAreas = this.parseZipAreas(this.leadZipAreasInput);
      await this.companyProfile.save(this.profile);
      this.successMsg.set(this.i18n.t('Einstellungen gespeichert.'));
    } catch {
      this.errorMsg.set(this.i18n.t('Speichern fehlgeschlagen. Bitte versuche es erneut.'));
    } finally {
      this.saving.set(false);
    }
  }

  isRoomTypeSelected(value: RoomType): boolean {
    return this.profile.leadRoomTypes.includes(value);
  }

  toggleRoomType(value: RoomType): void {
    const set = new Set(this.profile.leadRoomTypes);
    if (set.has(value)) {
      set.delete(value);
    } else {
      set.add(value);
    }
    this.profile.leadRoomTypes = [...set];
  }

  /** Zerlegt die Komma-/Leerzeichen-getrennte PLZ-Eingabe in eine deduplizierte Liste. */
  private parseZipAreas(input: string): string[] {
    const seen = new Set<string>();
    for (const part of input.split(/[\s,;]+/)) {
      const trimmed = part.trim();
      if (trimmed) {
        seen.add(trimmed);
      }
    }
    return [...seen];
  }
}
