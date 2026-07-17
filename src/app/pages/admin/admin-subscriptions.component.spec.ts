import { TestBed } from '@angular/core/testing';
import {
  ADMIN_SUBSCRIPTIONS_REPOSITORY,
  AdminSubscriptionEntry
} from './data-access/admin-subscriptions-repository';
import { AdminSubscriptionsComponent } from './admin-subscriptions.component';

function entry(overrides: Partial<AdminSubscriptionEntry> = {}): AdminSubscriptionEntry {
  return {
    userId: 'u1',
    email: 'profi@beispiel.de',
    provider: 'paypal',
    planKey: 'lead_pro',
    status: 'active',
    currentPeriodEnd: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    active: true,
    ...overrides
  };
}

function setup(entries: AdminSubscriptionEntry[]): AdminSubscriptionsComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AdminSubscriptionsComponent],
    providers: [
      {
        provide: ADMIN_SUBSCRIPTIONS_REPOSITORY,
        useValue: { listSubscriptions: async () => entries }
      }
    ]
  });
  return TestBed.createComponent(AdminSubscriptionsComponent).componentInstance;
}

describe('AdminSubscriptionsComponent', () => {
  it('loads the subscriptions on init and counts the active ones', async () => {
    const component = setup([
      entry({ userId: 'a', status: 'active' }),
      entry({ userId: 'b', status: 'trialing' }),
      entry({ userId: 'c', status: 'cancelled' })
    ]);
    await component.ngOnInit();
    expect(component.entries().length).toBe(3);
    expect(component.activeCount()).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('renders the e-mail and status badge in the table', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AdminSubscriptionsComponent],
      providers: [
        {
          provide: ADMIN_SUBSCRIPTIONS_REPOSITORY,
          useValue: { listSubscriptions: async () => [entry({ status: 'past_due' })] }
        }
      ]
    });
    const fixture = TestBed.createComponent(AdminSubscriptionsComponent);
    fixture.detectChanges(); // triggert ngOnInit (async Laden gestartet)
    await fixture.whenStable();
    fixture.detectChanges(); // rendert die geladenen Zeilen
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('profi@beispiel.de');
    expect(text).toContain('überfällig');
  });

  it('maps statuses to labels and colour tones', () => {
    const component = setup([]);
    expect(component.statusLabel('active')).toBe('aktiv');
    expect(component.statusLabel('past_due')).toBe('überfällig');
    expect(component.tone('active')).toBe('ok');
    expect(component.tone('trialing')).toBe('ok');
    expect(component.tone('past_due')).toBe('warn');
    expect(component.tone('cancelled')).toBe('muted');
    expect(component.tone('expired')).toBe('muted');
  });

  it('formats dates and falls back to an em dash for missing values', () => {
    const component = setup([]);
    expect(component.formatDate(null)).toBe('—');
    expect(component.formatDate('not-a-date')).toBe('—');
    expect(component.formatDate('2026-09-01T00:00:00.000Z')).toContain('2026');
  });

  it('surfaces an error message when loading fails', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AdminSubscriptionsComponent],
      providers: [
        {
          provide: ADMIN_SUBSCRIPTIONS_REPOSITORY,
          useValue: {
            listSubscriptions: async () => {
              throw new Error('nope');
            }
          }
        }
      ]
    });
    const component = TestBed.createComponent(AdminSubscriptionsComponent).componentInstance;
    await component.ngOnInit();
    expect(component.error()).not.toBeNull();
    expect(component.entries().length).toBe(0);
    expect(component.loading()).toBe(false);
  });
});
