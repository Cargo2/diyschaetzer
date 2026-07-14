import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { SITE_URL } from '../config/site.config';

/**
 * Fallback im App-Baum (WP1) für unbekannte Pfade: bekannte Marketing-Präfixe
 * werden auf die Marketing-Domain umgeleitet (`SITE_URL`), alles Übrige landet
 * auf dem Projekt-Dashboard. Läuft nur clientseitig (App-Baum matcht serverseitig
 * nie); der `isPlatformBrowser`-Guard schadet trotzdem nicht.
 */
@Component({
  selector: 'app-external-redirect',
  imports: [],
  template: `<p style="padding:2rem;text-align:center">Weiterleitung …</p>`
})
export class ExternalRedirectComponent {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  /** Pfade, die zum Marketing-Baum gehören und daher auf die Marketing-Domain gehören. */
  private static readonly MARKETING_PREFIXES = [
    'ratgeber',
    'kosten',
    'vorlage',
    'fuer-fliesenleger',
    'agb-betriebe',
    'impressum',
    'datenschutz',
    'kontakt',
    'geteilt',
    'angebot',
    'lead-bestaetigen'
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const path = globalThis.location.pathname.replace(/^\/+/, '');
    const firstSegment = path.split('/')[0];
    if (ExternalRedirectComponent.MARKETING_PREFIXES.includes(firstSegment)) {
      globalThis.location.replace(SITE_URL + globalThis.location.pathname + globalThis.location.search);
      return;
    }
    void this.router.navigateByUrl('/projekt-dashboard');
  }
}
