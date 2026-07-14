import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnInit,
  output,
  signal,
  viewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PAYPAL_CONFIG } from '../../../config/commercial.config';
import { SUBSCRIPTION_REPOSITORY } from '../../../data-access/subscription-repository';
import {
  Subscription,
  subscriptionBadge,
  SUBSCRIPTION_BADGE_LABELS
} from '../../../models/subscription.model';
import { AuthService } from '../../../services/auth.service';
import { ConsentService } from '../../../services/consent.service';
import { FeatureAccessService } from '../../../services/feature-access.service';
import { PaypalSdkLoaderService } from '../../../services/paypal-sdk-loader.service';

/**
 * Profil-Abschnitt „Lead-Abo" (id="abo"). Zeigt den Abo-Status (aktiv bis …/
 * überfällig/inaktiv) aus der eigenen `subscriptions`-Zeile und – solange kein
 * aktives Abo besteht – den PayPal-Subscribe-Button.
 *
 * Consent-Gate: Das PayPal-SDK ist ein externer Dritt-Dienst der Kategorie
 * `external_services`. Der Button wird NUR gerendert (und das SDK NUR geladen),
 * wenn der Nutzer diese Kategorie freigegeben hat; sonst erscheint eine Hinweis-
 * Karte, die den Consent-Dialog öffnet. Ohne Feature/Supabase (Prerender/Offline)
 * bleibt der ganze Abschnitt aus dem DOM (FeatureAccessService.canManageSubscription()).
 *
 * Zahlungs-Setup-Gate: Für fliesen-kosten existiert noch KEIN PayPal-Produkt/-Plan
 * (PAYPAL_CONFIG.clientId/planId sind leer). Solange das der Fall ist, wird weder das
 * SDK geladen noch der Button gerendert; stattdessen erscheint ein neutraler Hinweis,
 * dass die Zahlungsabwicklung gerade eingerichtet wird.
 */
@Component({
  selector: 'app-lead-subscription',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './lead-subscription.component.html',
  styleUrl: './lead-subscription.component.css'
})
export class LeadSubscriptionComponent implements OnInit {
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly consent = inject(ConsentService);
  private readonly auth = inject(AuthService);
  private readonly repository = inject(SUBSCRIPTION_REPOSITORY);
  private readonly paypal = inject(PaypalSdkLoaderService);

  private readonly paypalContainer =
    viewChild<ElementRef<HTMLDivElement>>('paypalContainer');

  /** Feuert nach erfolgreicher Aktivierung, damit die Umgebung (Nav) neu laden kann. */
  readonly activated = output<void>();

  /** Gesamt-Sichtbarkeit des Abschnitts (Feature + Supabase + Profi). */
  readonly visible = computed(() => this.featureAccess.canManageSubscription());
  /** Reaktiver Einwilligungsstand für externe Dienste (PayPal-SDK). */
  readonly externalConsent = computed(
    () => this.consent.grantedChanges().external_services
  );
  /** true, sobald ein PayPal-Produkt/-Plan hinterlegt ist (sonst „wird eingerichtet"). */
  readonly paymentConfigured = PAYPAL_CONFIG.clientId !== '' && PAYPAL_CONFIG.planId !== '';

  readonly loading = signal(true);
  readonly subscription = signal<Subscription | null>(null);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly activating = signal(false);

  readonly badge = computed(() => subscriptionBadge(this.subscription()));
  readonly badgeLabel = computed(() => SUBSCRIPTION_BADGE_LABELS[this.badge()]);
  readonly isActive = computed(() => this.badge() === 'active');

  /** Verhindert doppeltes Rendern/Nachladen des SDK bei erneutem Effekt-Lauf. */
  private paypalRendered = false;

  constructor() {
    // Button rendern, sobald Abschnitt sichtbar, kein aktives Abo besteht,
    // ein PayPal-Plan hinterlegt ist, Consent für externe Dienste vorliegt
    // UND der Container im DOM ist.
    effect(() => {
      const container = this.paypalContainer();
      const shouldRender =
        this.visible() &&
        !this.loading() &&
        !this.isActive() &&
        this.paymentConfigured &&
        this.externalConsent();
      if (shouldRender && container && !this.paypalRendered) {
        this.paypalRendered = true;
        void this.renderPaypalButton(container.nativeElement);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.featureAccess.canManageSubscription()) {
      this.loading.set(false);
      return;
    }
    try {
      this.subscription.set(await this.repository.getMySubscription());
    } catch {
      this.errorMsg.set('Der Abo-Status konnte nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  openConsent(): void {
    this.consent.openSettings();
  }

  formatDate(iso: string | null): string {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  private async renderPaypalButton(container: HTMLElement): Promise<void> {
    const userId = this.auth.session()?.user.id ?? this.auth.profile()?.id ?? null;
    if (!userId) {
      this.paypalRendered = false;
      return;
    }
    try {
      const paypal = await this.paypal.load(PAYPAL_CONFIG.clientId);
      const buttons = paypal.Buttons({
        style: { layout: 'vertical', shape: 'pill', label: 'subscribe' },
        createSubscription: (_data, actions) =>
          actions.subscription.create({
            plan_id: PAYPAL_CONFIG.planId,
            custom_id: userId
          }),
        onApprove: async ({ subscriptionID }) => {
          await this.onPaypalApprove(subscriptionID ?? '');
        },
        onError: () => {
          this.errorMsg.set(
            'Die Zahlung konnte nicht gestartet werden. Bitte versuche es erneut.'
          );
        }
      });
      await buttons.render(container);
    } catch {
      this.paypalRendered = false;
      this.errorMsg.set(
        'Der Zahlungsanbieter (PayPal) konnte nicht geladen werden. Bitte lade die Seite neu.'
      );
    }
  }

  private async onPaypalApprove(subscriptionId: string): Promise<void> {
    this.activating.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);
    try {
      const result = await this.repository.activate(subscriptionId);
      if (result.ok) {
        this.subscription.set(result.subscription);
        this.successMsg.set(
          'Dein Lead-Abo ist aktiv. Du wirst ab sofort bei neuen Anfragen berücksichtigt.'
        );
        this.activated.emit();
      } else {
        this.errorMsg.set(
          'Die Aktivierung ist fehlgeschlagen. Falls bereits Geld abgebucht wurde, melde dich bitte bei uns.'
        );
      }
    } catch {
      this.errorMsg.set('Die Aktivierung ist fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      this.activating.set(false);
    }
  }
}
