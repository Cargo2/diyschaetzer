import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SUBSCRIPTION_REPOSITORY } from '../../../data-access/subscription-repository';
import { Subscription } from '../../../models/subscription.model';
import { AuthService } from '../../../services/auth.service';
import { ConsentService } from '../../../services/consent.service';
import { FeatureAccessService } from '../../../services/feature-access.service';
import {
  PaypalSdkLoaderService,
  PayPalNamespace
} from '../../../services/paypal-sdk-loader.service';
import { LeadSubscriptionComponent } from './lead-subscription.component';

const FAKE_PAYPAL: PayPalNamespace = {
  Buttons: () => ({ render: async () => undefined })
};

interface Options {
  canManage?: boolean;
  subscription?: Subscription | null;
  grantExternal?: boolean;
}

async function setup(options: Options = {}): Promise<{
  fixture: ComponentFixture<LeadSubscriptionComponent>;
  loadCalls: string[];
}> {
  const loadCalls: string[] = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [LeadSubscriptionComponent],
    providers: [
      provideRouter([]),
      {
        provide: FeatureAccessService,
        useValue: { canManageSubscription: () => options.canManage ?? true }
      },
      {
        provide: SUBSCRIPTION_REPOSITORY,
        useValue: {
          getMySubscription: async () => options.subscription ?? null,
          activate: async () => ({ ok: false, reason: 'unknown' as const })
        }
      },
      {
        provide: AuthService,
        useValue: {
          session: () => ({ user: { id: 'user-1' } }),
          profile: () => null
        }
      },
      {
        provide: PaypalSdkLoaderService,
        useValue: {
          load: (clientId: string) => {
            loadCalls.push(clientId);
            return Promise.resolve(FAKE_PAYPAL);
          }
        }
      }
    ]
  });

  // Consent-Zustand vor dem ersten Render setzen (jsdom-localStorage persistiert
  // zwischen Tests, daher explizit überschreiben).
  const consent = TestBed.inject(ConsentService);
  if (options.grantExternal) {
    consent.acceptAll();
  } else {
    consent.acceptEssentialOnly();
  }

  const fixture = TestBed.createComponent(LeadSubscriptionComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, loadCalls };
}

describe('LeadSubscriptionComponent', () => {
  it('renders no subscription UI when the feature is not manageable (no config/no contractor)', async () => {
    const { fixture, loadCalls } = await setup({ canManage: false, grantExternal: true });
    expect(fixture.nativeElement.querySelector('#abo')).toBeNull();
    expect(loadCalls).toEqual([]);
  });

  it('shows the "active" badge with the period end for an active subscription', async () => {
    const { fixture } = await setup({
      subscription: {
        provider: 'paypal',
        planKey: 'lead_pro',
        status: 'active',
        currentPeriodEnd: '2026-08-01T00:00:00Z'
      }
    });
    expect(fixture.componentInstance.badge()).toBe('active');
    const badge = fixture.nativeElement.querySelector('.abo-badge') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('Aktiv');
    expect(fixture.nativeElement.textContent).toContain('Aktiv bis');
    // Kein PayPal-Button bei aktivem Abo.
    expect(fixture.nativeElement.querySelector('.paypal-container')).toBeNull();
  });

  it('maps a past_due subscription to the "overdue" badge', async () => {
    const { fixture } = await setup({
      subscription: {
        provider: 'paypal',
        planKey: 'lead_pro',
        status: 'past_due',
        currentPeriodEnd: null
      }
    });
    expect(fixture.componentInstance.badge()).toBe('overdue');
    expect((fixture.nativeElement.querySelector('.abo-badge') as HTMLElement).textContent?.trim()).toBe(
      'Überfällig'
    );
  });

  it('shows the "inactive" badge when there is no subscription', async () => {
    const { fixture } = await setup({ subscription: null, grantExternal: true });
    expect(fixture.componentInstance.badge()).toBe('inactive');
    expect((fixture.nativeElement.querySelector('.abo-badge') as HTMLElement).textContent?.trim()).toBe(
      'Inaktiv'
    );
  });

  // fliesen-kosten hat noch KEIN PayPal-Produkt/-Plan (PAYPAL_CONFIG leer): das SDK
  // wird nie geladen (auch nicht mit Consent) und statt des Buttons erscheint der
  // neutrale „wird eingerichtet"-Hinweis (Setup-Karte), keine Consent-Karte.
  it('does NOT load the PayPal SDK and shows the setup notice while PayPal is not configured', async () => {
    const { fixture, loadCalls } = await setup({ subscription: null, grantExternal: true });
    expect(loadCalls).toEqual([]);
    expect(fixture.componentInstance.paymentConfigured).toBe(false);
    expect(fixture.nativeElement.querySelector('.setup-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.paypal-container')).toBeNull();
    expect(fixture.nativeElement.querySelector('.consent-card')).toBeNull();
  });

  it('also shows the setup notice (no SDK) without external-services consent', async () => {
    const { fixture, loadCalls } = await setup({ subscription: null, grantExternal: false });
    expect(loadCalls).toEqual([]);
    expect(fixture.nativeElement.querySelector('.setup-card')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.paypal-container')).toBeNull();
  });
});
