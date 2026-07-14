import { computed, Injectable, signal, type Signal } from '@angular/core';

/**
 * Consent-Kategorien. `essential` ist immer aktiv (technisch notwendige Speicherung
 * wie localStorage und Login-Session) und kann nicht abgewählt werden.
 *
 * Aktuell setzt die App noch KEINE nicht-essenziellen Dienste ein – die Kategorien
 * sind vorbereitet für kommende Ausbaustufen:
 *   - `external_services`: eingebettete Dritt-Dienste, z. B. der Zahlungsdienstleister
 *     PayPal für das Fliesenleger-Abo.
 *   - `statistics`: Reichweitenmessung, z. B. Google Analytics 4 (derzeit ungenutzt).
 */
export type ConsentCategory = 'essential' | 'external_services' | 'statistics';

/** Abwählbare (Opt-in-)Kategorien – `essential` ist bewusst ausgenommen. */
export type OptionalConsentCategory = Exclude<ConsentCategory, 'essential'>;

export interface ConsentState {
  /** Immer true – technisch notwendig, nicht abwählbar. */
  readonly essential: true;
  readonly external_services: boolean;
  readonly statistics: boolean;
}

/** Persistiertes Format im localStorage. */
interface StoredConsent {
  version: 1;
  /** Hat der Nutzer aktiv eine Wahl getroffen? Steuert die Banner-Anzeige. */
  decided: boolean;
  external_services: boolean;
  statistics: boolean;
}

const STORAGE_KEY = 'badprojekt:consent-v1';
const CONSENT_VERSION = 1 as const;

/**
 * Signal-basierter Consent-Manager (Eigenbau, keine externe Abhängigkeit).
 *
 * Prerender-/SSR-sicher: `localStorage` wird nur über `globalThis.localStorage?.`
 * in try/catch angefasst. Auf dem Server (Prerender) existiert kein Storage →
 * Zustand „noch nicht entschieden, nur essenziell" → das Banner wird in das
 * statische HTML gerendert und funktioniert damit auch ohne JavaScript.
 *
 * ── Muster für spätere Skript-Loader (PayPal-SDK, GA4 o. Ä.) ──────────────────
 * Nicht-essenzielle Skripte dürfen NUR nach Opt-in geladen werden. Ein Loader
 * gated dazu reaktiv auf `grantedChanges` (feuert bei jeder Consent-Änderung,
 * auch bei Widerruf) bzw. prüft punktuell `isGranted(category)`:
 *
 *   effect(() => {
 *     if (consent.grantedChanges().statistics) {
 *       loadAnalyticsScriptOnce();   // idempotent!
 *     }
 *   });
 *
 * `isGranted('external_services')` bewacht analog das PayPal-SDK. So bleibt das
 * Gating an EINER Stelle und respektiert auch einen späteren Widerruf.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
  private readonly stateSignal = signal<StoredConsent>(this.load());

  /** true, sobald der Nutzer aktiv „Alle/Nur essenziell/Speichern" gewählt hat. */
  readonly decisionMade = computed(() => this.stateSignal().decided);

  /** Das Banner erscheint, solange keine Entscheidung getroffen wurde. */
  readonly bannerVisible = computed(() => !this.stateSignal().decided);

  /**
   * Aktueller Einwilligungsstand als read-only Signal. Skript-Loader gaten hierauf
   * (feuert bei jeder Änderung, inkl. Widerruf).
   */
  readonly grantedChanges: Signal<ConsentState> = computed(() => ({
    essential: true,
    external_services: this.stateSignal().external_services,
    statistics: this.stateSignal().statistics
  }));

  /** Steuert den Einstellungen-Dialog (Banner-Button UND Footer-Link öffnen ihn). */
  readonly settingsOpen = signal(false);

  /** Einwilligung für eine Kategorie abfragen. `essential` ist immer true. */
  isGranted(category: ConsentCategory): boolean {
    if (category === 'essential') {
      return true;
    }
    return this.stateSignal()[category] === true;
  }

  /** „Alle akzeptieren" – alle Kategorien an. */
  acceptAll(): void {
    this.commit({ external_services: true, statistics: true });
  }

  /** „Nur essenziell" – alle Opt-in-Kategorien aus. */
  acceptEssentialOnly(): void {
    this.commit({ external_services: false, statistics: false });
  }

  /** Auswahl aus dem Einstellungen-Dialog übernehmen (Widerruf inklusive). */
  saveSelection(selection: Record<OptionalConsentCategory, boolean>): void {
    this.commit({
      external_services: selection.external_services === true,
      statistics: selection.statistics === true
    });
  }

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  private commit(values: Record<OptionalConsentCategory, boolean>): void {
    const next: StoredConsent = {
      version: CONSENT_VERSION,
      decided: true,
      external_services: values.external_services,
      statistics: values.statistics
    };
    this.stateSignal.set(next);
    this.persist(next);
    this.settingsOpen.set(false);
  }

  private load(): StoredConsent {
    const fallback: StoredConsent = {
      version: CONSENT_VERSION,
      decided: false,
      external_services: false,
      statistics: false
    };
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw) as Partial<StoredConsent>;
      // Ältere/abweichende Version → erneut fragen (konservativ, nur essenziell).
      if (parsed.version !== CONSENT_VERSION || parsed.decided !== true) {
        return fallback;
      }
      return {
        version: CONSENT_VERSION,
        decided: true,
        external_services: parsed.external_services === true,
        statistics: parsed.statistics === true
      };
    } catch {
      return fallback;
    }
  }

  private persist(state: StoredConsent): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ohne Storage bleibt der Zustand nur für diese Sitzung erhalten.
    }
  }
}
