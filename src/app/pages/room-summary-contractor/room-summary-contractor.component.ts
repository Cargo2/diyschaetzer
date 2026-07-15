import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SummaryAssumptionsComponent } from '../../components/summary-assumptions/summary-assumptions.component';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';
import { ExportDocumentData } from '../../models/export-document.model';
import { CostComparisonService } from '../../services/cost-comparison.service';
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { MaterialListService } from '../../services/material-list.service';
import { MaterialListStateService } from '../../services/material-list-state.service';
import { LocalProjectService } from '../../services/local-project.service';
import { RoomLimitService } from '../../services/room-limit.service';
import { WizardStateService } from '../../services/wizard-state.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Raum-Zusammenfassung für Profis (`contractor`), Route `/zusammenfassung_raum`.
 *
 * Bewusst reduziert gegenüber der Heimwerker-Zusammenfassung (`SummaryPageComponent`):
 * KEIN DIY-vs-Profi-Vergleich, KEINE DIY-Kostenschätzung und KEINE Materialübersicht –
 * nur die Raum-Übersicht (zum Ansehen) plus die Fliesenleger-Leistungspositionen.
 * Der Raum bleibt speicherbar. Die Leistungspositionen stammen aus derselben
 * `CostComparisonService`-Pipeline wie die Heimwerker-Seite (identische Zahlen); die
 * Materialliste wird nur intern als Eingabe berechnet, nicht angezeigt.
 */
@Component({
  selector: 'app-room-summary-contractor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    SummaryAssumptionsComponent,
    PremiumExportButtonComponent,
    TranslatePipe
  ],
  template: `
    @if (wizardCompleted()) {
      <div class="summary-page">
        <div class="summary-top-actions">
          <app-premium-export-button
            [label]="'Fliesenleger-Kalkulation als PDF exportieren' | t"
            hintId="contractor-room-pdf-hint"
            [document]="buildProfessionalDocument"
          />
        </div>
        <app-summary-assumptions
          [showOptions]="false"
          [showAssumptions]="false"
          [showJson]="false"
        />

        <section class="save-room-panel">
          <div class="save-room-info">
            <p>{{ 'Angebot / Projekt' | t }}</p>
            <h2>{{ payload().room.roomName }}</h2>
          </div>
          @if (!roomSaved()) {
            @let newRoomBlocked = !editingRoomId() && roomLimitReached();
            <div class="save-room-controls">
              @if (!editingRoomId()) {
                <label class="offer-picker">
                  <span>{{ 'In welches Angebot speichern?' | t }}</span>
                  <select [ngModel]="targetOfferId()" (ngModelChange)="targetOfferId.set($event)">
                    @for (project of projects(); track project.id) {
                      <option [value]="project.id">{{ project.name }}</option>
                    }
                    <option [value]="NEW_OFFER">{{ '+ Neues Angebot' | t }}</option>
                  </select>
                </label>
                @if (targetOfferId() === NEW_OFFER) {
                  <label class="offer-name">
                    <span>{{ 'Name des neuen Angebots' | t }}</span>
                    <input
                      type="text"
                      [ngModel]="newOfferName()"
                      (ngModelChange)="newOfferName.set($event)"
                      [placeholder]="'Neues Angebot' | t"
                    />
                  </label>
                }
              }
              <button type="button" (click)="saveRoom()" [disabled]="newRoomBlocked">
                {{ editingRoomId() ? ('Änderungen speichern' | t) : ('Raum speichern' | t) }}
              </button>
            </div>
            @if (newRoomBlocked || roomLimitBlocked()) {
              <p class="room-limit-hint" role="alert">
                {{ 'Maximal erreicht:' | t }} {{ roomLimitHint() | t }} {{ 'Bestehende Räume kannst du weiter bearbeiten.' | t }}
              </p>
            }
          } @else {
            <div class="save-success">
              <strong>
                {{
                  savedExistingRoom()
                    ? ('Änderungen wurden gespeichert.' | t)
                    : (('Raum wurde im Angebot „' | t) + savedOfferName() + ('" gespeichert.' | t))
                }}
              </strong>
              <div class="save-actions">
                <button type="button" (click)="startAnotherRoom()" [disabled]="roomLimitReached()">{{ 'Weiteren Raum hinzufügen' | t }}</button>
                <a routerLink="/projekt-dashboard">{{ 'Zum Projekt-Dashboard' | t }}</a>
              </div>
              @if (roomLimitReached()) {
                <p class="room-limit-hint" role="alert">{{ roomLimitHint() | t }}</p>
              }
            </div>
          }
        </section>

        @let comparison = costComparison();
        <section class="offer-section">
          <div class="section-heading">
            <div>
              <p>{{ 'Leistungspositionsmodell' | t }}</p>
              <h2>{{ 'Fliesenleger-Leistungspositionen' | t }}</h2>
            </div>
          </div>
          <div class="comparison-table-wrap">
            <table class="comparison-table">
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
                @for (item of comparison.professional.offer.lineItems; track item.id) {
                  <tr [class.inactive-offer-item]="!item.isActive">
                    <td>
                      {{ item.label }}
                      @if (item.isOptional) {
                        <small class="optional-label">{{ 'optional' | t }}</small>
                      }
                    </td>
                    <td>{{ formatNumber(item.quantity, item.unit === 'piece' ? 0 : 2) }}</td>
                    <td>{{ lineItemUnitLabel(item.unit) }}</td>
                    <td>{{ formatCurrency(item.unitPrice) }}</td>
                    <td>
                      {{
                        item.isActive
                          ? formatCurrency(item.totalPrice)
                          : ('nicht eingerechnet' | t)
                      }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <dl class="offer-totals">
            <div>
              <dt>{{ 'Nettobetrag' | t }}</dt>
              <dd>{{ formatCurrency(comparison.professional.offer.netTotal) }}</dd>
            </div>
            <div>
              <dt>{{ 'Material laut Auswahl' | t }}</dt>
              <dd>{{ formatCurrency(comparison.professional.materialCost) }}</dd>
            </div>
            <div>
              <dt>{{ 'zzgl.' | t }} {{ comparison.professional.offer.vatPercent }} {{ '% MwSt. (Leistung + Material)' | t }}</dt>
              <dd>{{ formatCurrency(comparison.professional.totalCost - comparison.professional.offer.netTotal - comparison.professional.materialCost) }}</dd>
            </div>
            <div class="offer-grand-total">
              <dt>{{ 'Gesamtschätzung Fliesenleger' | t }}</dt>
              <dd>{{ formatCurrency(comparison.professional.totalCost) }}</dd>
            </div>
          </dl>
          @if (!payload().scope.includeTileMaterial) {
            <p class="material-note">{{ 'Ohne Fliesenmaterial kalkuliert.' | t }}</p>
          }
        </section>

        @if (comparison.warnings.length > 0) {
          <section class="offer-section warning-section">
            <div class="section-heading">
              <div>
                <p>{{ 'Bitte beachten' | t }}</p>
                <h2>{{ 'Hinweise und Risiken' | t }}</h2>
              </div>
            </div>
            <ul class="info-list">
              @for (warning of comparison.warnings; track warning) {
                <li>{{ warning | t }}</li>
              }
            </ul>
          </section>
        }
      </div>
    } @else {
      <section class="empty-panel">
        <p>{{ 'Die Zusammenfassung erscheint erst, wenn du den finalen Button im Wizard drückst.' | t }}</p>
        <a routerLink="/raum-anlegen" class="summary-link">{{ 'Raum anlegen' | t }}</a>
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

      .summary-link {
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

      .save-room-controls {
        align-items: flex-end;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .offer-picker,
      .offer-name {
        display: grid;
        gap: 0.3rem;
      }

      .offer-picker span,
      .offer-name span {
        color: #047857;
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .offer-picker select,
      .offer-name input {
        background: #fff;
        border: 1px solid #6ee7b7;
        border-radius: 0.75rem;
        color: #064e3b;
        font: inherit;
        min-height: 2.9rem;
        min-width: 12rem;
        padding: 0.55rem 0.7rem;
      }

      .room-limit-hint {
        color: #9a3412;
        font-size: 0.85rem;
        margin: 0.5rem 0 0;
      }

      .offer-section {
        background: #fafaf9;
        border: 1px solid #e7e5e4;
        border-radius: 1.25rem;
        box-shadow: 0 20px 55px rgba(83, 91, 76, 0.1);
        margin-top: 1rem;
        padding: 1.25rem;
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

      .comparison-table-wrap {
        margin-top: 1rem;
        overflow-x: auto;
      }

      .comparison-table {
        border-collapse: collapse;
        min-width: 32rem;
        width: 100%;
      }

      .comparison-table th,
      .comparison-table td {
        border-bottom: 1px solid #e7e5e4;
        padding: 0.6rem 0.8rem;
        text-align: right;
        vertical-align: top;
      }

      .comparison-table th:not(:first-child),
      .comparison-table td:not(:first-child) {
        white-space: nowrap;
      }

      .comparison-table th:first-child,
      .comparison-table td:first-child {
        text-align: left;
        width: 40%;
      }

      .comparison-table tbody tr:nth-child(even) {
        background: #fff;
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
        max-width: 34rem;
      }

      .offer-totals div {
        align-items: center;
        background: #fff;
        border-radius: 0.65rem;
        display: flex;
        gap: 0.8rem;
        justify-content: space-between;
        padding: 0.7rem 0.8rem;
      }

      .offer-totals dt,
      .offer-totals dd {
        margin: 0;
        min-width: 0;
      }

      .offer-totals dd {
        font-weight: 800;
        text-align: right;
        white-space: nowrap;
      }

      .offer-totals .offer-grand-total {
        background: #ecfdf5;
        color: #065f46;
        font-size: 1.05rem;
        font-weight: 900;
      }

      .material-note {
        color: #78716c;
        font-size: 0.85rem;
        margin: 0.75rem 0 0;
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

      @media (max-width: 1024px) {
        .summary-page {
          max-width: 100%;
          width: 100%;
        }
      }

      @media (max-width: 650px) {
        .summary-page {
          max-width: 100%;
          width: 100%;
        }

        .offer-section {
          padding: 0.85rem;
        }

        .offer-totals {
          gap: 0.4rem;
        }

        .offer-totals div {
          font-size: 0.85rem;
          gap: 0.6rem;
          padding: 0.55rem 0.65rem;
        }

        .offer-totals .offer-grand-total {
          font-size: 0.92rem;
        }
      }

      @media (max-width: 430px) {
        .section-heading {
          flex-direction: column;
        }
      }
    `
  ]
})
export class RoomSummaryContractorComponent {
  private readonly wizardState = inject(WizardStateService);
  private readonly materialListService = inject(MaterialListService);
  private readonly materialListState = inject(MaterialListStateService);
  private readonly costComparisonService = inject(CostComparisonService);
  private readonly localProject = inject(LocalProjectService);
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly router = inject(Router);
  private readonly roomLimit = inject(RoomLimitService);
  private readonly i18n = inject(I18nService);

  readonly roomLimitReached = this.roomLimit.limitReached;
  readonly roomLimitHint = this.roomLimit.hint;
  readonly roomLimitBlocked = signal(false);
  readonly wizardCompleted = this.wizardState.resultsAvailable;
  readonly payload = this.wizardState.payload;
  readonly roomSaved = signal(false);
  readonly savedExistingRoom = signal(false);
  readonly editingRoomId = this.localProject.editingRoomId;
  readonly projects = this.localProject.projects;
  /** Sentinel-Wert im Dropdown für „+ Neues Angebot". */
  readonly NEW_OFFER = '__new__';
  /** Ziel-Angebot (= Projekt) für einen NEUEN Raum; Default = aktives Projekt. */
  readonly targetOfferId = signal<string>(this.localProject.activeProjectId());
  readonly newOfferName = signal<string>('');
  /** Name des Angebots, in das gerade gespeichert wurde (für die Erfolgsmeldung). */
  readonly savedOfferName = signal<string>('');
  // Materialliste wird nur als Eingabe für die Profi-Positionen berechnet, nicht angezeigt.
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

  // Export-Factory: wird erst beim Klick ausgewertet (aktueller Stand).
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

  saveRoom(): void {
    const editing = this.localProject.getEditingRoomId() !== null;
    // Heimwerker-Limit (für Profis Infinity): einen NEUEN Raum nur anlegen,
    // solange die Obergrenze nicht erreicht ist.
    if (!editing && this.roomLimit.limitReached()) {
      this.roomLimitBlocked.set(true);
      return;
    }
    this.roomLimitBlocked.set(false);
    this.savedExistingRoom.set(editing);

    // Wizard-/Materialstand VOR einem evtl. Projektwechsel festhalten.
    const data = this.wizardState.payload();
    const state = this.materialListState.getState();

    if (editing) {
      // Bestehenden Raum in seinem Angebot aktualisieren (kein Verschieben).
      this.localProject.saveCurrentRoom(data, state);
    } else if (this.targetOfferId() === this.NEW_OFFER) {
      // Neues Angebot (Projekt) anlegen – ohne Wizard-Reset – und Raum dort speichern.
      const project = this.localProject.createProject(
        this.newOfferName().trim() || undefined,
        false
      );
      this.localProject.saveCurrentRoom(data, state);
      this.savedOfferName.set(project.name);
    } else {
      // In ein bestehendes Angebot (Projekt) speichern (macht es aktiv).
      this.localProject.switchProject(this.targetOfferId());
      this.localProject.saveCurrentRoom(data, state);
      this.savedOfferName.set(this.localProject.getProject().name);
    }
    this.roomSaved.set(true);
  }

  startAnotherRoom(): void {
    if (this.roomLimit.limitReached()) {
      this.roomLimitBlocked.set(true);
      return;
    }
    this.localProject.startNewRoom();
    this.materialListState.resetMaterialOverrides();
    void this.router.navigate(['/raum-anlegen']);
  }
}
