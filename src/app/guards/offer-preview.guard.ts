import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Tolerante Variante des `contractorGuard` NUR für `/angebote`: anonyme Nutzer
 * dürfen in den Vorschau-Modus (Angebot erstellen + Vorschau-PDF mit
 * Wasserzeichen), angemeldete Profis (`contractor`) in den Vollmodus.
 * Eingeloggte Nicht-Profis werden wie bisher auf die Startseite umgeleitet.
 * Wartet die initiale Auth-Prüfung ab, damit ein Direktaufruf (Reload auf
 * /angebote) nicht fälschlich im Vorschau-Modus landet.
 */
export const offerPreviewGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  // Anonym → Vorschau-Modus; angemeldeter Profi → Vollmodus.
  if (!auth.isAuthenticated() || auth.profile()?.role === 'contractor') {
    return true;
  }
  // Bereits angemeldet, aber kein Profi → auf die Startseite (wie contractorGuard).
  return router.createUrlTree(['/']);
};
