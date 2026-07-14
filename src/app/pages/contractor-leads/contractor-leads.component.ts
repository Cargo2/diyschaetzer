import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatLeadSnapshot, LEAD_TIMEFRAME_LABELS, LeadTimeframe } from '../../models/lead.model';
import { SUBSCRIPTION_REPOSITORY } from '../../data-access/subscription-repository';
import { subscriptionBadge } from '../../models/subscription.model';
import { AssignedLeadsBadgeService } from '../../services/assigned-leads-badge.service';
import { FeatureAccessService } from '../../services/feature-access.service';
import {
  CONTRACTOR_LEADS_REPOSITORY,
  ContractorLeadEntry
} from './data-access/contractor-leads-repository';

/**
 * Contractor-Ansicht „Anfragen" (Welle 1, `/anfragen`, contractorGuard). Zeigt
 * ausschließlich die dem Profi zugeteilten, weitergegebenen Leads (Kontaktdaten
 * + Snapshot). Der leere Zustand erklärt, wie eine Zuteilung zustande kommt.
 * Ohne aktives Lead-Abo weist ein Banner darauf hin, dass keine neuen Anfragen
 * mehr zugeteilt werden.
 */
@Component({
  selector: 'app-contractor-leads',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="leads">
      <header class="leads-head">
        <p class="eyebrow">Profi-Bereich</p>
        <h1>Anfragen</h1>
        <p class="leads-lead">
          Hier erscheinen die dir zugeteilten Anfragen von Interessenten. Jede Anfrage wurde per
          E-Mail bestätigt und an maximal 3 Betriebe weitergegeben.
        </p>
      </header>

      @if (showInactiveAboBanner()) {
        <div class="abo-banner" role="status">
          <span>
            Du erhältst aktuell <strong>keine neuen Anfragen</strong> – dein Lead-Abo ist nicht
            aktiv. Bereits zugeteilte Anfragen bleiben sichtbar.
          </span>
          <a routerLink="/konto/premium" class="abo-banner-cta">Lead-Abo aktivieren</a>
        </div>
      }

      @if (loading()) {
        <p class="leads-status">Anfragen werden geladen …</p>
      } @else if (error()) {
        <p class="leads-status error" role="alert">{{ error() }}</p>
      } @else if (leads().length === 0) {
        <div class="leads-empty">
          <strong>Noch keine Anfragen.</strong>
          <p>
            Sobald dir eine bestätigte Anfrage zugeteilt wird, erscheint sie hier. Prüfe unter
            <a routerLink="/konto/anfragen-empfang">Konto → Anfragen empfangen</a> deine
            Lead-Einstellungen (PLZ-Gebiete, Raumarten, Empfang aktiv).
          </p>
        </div>
      } @else {
        <ul class="lead-list">
          @for (lead of leads(); track lead.id) {
            <li class="lead-item">
              <div class="lead-top">
                <div>
                  <strong class="lead-name">{{ lead.name }}</strong>
                  <span class="lead-place">PLZ {{ lead.postalCode }}</span>
                </div>
                <span class="lead-date">{{ formatDate(lead.assignedAt) }}</span>
              </div>

              <div class="lead-contact">
                <a [href]="'mailto:' + lead.email">{{ lead.email }}</a>
                @if (lead.phone) {
                  <a [href]="'tel:' + lead.phone">{{ lead.phone }}</a>
                }
                <span class="lead-timeframe">{{ timeframeLabel(lead.timeframe) }}</span>
              </div>

              @if (lead.message) {
                <p class="lead-message">{{ lead.message }}</p>
              }

              @if (snapshotRows(lead); as rows) {
                @if (rows.length > 0) {
                  <dl class="lead-snapshot">
                    @for (row of rows; track row.label) {
                      <div>
                        <dt>{{ row.label }}</dt>
                        <dd>{{ row.value }}</dd>
                      </div>
                    }
                  </dl>
                }
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .leads {
        max-width: 52rem;
        margin: 0 auto;
        display: grid;
        gap: 1.25rem;
        padding: 1.5rem 0 3rem;
      }

      .eyebrow {
        margin: 0 0 0.3rem;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #6f4a29;
      }

      .leads-head h1 {
        margin: 0 0 0.5rem;
        font-size: 1.6rem;
      }

      .leads-lead {
        margin: 0;
        color: #475569;
        line-height: 1.7;
      }

      .leads-status {
        color: #6b7280;
      }

      .leads-status.error {
        color: #b91c1c;
      }

      .abo-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.6rem 1rem;
        background: #fef3c7;
        border: 1px solid #fcd34d;
        color: #92400e;
        border-radius: 0.85rem;
        padding: 0.85rem 1.1rem;
        line-height: 1.5;
      }

      .abo-banner-cta {
        flex: 0 0 auto;
        background: #92400e;
        color: #fffbeb;
        font-weight: 700;
        border-radius: 999px;
        padding: 0.45rem 1rem;
        text-decoration: none;
      }

      .leads-empty {
        background: #fff;
        border: 1px dashed #e5e7eb;
        border-radius: 1rem;
        padding: 1.5rem;
        display: grid;
        gap: 0.5rem;
        text-align: center;
        color: #475569;
      }

      .leads-empty a {
        color: #0f766e;
        font-weight: 700;
      }

      .lead-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.85rem;
      }

      .lead-item {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 0.9rem;
        padding: 1rem 1.15rem;
        display: grid;
        gap: 0.6rem;
      }

      .lead-top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .lead-name {
        font-size: 1.05rem;
      }

      .lead-place {
        margin-left: 0.6rem;
        color: #6b7280;
        font-size: 0.9rem;
      }

      .lead-date {
        color: #6b7280;
        font-size: 0.85rem;
      }

      .lead-contact {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 1rem;
        font-size: 0.92rem;
      }

      .lead-contact a {
        color: #0f766e;
        font-weight: 600;
      }

      .lead-timeframe {
        color: #92400e;
        background: #fef3c7;
        border-radius: 999px;
        padding: 0.05rem 0.6rem;
        font-size: 0.82rem;
        font-weight: 600;
      }

      .lead-message {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.6;
        color: #1c1710;
      }

      .lead-snapshot {
        margin: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.35rem 1rem;
        background: #fafaf9;
        border: 1px solid #e7e5e4;
        border-radius: 0.7rem;
        padding: 0.75rem 0.9rem;
      }

      .lead-snapshot div {
        display: flex;
        justify-content: space-between;
        gap: 0.6rem;
        font-size: 0.85rem;
      }

      .lead-snapshot dt {
        color: #78716c;
      }

      .lead-snapshot dd {
        margin: 0;
        font-weight: 700;
        color: #292524;
        text-align: right;
      }

      @media (max-width: 560px) {
        .lead-snapshot {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class ContractorLeadsComponent implements OnInit {
  private readonly repository = inject(CONTRACTOR_LEADS_REPOSITORY);
  private readonly subscriptionRepository = inject(SUBSCRIPTION_REPOSITORY);
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly assignedLeadsBadge = inject(AssignedLeadsBadgeService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly leads = signal<ContractorLeadEntry[]>([]);

  /** Banner „keine neuen Anfragen" nur bei aktivem Feature UND inaktivem Abo. */
  readonly showInactiveAboBanner = signal(false);

  async ngOnInit(): Promise<void> {
    void this.loadSubscriptionStatus();
    // Nav-Badge „Anfragen" bei jedem Aufruf der Seite auffrischen.
    void this.assignedLeadsBadge.refresh();
    try {
      this.leads.set(await this.repository.listAssignedLeads());
    } catch (err) {
      console.error('Anfragen konnten nicht geladen werden:', err);
      this.error.set('Anfragen konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSubscriptionStatus(): Promise<void> {
    if (!this.featureAccess.canManageSubscription()) {
      return;
    }
    try {
      const subscription = await this.subscriptionRepository.getMySubscription();
      const active = subscriptionBadge(subscription) === 'active';
      this.showInactiveAboBanner.set(!active);
    } catch (err) {
      console.error('Abo-Status konnte nicht geladen werden:', err);
    }
  }

  snapshotRows(lead: ContractorLeadEntry): ReadonlyArray<{ label: string; value: string }> {
    return formatLeadSnapshot(lead.projectSnapshot);
  }

  timeframeLabel(value: LeadTimeframe): string {
    return LEAD_TIMEFRAME_LABELS[value];
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}
