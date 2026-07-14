import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  formatLeadSnapshot,
  LEAD_STATUS_LABELS,
  LEAD_TIMEFRAME_LABELS,
  LeadStatus,
  LeadTimeframe
} from '../../models/lead.model';
import { ADMIN_LEADS_REPOSITORY, AdminLeadEntry } from './data-access/admin-leads-repository';
import { ADMIN_USERS_REPOSITORY, AdminUserSummary } from './data-access/admin-users-repository';
import { ADMIN_SUBSCRIPTIONS_REPOSITORY } from './data-access/admin-subscriptions-repository';
import { COMMERCIAL_CONFIG } from '../../config/commercial.config';

const MAX_CONTRACTORS_PER_LEAD = 3;

/**
 * Admin-Tab „Leads" (Welle 1). Listet alle Anfragen über admin_list_leads()
 * (Status-Badge, Snapshot-Aufklapper); Aktionen: Status setzen, Löschen (DSGVO,
 * Bestätigungsdialog) und Zuteilen an max. 3 Contractors (admin_assign_lead).
 */
@Component({
  selector: 'app-admin-leads',
  standalone: true,
  template: `
    <div class="leads">
      @if (loading()) {
        <p class="status">Lade Anfragen …</p>
      } @else if (error()) {
        <p class="status error" role="alert">{{ error() }}</p>
      } @else {
        <div class="bar">
          <span class="count">{{ leads().length }} Anfrage(n)</span>
          <span class="tally">{{ confirmedCount() }} bestätigt · {{ distributedCount() }} weitergegeben</span>
        </div>

        <ul class="list">
          @for (lead of leads(); track lead.id) {
            <li class="item" [class]="'status-' + lead.status">
              <div class="meta">
                <span class="badge" [class]="'badge-' + lead.status">{{ statusLabel(lead.status) }}</span>
                <span class="from">{{ lead.name }} · PLZ {{ lead.postalCode }}</span>
                <span class="date">{{ formatDate(lead.createdAt) }}</span>
                <span class="tf">{{ timeframeLabel(lead.timeframe) }}</span>
              </div>

              <div class="contact">
                <span>{{ lead.email }}</span>
                @if (lead.phone) {
                  <span>{{ lead.phone }}</span>
                }
                @if (lead.assignedContractorIds.length > 0) {
                  <span class="assigned">
                    Zugeteilt: {{ contractorNames(lead.assignedContractorIds) }}
                  </span>
                }
              </div>

              @if (lead.message) {
                <p class="message">{{ lead.message }}</p>
              }

              <details class="snapshot">
                <summary>Projektdaten &amp; Einwilligung</summary>
                <dl>
                  @for (row of snapshotRows(lead); track row.label) {
                    <div><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></div>
                  }
                  <div><dt>Einwilligung</dt><dd>{{ lead.consentVersion }} ({{ formatDate(lead.consentAt) }})</dd></div>
                </dl>
              </details>

              <div class="actions">
                <label class="status-set">
                  <span>Status</span>
                  <select
                    [value]="lead.status"
                    [disabled]="busyId() === lead.id"
                    (change)="onStatusChange(lead, $event)"
                  >
                    @for (option of statusOptions; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </label>

                <button
                  type="button"
                  class="assign"
                  [disabled]="busyId() === lead.id"
                  (click)="openAssign(lead)"
                >
                  Zuteilen …
                </button>

                <button
                  type="button"
                  class="danger"
                  [disabled]="busyId() === lead.id"
                  (click)="deleteLead(lead)"
                >
                  Löschen
                </button>
              </div>
            </li>
          } @empty {
            <li class="empty">Noch keine Anfragen eingegangen.</li>
          }
        </ul>
      }
    </div>

    @if (assignLead(); as lead) {
      <div class="dialog-backdrop" (click)="closeAssign()">
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="assign-title" (click)="$event.stopPropagation()">
          <h2 id="assign-title">Anfrage zuteilen</h2>
          <p class="dialog-lead">
            Wähle bis zu {{ maxContractors }} Fachbetriebe. Die Einwilligung erlaubt maximal
            {{ maxContractors }} Empfänger. Zuteilen ist nur bei bestätigten Anfragen möglich.
          </p>

          @if (lead.status !== 'confirmed' && lead.status !== 'distributed') {
            <p class="dialog-warn" role="alert">
              Diese Anfrage ist noch nicht bestätigt – eine Zuteilung wird serverseitig abgelehnt.
            </p>
          }

          <ul class="contractor-list">
            @for (contractor of contractors(); track contractor.id) {
              <li>
                <label [class.no-sub]="subscriptionGate && !hasActiveSubscription(contractor.id)">
                  <input
                    type="checkbox"
                    [checked]="isSelected(contractor.id)"
                    [disabled]="
                      (subscriptionGate && !hasActiveSubscription(contractor.id)) ||
                      (!isSelected(contractor.id) && selectedContractorIds().length >= maxContractors)
                    "
                    (change)="toggleContractor(contractor.id)"
                  />
                  <span>{{ contractor.displayName ?? contractor.email ?? contractor.id }}</span>
                  @if (subscriptionGate) {
                    @if (hasActiveSubscription(contractor.id)) {
                      <span class="sub-badge active">Abo aktiv</span>
                    } @else {
                      <span class="sub-badge inactive">kein aktives Abo</span>
                    }
                  }
                </label>
              </li>
            } @empty {
              <li class="empty">Keine Profi-Konten vorhanden.</li>
            }
          </ul>

          @if (assignError()) {
            <p class="dialog-warn" role="alert">{{ assignError() }}</p>
          }

          <div class="dialog-actions">
            <button type="button" class="ghost" (click)="closeAssign()">Abbrechen</button>
            <button
              type="button"
              class="primary"
              [disabled]="selectedContractorIds().length === 0 || assigning()"
              (click)="confirmAssign(lead)"
            >
              {{ assigning() ? 'Wird zugeteilt …' : 'Zuteilen (' + selectedContractorIds().length + ')' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .leads {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .status {
        color: #6b7280;
      }

      .status.error {
        color: #b91c1c;
      }

      .bar {
        display: flex;
        gap: 1rem;
        align-items: baseline;
        flex-wrap: wrap;
      }

      .count {
        font-weight: 600;
      }

      .tally {
        font-size: 0.85rem;
        color: #6b7280;
      }

      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }

      .item {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 0.85rem 1rem;
        background: #fff;
        display: grid;
        gap: 0.55rem;
      }

      .item.status-distributed {
        border-color: #bbf7d0;
        background: #f6fef9;
      }

      .meta {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
        font-size: 0.85rem;
        color: #6b7280;
      }

      .from {
        font-weight: 600;
        color: #374151;
      }

      .badge {
        display: inline-block;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .badge-pending_confirmation {
        background: #fef3c7;
        color: #92400e;
      }

      .badge-confirmed {
        background: #dbeafe;
        color: #1e40af;
      }

      .badge-distributed {
        background: #dcfce7;
        color: #166534;
      }

      .badge-expired {
        background: #f1f5f9;
        color: #475569;
      }

      .tf {
        color: #92400e;
      }

      .contact {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem 1rem;
        font-size: 0.9rem;
        color: #374151;
      }

      .assigned {
        color: #166534;
        font-weight: 600;
      }

      .message {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.6;
        color: #1c1710;
        font-size: 0.9rem;
      }

      .snapshot summary {
        cursor: pointer;
        font-size: 0.85rem;
        color: #475569;
      }

      .snapshot dl {
        margin: 0.5rem 0 0;
        display: grid;
        gap: 0.25rem;
      }

      .snapshot dl div {
        display: flex;
        justify-content: space-between;
        gap: 0.6rem;
        font-size: 0.85rem;
      }

      .snapshot dt {
        color: #78716c;
      }

      .snapshot dd {
        margin: 0;
        font-weight: 600;
        color: #292524;
      }

      .actions {
        display: flex;
        align-items: flex-end;
        gap: 0.6rem;
        flex-wrap: wrap;
      }

      .status-set {
        display: grid;
        gap: 0.2rem;
        font-size: 0.78rem;
        color: #475569;
      }

      select {
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        padding: 0.35rem 0.5rem;
        font: inherit;
        background: #fff;
      }

      button {
        border-radius: 0.6rem;
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0.4rem 0.9rem;
        cursor: pointer;
        border: 1px solid #c7d2fe;
        background: #eef2ff;
        color: #3730a3;
      }

      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      button.danger {
        border-color: #fecaca;
        background: #fef2f2;
        color: #b91c1c;
      }

      .empty {
        list-style: none;
        color: #6b7280;
        padding: 1.5rem;
        text-align: center;
        border: 1px dashed #e5e7eb;
        border-radius: 0.75rem;
      }

      .dialog-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        z-index: 50;
      }

      .dialog {
        background: #fff;
        border-radius: 1rem;
        padding: 1.5rem;
        width: min(30rem, 100%);
        max-height: 85vh;
        overflow-y: auto;
        display: grid;
        gap: 0.85rem;
        box-shadow: 0 25px 60px rgba(15, 23, 42, 0.3);
      }

      .dialog h2 {
        margin: 0;
        font-size: 1.2rem;
      }

      .dialog-lead {
        margin: 0;
        font-size: 0.9rem;
        color: #475569;
      }

      .dialog-warn {
        margin: 0;
        font-size: 0.85rem;
        color: #b45309;
      }

      .contractor-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.4rem;
      }

      .contractor-list label {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        cursor: pointer;
      }

      .contractor-list label.no-sub {
        cursor: not-allowed;
        color: #94a3b8;
      }

      .sub-badge {
        margin-left: auto;
        font-size: 0.72rem;
        font-weight: 700;
        border-radius: 999px;
        padding: 0.05rem 0.5rem;
      }

      .sub-badge.active {
        background: #dcfce7;
        color: #166534;
      }

      .sub-badge.inactive {
        background: #fee2e2;
        color: #b91c1c;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
      }

      button.ghost {
        background: #fff;
        border-color: #e5e7eb;
        color: #475569;
      }

      button.primary {
        background: #0f766e;
        border-color: #0f766e;
        color: #f0fdfa;
      }
    `
  ]
})
export class AdminLeadsComponent implements OnInit {
  private readonly repository = inject(ADMIN_LEADS_REPOSITORY);
  private readonly usersRepository = inject(ADMIN_USERS_REPOSITORY);
  private readonly subscriptionsRepository = inject(ADMIN_SUBSCRIPTIONS_REPOSITORY);

  readonly maxContractors = MAX_CONTRACTORS_PER_LEAD;
  /** Abo-Gate nur aktiv, wenn das Feature konfiguriert ist (Abo-Welle). */
  readonly subscriptionGate = COMMERCIAL_CONFIG.contractorSubscriptionEnabled;
  /** User-IDs der Contractors mit aktivem Abo (Server-Wahrheit inkl. Grace-Period). */
  private readonly activeSubscriptionIds = signal<ReadonlySet<string>>(new Set());
  readonly statusOptions: ReadonlyArray<{ value: LeadStatus; label: string }> = (
    Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]
  ).map((value) => ({ value, label: LEAD_STATUS_LABELS[value] }));

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly leads = signal<AdminLeadEntry[]>([]);
  readonly busyId = signal<string | null>(null);

  private readonly users = signal<AdminUserSummary[]>([]);
  readonly contractors = computed(() =>
    this.users().filter((user) => user.role === 'contractor')
  );

  readonly assignLead = signal<AdminLeadEntry | null>(null);
  readonly selectedContractorIds = signal<string[]>([]);
  readonly assigning = signal(false);
  readonly assignError = signal<string | null>(null);

  readonly confirmedCount = computed(
    () => this.leads().filter((lead) => lead.status === 'confirmed').length
  );
  readonly distributedCount = computed(
    () => this.leads().filter((lead) => lead.status === 'distributed').length
  );

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [leads, users] = await Promise.all([
        this.repository.listLeads(),
        this.usersRepository.listUsers()
      ]);
      this.leads.set(leads);
      this.users.set(users);
      this.error.set(null);
      void this.loadSubscriptions();
    } catch (err) {
      console.error('Anfragen konnten nicht geladen werden:', err);
      this.error.set('Anfragen konnten nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  async onStatusChange(lead: AdminLeadEntry, event: Event): Promise<void> {
    const status = (event.target as HTMLSelectElement).value as LeadStatus;
    if (status === lead.status) {
      return;
    }
    this.busyId.set(lead.id);
    try {
      await this.repository.setStatus(lead.id, status);
      this.patchLead(lead.id, { status });
    } catch (err) {
      console.error('Status konnte nicht geändert werden:', err);
      this.error.set('Status konnte nicht geändert werden.');
    } finally {
      this.busyId.set(null);
    }
  }

  async deleteLead(lead: AdminLeadEntry): Promise<void> {
    const ok = globalThis.confirm?.(
      `Anfrage von „${lead.name}" (${lead.email}) endgültig löschen? Diese DSGVO-Löschung kann nicht rückgängig gemacht werden.`
    );
    if (!ok) {
      return;
    }
    this.busyId.set(lead.id);
    try {
      await this.repository.delete(lead.id);
      this.leads.update((list) => list.filter((entry) => entry.id !== lead.id));
    } catch (err) {
      console.error('Anfrage konnte nicht gelöscht werden:', err);
      this.error.set('Anfrage konnte nicht gelöscht werden.');
    } finally {
      this.busyId.set(null);
    }
  }

  openAssign(lead: AdminLeadEntry): void {
    this.assignError.set(null);
    this.selectedContractorIds.set([...lead.assignedContractorIds].slice(0, this.maxContractors));
    this.assignLead.set(lead);
  }

  closeAssign(): void {
    this.assignLead.set(null);
    this.selectedContractorIds.set([]);
    this.assignError.set(null);
  }

  isSelected(contractorId: string): boolean {
    return this.selectedContractorIds().includes(contractorId);
  }

  /** true, wenn der Contractor ein aktives Lead-Abo hat (Server-Wahrheit). */
  hasActiveSubscription(contractorId: string): boolean {
    return this.activeSubscriptionIds().has(contractorId);
  }

  toggleContractor(contractorId: string): void {
    // Ohne aktives Abo nicht wählbar (der Server erzwingt es zusätzlich).
    if (this.subscriptionGate && !this.hasActiveSubscription(contractorId)) {
      return;
    }
    this.selectedContractorIds.update((ids) => {
      if (ids.includes(contractorId)) {
        return ids.filter((id) => id !== contractorId);
      }
      if (ids.length >= this.maxContractors) {
        return ids;
      }
      return [...ids, contractorId];
    });
  }

  private async loadSubscriptions(): Promise<void> {
    if (!this.subscriptionGate) {
      return;
    }
    try {
      const subscriptions = await this.subscriptionsRepository.listSubscriptions();
      this.activeSubscriptionIds.set(
        new Set(subscriptions.filter((sub) => sub.active).map((sub) => sub.userId))
      );
    } catch (err) {
      console.error('Abo-Status konnte nicht geladen werden:', err);
    }
  }

  async confirmAssign(lead: AdminLeadEntry): Promise<void> {
    const contractorIds = this.selectedContractorIds();
    if (contractorIds.length === 0 || contractorIds.length > this.maxContractors) {
      return;
    }
    this.assigning.set(true);
    this.assignError.set(null);
    try {
      await this.repository.assign(lead.id, contractorIds);
      this.patchLead(lead.id, { status: 'distributed', assignedContractorIds: [...contractorIds] });
      this.closeAssign();
    } catch (err) {
      console.error('Zuteilung fehlgeschlagen:', err);
      this.assignError.set(
        'Zuteilung fehlgeschlagen. Die Anfrage muss bestätigt sein und es dürfen höchstens 3 Betriebe gewählt werden.'
      );
    } finally {
      this.assigning.set(false);
    }
  }

  contractorNames(ids: string[]): string {
    const byId = new Map(this.users().map((user) => [user.id, user] as const));
    return ids
      .map((id) => {
        const user = byId.get(id);
        return user?.displayName ?? user?.email ?? id;
      })
      .join(', ');
  }

  snapshotRows(lead: AdminLeadEntry): ReadonlyArray<{ label: string; value: string }> {
    return formatLeadSnapshot(lead.projectSnapshot);
  }

  statusLabel(status: LeadStatus): string {
    return LEAD_STATUS_LABELS[status];
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  private patchLead(id: string, patch: Partial<AdminLeadEntry>): void {
    this.leads.update((list) =>
      list.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    );
  }
}
