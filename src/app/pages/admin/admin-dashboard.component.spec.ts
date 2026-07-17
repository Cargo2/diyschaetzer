import { TestBed } from '@angular/core/testing';
import { ADMIN_STATS_REPOSITORY, AdminStats } from './data-access/admin-stats-repository';
import { AdminDashboardComponent } from './admin-dashboard.component';

function stats(overrides: Partial<AdminStats> = {}): AdminStats {
  return {
    usersTotal: 42,
    usersCustomer: 30,
    usersContractor: 11,
    usersAdmin: 1,
    usersNew30d: 5,
    usersNew7d: 2,
    subsTotal: 8,
    subsActive: 6,
    subsPastDue: 1,
    subsCancelled: 1,
    projectsTotal: 120,
    projectsNew30d: 9,
    projectsActive30d: 15,
    offersTotal: 20,
    offersDraft: 8,
    offersSent: 7,
    offersAccepted: 5,
    invoicesTotal: 12,
    invoicesNew30d: 3,
    sharedOffersTotal: 10,
    sharedOffersViewed: 7,
    sharedOffersViewSum: 33,
    sharedOffersAccepted: 4,
    sharedCalculationsTotal: 6,
    leadsTotal: 25,
    leadsPending: 4,
    leadsConfirmed: 6,
    leadsDistributed: 13,
    leadsExpired: 2,
    feedbackTotal: 9,
    feedbackOpen: 3,
    ...overrides
  };
}

function setup(repo: { getStats: () => Promise<AdminStats> }): AdminDashboardComponent {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AdminDashboardComponent],
    providers: [{ provide: ADMIN_STATS_REPOSITORY, useValue: repo }]
  });
  return TestBed.createComponent(AdminDashboardComponent).componentInstance;
}

describe('AdminDashboardComponent', () => {
  it('loads the stats on init and renders the tiles', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [{ provide: ADMIN_STATS_REPOSITORY, useValue: { getStats: async () => stats() } }]
    });
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges(); // triggert ngOnInit (async Laden gestartet)
    await fixture.whenStable();
    fixture.detectChanges(); // rendert die geladenen Kacheln
    expect(fixture.componentInstance.stats()).not.toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nutzer gesamt');
    expect(text).toContain('Aktive Abos');
  });

  it('derives the monthly and yearly revenue from active subscriptions × price', async () => {
    const component = setup({ getStats: async () => stats({ subsActive: 6 }) });
    await component.ngOnInit();
    expect(component.monthlyRevenue()).toBeCloseTo(6 * 29.99, 2);
    expect(component.yearlyRevenue()).toBeCloseTo(6 * 29.99 * 12, 2);
  });

  it('computes the acceptance rate (accepted / total shared offers)', async () => {
    const component = setup({
      getStats: async () => stats({ sharedOffersTotal: 10, sharedOffersAccepted: 4 })
    });
    await component.ngOnInit();
    expect(component.acceptanceRate()).toBeCloseTo(0.4, 5);
    expect(component.formatPercent(component.acceptanceRate())).toContain('%');
  });

  it('returns a zero acceptance rate when there are no shared offers', async () => {
    const component = setup({
      getStats: async () => stats({ sharedOffersTotal: 0, sharedOffersAccepted: 0 })
    });
    await component.ngOnInit();
    expect(component.acceptanceRate()).toBe(0);
  });

  it('computes a percentage share for the CSS bars, safe against a zero total', () => {
    const component = setup({ getStats: async () => stats() });
    expect(component.pct(5, 20)).toBe(25);
    expect(component.pct(3, 0)).toBe(0);
  });

  it('surfaces an error message when loading fails', async () => {
    const component = setup({
      getStats: async () => {
        throw new Error('nope');
      }
    });
    await component.ngOnInit();
    expect(component.error()).not.toBeNull();
    expect(component.stats()).toBeNull();
    expect(component.loading()).toBe(false);
  });
});
