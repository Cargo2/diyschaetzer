import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SUBSCRIPTION_REPOSITORY } from '../../data-access/subscription-repository';
import { AuthService } from '../../services/auth.service';
import { FeatureAccessService } from '../../services/feature-access.service';
import { PaypalSdkLoaderService, PayPalNamespace } from '../../services/paypal-sdk-loader.service';
import { KontoPremiumComponent } from './konto-premium.component';

const FAKE_PAYPAL: PayPalNamespace = {
  Buttons: () => ({ render: async () => undefined })
};

async function setup(): Promise<ComponentFixture<KontoPremiumComponent>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [KontoPremiumComponent],
    providers: [
      provideRouter([]),
      // Lead-Abo-Sektion selbst nicht Teil dieses Tests: canManage=false lässt sie
      // leer rendern (kein Netzwerk-/PayPal-Aufruf), analog LeadSubscriptionComponent-Spec.
      { provide: FeatureAccessService, useValue: { canManageSubscription: () => false } },
      {
        provide: SUBSCRIPTION_REPOSITORY,
        useValue: {
          getMySubscription: async () => null,
          activate: async () => ({ ok: false, reason: 'unknown' as const })
        }
      },
      { provide: AuthService, useValue: { session: () => null, profile: () => null } },
      {
        provide: PaypalSdkLoaderService,
        useValue: { load: async () => FAKE_PAYPAL }
      }
    ]
  });
  const fixture = TestBed.createComponent(KontoPremiumComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('KontoPremiumComponent', () => {
  it('shows the cancellation/deletion hint with a link to the invoices help page', async () => {
    const fixture = await setup();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Nach einer Kündigung bleiben deine Angebote und Rechnungen erhalten');
    expect(text).toContain('Datenexport');

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      '.cancellation-note a'
    );
    expect(link.getAttribute('routerLink') ?? link.getAttribute('href')).toBe(
      '/hilfe/rechnungen'
    );
  });
});
