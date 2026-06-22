import { effect, inject, Injectable, signal } from '@angular/core';
import { ProfileAssumptionDefaults } from '../config/profile-price-fields';
import { PROFILE_ASSUMPTION_DEFAULTS_REPOSITORY } from '../data-access/profile-assumption-defaults-repository';
import { AuthService } from './auth.service';

/**
 * Cached die Profil-Standardannahmen des angemeldeten Profis und stellt sie
 * **synchron** ({@link current}) für den {@link AssumptionService} bereit – so
 * bleibt die synchrone Berechnungs-Pipeline unangetastet (analog CatalogService).
 *
 * Für Nicht-Profis/anonym ist der Cache leer → es greifen die System-Defaults.
 * Geladen wird einmal nach Login; bei Profil-Wechsel (effect) neu.
 */
@Injectable({ providedIn: 'root' })
export class ProfileAssumptionDefaultsService {
  private readonly auth = inject(AuthService);
  private readonly repository = inject(PROFILE_ASSUMPTION_DEFAULTS_REPOSITORY);

  private readonly defaultsSig = signal<ProfileAssumptionDefaults>({});
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

  /** Aktuelle Profil-Defaults (leer, wenn keine/kein Profi). */
  current(): ProfileAssumptionDefaults {
    return this.defaultsSig();
  }

  /** Neu aus der DB laden (z. B. nach dem Speichern). */
  async refresh(): Promise<void> {
    await this.hydrate();
  }

  /** Speichert die Defaults und aktualisiert den Cache. */
  async save(defaults: ProfileAssumptionDefaults): Promise<void> {
    await this.repository.save(defaults);
    this.defaultsSig.set({ ...defaults });
    this.loadedForUserId = this.auth.profile()?.id ?? null;
  }

  private async hydrate(): Promise<void> {
    await this.auth.ready;
    const profile = this.auth.profile();
    if (profile?.role !== 'contractor') {
      this.defaultsSig.set({});
      this.loadedForUserId = null;
      return;
    }
    try {
      this.defaultsSig.set(await this.repository.load());
      this.loadedForUserId = profile.id;
    } catch {
      // Backend offline o. Ä.: System-Defaults bleiben aktiv.
      this.defaultsSig.set({});
    }
  }
}
