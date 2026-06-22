import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Lässt nur angemeldete Profis (`contractor`) durch. Wartet die initiale
 * Auth-Prüfung ab, damit ein Direktaufruf (Reload auf /profil) nicht
 * fälschlich umgeleitet wird.
 */
export const contractorGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ready;

  if (auth.isAuthenticated() && auth.profile()?.role === 'contractor') {
    return true;
  }
  return router.createUrlTree(['/login']);
};
