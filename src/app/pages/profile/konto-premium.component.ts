import { Component, inject } from '@angular/core';
import { SubscriptionStatusService } from '../../services/subscription-status.service';
import { LeadSubscriptionComponent } from './lead-subscription/lead-subscription.component';

/**
 * Konto → „Premium freischalten" (contractorGuard). Hostet die Lead-Abo-Sektion
 * ({@link LeadSubscriptionComponent}), die den Abo-Status anzeigt und – ohne
 * aktives Abo – den PayPal-Subscribe-Button (Consent-gated) rendert.
 *
 * Nach erfolgreicher Aktivierung wird der geteilte Abo-Status aufgefrischt, damit
 * die Navigation (Premium-„Aktiv"-Punkt, Freischaltung „Anfragen empfangen")
 * sofort aktualisiert.
 */
@Component({
  selector: 'app-konto-premium',
  standalone: true,
  imports: [LeadSubscriptionComponent],
  template: `
    <section class="konto-premium">
      <app-lead-subscription (activated)="onActivated()" />
    </section>
  `,
  styles: [
    `
      .konto-premium {
        max-width: 720px;
        margin: 0 auto;
        padding: 1.5rem 0 3rem;
      }
    `
  ]
})
export class KontoPremiumComponent {
  private readonly status = inject(SubscriptionStatusService);

  onActivated(): void {
    void this.status.refresh();
  }
}
