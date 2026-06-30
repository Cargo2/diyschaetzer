import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { feedbackCategoryLabel } from '../../models/feedback.model';
import {
  ADMIN_FEEDBACK_REPOSITORY,
  AdminFeedbackEntry
} from './data-access/admin-feedback-repository';

/**
 * Admin-Feedback-Ansicht (Phase 13). Listet die von Profis gesendeten
 * Verbesserungsvorschläge über die abgekapselte {@link ADMIN_FEEDBACK_REPOSITORY}
 * (SECURITY DEFINER-RPC). Status new/read lässt sich umschalten.
 */
@Component({
  selector: 'app-admin-feedback',
  standalone: true,
  template: `
    <div class="fb">
      @if (loading()) {
        <p class="fb-status">Lade Feedback …</p>
      } @else if (error()) {
        <p class="fb-status error" role="alert">{{ error() }}</p>
      } @else {
        <div class="fb-bar">
          <span class="fb-count">{{ entries().length }} Nachricht(en)</span>
          <span class="fb-tally">{{ newCount() }} neu</span>
        </div>

        <ul class="fb-list">
          @for (entry of entries(); track entry.id) {
            <li class="fb-item" [class.is-new]="entry.status === 'new'">
              <div class="fb-meta">
                <span class="badge cat">{{ categoryLabel(entry.category) }}</span>
                @if (entry.status === 'new') {
                  <span class="badge new">neu</span>
                }
                <span class="fb-from">{{ entry.email ?? '—' }}</span>
                <span class="fb-date">{{ formatDate(entry.createdAt) }}</span>
              </div>
              <p class="fb-message">{{ entry.message }}</p>
              <div class="fb-actions">
                @if (entry.status === 'new') {
                  <button type="button" (click)="setStatus(entry, 'read')" [disabled]="busyId() === entry.id">
                    Als gelesen markieren
                  </button>
                } @else {
                  <button type="button" class="ghost" (click)="setStatus(entry, 'new')" [disabled]="busyId() === entry.id">
                    Als neu markieren
                  </button>
                }
              </div>
            </li>
          } @empty {
            <li class="fb-empty">Noch kein Feedback eingegangen.</li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .fb {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .fb-status {
        color: #6b7280;
        font-size: 0.9rem;
      }

      .fb-status.error {
        color: #b91c1c;
      }

      .fb-bar {
        display: flex;
        align-items: baseline;
        gap: 1rem;
      }

      .fb-count {
        font-weight: 600;
      }

      .fb-tally {
        font-size: 0.85rem;
        color: #6b7280;
      }

      .fb-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 0.75rem;
      }

      .fb-item {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 0.85rem 1rem;
        background: #fff;
      }

      .fb-item.is-new {
        border-color: #c7d2fe;
        background: #f8faff;
      }

      .fb-meta {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
        font-size: 0.82rem;
        color: #6b7280;
        margin-bottom: 0.45rem;
      }

      .fb-from {
        font-weight: 600;
        color: #374151;
      }

      .fb-message {
        margin: 0 0 0.6rem;
        white-space: pre-wrap;
        line-height: 1.6;
        color: #131711;
      }

      .badge {
        display: inline-block;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .badge.cat {
        background: #eef2ff;
        color: #3730a3;
      }

      .badge.new {
        background: #fef3c7;
        color: #92400e;
      }

      .fb-actions {
        display: flex;
        justify-content: flex-end;
      }

      button {
        border: 1px solid #c7d2fe;
        border-radius: 0.6rem;
        background: #eef2ff;
        color: #3730a3;
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0.35rem 0.8rem;
        cursor: pointer;
      }

      button.ghost {
        background: #fff;
        border-color: #e5e7eb;
        color: #475569;
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .fb-empty {
        list-style: none;
        color: #6b7280;
        padding: 1.5rem;
        text-align: center;
        border: 1px dashed #e5e7eb;
        border-radius: 0.75rem;
      }
    `
  ]
})
export class AdminFeedbackComponent implements OnInit {
  private readonly repository = inject(ADMIN_FEEDBACK_REPOSITORY);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly entries = signal<AdminFeedbackEntry[]>([]);
  readonly busyId = signal<string | null>(null);

  readonly newCount = computed(() => this.entries().filter((e) => e.status === 'new').length);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.entries.set(await this.repository.listFeedback());
      this.error.set(null);
    } catch (err) {
      console.error('Feedback konnte nicht geladen werden:', err);
      this.error.set('Feedback konnte nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  async setStatus(entry: AdminFeedbackEntry, status: 'new' | 'read'): Promise<void> {
    this.busyId.set(entry.id);
    try {
      await this.repository.setStatus(entry.id, status);
      this.entries.update((list) =>
        list.map((e) => (e.id === entry.id ? { ...e, status } : e))
      );
    } catch (err) {
      console.error('Status konnte nicht geändert werden:', err);
      this.error.set('Status konnte nicht geändert werden.');
    } finally {
      this.busyId.set(null);
    }
  }

  categoryLabel(value: string): string {
    return feedbackCategoryLabel(value);
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
}
