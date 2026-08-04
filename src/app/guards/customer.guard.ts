import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Gegenstück zum `contractorGuard`: lässt anonyme Nutzer und Hobby-Nutzer
 * (`customer`) durch. Angemeldete Profis (`contractor`) werden auf das
 * Projekt-Dashboard umgeleitet (Heimwerker-only-Seiten wie die
 * Projekt-Zusammenfassung). Wartet die initiale Auth-Prüfung ab, damit ein
 * Direktaufruf/Reload nicht fälschlich durchgelassen wird.
 */
export const customerGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (auth.isContractor()) {
    return router.createUrlTree(['/projekt-dashboard']);
  }
  return true;
};
