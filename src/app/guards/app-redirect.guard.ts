import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AppHostService } from '../services/app-host.service';
import { APP_URL } from '../config/site.config';

/**
 * Marketing-Baum-Guard (WP1): App-only-Routen (login, konto, feedback, angebote,
 * rechnungen, anfragen, admin) im Cross-Domain-Betrieb auf die App-Domain
 * umleiten. Im `standalone`-Modus ein No-Op (`true`), damit bis zum Go-Live alles
 * exakt wie heute auf EINER Domain läuft.
 */
export const appRedirectGuard: CanActivateFn = (_route, state) => {
  const host = inject(AppHostService);
  if (host.crossDomainEnabled) {
    globalThis.location.assign(APP_URL + state.url);
    return false;
  }
  return true;
};
