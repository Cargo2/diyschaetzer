import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { OnlineStatusService } from './online-status.service';

function inject(platform: 'browser' | 'server'): OnlineStatusService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: PLATFORM_ID, useValue: platform }]
  });
  return TestBed.inject(OnlineStatusService);
}

describe('OnlineStatusService', () => {
  it('ist auf dem Server (kein Browser) immer online', () => {
    const service = inject('server');
    expect(service.isOnline()).toBe(true);
  });

  it('startet im Browser mit navigator.onLine (jsdom: online)', () => {
    const service = inject('browser');
    expect(service.isOnline()).toBe(true);
  });

  it('reagiert auf die online/offline-Events', () => {
    const service = inject('browser');

    globalThis.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBe(false);

    globalThis.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBe(true);
  });
});
