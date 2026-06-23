import { effect, inject, Injectable, signal } from '@angular/core';
import { ExportBrandingData, ExportDocumentData } from '../models/export-document.model';
import { AuthService } from './auth.service';
import { CompanyProfileService } from './company-profile.service';

/**
 * Stellt das Export-Branding des angemeldeten Profis (`contractor`) bereit:
 * aktuell ausschließlich der **Firmenname** (kein Logo – bewusst, s. Phase 13).
 *
 * Der Firmenname wird – analog zu {@link ProfileAssumptionDefaultsService} –
 * **synchron** zwischengespeichert, damit der bestehende Export-Pfad
 * (PDF/Excel) ihn ohne async-Umbau anwenden kann. Für Hobby-Nutzer/anonym oder
 * ohne hinterlegten Firmennamen bleibt der Cache leer → der bisherige Default
 * („Fliesenprojekt") greift unverändert.
 */
@Injectable({ providedIn: 'root' })
export class ContractorBrandingService {
  private readonly auth = inject(AuthService);
  private readonly companyProfile = inject(CompanyProfileService);

  private readonly brandNameSig = signal<string | null>(null);
  /** Für welchen Nutzer der Cache zuletzt geladen wurde (verhindert Doppelladen). */
  private loadedForUserId: string | null = null;

  /** Auflösbar, sobald der erste Ladeversuch abgeschlossen ist. */
  readonly ready: Promise<void> = this.hydrate();

  constructor() {
    // Bei Login/Logout bzw. Rollenwechsel neu laden.
    effect(() => {
      const profile = this.auth.profile();
      const userId = profile?.role === 'contractor' ? profile.id : null;
      if (userId !== this.loadedForUserId) {
        void this.hydrate();
      }
    });
  }

  /**
   * Aktuelles Branding oder `null` (anonym/Hobby/ohne Firmennamen). Nur der
   * Firmenname ist gesetzt; Logo/Farbe/Support-Mail bleiben bewusst leer.
   */
  current(): ExportBrandingData | null {
    const brandName = this.brandNameSig();
    if (!brandName) {
      return null;
    }
    return { brandName, logoUrl: null, primaryColor: null, supportEmail: null };
  }

  /** Legt das Profi-Branding auf das Exportmodell, sofern ein Firmenname vorliegt. */
  applyTo(data: ExportDocumentData): ExportDocumentData {
    const branding = this.current();
    return branding ? { ...data, branding } : data;
  }

  /** Cache neu laden (z. B. nachdem der Profi seinen Firmennamen geändert hat). */
  async refresh(): Promise<void> {
    await this.hydrate();
  }

  private async hydrate(): Promise<void> {
    await this.auth.ready;
    const profile = this.auth.profile();
    if (profile?.role !== 'contractor') {
      this.brandNameSig.set(null);
      this.loadedForUserId = null;
      return;
    }
    try {
      const companyProfile = await this.companyProfile.load();
      const brandName = companyProfile.companyName.trim();
      this.brandNameSig.set(brandName.length > 0 ? brandName : null);
      this.loadedForUserId = profile.id;
    } catch {
      // Backend offline o. Ä.: Default-Branding bleibt aktiv.
      this.brandNameSig.set(null);
    }
  }
}
