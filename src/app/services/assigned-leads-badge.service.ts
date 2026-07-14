import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CONTRACTOR_LEADS_REPOSITORY } from '../pages/contractor-leads/data-access/contractor-leads-repository';
import { AuthService } from './auth.service';

/**
 * Kleiner Signal-Cache für den Nav-Menüpunkt „Anfragen" (Welle 1, Nav-Aufräumen).
 *
 * Der Menüpunkt ist standardmäßig unsichtbar und erscheint nur, wenn dem
 * angemeldeten Profi mindestens eine Anfrage zugeteilt wurde. Die Zahl wird nach
 * Login einmal geladen (App-Effect) und bei Navigation auf `/anfragen` erneut
 * aufgefrischt. Die Route selbst bleibt jederzeit erreichbar (Guard unverändert).
 *
 * Prerender-sicher: Ohne Browser (SSR), ohne konfiguriertes Supabase oder für
 * Nicht-Profis wird kein Supabase-Call abgesetzt – der Badge bleibt unsichtbar.
 */
@Injectable({ providedIn: 'root' })
export class AssignedLeadsBadgeService {
  private readonly repository = inject(CONTRACTOR_LEADS_REPOSITORY);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly countSig = signal<number | null>(null);
  /** Anzahl zugeteilter Anfragen (`null`, solange noch nicht geladen). */
  readonly count = this.countSig.asReadonly();
  /** `true`, sobald mindestens eine Anfrage zugeteilt wurde. */
  readonly hasAssignedLeads = computed(() => (this.countSig() ?? 0) > 0);

  /** Laufender Ladevorgang – dedupliziert parallele Aufrufe. */
  private inFlight: Promise<void> | null = null;

  /**
   * Lädt die Anzahl zugeteilter Anfragen neu. No-op auf dem Server, ohne
   * Supabase oder für Nicht-Profis.
   */
  refresh(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }
    if (!this.auth.isConfigured || !this.auth.isContractor()) {
      return Promise.resolve();
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.load().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /** Setzt den Cache zurück (z. B. beim Abmelden). */
  reset(): void {
    this.countSig.set(null);
    this.inFlight = null;
  }

  private async load(): Promise<void> {
    try {
      const leads = await this.repository.listAssignedLeads();
      this.countSig.set(leads.length);
    } catch {
      // Fehler bewusst schlucken – der Badge bleibt dann unsichtbar.
    }
  }
}
