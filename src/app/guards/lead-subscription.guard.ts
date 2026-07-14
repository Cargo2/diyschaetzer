import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionStatusService } from '../services/subscription-status.service';

/**
 * Schützt `/konto/anfragen-empfang`: die Angebots-Textvorlagen und
 * Lead-Empfangs-Einstellungen sind nur mit aktivem Lead-Abo erreichbar. Ohne
 * aktives Abo wird auf `/konto/premium` (Freischalten) umgeleitet.
 *
 * Läuft immer NACH dem contractorGuard der Elternroute `/konto`, sodass die
 * Auth-Prüfung bereits abgeschlossen ist.
 */
export const leadSubscriptionGuard: CanActivateFn = async () => {
  const status = inject(SubscriptionStatusService);
  const router = inject(Router);

  await status.ensureLoaded();

  return status.isActive() ? true : router.createUrlTree(['/konto/premium']);
};
