import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AppHostService } from '../services/app-host.service';

/**
 * Lässt nur angemeldete Admins (`admin`) durch. Wartet die initiale Auth-Prüfung
 * ab, damit ein Direktaufruf/Reload auf /admin nicht fälschlich umgeleitet wird.
 * Die Admin-Rolle wird ausschließlich serverseitig vergeben (Migration 0003),
 * nie über die App.
 */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const host = inject(AppHostService);

  await auth.ready;

  if (auth.isAuthenticated() && auth.profile()?.role === 'admin') {
    return true;
  }
  // Cross-Domain-Betrieb: Login liegt auf der App-Domain → absolut dorthin.
  if (host.crossDomainEnabled) {
    globalThis.location.assign(host.loginUrl(state.url));
    return false;
  }
  return router.createUrlTree(['/login']);
};
