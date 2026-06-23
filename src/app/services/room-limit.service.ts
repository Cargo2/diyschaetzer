import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { LocalProjectService } from './local-project.service';

/** Maximale Raumanzahl pro Projekt für Heimwerker (customer/anonym). */
export const HOBBY_MAX_ROOMS = 5;

/**
 * Begrenzt die Raumanzahl je Projekt: Heimwerker (Rolle `customer` oder anonym)
 * dürfen max. {@link HOBBY_MAX_ROOMS} Räume, Profis/Admins unbegrenzt. Bewusst
 * außerhalb von {@link LocalProjectService} (der bleibt auth-agnostisch).
 */
@Injectable({ providedIn: 'root' })
export class RoomLimitService {
  private readonly auth = inject(AuthService);
  private readonly localProject = inject(LocalProjectService);

  /** Obergrenze: unbegrenzt für Profi/Admin, sonst {@link HOBBY_MAX_ROOMS}. */
  readonly maxRooms = computed(() => {
    const role = this.auth.profile()?.role;
    return role === 'contractor' || role === 'admin' ? Infinity : HOBBY_MAX_ROOMS;
  });

  /** Räume im aktiven Projekt. */
  readonly roomCount = computed(() => this.localProject.rooms().length);

  /** Gilt überhaupt eine Begrenzung (Heimwerker/anonym)? */
  readonly limited = computed(() => Number.isFinite(this.maxRooms()));

  /** Ist die Obergrenze erreicht? (Bestehende Räume bleiben weiter bearbeitbar.) */
  readonly limitReached = computed(() => this.roomCount() >= this.maxRooms());

  /** Hinweistext für die UI (leer, wenn unbegrenzt). */
  readonly hint = computed(() =>
    this.limited()
      ? `Als Heimwerker kannst du bis zu ${HOBBY_MAX_ROOMS} Räume pro Projekt anlegen.`
      : ''
  );

  /** Darf gerade ein NEUER Raum angelegt werden? */
  canAddRoom(): boolean {
    return !this.limitReached();
  }
}
