import { vi } from 'vitest';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  detectIos,
  detectStandalone,
  InstallPromptService,
  type BeforeInstallPromptEvent
} from './install-prompt.service';
import { AppHostService } from './app-host.service';

describe('detectIos', () => {
  it('erkennt iPhone/iPad/iPod an der UA', () => {
    expect(detectIos('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true);
    expect(detectIos('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 5)).toBe(true);
    expect(detectIos('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0)', 5)).toBe(true);
  });

  it('erkennt iPadOS-Desktop-UA (Macintosh + Touch)', () => {
    expect(detectIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
    // Echter Mac (kein Touch) ist NICHT iOS.
    expect(detectIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
  });

  it('ist false für Android/Desktop-Chrome', () => {
    expect(detectIos('Mozilla/5.0 (Linux; Android 13)', 5)).toBe(false);
    expect(detectIos('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0)).toBe(false);
    expect(detectIos('', 0)).toBe(false);
  });
});

describe('detectStandalone', () => {
  it('ist true, wenn display-mode ODER navigator.standalone standalone meldet', () => {
    expect(detectStandalone(true, false)).toBe(true);
    expect(detectStandalone(false, true)).toBe(true);
    expect(detectStandalone(true, true)).toBe(true);
  });

  it('ist false, wenn keines von beiden greift', () => {
    expect(detectStandalone(false, false)).toBe(false);
  });
});

function makeEvent(): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
  Object.assign(event, {
    prompt: () => Promise.resolve(),
    userChoice: Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' })
  });
  return event;
}

function inject(platform: 'browser' | 'server', isAppHost: boolean): InstallPromptService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: platform },
      { provide: AppHostService, useValue: { isAppHost } }
    ]
  });
  return TestBed.inject(InstallPromptService);
}

describe('InstallPromptService', () => {
  it('bietet auf dem Server (kein Browser) keine Installation an', () => {
    const service = inject('server', false);
    expect(service.canInstall()).toBe(false);
    expect(service.isIos()).toBe(false);
    expect(service.isStandalone()).toBe(false);
  });

  it('bietet ohne App-Host keine Installation an (Listener wird nicht registriert)', () => {
    const service = inject('browser', false);
    globalThis.dispatchEvent(makeEvent());
    // Kein beforeinstallprompt-Listener → kein gemerkter Prompt (jsdom-UA ist kein iOS).
    expect(service.canInstall()).toBe(false);
  });

  it('setzt canInstall nach einem abgefangenen beforeinstallprompt (App-Host) auf true', () => {
    const service = inject('browser', true);
    expect(service.canInstall()).toBe(false);
    globalThis.dispatchEvent(makeEvent());
    expect(service.canInstall()).toBe(true);
  });

  it('setzt canInstall nach appinstalled wieder auf false', () => {
    const service = inject('browser', true);
    globalThis.dispatchEvent(makeEvent());
    expect(service.canInstall()).toBe(true);
    globalThis.dispatchEvent(new Event('appinstalled'));
    expect(service.canInstall()).toBe(false);
  });

  it('promptInstall löst den gemerkten Chromium-Prompt aus und verwirft ihn danach', async () => {
    const service = inject('browser', true);
    const event = makeEvent();
    const promptSpy = vi.spyOn(event, 'prompt');
    globalThis.dispatchEvent(event);

    await expect(service.promptInstall()).resolves.toBe('prompted');
    expect(promptSpy).toHaveBeenCalledOnce();
    // Event ist einmalig → nach dem Auslösen kein Prompt mehr gemerkt.
    expect(service.canInstall()).toBe(false);
  });

  it('promptInstall meldet unavailable, wenn kein Prompt gemerkt ist (kein iOS)', async () => {
    const service = inject('browser', true);
    await expect(service.promptInstall()).resolves.toBe('unavailable');
  });
});
