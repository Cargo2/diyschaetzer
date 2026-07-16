import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppHostService } from './app-host.service';

/**
 * Minimales Interface des (nicht standardisierten) `beforeinstallprompt`-Events.
 * Chromium feuert es, wenn die PWA installierbar ist; wir fangen es ab, halten die
 * Referenz und lösen den Dialog erst auf ausdrückliche Nutzeraktion aus.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Ergebnis von {@link InstallPromptService.promptInstall}:
 * - `ios`         → Safari kennt keinen Prompt; die UI zeigt stattdessen die Anleitung.
 * - `prompted`    → nativer Chromium-Dialog wurde ausgelöst.
 * - `unavailable` → weder Prompt gemerkt noch iOS (nichts zu tun).
 */
export type InstallPromptOutcome = 'ios' | 'prompted' | 'unavailable';

/**
 * Reine iOS-Erkennung (iPhone/iPad/iPod) inklusive iPadOS-Desktop-UA: iPadOS meldet
 * sich ab v13 als „Macintosh", ist aber am Touch-Support (`maxTouchPoints > 1`)
 * erkennbar. Bewusst ohne Browser-APIs, damit die Logik ohne DOM prüfbar ist.
 */
export function detectIos(userAgent: string, maxTouchPoints: number): boolean {
  const ua = userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return true;
  }
  // iPadOS 13+ tarnt sich als Desktop-Safari (Macintosh), hat aber echten Touch.
  return /Macintosh/i.test(ua) && maxTouchPoints > 1;
}

/**
 * Reine Standalone-Erkennung: Läuft die App bereits im installierten Modus
 * (`display-mode: standalone` bzw. iOS-`navigator.standalone`)? Dann nie zur
 * Installation auffordern.
 */
export function detectStandalone(displayModeStandalone: boolean, navigatorStandalone: boolean): boolean {
  return displayModeStandalone === true || navigatorStandalone === true;
}

/**
 * Steuert den PWA-Installations-Hinweis (Phase 18, Stufe 3). Signal-basiert und
 * prerender-sicher: der Konstruktor fasst `window` nur im Browser an und registriert
 * den `beforeinstallprompt`-Listener NUR im App-Host (Sidebar-Eintrag existiert nur
 * dort). Kein localStorage-Dismiss – der Eintrag ist ein unaufdringlicher Sidebar-
 * Link, kein Banner.
 */
@Injectable({ providedIn: 'root' })
export class InstallPromptService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly appHost = inject(AppHostService);

  /** Gemerktes, abgefangenes `beforeinstallprompt`-Event (Chromium) oder null. */
  private readonly deferredPrompt = signal<BeforeInstallPromptEvent | null>(null);

  private readonly isIosSig = signal(false);
  private readonly isStandaloneSig = signal(false);

  /** true auf iPhone/iPad/iPod (inkl. iPadOS-Desktop-UA). */
  readonly isIos = this.isIosSig.asReadonly();
  /** true, wenn die App bereits installiert/standalone läuft → nie zur Installation auffordern. */
  readonly isStandalone = this.isStandaloneSig.asReadonly();

  /**
   * true, wenn eine Installation angeboten werden kann: entweder liegt ein
   * abgefangener Chromium-Prompt vor ODER es ist iOS (manueller Fallback). Im
   * Standalone-Modus immer false.
   */
  readonly canInstall = computed(() => {
    if (this.isStandaloneSig()) {
      return false;
    }
    return this.deferredPrompt() !== null || this.isIosSig();
  });

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const nav = globalThis.navigator;
    this.isIosSig.set(detectIos(nav?.userAgent ?? '', nav?.maxTouchPoints ?? 0));

    const displayModeStandalone =
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(display-mode: standalone)').matches;
    // iOS-Safari kennt kein display-mode, meldet den Home-Screen-Modus über
    // `navigator.standalone` (nicht typisiert → bewusster Index-Zugriff).
    const navigatorStandalone = (nav as unknown as { standalone?: boolean })?.standalone === true;
    this.isStandaloneSig.set(detectStandalone(displayModeStandalone, navigatorStandalone));

    // Listener nur im App-Host: der Install-Eintrag lebt ausschließlich in der App-Shell.
    if (!this.appHost.isAppHost) {
      return;
    }

    globalThis.addEventListener('beforeinstallprompt', (event: Event) => {
      // Verhindert den automatischen Mini-Infobalken; wir lösen bewusst selbst aus.
      event.preventDefault();
      this.deferredPrompt.set(event as BeforeInstallPromptEvent);
    });

    globalThis.addEventListener('appinstalled', () => {
      this.deferredPrompt.set(null);
    });
  }

  /**
   * Löst die Installation aus. Auf iOS gibt es keinen Prompt → `'ios'` zurückgeben,
   * damit die UI die Safari-Anleitung einblendet. Sonst den gemerkten Chromium-Prompt
   * auslösen und die Referenz verwerfen (ein Event ist nur einmal nutzbar).
   */
  async promptInstall(): Promise<InstallPromptOutcome> {
    if (this.isIosSig()) {
      return 'ios';
    }
    const event = this.deferredPrompt();
    if (!event) {
      return 'unavailable';
    }
    this.deferredPrompt.set(null);
    try {
      await event.prompt();
      await event.userChoice;
    } catch {
      // Prompt konnte nicht ausgelöst werden – Zustand bleibt konsistent (Event verworfen).
    }
    return 'prompted';
  }
}
