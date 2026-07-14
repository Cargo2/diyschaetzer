import { TestBed } from '@angular/core/testing';
import { ConsentService } from './consent.service';

function fresh(): ConsentService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(ConsentService);
}

describe('ConsentService', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  it('shows the banner and grants only essential before any decision', () => {
    const consent = fresh();
    expect(consent.bannerVisible()).toBe(true);
    expect(consent.decisionMade()).toBe(false);
    expect(consent.isGranted('essential')).toBe(true);
    expect(consent.isGranted('external_services')).toBe(false);
    expect(consent.isGranted('statistics')).toBe(false);
  });

  it('"nur essenziell" hides the banner and leaves optional categories off', () => {
    const consent = fresh();
    consent.acceptEssentialOnly();

    expect(consent.bannerVisible()).toBe(false);
    expect(consent.decisionMade()).toBe(true);
    expect(consent.isGranted('essential')).toBe(true);
    expect(consent.isGranted('external_services')).toBe(false);
    expect(consent.isGranted('statistics')).toBe(false);
    expect(consent.grantedChanges()).toEqual({
      essential: true,
      external_services: false,
      statistics: false
    });
  });

  it('"alle akzeptieren" hides the banner and grants every category', () => {
    const consent = fresh();
    consent.acceptAll();

    expect(consent.bannerVisible()).toBe(false);
    expect(consent.isGranted('external_services')).toBe(true);
    expect(consent.isGranted('statistics')).toBe(true);
    expect(consent.grantedChanges()).toEqual({
      essential: true,
      external_services: true,
      statistics: true
    });
  });

  it('saveSelection stores a mixed opt-in choice', () => {
    const consent = fresh();
    consent.saveSelection({ external_services: false, statistics: true });

    expect(consent.isGranted('external_services')).toBe(false);
    expect(consent.isGranted('statistics')).toBe(true);
    expect(consent.bannerVisible()).toBe(false);
  });

  it('persists the decision across service instances', () => {
    fresh().acceptAll();

    const reloaded = fresh();
    expect(reloaded.decisionMade()).toBe(true);
    expect(reloaded.bannerVisible()).toBe(false);
    expect(reloaded.isGranted('statistics')).toBe(true);
  });

  it('can reopen the settings dialog after a decision (Widerruf) and revoke', () => {
    const consent = fresh();
    consent.acceptAll();
    expect(consent.settingsOpen()).toBe(false);

    // Footer-Link „Cookie-Einstellungen" öffnet den Dialog erneut.
    consent.openSettings();
    expect(consent.settingsOpen()).toBe(true);

    // Widerruf: nur noch essenziell.
    consent.saveSelection({ external_services: false, statistics: false });
    expect(consent.settingsOpen()).toBe(false);
    expect(consent.isGranted('statistics')).toBe(false);
    expect(consent.isGranted('external_services')).toBe(false);

    // Nach Widerruf ist der Stand persistent.
    const reloaded = fresh();
    expect(reloaded.isGranted('statistics')).toBe(false);
    expect(reloaded.decisionMade()).toBe(true);
  });

  it('ignores stored data from an older consent version', () => {
    globalThis.localStorage?.setItem(
      'badprojekt:consent-v1',
      JSON.stringify({ version: 0, decided: true, external_services: true, statistics: true })
    );
    const consent = fresh();
    expect(consent.decisionMade()).toBe(false);
    expect(consent.isGranted('statistics')).toBe(false);
  });
});
