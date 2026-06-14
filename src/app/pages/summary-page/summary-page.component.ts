import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SummaryAssumptionsComponent } from '../../components/summary-assumptions/summary-assumptions.component';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';
import { ExportDocumentData } from '../../models/export-document.model';
import { CostComparisonService } from '../../services/cost-comparison.service';
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { MaterialListService } from '../../services/material-list.service';
import { MaterialListStateService } from '../../services/material-list-state.service';
import { LocalProjectService } from '../../services/local-project.service';
import { WizardStateService } from '../../services/wizard-state.service';

@Component({
  selector: 'app-summary-page',
  standalone: true,
  imports: [CommonModule, RouterLink, SummaryAssumptionsComponent, PremiumExportButtonComponent],
  template: `
    @if (wizardCompleted()) {
      <div class="summary-page">
        <div class="summary-top-actions">
          <app-premium-export-button
            label="Raum-Zusammenfassung als PDF exportieren"
            hintId="room-summary-pdf-hint"
            [document]="buildRoomSummaryDocument"
          />
        </div>
        <app-summary-assumptions
          [showOptions]="false"
          [showAssumptions]="false"
          [showJson]="false"
        />

        <section class="save-room-panel">
          <div>
            <p>Lokales Projekt</p>
            <h2>{{ payload().room.roomName }}</h2>
          </div>
          @if (!roomSaved()) {
            <button type="button" (click)="saveRoom()">
              {{ editingRoomId() ? 'Änderungen speichern' : 'Raum speichern' }}
            </button>
          } @else {
            <div class="save-success">
              <strong>
                {{ savedExistingRoom() ? 'Änderungen wurden gespeichert.' : 'Raum wurde gespeichert.' }}
              </strong>
              <div class="save-actions">
                <button type="button" (click)="startAnotherRoom()">Weiteren Raum hinzufügen</button>
                <a routerLink="/gesamtschaetzung">Zur Gesamtschätzung</a>
                <button type="button" (click)="openSavedRoomMaterialList()">Materialliste dieses Raumes prüfen</button>
              </div>
            </div>
          }
        </section>

        @let material = materialList();
        @let tile = material.tileCalculation;
        <section class="cost-accordion">
          <button
            type="button"
            class="cost-trigger"
            [attr.aria-expanded]="costOverviewOpen()"
            aria-controls="diy-cost-panel"
            (click)="costOverviewOpen.update((value) => !value)"
          >
            <span>
              <small>Zusammenfassung DIY</small>
              <strong>DIY-Kostenschätzung & Materialübersicht</strong>
            </span>
            <span class="trigger-total">
              {{ formatCurrency(material.totalDisplayCost) }}
              <i [class.open]="costOverviewOpen()">⌄</i>
            </span>
          </button>

          @if (costOverviewOpen()) {
            <div id="diy-cost-panel" class="cost-panel">
              <div class="panel-section">
                <div class="section-heading">
                  <div>
                    <p>Berechnungsgrundlage</p>
                    <h2>Fliesenmenge & Verschnitt</h2>
                  </div>
                </div>

                <div class="metric-grid">
                  <div><span>Zu fliesende Fläche</span><b>{{ formatNumber(tile.baseTileAreaM2) }} m²</b></div>
                  <div><span>Verschnitt</span><b>{{ formatNumber(tile.wasteFactorPercent, 0) }} %</b></div>
                  <div><span>Inkl. Verschnitt</span><b>{{ formatNumber(tile.tileAreaWithWasteM2) }} m²</b></div>
                  <div><span>Fliesenformat</span><b>{{ tile.tileLengthCm }} × {{ tile.tileWidthCm }} cm</b></div>
                  <div><span>Benötigte Fliesen</span><b>{{ tile.tileCount }} Stück</b></div>
                  <div><span>Fläche nach Stückzahl</span><b>{{ formatNumber(tile.actualTileAreaByCountM2) }} m²</b></div>
                </div>
              </div>

              <div class="panel-section cost-section">
                <div class="section-heading">
                  <div>
                    <p>Aktuelle Auswahl</p>
                    <h2>DIY-Materialkosten</h2>
                  </div>
                  <strong>{{ formatCurrency(material.totalDisplayCost) }}</strong>
                </div>

                <div class="cost-metrics">
                  <div>
                    <span>Aktive Materialpositionen</span>
                    <b>{{ material.activeItemCount }}</b>
                  </div>
                  <div>
                    <span>Deaktivierte Materialpositionen</span>
                    <b>{{ material.inactiveItemCount }}</b>
                  </div>
                  <div>
                    <span>Materialkosten gesamt</span>
                    <b>{{ formatCurrency(material.totalDisplayCost) }}</b>
                  </div>
                </div>

                <a routerLink="/materialliste">Materialliste bearbeiten</a>
              </div>
            </div>
          }
        </section>

        @let comparison = costComparison();
        <section class="cost-accordion comparison-accordion">
          <button
            type="button"
            class="cost-trigger comparison-trigger"
            [attr.aria-expanded]="comparisonOpen()"
            aria-controls="cost-comparison-panel"
            (click)="comparisonOpen.update((value) => !value)"
          >
            <span>
              <small>Kostenvergleich</small>
              <strong>Eigenleistung vs. Fliesenleger</strong>
            </span>
            <span class="trigger-total">
              {{ formatCurrency(comparison.savings.amount) }} Ersparnis
              <i [class.open]="comparisonOpen()">⌄</i>
            </span>
          </button>

          @if (comparisonOpen()) {
            <div id="cost-comparison-panel" class="comparison-panel">
              <div class="comparison-cards">
                <article class="comparison-card diy-card">
                  <p>Eigenleistung</p>
                  <h2>{{ formatCurrency(comparison.diy.totalCost) }}</h2>
                  <dl>
                    <div>
                      <dt>Material & Zubehör</dt>
                      <dd>{{ formatCurrency(comparison.diy.materialCost) }}</dd>
                    </div>
                    <div>
                      <dt>Puffer {{ comparison.diy.diyBufferPercent }} %</dt>
                      <dd>{{ formatCurrency(comparison.diy.diyBufferCost) }}</dd>
                    </div>
                    <div class="total-row">
                      <dt>Gesamt</dt>
                      <dd>{{ formatCurrency(comparison.diy.totalCost) }}</dd>
                    </div>
                  </dl>
                </article>

                <article class="comparison-card professional-card">
                  <p>Fliesenleger</p>
                  <h2>{{ formatCurrency(comparison.professional.totalCost) }}</h2>
                  <dl>
                    <div>
                      <dt>Leistungspositionen brutto</dt>
                      <dd>{{ formatCurrency(comparison.professional.offer.grossTotal) }}</dd>
                    </div>
                    <div>
                      <dt>Material laut Auswahl</dt>
                      <dd>{{ formatCurrency(comparison.professional.materialCost) }}</dd>
                    </div>
                    <div class="total-row">
                      <dt>Gesamt</dt>
                      <dd>{{ formatCurrency(comparison.professional.totalCost) }}</dd>
                    </div>
                  </dl>
                  @if (!payload().scope.includeTileMaterial) {
                    <strong class="time-note">Ohne Fliesenmaterial</strong>
                  }
                </article>
              </div>

              <section class="savings-box">
                <span>{{ comparison.savings.label }}</span>
                <strong>{{ formatCurrency(comparison.savings.amount) }}</strong>
                @if (comparison.savings.percent > 0) {
                  <small>
                    Das entspricht ca. {{ formatNumber(comparison.savings.percent, 1) }} % der
                    geschätzten Profi-Kosten.
                  </small>
                }
              </section>

              <section class="comparison-section">
                <div class="section-heading">
                  <div>
                    <p>Leistungspositionsmodell</p>
                    <h2>Profi-Angebotspositionen</h2>
                  </div>
                  <app-premium-export-button
                    label="Profi-Kalkulation als PDF exportieren"
                    hintId="professional-pdf-hint"
                    [document]="buildProfessionalDocument"
                  />
                </div>
                <div class="comparison-table-wrap">
                  <table class="comparison-table">
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Menge</th>
                        <th>Einheit</th>
                        <th>Einheitspreis</th>
                        <th>Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of comparison.professional.offer.lineItems; track item.id) {
                        <tr [class.inactive-offer-item]="!item.isActive">
                          <td>
                            {{ item.label }}
                            @if (item.isOptional) {
                              <small class="optional-label">optional</small>
                            }
                          </td>
                          <td>{{ formatNumber(item.quantity, item.unit === 'piece' ? 0 : 2) }}</td>
                          <td>{{ lineItemUnitLabel(item.unit) }}</td>
                          <td>{{ formatCurrency(item.unitPrice) }}</td>
                          <td>
                            {{
                              item.isActive
                                ? formatCurrency(item.totalPrice)
                                : 'nicht eingerechnet'
                            }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <dl class="offer-totals">
                  <div>
                    <dt>Nettobetrag</dt>
                    <dd>{{ formatCurrency(comparison.professional.offer.netTotal) }}</dd>
                  </div>
                  <div>
                    <dt>zzgl. {{ comparison.professional.offer.vatPercent }} % MwSt.</dt>
                    <dd>{{ formatCurrency(comparison.professional.offer.vatAmount) }}</dd>
                  </div>
                  <div>
                    <dt>Bruttosumme Leistungspositionen</dt>
                    <dd>{{ formatCurrency(comparison.professional.offer.grossTotal) }}</dd>
                  </div>
                  <div>
                    <dt>Material laut Auswahl</dt>
                    <dd>{{ formatCurrency(comparison.professional.materialCost) }}</dd>
                  </div>
                  <div class="offer-grand-total">
                    <dt>Gesamtschätzung Fliesenleger</dt>
                    <dd>{{ formatCurrency(comparison.professional.totalCost) }}</dd>
                  </div>
                </dl>
              </section>

              <div class="comparison-details">
                <section class="comparison-section">
                  <div class="section-heading">
                    <div>
                      <p>Eigenleistung</p>
                      <h2>Aufteilung der Materialkosten</h2>
                    </div>
                  </div>
                  <dl class="group-list">
                    @for (group of comparison.diy.costGroups; track group.id) {
                      <div>
                        <dt>{{ group.label }}</dt>
                        <dd>{{ formatCurrency(group.cost) }}</dd>
                      </div>
                    } @empty {
                      <div>
                        <dt>Keine aktiven Materialkosten</dt>
                        <dd>{{ formatCurrency(0) }}</dd>
                      </div>
                    }
                  </dl>
                </section>

                <section class="comparison-section">
                  <div class="section-heading">
                    <div>
                      <p>Berechnungsbasis</p>
                      <h2>Annahmen</h2>
                    </div>
                  </div>
                  <ul class="info-list">
                    @for (assumption of comparison.assumptions; track assumption) {
                      <li>{{ assumption }}</li>
                    }
                  </ul>
                </section>
              </div>

              @if (comparison.warnings.length > 0) {
                <section class="comparison-section warning-section">
                  <div class="section-heading">
                    <div>
                      <p>Bitte beachten</p>
                      <h2>Hinweise und Risiken</h2>
                    </div>
                  </div>
                  <ul class="info-list">
                    @for (warning of comparison.warnings; track warning) {
                      <li>{{ warning }}</li>
                    }
                  </ul>
                </section>
              }
            </div>
          }
        </section>
      </div>
    } @else {
      <section class="empty-panel">
        <p>Die Zusammenfassung erscheint erst, wenn du den finalen Button im Wizard drückst.</p>
        <a routerLink="/wizard" class="summary-link">Zum Wizard</a>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .summary-page {
        margin: 0 auto;
        max-width: 80vw;
        width: 80vw;
      }

      .summary-top-actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
      }

      .empty-panel {
        align-items: center;
        background: #fff;
        border: 1px solid rgba(255, 255, 255, 0.8);
        border-radius: 1.25rem;
        box-shadow: 0 20px 55px rgba(83, 91, 76, 0.1);
        color: #57534e;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        justify-content: center;
        min-height: calc(100vh - 8.5rem);
        padding: 1.5rem;
        text-align: center;
      }

      .summary-link,
      .cost-section a {
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

      .cost-accordion {
        background: #fff;
        border: 1px solid #e7e5e4;
        border-radius: 1.25rem;
        box-shadow: 0 20px 55px rgba(83, 91, 76, 0.1);
        margin-top: 1rem;
        overflow: hidden;
      }

      .save-room-panel {
        align-items: center;
        background: #ecfdf5;
        border: 1px solid #6ee7b7;
        border-radius: 1.25rem;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: space-between;
        margin-top: 1rem;
        padding: 1.1rem 1.25rem;
      }

      .save-room-panel p,
      .save-room-panel h2 {
        margin: 0;
      }

      .save-room-panel p {
        color: #047857;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .save-room-panel button,
      .save-room-panel a {
        background: #0f766e;
        border: 0;
        border-radius: 0.75rem;
        color: #fff;
        cursor: pointer;
        font: inherit;
        font-weight: 800;
        padding: 0.75rem 1rem;
        text-decoration: none;
      }

      .save-success,
      .save-actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .save-success {
        justify-content: flex-end;
      }

      .cost-trigger {
        align-items: center;
        background: #0c3b35;
        border: 0;
        color: #fff;
        cursor: pointer;
        display: flex;
        font: inherit;
        justify-content: space-between;
        padding: 1.2rem 1.4rem;
        text-align: left;
        width: 100%;
      }

      .cost-trigger > span:first-child {
        display: grid;
        gap: 0.25rem;
      }

      .cost-trigger small {
        color: #99f6e4;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .cost-trigger strong {
        font-size: clamp(1rem, 2vw, 1.25rem);
      }

      .trigger-total {
        align-items: center;
        color: #ccfbf1;
        display: flex;
        font-size: 1.1rem;
        font-weight: 800;
        gap: 0.8rem;
      }

      .trigger-total i {
        font-size: 1.35rem;
        font-style: normal;
        transition: transform 160ms ease;
      }

      .trigger-total i.open {
        transform: rotate(180deg);
      }

      .cost-panel {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1.2fr 0.8fr;
        padding: 1.25rem;
      }

      .panel-section {
        background: #fafaf9;
        border: 1px solid #e7e5e4;
        border-radius: 1rem;
        padding: 1rem;
      }

      .section-heading {
        align-items: start;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
      }

      .section-heading p {
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

      .section-heading > strong {
        color: #0f766e;
        font-size: 1.35rem;
      }

      .metric-grid,
      .cost-metrics {
        display: grid;
        gap: 0.65rem;
        margin-top: 1rem;
      }

      .metric-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .cost-metrics {
        grid-template-columns: 1fr;
      }

      .metric-grid div,
      .cost-metrics div {
        background: #fff;
        border-radius: 0.7rem;
        display: grid;
        gap: 0.25rem;
        padding: 0.75rem;
      }

      .metric-grid span,
      .cost-metrics span {
        color: #78716c;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .metric-grid b,
      .cost-metrics b {
        color: #292524;
      }

      .cost-section a {
        margin-top: 1rem;
      }

      .comparison-trigger {
        background: #172554;
      }

      .comparison-trigger small,
      .comparison-trigger .trigger-total {
        color: #bfdbfe;
      }

      .comparison-panel {
        display: grid;
        gap: 1rem;
        padding: 1.25rem;
      }

      .comparison-cards,
      .comparison-details {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .comparison-card,
      .comparison-section {
        border: 1px solid #e7e5e4;
        border-radius: 1rem;
        padding: 1.1rem;
      }

      .comparison-card {
        color: #fff;
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
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        margin: 0.45rem 0 1rem;
      }

      .comparison-card dl,
      .group-list {
        display: grid;
        gap: 0.55rem;
        margin: 0;
      }

      .comparison-card dl div,
      .group-list div {
        align-items: center;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
      }

      .comparison-card dt,
      .comparison-card dd,
      .group-list dt,
      .group-list dd {
        margin: 0;
      }

      .comparison-card dd,
      .group-list dd {
        font-weight: 800;
        text-align: right;
      }

      .comparison-card .total-row {
        border-top: 1px solid rgba(255, 255, 255, 0.3);
        font-size: 1.08rem;
        margin-top: 0.25rem;
        padding-top: 0.7rem;
      }

      .time-note {
        background: rgba(255, 255, 255, 0.12);
        border-radius: 0.75rem;
        display: block;
        line-height: 1.45;
        margin-top: 1rem;
        padding: 0.75rem;
      }

      .savings-box {
        align-items: center;
        background: #ecfdf5;
        border: 1px solid #6ee7b7;
        border-radius: 1rem;
        color: #064e3b;
        display: grid;
        gap: 0.3rem;
        padding: 1rem 1.2rem;
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

      .comparison-section {
        background: #fafaf9;
      }

      .comparison-table-wrap {
        margin-top: 1rem;
        overflow-x: auto;
      }

      .comparison-table {
        border-collapse: collapse;
        min-width: 34rem;
        width: 100%;
      }

      .comparison-table th,
      .comparison-table td {
        border-bottom: 1px solid #e7e5e4;
        padding: 0.75rem;
        text-align: right;
      }

      .comparison-table th:first-child,
      .comparison-table td:first-child {
        text-align: left;
      }

      .comparison-table th {
        color: #57534e;
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .comparison-table td {
        color: #292524;
        font-weight: 650;
      }

      .comparison-table .table-total td {
        border-bottom: 0;
        color: #0f766e;
        font-size: 1.05rem;
        font-weight: 900;
      }

      .comparison-table tr.inactive-offer-item {
        opacity: 0.58;
      }

      .optional-label {
        background: #e7e5e4;
        border-radius: 999px;
        color: #57534e;
        display: inline-block;
        font-size: 0.65rem;
        margin-left: 0.4rem;
        padding: 0.15rem 0.4rem;
        text-transform: uppercase;
      }

      .offer-totals {
        display: grid;
        gap: 0.5rem;
        margin: 1rem 0 0 auto;
        max-width: 32rem;
      }

      .offer-totals div {
        align-items: center;
        background: #fff;
        border-radius: 0.65rem;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        padding: 0.7rem 0.8rem;
      }

      .offer-totals dt,
      .offer-totals dd {
        margin: 0;
      }

      .offer-totals dd {
        font-weight: 800;
        text-align: right;
      }

      .offer-totals .offer-grand-total {
        background: #ecfdf5;
        color: #065f46;
        font-size: 1.05rem;
        font-weight: 900;
      }

      .group-list {
        margin-top: 1rem;
      }

      .group-list div {
        background: #fff;
        border-radius: 0.7rem;
        padding: 0.7rem 0.8rem;
      }

      .info-list {
        color: #44403c;
        display: grid;
        gap: 0.55rem;
        line-height: 1.5;
        margin: 1rem 0 0;
        padding-left: 1.2rem;
      }

      .warning-section {
        background: #fffbeb;
        border-color: #fde68a;
      }

      .warning-section .info-list {
        color: #92400e;
      }

      @media (max-width: 900px) {
        .cost-panel,
        .comparison-cards,
        .comparison-details {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 650px) {
        .summary-page {
          max-width: 100%;
          width: 100%;
        }

        .cost-trigger {
          align-items: stretch;
          flex-direction: column;
          gap: 0.8rem;
        }

        .trigger-total {
          justify-content: space-between;
        }

        .metric-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 430px) {
        .metric-grid {
          grid-template-columns: 1fr;
        }

        .section-heading {
          flex-direction: column;
        }
      }
    `
  ]
})
export class SummaryPageComponent {
  private readonly wizardState = inject(WizardStateService);
  private readonly materialListService = inject(MaterialListService);
  private readonly materialListState = inject(MaterialListStateService);
  private readonly costComparisonService = inject(CostComparisonService);
  private readonly localProject = inject(LocalProjectService);
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly router = inject(Router);

  readonly wizardCompleted = this.wizardState.resultsAvailable;
  readonly payload = this.wizardState.payload;
  readonly costOverviewOpen = signal(true);
  readonly comparisonOpen = signal(true);
  readonly roomSaved = signal(false);
  readonly savedExistingRoom = signal(false);
  readonly savedRoomId = signal<string | null>(null);
  readonly editingRoomId = this.localProject.editingRoomId;
  readonly materialList = computed(() =>
    this.materialListService.buildMaterialList(
      this.wizardState.payload(),
      this.materialListState.state()
    )
  );
  readonly costComparison = computed(() =>
    this.costComparisonService.buildCostComparison(
      this.wizardState.payload(),
      this.materialList()
    )
  );

  // Export-Factories: werden erst beim Klick ausgewertet (aktueller Stand).
  readonly buildRoomSummaryDocument = (): ExportDocumentData =>
    this.exportMapper.buildRoomSummaryExportData(
      this.payload(),
      this.materialList(),
      this.costComparison()
    );
  readonly buildProfessionalDocument = (): ExportDocumentData =>
    this.exportMapper.buildProfessionalComparisonExportData(this.costComparison());

  formatNumber(value: number, digits = 2): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  lineItemUnitLabel(value: string): string {
    return {
      pauschal: 'pauschal',
      m2: 'm²',
      lfm: 'lfm',
      piece: 'Stück',
      hour: 'Std.'
    }[value] ?? value;
  }

  saveRoom(): void {
    this.savedExistingRoom.set(this.localProject.getEditingRoomId() !== null);
    const room = this.localProject.saveCurrentRoom(
      this.wizardState.payload(),
      this.materialListState.getState()
    );
    this.savedRoomId.set(room.id);
    this.roomSaved.set(true);
  }

  startAnotherRoom(): void {
    this.localProject.startNewRoom();
    this.materialListState.resetMaterialOverrides();
    void this.router.navigate(['/wizard']);
  }

  openSavedRoomMaterialList(): void {
    const roomId = this.savedRoomId();
    if (!roomId) {
      return;
    }
    this.localProject.loadRoomIntoWizard(roomId);
    this.materialListState.loadStateForRoom(roomId);
    void this.router.navigate(['/materialliste'], {
      queryParams: { roomId }
    });
  }
}
