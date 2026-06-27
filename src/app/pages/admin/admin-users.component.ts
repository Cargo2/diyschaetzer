import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { UserRole } from '../../models/commercial.model';
import {
  ADMIN_USERS_REPOSITORY,
  AdminUserSummary
} from './data-access/admin-users-repository';

const ROLE_LABELS: Record<UserRole, string> = {
  anonymous: 'Anonym',
  customer: 'Hobby',
  contractor: 'Profi',
  admin: 'Admin'
};

/**
 * Read-only Nutzer-/Rollenübersicht (Phase 15, Block 5). Lädt über die
 * abgekapselte {@link ADMIN_USERS_REPOSITORY}-Schicht (SECURITY DEFINER-RPC).
 * Kein Schreibpfad – Rollenvergabe bleibt serverseitig.
 */
@Component({
  selector: 'app-admin-users',
  standalone: true,
  template: `
    <div class="users">
      @if (loading()) {
        <p class="users-status">Lade Nutzer …</p>
      } @else if (error()) {
        <p class="users-status error" role="alert">{{ error() }}</p>
      } @else {
        <div class="users-bar">
          <span class="users-count">{{ users().length }} Nutzer</span>
          @if (roleCounts(); as counts) {
            <span class="users-tally">
              {{ counts.admin }} Admin · {{ counts.contractor }} Profi · {{ counts.customer }} Hobby
            </span>
          }
        </div>

        <div class="users-scroll">
          <table class="users-table">
            <thead>
              <tr>
                <th>E-Mail</th>
                <th>Name</th>
                <th>Rolle</th>
                <th>Plan</th>
                <th>Registriert</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>{{ user.email ?? '—' }}</td>
                  <td>{{ user.displayName ?? '—' }}</td>
                  <td>
                    <span class="badge" [class]="'role-' + user.role">{{ roleLabel(user.role) }}</span>
                  </td>
                  <td>{{ user.plan }}</td>
                  <td>{{ formatDate(user.createdAt) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty">Keine Nutzer gefunden.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .users {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .users-status {
        color: #6b7280;
        font-size: 0.9rem;
      }

      .users-status.error {
        color: #b91c1c;
      }

      .users-bar {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .users-count {
        font-weight: 600;
      }

      .users-tally {
        font-size: 0.85rem;
        color: #6b7280;
      }

      .users-scroll {
        overflow-x: auto;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
      }

      .users-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
        min-width: 38rem;
      }

      .users-table th,
      .users-table td {
        text-align: left;
        padding: 0.5rem 0.7rem;
        border-bottom: 1px solid #f1f5f9;
        white-space: nowrap;
      }

      .users-table thead th {
        position: sticky;
        top: 0;
        background: #f8fafc;
        font-weight: 600;
        color: #475569;
      }

      .users-table tbody tr:hover {
        background: #f8fafc;
      }

      .badge {
        display: inline-block;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
      }

      .role-admin {
        background: #fef3c7;
        color: #92400e;
      }

      .role-contractor {
        background: #dbeafe;
        color: #1e40af;
      }

      .role-customer {
        background: #dcfce7;
        color: #166534;
      }

      .role-anonymous {
        background: #f1f5f9;
        color: #475569;
      }

      .users-table td.empty {
        text-align: center;
        color: #6b7280;
        padding: 1.5rem;
      }
    `
  ]
})
export class AdminUsersComponent implements OnInit {
  private readonly repository = inject(ADMIN_USERS_REPOSITORY);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly users = signal<AdminUserSummary[]>([]);

  readonly roleCounts = computed(() => {
    const counts = { admin: 0, contractor: 0, customer: 0 };
    for (const user of this.users()) {
      if (user.role === 'admin') {
        counts.admin++;
      } else if (user.role === 'contractor') {
        counts.contractor++;
      } else if (user.role === 'customer') {
        counts.customer++;
      }
    }
    return counts;
  });

  async ngOnInit(): Promise<void> {
    try {
      this.users.set(await this.repository.listUsers());
    } catch (err) {
      console.error('Nutzerliste konnte nicht geladen werden:', err);
      this.error.set('Nutzerliste konnte nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  roleLabel(role: UserRole): string {
    return ROLE_LABELS[role];
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
