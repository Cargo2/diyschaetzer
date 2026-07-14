import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LEAD_REPOSITORY } from '../../data-access/lead-repository';
import { LeadConfirmResult } from '../../models/lead.model';

/**
 * Double-Opt-in-Bestätigung (Welle 1). Route `/lead-bestaetigen/:token`
 * (RenderMode.Client – kein Prerender, kein Supabase-Call im Build). Ruft die
 * idempotente RPC `confirm_lead(token)` und zeigt Erfolg oder „ungültig/abgelaufen".
 */
@Component({
  selector: 'app-lead-confirm',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="confirm">
      @switch (state()) {
        @case ('loading') {
          <p class="confirm-status">Anfrage wird bestätigt …</p>
        }
        @case ('confirmed') {
          <div class="confirm-card success">
            <h1>Anfrage bestätigt</h1>
            <p>
              Danke! Deine Anfrage ist bestätigt. <strong>Bis zu 3 passende Betriebe</strong>
              melden sich in Kürze bei dir.
            </p>
            <a routerLink="/" class="confirm-link">Zur Startseite</a>
          </div>
        }
        @default {
          <div class="confirm-card invalid">
            <h1>Link ungültig oder abgelaufen</h1>
            <p>
              Dieser Bestätigungslink ist ungültig oder bereits abgelaufen. Unbestätigte Anfragen
              werden nach 7 Tagen automatisch gelöscht. Du kannst jederzeit eine neue Anfrage
              stellen.
            </p>
            <a routerLink="/" class="confirm-link">Zur Startseite</a>
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .confirm {
        max-width: 40rem;
        margin: 0 auto;
        padding: 2.5rem 0 3rem;
      }

      .confirm-status {
        color: #6b7280;
        text-align: center;
      }

      .confirm-card {
        border-radius: 1.25rem;
        padding: 2rem;
        display: grid;
        gap: 1rem;
        text-align: center;
      }

      .confirm-card.success {
        background: #ecfdf5;
        border: 1px solid #6ee7b7;
        color: #065f46;
      }

      .confirm-card.invalid {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }

      .confirm-card h1 {
        margin: 0;
        font-size: 1.5rem;
      }

      .confirm-card p {
        margin: 0;
        line-height: 1.7;
      }

      .confirm-link {
        justify-self: center;
        background: #0f766e;
        border-radius: 0.75rem;
        color: #f0fdfa;
        font-weight: 800;
        padding: 0.7rem 1.4rem;
        text-decoration: none;
      }
    `
  ]
})
export class LeadConfirmComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(LEAD_REPOSITORY);

  readonly state = signal<'loading' | LeadConfirmResult>('loading');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.state.set('invalid');
      return;
    }
    try {
      this.state.set(await this.repository.confirm(token));
    } catch {
      this.state.set('error');
    }
  }
}
