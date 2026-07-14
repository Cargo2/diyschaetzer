import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CONTRACTOR_DIRECTORY_REPOSITORY } from '../../data-access/contractor-directory-repository';
import { ContractorDirectoryEntry } from '../../models/contractor-directory.model';
import { ROOM_TYPE_DEFAULT_NAMES, RoomType } from '../../models/bathroom-wizard.model';
import { FeatureAccessService } from '../../services/feature-access.service';
import { LeadRegionService } from '../../services/lead-region.service';

/**
 * „Betriebe in deiner Region"-Sektion am Anfang der Zusammenfassung (Nutzerauftrag
 * 12.07.2026). PLZ-Eingabe → RPC `list_active_contractors` → Kachel-Grid aktiver
 * Premium-Betriebe. Wird nur gerendert, wenn Supabase konfiguriert ist (gleiches
 * Gate wie das Lead-Formular); der RPC-Call passiert erst auf Nutzeraktion, ist
 * also prerender-sicher. Die eingegebene PLZ liegt im geteilten LeadRegionService
 * und befüllt das Lead-Formular-PLZ-Feld vor.
 */
@Component({
  selector: 'app-contractor-directory',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contractor-directory.component.html',
  styleUrl: './contractor-directory.component.css'
})
export class ContractorDirectoryComponent {
  private readonly repository = inject(CONTRACTOR_DIRECTORY_REPOSITORY);
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly region = inject(LeadRegionService);

  /** Aufklappbar, standardmäßig aufgeklappt. */
  readonly open = signal(true);
  readonly loading = signal(false);
  readonly error = signal(false);
  /** Ergebnisse der letzten Suche (`null` = noch nicht gesucht). */
  readonly results = signal<ContractorDirectoryEntry[] | null>(null);

  /** Geteilte PLZ (befüllt zugleich das Lead-Formular vor). */
  get postalCode(): string {
    return this.region.postalCode();
  }
  set postalCode(value: string) {
    this.region.postalCode.set(value);
  }

  /** Feature-Gate: ohne Supabase kein DOM (siehe Lead-Formular). */
  canShow(): boolean {
    return this.featureAccess.canSubmitLeads();
  }

  postalCodeValid(): boolean {
    return /^[0-9]{5}$/.test(this.postalCode.trim());
  }

  canSearch(): boolean {
    return this.postalCodeValid() && !this.loading();
  }

  async search(): Promise<void> {
    if (!this.canSearch()) {
      return;
    }
    this.error.set(false);
    this.loading.set(true);
    try {
      this.results.set(await this.repository.listActiveContractors(this.postalCode.trim()));
    } catch {
      this.error.set(true);
      this.results.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  /** RoomType-Wert → deutsches Label (Fallback: Rohwert). */
  roomTypeLabel(value: string): string {
    return ROOM_TYPE_DEFAULT_NAMES[value as RoomType] ?? value;
  }

  /** Baut eine sichere https-URL für die Website (fügt fehlendes Schema hinzu). */
  websiteHref(website: string): string {
    const trimmed = website.trim();
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
}
