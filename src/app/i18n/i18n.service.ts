import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AppHostService } from '../services/app-host.service';

/** Zur Laufzeit wählbare UI-Sprachen des App-Bereichs. Deutsch ist Quellsprache. */
export type UiLang = 'de' | 'pl' | 'en';

/** localStorage-Schlüssel für die zuletzt gewählte UI-Sprache. */
export const UI_LANG_STORAGE_KEY = 'badprojekt:ui-lang';

/**
 * Laufzeit-Übersetzung NUR für den App-Bereich (app.fliesen-kosten.de bzw.
 * Dev-Override `?app-host=1`). Marketing/Dokumente bleiben deutsch.
 *
 * Konzept **Deutsch-als-Schlüssel**: der deutsche Quelltext IST der Key. Die
 * Dictionaries (`dict/pl.ts`, `dict/en.ts`) mappen ihn direkt auf die
 * Übersetzung. Ist keine Übersetzung hinterlegt, greift die Fallback-Kette
 * **gewählte Sprache → Englisch → Deutsch (= Key selbst)**.
 *
 * Zoneless-Hinweis: `t()` liest im Body `lang()`/`dict()`/`enDict()` als Signale,
 * damit gewrappte Views (über die impure `t`-Pipe) beim Sprachwechsel automatisch
 * neu evaluiert werden.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly appHost = inject(AppHostService);

  /** Aktuelle Sprache (nach außen readonly). Default: Deutsch. */
  private readonly langSig = signal<UiLang>('de');
  readonly lang = this.langSig.asReadonly();

  /** Dictionary der aktiven Nicht-Deutsch-Sprache (pl **oder** en). */
  private readonly dict = signal<Record<string, string> | null>(null);
  /** Englisches Dictionary als Zwischen-Fallback (nur bei aktivem `pl` gesetzt). */
  private readonly enDict = signal<Record<string, string> | null>(null);

  /**
   * Übersetzt `key` (= deutscher Quelltext). Bei Deutsch ist der Key die
   * Identität; sonst Fallback-Kette gewählte Sprache → Englisch → Key.
   */
  t(key: string): string {
    if (this.langSig() === 'de') {
      return key;
    }
    return this.dict()?.[key] ?? this.enDict()?.[key] ?? key;
  }

  /**
   * Setzt die Sprache, persistiert sie (try/catch-sicher) und lädt die
   * benötigten Dictionaries **lazy** (eigener Chunk, kein Ballast im
   * Initial-Bundle). Bei Deutsch werden die Dictionaries geleert.
   */
  async setLang(lang: UiLang): Promise<void> {
    this.langSig.set(lang);
    this.persist(lang);

    if (lang === 'de') {
      this.dict.set(null);
      this.enDict.set(null);
      return;
    }
    if (lang === 'en') {
      const { EN_DICT } = await import('./dict/en');
      this.dict.set(EN_DICT);
      this.enDict.set(null);
      return;
    }
    // pl: braucht pl (Primär) UND en (Zwischen-Fallback).
    const [{ PL_DICT }, { EN_DICT }] = await Promise.all([
      import('./dict/pl'),
      import('./dict/en')
    ]);
    this.dict.set(PL_DICT);
    this.enDict.set(EN_DICT);
  }

  /**
   * Initialisiert die Sprache aus dem localStorage – aber NUR im Browser UND
   * NUR im App-Host (app.fliesen-kosten.de / Dev-Override).
   *
   * Dieses Gate ist der tragende Lock: derselbe Wizard/dieselben Komponenten
   * werden auch im Marketing-Baum (und beim statischen Prerender) gerendert.
   * Dort MUSS immer Deutsch erscheinen – niemals eine gespeicherte Fremdsprache.
   * Ohne dieses Gate würde eine früher gewählte pl/en-Präferenz in die
   * Marketing-/Prerender-Ansicht durchschlagen. Beim Prerender ist ohnehin kein
   * Browser vorhanden (`isPlatformBrowser` false), sodass Deutsch gebacken wird.
   */
  initFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (!this.appHost.isAppHost) {
      return;
    }
    try {
      const stored = globalThis.localStorage?.getItem(UI_LANG_STORAGE_KEY);
      if (stored === 'pl' || stored === 'en' || stored === 'de') {
        void this.setLang(stored);
      }
      // Unbekannte Werte werden bewusst ignoriert (Default bleibt Deutsch).
    } catch {
      /* localStorage nicht verfügbar – Default (Deutsch) bleibt aktiv. */
    }
  }

  private persist(lang: UiLang): void {
    try {
      globalThis.localStorage?.setItem(UI_LANG_STORAGE_KEY, lang);
    } catch {
      /* localStorage nicht verfügbar – Wahl gilt dann nur für diese Session. */
    }
  }
}
