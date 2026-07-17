import { Component, inject, OnInit, signal } from '@angular/core';
import { SubscriptionStatus } from '../../models/subscription.model';
import {
  ADMIN_SUBSCRIPTIONS_REPOSITORY,
  AdminSubscriptionEntry
} from './data-access/admin-subscriptions-repository';

/** Farbklasse des Status-Badges. */
type BadgeTone = 'ok' | 'warn' | 'muted';

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'aktiv',
  trialing: 'Probephase',
  past_due: 'überfällig',
  cancelled: 'gekündigt',
  expired: 'abgelaufen'
};

const STATUS_TONES: Record<SubscriptionStatus, BadgeTone> = {
  active: 'ok',
  trialing: 'ok',
  past_due: 'warn',
  cancelled: 'muted',
  expired: 'muted'
};

/**
 * Admin-Abo-Übersicht (read-only). Listet alle Abos über die abgekapselte
 * {@link ADMIN_SUBSCRIPTIONS_REPOSITORY} (SECURITY DEFINER-RPC
 * `admin_list_subscriptions()`, seit Migration 0026 inkl. E-Mail + Anlagedatum).
 * Serverseitig nach Status/Periodenende sortiert; hier kein Schreibpfad.
 */
@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  template: `
    <div class="subs">
      @if (loading()) {
        <p class="subs-status">Lade Abos …</p>
      } @else if (error()) {
        <p class="subs-status error" role="alert">{{ error() }}</p>
      } @else {
        <div class="subs-bar">
          <span class="subs-count">{{ entries().length }} Abo(s)</span>
          <span class="subs-tally">{{ activeCount() }} aktiv</span>
        </div>

        @if (entries().length === 0) {
          <p class="subs-empty">Noch keine Abos vorhanden.</p>
        } @else {
          <div class="table-wrap">
            <table class="subs-table">
              <thead>
                <tr>
                  <th>Nutzer (E-Mail)</th>
                  <th>Status</th>
                  <th>Periodenende</th>
                  <th>Provider</th>
                  <th>Plan</th>
                  <th>Angelegt</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries(); track entry.userId) {
                  <tr>
                    <td class="email">{{ entry.email ?? '—' }}</td>
                    <td>
                      <span class="badge" [class]="'badge ' + tone(entry.status)">
                        {{ statusLabel(entry.status) }}
                      </span>
                    </td>
                    <td>{{ formatDate(entry.currentPeriodEnd) }}</td>
                    <td>{{ entry.provider }}</td>
                    <td>{{ entry.planKey }}</td>
                    <td>{{ formatDate(entry.createdAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .subs {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .subs-status {
        color: #6b7280;
        font-size: 0.9rem;
      }

      .subs-status.error {
        color: #b91c1c;
      }

      .subs-bar {
        display: flex;
        align-items: baseline;
        gap: 1rem;
      }

      .subs-count {
        font-weight: 600;
      }

      .subs-tally {
        font-size: 0.85rem;
        color: #6b7280;
      }

      .table-wrap {
        overflow-x: auto;
      }

      .subs-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.88rem;
      }

      .subs-table th,
      .subs-table td {
        text-align: left;
        padding: 0.55rem 0.7rem;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
      }

      .subs-table th {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6b7280;
      }

      .email {
        font-weight: 600;
        color: #374151;
        white-space: normal;
      }

      .badge {
        display: inline-block;
        padding: 0.1rem 0.55rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .badge.ok {
        background: #dcfce7;
        color: #166534;
      }

      .badge.warn {
        background: #ffedd5;
        color: #9a3412;
      }

      .badge.muted {
        background: #f1f5f9;
        color: #475569;
      }

      .subs-empty {
        color: #6b7280;
        padding: 1.5rem;
        text-align: center;
        border: 1px dashed #e5e7eb;
        border-radius: 0.75rem;
      }
    `
  ]
})
export class AdminSubscriptionsComponent implements OnInit {
  private readonly repository = inject(ADMIN_SUBSCRIPTIONS_REPOSITORY);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly entries = signal<AdminSubscriptionEntry[]>([]);

  activeCount(): number {
    return this.entries().filter((e) => e.status === 'active' || e.status === 'trialing').length;
  }

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      this.entries.set(await this.repository.listSubscriptions());
      this.error.set(null);
    } catch (err) {
      console.error('Abos konnten nicht geladen werden:', err);
      this.error.set('Abos konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(status: SubscriptionStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  tone(status: SubscriptionStatus): BadgeTone {
    return STATUS_TONES[status] ?? 'muted';
  }

  formatDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
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
