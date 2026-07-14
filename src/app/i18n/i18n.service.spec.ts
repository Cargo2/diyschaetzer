import { PLATFORM_ID, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nService, UI_LANG_STORAGE_KEY, UiLang } from './i18n.service';
import { AppHostService } from '../services/app-host.service';

function makeService(opts: { isAppHost?: boolean; platform?: string } = {}): I18nService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: opts.platform ?? 'browser' },
      { provide: AppHostService, useValue: { isAppHost: opts.isAppHost ?? true } }
    ]
  });
  return TestBed.inject(I18nService);
}

/**
 * Zugriff auf die privaten Signale, um die Fallback-Kette mit BEWUSST
 * asymmetrischen Dictionaries deterministisch zu prüfen. Das Angular-Unit-Test-
 * System unterstützt `vi.mock` für relative Imports nicht, daher setzen wir die
 * internen Signale direkt statt die Dictionary-Module zu mocken.
 */
interface I18nInternals {
  langSig: WritableSignal<UiLang>;
  dict: WritableSignal<Record<string, string> | null>;
  enDict: WritableSignal<Record<string, string> | null>;
}

function internals(service: I18nService): I18nInternals {
  return service as unknown as I18nInternals;
}

describe('I18nService', () => {
  beforeEach(() => {
    try {
      globalThis.localStorage?.clear();
    } catch {
      /* egal */
    }
  });

  it('de: der Schlüssel ist die Identität', () => {
    const service = makeService();
    expect(service.lang()).toBe('de');
    expect(service.t('Irgendein Text')).toBe('Irgendein Text');
    expect(service.t('Angebote')).toBe('Angebote');
  });

  it('pl bevorzugt die polnische Übersetzung (echtes Dictionary)', async () => {
    const service = makeService();
    await service.setLang('pl');
    expect(service.lang()).toBe('pl');
    expect(service.t('Angebote')).toBe('Oferty');
  });

  it('en nutzt das englische Dictionary (echtes Dictionary)', async () => {
    const service = makeService();
    await service.setLang('en');
    expect(service.lang()).toBe('en');
    expect(service.t('Angebote')).toBe('Offers');
  });

  it('Fallback-Kette: pl → en → Key (asymmetrische Dictionaries)', () => {
    const service = makeService();
    const inner = internals(service);
    inner.langSig.set('pl');
    inner.dict.set({ both: 'PL-both', 'nur-pl': 'PL' });
    inner.enDict.set({ both: 'EN-both', 'nur-en': 'EN' });

    expect(service.t('both')).toBe('PL-both'); // pl gewinnt
    expect(service.t('nur-en')).toBe('EN'); // Fallback auf en
    expect(service.t('voellig-unbekannt')).toBe('voellig-unbekannt'); // Fallback auf Key
  });

  it('en ohne Zwischen-Dictionary fällt direkt auf den Key zurück', () => {
    const service = makeService();
    const inner = internals(service);
    inner.langSig.set('en');
    inner.dict.set({ both: 'EN-both' });
    inner.enDict.set(null);

    expect(service.t('both')).toBe('EN-both');
    expect(service.t('nur-pl')).toBe('nur-pl');
  });

  it('Zurückschalten auf de leert die Dictionaries wieder', async () => {
    const service = makeService();
    await service.setLang('pl');
    await service.setLang('de');
    expect(service.t('Angebote')).toBe('Angebote');
  });

  it('setLang persistiert die Wahl im localStorage', async () => {
    const service = makeService();
    await service.setLang('pl');
    expect(globalThis.localStorage.getItem(UI_LANG_STORAGE_KEY)).toBe('pl');
  });

  it('initFromStorage tut nichts, wenn kein App-Host', () => {
    globalThis.localStorage.setItem(UI_LANG_STORAGE_KEY, 'pl');
    const service = makeService({ isAppHost: false });
    service.initFromStorage();
    expect(service.lang()).toBe('de');
  });

  it('initFromStorage tut nichts ohne Browser (Prerender)', () => {
    globalThis.localStorage.setItem(UI_LANG_STORAGE_KEY, 'pl');
    const service = makeService({ isAppHost: true, platform: 'server' });
    service.initFromStorage();
    expect(service.lang()).toBe('de');
  });

  it('initFromStorage übernimmt eine gültige Sprache im App-Host', () => {
    globalThis.localStorage.setItem(UI_LANG_STORAGE_KEY, 'pl');
    const service = makeService({ isAppHost: true });
    service.initFromStorage();
    // langSig wird synchron gesetzt (vor dem lazy Dictionary-Import).
    expect(service.lang()).toBe('pl');
  });

  it('initFromStorage ignoriert einen unbekannten Storage-Wert', () => {
    globalThis.localStorage.setItem(UI_LANG_STORAGE_KEY, 'fr');
    const service = makeService({ isAppHost: true });
    service.initFromStorage();
    expect(service.lang()).toBe('de');
  });
});
