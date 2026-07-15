import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SubscriptionStatusService } from '../../services/subscription-status.service';
import { LeadSubscriptionComponent } from './lead-subscription/lead-subscription.component';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Konto → „Premium freischalten" (contractorGuard). Hostet die Lead-Abo-Sektion
 * ({@link LeadSubscriptionComponent}), die den Abo-Status anzeigt und – ohne
 * aktives Abo – den PayPal-Subscribe-Button (Consent-gated) rendert.
 *
 * Nach erfolgreicher Aktivierung wird der geteilte Abo-Status aufgefrischt, damit
 * die Navigation (Premium-„Aktiv"-Punkt, Freischaltung „Anfragen empfangen")
 * sofort aktualisiert.
 *
 * Darunter ein dezenter Hinweis zu Kündigung/Löschung, der auf die Anwenderdoku
 * (`/hilfe/rechnungen`) verlinkt.
 */
@Component({
  selector: 'app-konto-premium',
  standalone: true,
  imports: [LeadSubscriptionComponent, RouterLink, TranslatePipe],
  template: `
    <section class="konto-premium">
      <app-lead-subscription (activated)="onActivated()" />

      <div class="cancellation-note">
        <p>
          {{ 'Nach einer Kündigung bleiben deine Angebote und Rechnungen erhalten und lesend zugänglich.' | t }}
          {{ 'Eine endgültige Löschung erfolgt erst nach Ablauf der in der Datenschutzerklärung genannten Fristen.' | t }}
          {{ 'Exportiere deine Rechnungen vorher über den Datenexport.' | t }}
        </p>
        <a routerLink="/hilfe/rechnungen">{{ 'Mehr zu Rechnungen & Kündigung erfahren' | t }}</a>
      </div>
    </section>
  `,
  styles: [
    `
      .konto-premium {
        max-width: 720px;
        margin: 0 auto;
        padding: 1.5rem 0 3rem;
      }

      .cancellation-note {
        margin-top: 1.5rem;
        padding: 0.9rem 1.1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.7rem;
        background: #f9fafb;
        font-size: 0.85rem;
        color: #4b5563;
      }

      .cancellation-note p {
        margin: 0 0 0.4rem;
        line-height: 1.5;
      }

      .cancellation-note a {
        color: #047857;
        font-weight: 600;
        text-decoration: none;
      }

      .cancellation-note a:hover,
      .cancellation-note a:focus-visible {
        text-decoration: underline;
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
