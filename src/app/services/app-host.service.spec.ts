import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppHostService, resolveHostMode } from './app-host.service';
import { APP_DOMAIN_LIVE } from '../config/site.config';

describe('resolveHostMode', () => {
  it('liefert beim Prerender/Server immer marketing (kein Browser)', () => {
    expect(resolveHostMode('fliesen-kosten.de', '', false, false)).toBe('marketing');
    expect(resolveHostMode('app.fliesen-kosten.de', '', false, false)).toBe('marketing');
  });

  it('erkennt die App-Domain am app.-Präfix', () => {
    expect(resolveHostMode('app.fliesen-kosten.de', '', false, true)).toBe('app');
    expect(resolveHostMode('app.example.test', '', false, true)).toBe('app');
    expect(resolveHostMode('APP.Fliesen-Kosten.de', '', false, true)).toBe('app');
  });

  it('behandelt Marketing-Domains je nach Go-Live-Schalter', () => {
    const expected = APP_DOMAIN_LIVE ? 'marketing' : 'standalone';
    expect(resolveHostMode('fliesen-kosten.de', '', false, true)).toBe(expected);
    expect(resolveHostMode('www.fliesen-kosten.de', '', false, true)).toBe(expected);
  });

  it('ist standalone auf unbekannten Hosts (bouletten-contest.de, localhost, IPs)', () => {
    expect(resolveHostMode('bouletten-contest.de', '', false, true)).toBe('standalone');
    expect(resolveHostMode('localhost', '', false, true)).toBe('standalone');
    expect(resolveHostMode('127.0.0.1', '', false, true)).toBe('standalone');
  });

  it('greift bei Dev-Override (Query oder gespeichertes Flag) auf app', () => {
    expect(resolveHostMode('localhost', '?app-host=1', false, true)).toBe('app');
    expect(resolveHostMode('localhost', '?foo=1&app-host=1', false, true)).toBe('app');
    expect(resolveHostMode('localhost', '', true, true)).toBe('app');
    // app-host=0 aktiviert nichts.
    expect(resolveHostMode('localhost', '?app-host=0', false, true)).toBe('standalone');
  });
});

describe('AppHostService', () => {
  it('meldet auf dem Server (kein Browser) den Marketing-Modus, kein App-Host', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }]
    });
    const service = TestBed.inject(AppHostService);
    expect(service.mode).toBe('marketing');
    expect(service.isAppHost).toBe(false);
  });

  it('loginUrl liefert relativen Pfad, solange kein Cross-Domain aktiv ist', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }]
    });
    const service = TestBed.inject(AppHostService);
    // Auf dem Server ist crossDomainEnabled nur bei APP_DOMAIN_LIVE aktiv; ohne
    // Go-Live bleibt der Link relativ.
    if (!service.crossDomainEnabled) {
      expect(service.loginUrl()).toBe('/login');
      expect(service.loginUrl('/angebote')).toBe('/login?weiter=%2Fangebote');
    }
  });
});
