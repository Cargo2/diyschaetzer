import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Meldet den Online-/Offline-Zustand des Browsers als Signal. Prerender-sicher:
 * auf dem Server (kein `window`/`navigator`) bleibt `isOnline` true. Im Browser
 * initial aus `navigator.onLine` gelesen und über die `online`/`offline`-Events
 * aktualisiert.
 */
@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly onlineSig = signal(true);

  /** true, solange der Browser online ist (auf dem Server immer true). */
  readonly isOnline = this.onlineSig.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // `navigator.onLine` ist nur ein Hinweis (true = evtl. online), reicht hier aber.
    this.onlineSig.set(globalThis.navigator?.onLine !== false);
    globalThis.addEventListener('online', () => this.onlineSig.set(true));
    globalThis.addEventListener('offline', () => this.onlineSig.set(false));
  }
}
