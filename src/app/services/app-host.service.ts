import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { APP_DOMAIN_LIVE, APP_URL, MARKETING_HOSTNAMES } from '../config/site.config';

/**
 * Betriebsmodus der Shell (WP1, Zwei-Domain-Vorbereitung):
 * - `app`         → App-Bereich (app.fliesen-kosten.de bzw. Dev-Override).
 * - `marketing`   → Marketing-Seite mit heutigem Topmenü (fliesen-kosten.de,
 *                   sobald `APP_DOMAIN_LIVE`), sowie IMMER beim Prerender.
 * - `standalone`  → EINE Domain, alles wie heute (bis Go-Live / auf bouletten-
 *                   contest.de / localhost). Inert: verhält sich exakt wie bisher.
 */
export type HostMode = 'app' | 'marketing' | 'standalone';

/**
 * Reine, testbare Ableitung des Host-Modus. Bewusst ohne Angular-/Browser-APIs,
 * damit die gesamte Logik ohne DOM prüfbar ist (siehe Spec).
 *
 * Reihenfolge:
 * 1. Kein Browser (Prerender/Server) → `marketing` (das gebackene HTML ist immer
 *    das Marketing-Markup; die App-Routen matchen serverseitig nie).
 * 2. Hostname beginnt mit `app.` → `app`.
 * 3. Hostname ist eine Marketing-Domain → `marketing` (nur wenn `APP_DOMAIN_LIVE`),
 *    sonst `standalone`.
 * 4. Sonst (bouletten-contest.de, localhost, IPs) → `standalone`, AUSSER der
 *    Dev-Override-Flag ist gesetzt → `app`.
 */
export function resolveHostMode(
  hostname: string,
  search: string,
  storedFlag: boolean,
  isBrowser: boolean
): HostMode {
  if (!isBrowser) {
    return 'marketing';
  }
  const host = hostname.toLowerCase();
  if (host === 'app.' + MARKETING_HOSTNAMES[0] || host.startsWith('app.')) {
    return 'app';
  }
  if (MARKETING_HOSTNAMES.includes(host)) {
    return APP_DOMAIN_LIVE ? 'marketing' : 'standalone';
  }
  // Dev-Override: erlaubt das App-Layout lokal/auf der Zwischendomain zu testen.
  const overrideOn = /(?:^|[?&])app-host=1(?:&|$)/.test(search) || storedFlag;
  return overrideOn ? 'app' : 'standalone';
}

/**
 * Hinweistext für Cross-Domain-Login-CTAs: das anonyme lokale Projekt
 * (localStorage) ist an die Marketing-Domain gebunden und bleibt nach dem
 * Wechsel zur App-Domain dort erhalten, statt „mitzuwandern". Nur relevant,
 * solange {@link AppHostService.crossDomainEnabled} true ist.
 */
export const CROSS_DOMAIN_PROJECT_HINT =
  'Dein lokal gespeichertes Projekt bleibt auf diesem Gerät unter fliesen-kosten.de verfügbar.';

const FORCE_APP_HOST_KEY = 'force_app_host';

@Injectable({ providedIn: 'root' })
export class AppHostService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Modus EINMALIG im Konstruktor bestimmt (Feld, KEIN Signal). Muss über alle
   * Navigationen stabil sein, sonst würde `canMatch` mitten in der Session
   * umspringen.
   */
  readonly mode: HostMode;

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);
    let hostname = '';
    let search = '';
    if (isBrowser) {
      hostname = globalThis.location?.hostname ?? '';
      search = globalThis.location?.search ?? '';
      // `?app-host=1` persistiert das Override-Flag (überlebt Navigation/Reload),
      // `?app-host=0` löscht es. localStorage bewusst try/catch-sicher.
      this.applyOverrideQuery(search);
    }
    const storedFlag = isBrowser ? this.readStoredFlag() : false;
    this.mode = resolveHostMode(hostname, search, storedFlag, isBrowser);
  }

  /** true, wenn der App-Routen-Baum greifen soll (App-Domain / Dev-Override). */
  get isAppHost(): boolean {
    return this.mode === 'app';
  }

  /**
   * true, wenn Marketing UND die App-Domain live ist – dann verweisen Login-/
   * App-Links auf die absolute App-Domain (Cross-Domain). Im `standalone`-Modus
   * immer false → alle Links bleiben relativ wie heute.
   */
  get crossDomainEnabled(): boolean {
    return this.mode === 'marketing' && APP_DOMAIN_LIVE;
  }

  /**
   * Login-URL. Bei aktivem Cross-Domain-Betrieb absolut auf die App-Domain
   * (optional mit `?weiter=<pfad>`), sonst relativ `/login` (Verhalten wie heute).
   */
  loginUrl(weiter?: string): string {
    const query = weiter ? `?weiter=${encodeURIComponent(weiter)}` : '';
    if (this.crossDomainEnabled) {
      return `${APP_URL}/login${query}`;
    }
    return `/login${query}`;
  }

  private applyOverrideQuery(search: string): void {
    try {
      if (/(?:^|[?&])app-host=1(?:&|$)/.test(search)) {
        globalThis.localStorage?.setItem(FORCE_APP_HOST_KEY, '1');
      } else if (/(?:^|[?&])app-host=0(?:&|$)/.test(search)) {
        globalThis.localStorage?.removeItem(FORCE_APP_HOST_KEY);
      }
    } catch {
      /* localStorage nicht verfügbar – Override dann nur für diese Navigation */
    }
  }

  private readStoredFlag(): boolean {
    try {
      return globalThis.localStorage?.getItem(FORCE_APP_HOST_KEY) === '1';
    } catch {
      return false;
    }
  }
}
