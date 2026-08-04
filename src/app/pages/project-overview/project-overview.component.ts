import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DIY_COST_DEFAULTS } from '../../config/diy-cost-defaults';
import { ExportDocumentData } from '../../models/export-document.model';
import { AppHostService, CROSS_DOMAIN_PROJECT_HINT } from '../../services/app-host.service';
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { LocalProjectService } from '../../services/local-project.service';
import { ProjectAggregationService } from '../../services/project-aggregation.service';
import { ShareService } from '../../services/share.service';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Heimwerker-Seite „Projekt-Zusammenfassung": Zusammenfassung über ALLE
 * gespeicherten Räume des aktiven Projekts (Kennzahlen, Kostenvergleich
 * DIY vs. Fliesenleger, Raum-Tabelle, Hinweise). Nutzt ausschließlich den
 * vorhandenen `ProjectAggregationService` – keine eigene Berechnung.
 * Contractor-Zugriffe leitet der `customerGuard` auf das Dashboard um.
 */
@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [RouterLink, PremiumExportButtonComponent, TranslatePipe],
  template: `
    <section class="project-overview">
      <header class="overview-header">
        <div>
          <h1>{{ 'Projekt-Zusammenfassung' | t }}</h1>
          <p>{{ rooms().length }} {{ 'gespeicherte Räume' | t }}</p>
        </div>
        @if (rooms().length > 0) {
          <div class="header-actions">
            <app-premium-export-button
              [label]="'Projekt-Zusammenfassung als PDF' | t"
              hintId="project-overview-pdf-hint"
              [document]="buildProjectSummaryDocument"
            />
            <app-premium-export-button
              format="excel"
              [label]="'Projekt-Zusammenfassung als Excel' | t"
              hintId="project-overview-excel-hint"
              [document]="buildProjectSummaryDocument"
            />
          </div>
        }
      </header>

      @if (rooms().length === 0) {
        <section class="overview-section empty-state">
          <h2>{{ 'Noch keine Räume gespeichert.' | t }}</h2>
          <p>{{ 'Lege deinen ersten Raum an, damit Projektkosten und Materialien berechnet werden können.' | t }}</p>
          <a routerLink="/raum-anlegen" class="cta-link">{{ 'Raum anlegen' | t }}</a>
        </section>
      } @else {
        @let totals = result();

        <section class="totals-grid" [attr.aria-label]="'Projektkosten' | t">
          <article><span>{{ 'Anzahl Räume' | t }}</span><strong>{{ totals.roomCount }}</strong></article>
          <article><span>{{ 'Gesamtfläche' | t }}</span><strong>{{ formatNumber(totals.totalTileAreaM2) }} {{ 'm²' | t }}</strong></article>
          <article><span>{{ 'Fliesen inkl. Verschnitt' | t }}</span><strong>{{ formatNumber(totals.totalTileAreaWithWasteM2) }} {{ 'm²' | t }}</strong></article>
          <article><span>{{ 'DIY-Kosten' | t }}</span><strong>{{ formatCurrency(totals.totalDiyCost) }}</strong></article>
          <article><span>{{ 'Fliesenleger-Kosten' | t }}</span><strong>{{ formatCurrency(totals.totalProfessionalCost) }}</strong></article>
          <article>
            <span>{{ 'Mögliche Ersparnis' | t }}</span>
            <strong>{{ formatCurrency(totals.totalSavings) }}</strong>
            @if (savingsPercent() > 0) {
              <small>{{ formatNumber(savingsPercent(), 1) }} %</small>
            }
          </article>
        </section>

        <section class="overview-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">{{ 'Kostenvergleich' | t }}</p>
              <h2>{{ 'Eigenleistung vs. Fliesenleger' | t }}</h2>
            </div>
          </div>

          <div class="comparison-cards">
            <article class="comparison-card diy-card">
              <p>{{ 'Eigenleistung' | t }}</p>
              <h2>{{ formatCurrency(totals.totalDiyCost) }}</h2>
              <dl>
                <div>
                  <dt>{{ 'Materialkosten gesamt' | t }}</dt>
                  <dd>{{ formatCurrency(totals.totalMaterialCost) }}</dd>
                </div>
                <div>
                  <dt>{{ 'Puffer' | t }} {{ diyBufferPercent }} %</dt>
                  <dd>{{ formatCurrency(diyBufferCost()) }}</dd>
                </div>
                <div class="total-row">
                  <dt>{{ 'Gesamt' | t }}</dt>
                  <dd>{{ formatCurrency(totals.totalDiyCost) }}</dd>
                </div>
              </dl>
            </article>

            <article class="comparison-card professional-card">
              <p>{{ 'Fliesenleger' | t }}</p>
              <h2>{{ formatCurrency(totals.totalProfessionalCost) }}</h2>
              <dl>
                <div>
                  <dt>{{ 'Anzahl Räume' | t }}</dt>
                  <dd>{{ totals.roomCount }}</dd>
                </div>
                <div class="total-row">
                  <dt>{{ 'Gesamt inkl. MwSt.' | t }}</dt>
                  <dd>{{ formatCurrency(totals.totalProfessionalCost) }}</dd>
                </div>
              </dl>
            </article>
          </div>

          <section class="savings-box">
            <span>{{ savingsLabel() }}</span>
            <strong>{{ formatCurrency(totals.totalSavings) }}</strong>
            @if (savingsPercent() > 0) {
              <small>
                {{ 'Das entspricht ca.' | t }} {{ formatNumber(savingsPercent(), 1) }} {{ '% der geschätzten Profi-Kosten.' | t }}
              </small>
            }
          </section>

          <section class="share-box">
            <div class="share-head">
              <div>
                <p class="share-eyebrow">{{ 'Kalkulation teilen' | t }}</p>
                <h2>{{ 'Read-only-Link erzeugen' | t }}</h2>
              </div>
              @if (canShare()) {
                <button type="button" (click)="share()" [disabled]="sharing()">
                  {{ sharing() ? ('Link wird erstellt …' | t) : ('Teilen-Link erzeugen' | t) }}
                </button>
              }
            </div>
            @if (!canShare()) {
              <p class="share-hint">
                {{ 'Zum Teilen bitte' | t }}
                @if (host.crossDomainEnabled) {
                  <a [href]="host.loginUrl()">{{ 'anmelden' | t }}</a>
                } @else {
                  <a routerLink="/login">{{ 'anmelden' | t }}</a>
                }
                {{ '– ein geteilter Link speichert eine eingefrorene Momentaufnahme dieser Kalkulation.' | t }}
              </p>
              @if (showCrossDomainProjectHint()) {
                <p class="share-hint">{{ crossDomainProjectHint | t }}</p>
              }
            }
            @if (shareError()) {
              <p class="share-error" role="alert">{{ shareError() }}</p>
            }
            @if (shareLink()) {
              <div class="share-result">
                <input type="text" readonly [value]="shareLink()" #shareInput (focus)="shareInput.select()" />
                <button type="button" (click)="copyShareLink()">
                  {{ copied() ? ('Kopiert ✓' | t) : ('Kopieren' | t) }}
                </button>
              </div>
              <small class="share-note">
                {{ 'Jeder mit diesem Link sieht eine schreibgeschützte Ansicht – ohne deine übrigen Projektdaten.' | t }}
              </small>
            }
          </section>
        </section>

        <section class="overview-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">{{ 'Gespeicherte Räume' | t }}</p>
              <h2>{{ 'Einzelne Kalkulationen' | t }}</h2>
            </div>
          </div>

          <div class="room-table-wrap">
            <table class="room-table">
              <thead>
                <tr>
                  <th>{{ 'Raum' | t }}</th>
                  <th>{{ 'Fläche' | t }}</th>
                  <th>{{ 'DIY-Kosten' | t }}</th>
                  <th>{{ 'Fliesenleger' | t }}</th>
                  <th>{{ 'Mögliche Ersparnis' | t }}</th>
                </tr>
              </thead>
              <tbody>
                @for (room of totals.roomSummaries; track room.roomId) {
                  <tr>
                    <td>{{ room.roomName }}</td>
                    <td>{{ formatNumber(room.tileAreaM2) }} {{ 'm²' | t }}</td>
                    <td>{{ formatCurrency(room.diyCost) }}</td>
                    <td>{{ formatCurrency(room.professionalCost) }}</td>
                    <td>{{ formatCurrency(room.savings) }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="table-total">
                  <td>{{ 'Gesamt' | t }}</td>
                  <td>{{ formatNumber(totals.totalTileAreaM2) }} {{ 'm²' | t }}</td>
                  <td>{{ formatCurrency(totals.roomDiyCostSum) }}</td>
                  <td>{{ formatCurrency(totals.totalProfessionalCost) }}</td>
                  <td>{{ formatCurrency(roomSavingsSum()) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          @if (totals.deduplicationSavings > 0) {
            <p class="dedup-note">
              {{ 'Summe Einzelräume' | t }}: {{ formatCurrency(totals.roomDiyCostSum) }} –
              {{ 'davon −' | t }}{{ formatCurrency(totals.deduplicationSavings) }}
              {{ 'gespart, weil Werkzeuge projektweit nur einmal gerechnet werden.' | t }}
              {{ 'Werkzeugkosten einmalig' | t }}: {{ formatCurrency(totals.totalToolCostDeduplicated) }}
            </p>
          }
        </section>

        <section class="overview-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">{{ 'Leistungspositionsmodell' | t }}</p>
              <h2>{{ 'Profi-Leistungspositionen' | t }}</h2>
            </div>
          </div>

          @for (room of totals.roomSummaries; track room.roomId) {
            <details class="offer-room">
              <summary>
                <span>{{ room.roomName }}</span>
                <strong>{{ formatCurrency(room.professional.totalCost) }}</strong>
              </summary>
              <div class="room-table-wrap">
                <table class="room-table offer-table">
                  <thead>
                    <tr>
                      <th>{{ 'Position' | t }}</th>
                      <th>{{ 'Menge' | t }}</th>
                      <th>{{ 'Einheit' | t }}</th>
                      <th>{{ 'Einheitspreis' | t }}</th>
                      <th>{{ 'Gesamt' | t }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of room.professional.lineItems; track item.id) {
                      <tr>
                        <td>
                          {{ item.label }}
                          @if (item.isOptional) {
                            <small class="optional-label">{{ 'optional' | t }}</small>
                          }
                        </td>
                        <td>{{ formatNumber(item.quantity, item.unit === 'piece' ? 0 : 2) }}</td>
                        <td>{{ lineItemUnitLabel(item.unit) }}</td>
                        <td>{{ formatCurrency(item.unitPrice) }}</td>
                        <td>{{ formatCurrency(item.totalPrice) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <dl class="offer-totals">
                <div>
                  <dt>{{ 'Nettobetrag' | t }}</dt>
                  <dd>{{ formatCurrency(room.professional.netTotal) }}</dd>
                </div>
                <div>
                  <dt>{{ 'Material laut Auswahl' | t }}</dt>
                  <dd>{{ formatCurrency(room.professional.materialCost) }}</dd>
                </div>
                <div>
                  <dt>{{ 'zzgl.' | t }} {{ room.professional.vatPercent }} {{ '% MwSt. (Leistung + Material)' | t }}</dt>
                  <dd>{{ formatCurrency(room.professional.vatAmount) }}</dd>
                </div>
                <div class="offer-grand-total">
                  <dt>{{ 'Gesamtschätzung Fliesenleger' | t }}</dt>
                  <dd>{{ formatCurrency(room.professional.totalCost) }}</dd>
                </div>
              </dl>
            </details>
          }

          <dl class="offer-totals project-offer-totals">
            <div>
              <dt>{{ 'Netto gesamt (Leistung + Material)' | t }}</dt>
              <dd>{{ formatCurrency(professionalNetSum()) }}</dd>
            </div>
            <div>
              <dt>{{ 'MwSt. gesamt' | t }}</dt>
              <dd>{{ formatCurrency(professionalVatSum()) }}</dd>
            </div>
            <div class="offer-grand-total">
              <dt>{{ 'Gesamtschätzung Fliesenleger' | t }}</dt>
              <dd>{{ formatCurrency(totals.totalProfessionalCost) }}</dd>
            </div>
          </dl>
        </section>

        @if (totals.warnings.length > 0) {
          <section class="overview-section warning-section">
            <div class="section-heading">
              <div>
                <p class="eyebrow">{{ 'Bitte beachten' | t }}</p>
                <h2>{{ 'Hinweise und Risiken' | t }}</h2>
              </div>
            </div>
            <ul class="info-list">
              @for (warning of totals.warnings; track warning.id) {
                <li>
                  @if (warning.roomName) {
                    <strong>{{ warning.roomName }}:</strong>
                  }
                  {{ warning.message | t }}
                </li>
              }
            </ul>
          </section>
        }
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .project-overview {
        display: grid;
        gap: 1.4rem;
        margin: 0 auto;
        max-width: 72rem;
        width: 100%;
      }

      .overview-header,
      .overview-section {
        background: #fff;
        border: 1px solid #e7e5e4;
        border-radius: 1.25rem;
        box-shadow: 0 20px 55px rgba(83, 91, 76, 0.1);
        padding: clamp(1.25rem, 3vw, 1.75rem);
      }

      .overview-header {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: space-between;
      }

      .overview-header h1 {
        font-size: clamp(1.5rem, 3.5vw, 2.2rem);
        margin: 0;
      }

      .overview-header p {
        color: #78716c;
        margin: 0.25rem 0 0;
      }

      .header-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .empty-state {
        display: grid;
        gap: 0.75rem;
        justify-items: center;
        padding: 2.5rem 1.5rem;
        text-align: center;
      }

      .empty-state h2,
      .empty-state p {
        margin: 0;
      }

      .cta-link {
        align-items: center;
        background: #0f766e;
        border-radius: 0.75rem;
        color: #f0fdfa;
        display: inline-flex;
        font-weight: 800;
        justify-content: center;
        min-height: 2.75rem;
        padding: 0.7rem 1rem;
        text-decoration: none;
      }

      .totals-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .totals-grid article {
        background: linear-gradient(150deg, #0a352f, #07241f);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 1.15rem;
        color: #fff;
        display: grid;
        gap: 0.45rem;
        padding: 1.15rem;
      }

      .totals-grid span {
        color: #9fcbb9;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .totals-grid strong {
        color: #f5efe4;
        font-size: 1.5rem;
      }

      .totals-grid small {
        color: #9fcbb9;
      }

      .section-heading {
        align-items: start;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
      }

      .section-heading .eyebrow {
        color: #78716c;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.12em;
        margin: 0 0 0.25rem;
        text-transform: uppercase;
      }

      .section-heading h2 {
        color: #1c1917;
        font-size: 1.15rem;
        margin: 0;
      }

      .comparison-cards {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 1rem;
      }

      .comparison-card {
        border: 1px solid #e7e5e4;
        border-radius: 1rem;
        color: #fff;
        min-width: 0;
        padding: 1.1rem;
      }

      .diy-card {
        background: linear-gradient(145deg, #065f46, #0f766e);
      }

      .professional-card {
        background: linear-gradient(145deg, #1e3a8a, #1d4ed8);
      }

      .comparison-card > p {
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        margin: 0;
        opacity: 0.78;
        text-transform: uppercase;
      }

      .comparison-card > h2 {
        color: #fff;
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        margin: 0.45rem 0 1rem;
      }

      .comparison-card dl {
        display: grid;
        gap: 0.55rem;
        margin: 0;
      }

      .comparison-card dl div {
        align-items: center;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
      }

      .comparison-card dt,
      .comparison-card dd {
        margin: 0;
      }

      .comparison-card dd {
        font-weight: 800;
        text-align: right;
        white-space: nowrap;
      }

      .comparison-card .total-row {
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        font-size: 1.08rem;
        margin-top: 0.25rem;
        padding-top: 0.7rem;
      }

      .savings-box {
        align-items: center;
        background: #ecfdf5;
        border: 1px solid #6ee7b7;
        border-radius: 1rem;
        color: #064e3b;
        display: grid;
        gap: 0.3rem;
        margin-top: 1rem;
        padding: 1rem 1.2rem;
        text-align: center;
      }

      .savings-box span {
        font-weight: 800;
      }

      .savings-box strong {
        font-size: clamp(1.5rem, 3vw, 2.2rem);
      }

      .savings-box small {
        color: #047857;
      }

      .share-box {
        background: #fff;
        border: 1px solid #e7e5e4;
        border-radius: 1rem;
        display: grid;
        gap: 0.6rem;
        margin-top: 1rem;
        padding: 1rem 1.2rem;
      }

      .share-head {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: space-between;
      }

      .share-head h2 {
        font-size: 1.05rem;
        margin: 0.1rem 0 0;
      }

      .share-eyebrow {
        color: #78716c;
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        margin: 0;
        text-transform: uppercase;
      }

      .share-head button,
      .share-result button {
        background: #0f766e;
        border: 0;
        border-radius: 0.75rem;
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-weight: 800;
        padding: 0.65rem 1rem;
      }

      .share-head button:disabled {
        cursor: default;
        opacity: 0.6;
      }

      .share-hint,
      .share-note {
        color: #78716c;
        font-size: 0.85rem;
        margin: 0;
      }

      .share-error {
        color: #b91c1c;
        font-size: 0.85rem;
        margin: 0;
      }

      .share-result {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .share-result input {
        background: #fafaf9;
        border: 1px solid #d6d3d1;
        border-radius: 0.55rem;
        flex: 1 1 18rem;
        font: inherit;
        padding: 0.55rem 0.7rem;
      }

      .room-table-wrap {
        margin-top: 1rem;
        overflow-x: auto;
      }

      .room-table {
        border-collapse: collapse;
        min-width: 32rem;
        width: 100%;
      }

      .room-table th,
      .room-table td {
        border-bottom: 1px solid #e7e5e4;
        padding: 0.6rem 0.8rem;
        text-align: right;
        vertical-align: top;
      }

      .room-table th:not(:first-child),
      .room-table td:not(:first-child) {
        white-space: nowrap;
      }

      .room-table th:first-child,
      .room-table td:first-child {
        text-align: left;
        width: 32%;
      }

      .room-table tbody tr:nth-child(even) {
        background: #fafaf9;
      }

      .room-table th {
        color: #57534e;
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .room-table td {
        color: #292524;
        font-weight: 650;
      }

      .room-table .table-total td {
        border-bottom: 0;
        color: #0f766e;
        font-size: 1.05rem;
        font-weight: 900;
      }

      .offer-room {
        border: 1px solid #e7e5e4;
        border-radius: 0.85rem;
        margin-top: 1rem;
      }

      .offer-room summary {
        align-items: center;
        cursor: pointer;
        display: flex;
        flex-wrap: wrap;
        font-weight: 800;
        gap: 1rem;
        justify-content: space-between;
        padding: 0.8rem 1rem;
      }

      .offer-room summary strong {
        color: #0f766e;
        white-space: nowrap;
      }

      .offer-room .room-table-wrap {
        margin-top: 0;
        padding: 0 1rem;
      }

      .offer-table {
        min-width: 38rem;
      }

      .optional-label {
        color: #92400e;
        font-weight: 650;
        margin-left: 0.35rem;
      }

      .offer-totals {
        display: grid;
        gap: 0.45rem;
        margin: 0.75rem 0 0;
        padding: 0 1rem 1rem;
      }

      .offer-totals div {
        align-items: baseline;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
      }

      .offer-totals dt,
      .offer-totals dd {
        margin: 0;
      }

      .offer-totals dd {
        font-weight: 800;
        text-align: right;
        white-space: nowrap;
      }

      .offer-totals .offer-grand-total {
        border-top: 1px solid #e7e5e4;
        color: #0f766e;
        font-size: 1.05rem;
        font-weight: 900;
        padding-top: 0.55rem;
      }

      .project-offer-totals {
        background: #fafaf9;
        border: 1px solid #e7e5e4;
        border-radius: 0.85rem;
        margin-top: 1rem;
        padding: 1rem;
      }

      .dedup-note {
        background: #fafaf9;
        border: 1px solid #e7e5e4;
        border-radius: 0.75rem;
        color: #57534e;
        font-size: 0.88rem;
        line-height: 1.5;
        margin: 1rem 0 0;
        padding: 0.75rem 0.9rem;
      }

      .warning-section {
        background: #fffbeb;
        border-color: #fde68a;
      }

      .info-list {
        color: #92400e;
        display: grid;
        gap: 0.55rem;
        line-height: 1.5;
        margin: 1rem 0 0;
        padding-left: 1.2rem;
      }

      @media (max-width: 900px) {
        .comparison-cards {
          grid-template-columns: 1fr;
        }

        .totals-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 650px) {
        .overview-header,
        .section-heading {
          align-items: stretch;
          flex-direction: column;
        }

        .totals-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class ProjectOverviewComponent {
  private readonly localProject = inject(LocalProjectService);
  private readonly aggregationService = inject(ProjectAggregationService);
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly i18n = inject(I18nService);

  readonly rooms = this.localProject.rooms;
  /** Aggregation ist teuer → zwingend im computed, nie im Template aufrufen. */
  readonly result = computed(() => this.aggregationService.aggregateProject(this.rooms()));

  /** DIY-Puffer in % (fixe Konstante, nur Anzeige neben dem Pufferbetrag). */
  readonly diyBufferPercent = DIY_COST_DEFAULTS.riskBufferPercent;
  /** Pufferbetrag = DIY-Gesamtkosten minus deduplizierter Materialkosten. */
  readonly diyBufferCost = computed(() => {
    const totals = this.result();
    return Math.max(0, totals.totalDiyCost - totals.totalMaterialCost);
  });

  /** Ersparnis in % der geschätzten Profi-Kosten (projektweit). */
  readonly savingsPercent = computed(() => {
    const totals = this.result();
    return totals.totalProfessionalCost > 0
      ? (totals.totalSavings / totals.totalProfessionalCost) * 100
      : 0;
  });

  /** Summe der Einzelraum-Ersparnisse (Summenzeile; ≠ projektweite Ersparnis). */
  readonly roomSavingsSum = computed(() =>
    this.result().roomSummaries.reduce((sum, room) => sum + room.savings, 0)
  );

  /** Σ Netto (Leistung + Material) über alle Räume – Profi-Leistungspositionen. */
  readonly professionalNetSum = computed(() =>
    this.result().roomSummaries.reduce(
      (sum, room) => sum + room.professional.netTotal + room.professional.materialCost,
      0
    )
  );

  /** Σ MwSt. über alle Räume – zusammen mit Σ Netto ergibt das `totalProfessionalCost`. */
  readonly professionalVatSum = computed(() =>
    this.result().roomSummaries.reduce((sum, room) => sum + room.professional.vatAmount, 0)
  );

  // Export-Factory: wird erst beim Klick ausgewertet (aktueller Stand).
  readonly buildProjectSummaryDocument = (): ExportDocumentData =>
    this.exportMapper.buildProjectSummaryExportData(this.result());

  // --- Teilen (Muster: summary-page) ---
  private readonly shareService = inject(ShareService);
  readonly host = inject(AppHostService);
  readonly crossDomainProjectHint = CROSS_DOMAIN_PROJECT_HINT;
  /** Anonymes lokales Projekt bleibt beim Cross-Domain-Login auf der Marketing-Domain. */
  readonly showCrossDomainProjectHint = computed(
    () => this.host.crossDomainEnabled && this.rooms().length > 0
  );
  readonly canShare = this.shareService.canShare;
  readonly sharing = signal(false);
  readonly shareLink = signal<string | null>(null);
  readonly shareError = signal<string | null>(null);
  readonly copied = signal(false);

  async share(): Promise<void> {
    if (!this.canShare() || this.sharing()) {
      return;
    }
    this.shareError.set(null);
    this.shareLink.set(null);
    this.copied.set(false);
    this.sharing.set(true);
    try {
      const snapshot = this.shareService.buildProjectSnapshot(
        this.localProject.project().name,
        this.result()
      );
      const token = await this.shareService.createShare(snapshot);
      this.shareLink.set(this.shareService.projectShareUrl(token));
    } catch (error) {
      console.error('Teilen-Link konnte nicht erstellt werden:', error);
      this.shareError.set(
        this.i18n.t('Der Teilen-Link konnte nicht erstellt werden. Bitte erneut versuchen.')
      );
    } finally {
      this.sharing.set(false);
    }
  }

  async copyShareLink(): Promise<void> {
    const url = this.shareLink();
    if (!url) {
      return;
    }
    try {
      await globalThis.navigator?.clipboard?.writeText(url);
      this.copied.set(true);
    } catch {
      // Clipboard nicht verfügbar: der Nutzer kann den markierten Link manuell kopieren.
    }
  }

  savingsLabel(): string {
    return this.result().totalSavings > 0
      ? this.i18n.t('Mögliche Ersparnis durch Eigenleistung')
      : this.i18n.t('Keine rechnerische Ersparnis');
  }

  formatNumber(value: number, digits = 2): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  /** Einheiten-Label der Profi-Positionen (Muster: summary-page, übersetzt). */
  lineItemUnitLabel(value: string): string {
    const label =
      {
        pauschal: 'pauschal',
        m2: 'm²',
        lfm: 'lfm',
        piece: 'Stück',
        hour: 'Std.'
      }[value] ?? value;
    return this.i18n.t(label);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }
}
