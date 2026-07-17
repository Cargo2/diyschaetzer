import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ADMIN_STATS_REPOSITORY, AdminStats } from './data-access/admin-stats-repository';

/** Monatlicher Abo-Preis (brutto) für die Umsatz-Hochrechnung im Dashboard. */
const MONTHLY_SUBSCRIPTION_PRICE = 29.99;

/**
 * Admin-Statistik-Dashboard (Startseite des Admin-Bereichs). Zeigt aggregierte
 * Kennzahlen aus {@link ADMIN_STATS_REPOSITORY} (SECURITY DEFINER-RPC
 * `admin_get_stats()`) als Kachel-Layout. Bewusst ohne Chart-Library – Zahlen +
 * einfache CSS-Balken. Read-only, mit Aktualisieren-Button.
 */
@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <div class="dash">
      <div class="dash-bar">
        <p class="dash-lead">Kennzahlen im Überblick (Live aus der Datenbank).</p>
        <button type="button" class="refresh" (click)="refresh()" [disabled]="loading()">
          {{ loading() ? 'Lädt …' : 'Aktualisieren' }}
        </button>
      </div>

      @if (loading() && !stats()) {
        <p class="dash-status">Lade Statistik …</p>
      } @else if (error()) {
        <p class="dash-status error" role="alert">{{ error() }}</p>
      } @else if (stats(); as s) {
        <!-- Nutzer -->
        <section class="dash-section">
          <h2>Nutzer</h2>
          <div class="grid">
            <div class="tile">
              <span class="tile-value">{{ s.usersTotal }}</span>
              <span class="tile-label">Nutzer gesamt</span>
              <span class="tile-trend">+{{ s.usersNew30d }} in 30 Tagen · +{{ s.usersNew7d }} in 7 Tagen</span>
            </div>
            <div class="tile">
              <span class="tile-value">{{ s.usersContractor }}</span>
              <span class="tile-label">Profis (contractor)</span>
            </div>
            <div class="tile">
              <span class="tile-value">{{ s.usersCustomer }}</span>
              <span class="tile-label">Hobby (customer)</span>
            </div>
            <div class="tile">
              <span class="tile-value">{{ s.usersAdmin }}</span>
              <span class="tile-label">Admins</span>
            </div>
          </div>
        </section>

        <!-- Abos & Umsatz -->
        <section class="dash-section">
          <h2>Abos &amp; Umsatz</h2>
          <div class="grid">
            <div class="tile accent">
              <span class="tile-value">{{ s.subsActive }}</span>
              <span class="tile-label">Aktive Abos (aktiv/Probephase)</span>
            </div>
            <div class="tile accent">
              <span class="tile-value">{{ formatCurrency(monthlyRevenue()) }}</span>
              <span class="tile-label">Monatsumsatz (× {{ formatCurrency(price) }})</span>
              <span class="tile-trend">{{ formatCurrency(yearlyRevenue()) }} / Jahr (hochgerechnet)</span>
            </div>
            <div class="tile">
              <span class="tile-value">{{ s.subsPastDue }}</span>
              <span class="tile-label">Überfällig (past_due)</span>
            </div>
            <div class="tile">
              <span class="tile-value">{{ s.subsCancelled }}</span>
              <span class="tile-label">Gekündigt/abgelaufen</span>
            </div>
          </div>
        </section>

        <!-- Aktivität -->
        <section class="dash-section">
          <h2>Aktivität</h2>
          <div class="grid">
            <div class="tile">
              <span class="tile-value">{{ s.projectsTotal }}</span>
              <span class="tile-label">Projekte gesamt</span>
              <span class="tile-trend">+{{ s.projectsNew30d }} neu · {{ s.projectsActive30d }} aktiv (30 Tage)</span>
            </div>
            <div class="tile">
              <span class="tile-value">{{ s.offersTotal }}</span>
              <span class="tile-label">Angebote gesamt</span>
              <span class="tile-trend">{{ s.offersDraft }} Entwurf · {{ s.offersSent }} versendet · {{ s.offersAccepted }} angenommen</span>
              @if (s.offersTotal > 0) {
                <div class="bars" aria-hidden="true">
                  <span class="bar draft" [style.width.%]="pct(s.offersDraft, s.offersTotal)"></span>
                  <span class="bar sent" [style.width.%]="pct(s.offersSent, s.offersTotal)"></span>
                  <span class="bar accepted" [style.width.%]="pct(s.offersAccepted, s.offersTotal)"></span>
                </div>
              }
            </div>
            <div class="tile">
              <span class="tile-value">{{ s.invoicesTotal }}</span>
              <span class="tile-label">Rechnungen gesamt</span>
              <span class="tile-trend">+{{ s.invoicesNew30d }} in 30 Tagen</span>
            </div>
          </div>
        </section>

        <!-- Teilen & Annahme -->
        <section class="dash-section">
          <h2>Teilen &amp; Annahme</h2>
          <div class="grid">
            <div class="tile">
              <span class="tile-value">{{ s.sharedOffersTotal }}</span>
              <span class="tile-label">Geteilte Angebote</span>
              <span class="tile-trend">{{ s.sharedOffersViewed }} angesehen · {{ s.sharedOffersViewSum }} Aufrufe</span>
            </div>
            <div class="tile accent">
              <span class="tile-value">{{ s.sharedOffersAccepted }}</span>
              <span class="tile-label">Angenommene Angebote</span>
              <span class="tile-trend">Annahme-Quote {{ formatPercent(acceptanceRate()) }}</span>
              @if (s.sharedOffersTotal > 0) {
                <div class="bars" aria-hidden="true">
                  <span class="bar accepted" [style.width.%]="pct(s.sharedOffersAccepted, s.sharedOffersTotal)"></span>
                </div>
              }
            </div>
            <div class="tile">
              <span class="tile-value">{{ s.sharedCalculationsTotal }}</span>
              <span class="tile-label">Geteilte Kalkulationen</span>
            </div>
          </div>
        </section>

        <!-- Leads & Feedback -->
        <section class="dash-section">
          <h2>Leads &amp; Feedback</h2>
          <div class="grid">
            <div class="tile">
              <span class="tile-value">{{ s.leadsTotal }}</span>
              <span class="tile-label">Leads gesamt</span>
              <span class="tile-trend">
                {{ s.leadsPending }} offen · {{ s.leadsConfirmed }} bestätigt ·
                {{ s.leadsDistributed }} verteilt · {{ s.leadsExpired }} abgelaufen
              </span>
            </div>
            <div class="tile" [class.accent]="s.feedbackOpen > 0">
              <span class="tile-value">{{ s.feedbackOpen }}</span>
              <span class="tile-label">Offenes Feedback</span>
              <span class="tile-trend">{{ s.feedbackTotal }} gesamt</span>
            </div>
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .dash {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .dash-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .dash-lead {
        margin: 0;
        font-size: 0.9rem;
        color: #6b7280;
      }

      .refresh {
        border: 1px solid #c7d2fe;
        border-radius: 0.6rem;
        background: #eef2ff;
        color: #3730a3;
        font-size: 0.85rem;
        font-weight: 600;
        padding: 0.4rem 0.9rem;
        cursor: pointer;
      }

      .refresh:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .dash-status {
        color: #6b7280;
        font-size: 0.9rem;
      }

      .dash-status.error {
        color: #b91c1c;
      }

      .dash-section {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .dash-section h2 {
        margin: 0;
        font-size: 1.05rem;
        color: #131711;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 0.75rem;
      }

      .tile {
        border: 1px solid #e5e7eb;
        border-radius: 0.85rem;
        padding: 0.9rem 1rem;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .tile.accent {
        border-color: #c7d2fe;
        background: #f8faff;
      }

      .tile-value {
        font-size: 1.7rem;
        font-weight: 700;
        line-height: 1.1;
        color: #1f2937;
      }

      .tile-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #374151;
      }

      .tile-trend {
        font-size: 0.78rem;
        color: #6b7280;
      }

      .bars {
        display: flex;
        width: 100%;
        height: 8px;
        margin-top: 0.4rem;
        border-radius: 999px;
        overflow: hidden;
        background: #f1f5f9;
      }

      .bar {
        height: 100%;
      }

      .bar.draft {
        background: #cbd5e1;
      }

      .bar.sent {
        background: #93c5fd;
      }

      .bar.accepted {
        background: #34d399;
      }
    `
  ]
})
export class AdminDashboardComponent implements OnInit {
  private readonly repository = inject(ADMIN_STATS_REPOSITORY);

  readonly price = MONTHLY_SUBSCRIPTION_PRICE;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly stats = signal<AdminStats | null>(null);

  readonly monthlyRevenue = computed(() => (this.stats()?.subsActive ?? 0) * this.price);
  readonly yearlyRevenue = computed(() => this.monthlyRevenue() * 12);

  /** Annahme-Quote der geteilten Angebote (angenommen / geteilt), 0..1. */
  readonly acceptanceRate = computed(() => {
    const s = this.stats();
    if (!s || s.sharedOffersTotal === 0) {
      return 0;
    }
    return s.sharedOffersAccepted / s.sharedOffersTotal;
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async refresh(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.stats.set(await this.repository.getStats());
      this.error.set(null);
    } catch (err) {
      console.error('Statistik konnte nicht geladen werden:', err);
      this.error.set('Statistik konnte nicht geladen werden.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Anteil (0..100) für die CSS-Balkenbreite; 0, wenn kein Gesamtwert. */
  pct(part: number, total: number): number {
    if (!total) {
      return 0;
    }
    return Math.round((part / total) * 100);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  formatPercent(rate: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'percent',
      maximumFractionDigits: 1
    }).format(rate);
  }
}
