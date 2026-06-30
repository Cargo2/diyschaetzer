import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FEEDBACK_REPOSITORY } from '../../data-access/feedback-repository';
import { FEEDBACK_CATEGORIES, FeedbackCategory } from '../../models/feedback.model';

/**
 * Profi-Feedback (Phase 13). Nur über den contractorGuard erreichbar: Profis
 * senden Verbesserungsvorschläge (Kategorie + Freitext), gespeichert in der DB
 * und nur für Admins lesbar. Bewusst ohne Verlaufsliste (reines Absenden).
 */
@Component({
  selector: 'app-feedback-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="feedback">
      <header class="feedback-head">
        <p class="eyebrow">Profi-Feedback</p>
        <h1>Verbesserungen vorschlagen</h1>
        <p class="feedback-lead">
          Was fehlt dir, was sollte besser laufen? Schreib mir direkt. Dein Feedback
          landet bei mir und hilft, das Tool für Profis weiterzuentwickeln.
        </p>
      </header>

      <form class="feedback-card" (ngSubmit)="submit()">
        <label class="field">
          <span>Kategorie</span>
          <select name="category" [(ngModel)]="category" [disabled]="sending()">
            @for (cat of categories; track cat.value) {
              <option [value]="cat.value">{{ cat.label }}</option>
            }
          </select>
        </label>

        <label class="field">
          <span>Nachricht</span>
          <textarea
            name="message"
            rows="7"
            maxlength="4000"
            placeholder="Beschreibe deinen Vorschlag oder das Problem so konkret wie möglich."
            [(ngModel)]="message"
            [disabled]="sending()"
          ></textarea>
        </label>

        @if (errorMsg()) {
          <p class="msg error" role="alert">{{ errorMsg() }}</p>
        }
        @if (successMsg()) {
          <p class="msg success" role="status">{{ successMsg() }}</p>
        }

        <div class="actions">
          <button type="submit" [disabled]="sending() || !message.trim()">
            {{ sending() ? 'Senden …' : 'Feedback senden' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .feedback {
        max-width: 40rem;
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
        color: var(--verde-deep, #11574a);
      }

      .feedback-head h1 {
        margin: 0 0 0.5rem;
        font-size: 1.6rem;
      }

      .feedback-lead {
        margin: 0;
        color: var(--ink-soft, #475569);
        line-height: 1.7;
      }

      .feedback-card {
        background: var(--card, #fff);
        border: 1px solid rgba(19, 23, 17, 0.08);
        border-radius: 1rem;
        box-shadow: var(--shadow-card, 0 10px 30px -18px rgba(10, 53, 47, 0.25));
        padding: 1.5rem;
        display: grid;
        gap: 1.1rem;
      }

      .field {
        display: grid;
        gap: 0.4rem;
      }

      .field span {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--ink, #131711);
      }

      select,
      textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 0.6rem;
        padding: 0.6rem 0.7rem;
        font: inherit;
        background: #fff;
        color: var(--ink, #131711);
      }

      textarea {
        resize: vertical;
        min-height: 8rem;
      }

      select:focus,
      textarea:focus {
        outline: none;
        border-color: var(--verde, #11574a);
        box-shadow: 0 0 0 3px rgba(17, 87, 74, 0.15);
      }

      .msg {
        margin: 0;
        font-size: 0.9rem;
      }

      .msg.error {
        color: #b91c1c;
      }

      .msg.success {
        color: #166534;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
      }

      button {
        border: none;
        border-radius: 999px;
        background: linear-gradient(120deg, var(--copper, #c2703d), #a9582c);
        color: #fff5ec;
        font-weight: 700;
        padding: 0.7rem 1.5rem;
        cursor: pointer;
      }

      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `
  ]
})
export class FeedbackPageComponent {
  private readonly repository = inject(FEEDBACK_REPOSITORY);

  readonly categories = FEEDBACK_CATEGORIES;
  category: FeedbackCategory = 'idea';
  message = '';

  readonly sending = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  async submit(): Promise<void> {
    const message = this.message.trim();
    if (!message) {
      return;
    }
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.sending.set(true);
    try {
      await this.repository.submit({ category: this.category, message });
      this.successMsg.set('Danke! Dein Feedback ist angekommen.');
      this.message = '';
      this.category = 'idea';
    } catch (err) {
      console.error('Feedback konnte nicht gesendet werden:', err);
      this.errorMsg.set('Senden fehlgeschlagen. Bitte versuche es später erneut.');
    } finally {
      this.sending.set(false);
    }
  }
}
