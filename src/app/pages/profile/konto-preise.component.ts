import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PROFILE_PRICE_FIELDS,
  ProfileAssumptionDefaults
} from '../../config/profile-price-fields';
import { ProfileAssumptionDefaultsService } from '../../services/profile-assumption-defaults.service';

/**
 * Konto → „Eigene Preise" (contractorGuard). Enthält NUR die Standard-Preise
 * (Profil-Default-Annahmen). Leer gelassene Felder fallen auf den System-Standard
 * zurück; in einer einzelnen Kalkulation geänderte Werte behalten Vorrang.
 */
@Component({
  selector: 'app-konto-preise',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './konto-preise.component.html',
  styleUrl: './profile-page.component.css'
})
export class KontoPreiseComponent implements OnInit {
  private readonly profileDefaults = inject(ProfileAssumptionDefaultsService);

  readonly loading = signal(true);
  readonly priceFields = PROFILE_PRICE_FIELDS;
  priceValues: Record<string, number | null> = {};
  readonly savingPrices = signal(false);
  readonly priceErrorMsg = signal<string | null>(null);
  readonly priceSuccessMsg = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadPrices();
    this.loading.set(false);
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
