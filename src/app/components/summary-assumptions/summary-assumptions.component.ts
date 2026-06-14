import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AssumptionValue,
  BathroomAssumptions,
  BathroomWizardData,
  ROOM_TYPE_DEFAULT_NAMES,
  ToiletInstallationType
} from '../../models/bathroom-wizard.model';
import { WizardStateService } from '../../services/wizard-state.service';
import { LocalProjectService } from '../../services/local-project.service';
import {
  WizardFieldKey,
  WizardFieldRelevanceService
} from '../../services/wizard-field-relevance.service';

interface SummaryItem {
  label: string;
  value: string;
  muted?: boolean;
}

interface CalculationAssumptionItem {
  path: string;
  section: string;
  assumption: AssumptionValue<number>;
  max: number;
}

interface AssumptionGroupViewModel {
  label: string;
  items: CalculationAssumptionItem[];
}

@Component({
  selector: 'app-summary-assumptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './summary-assumptions.component.html',
  styleUrl: './summary-assumptions.component.css'
})
export class SummaryAssumptionsComponent {
  private readonly wizardState = inject(WizardStateService);
  private readonly localProject = inject(LocalProjectService);
  private readonly fieldRelevance = inject(WizardFieldRelevanceService);

  readonly showOptions = input(true);
  readonly showAssumptions = input(true);
  readonly showJson = input(true);

  readonly payload = this.wizardState.payload;
  readonly assumptions = this.wizardState.assumptions;
  readonly payloadJson = this.wizardState.payloadJson;
  readonly copyFeedback = signal('');

  readonly summaryItems = computed(() => this.buildSummaryItems(this.payload()));
  readonly preparationItems = computed(() => this.buildPreparationItems(this.payload()));
  readonly scopeItems = computed(() => this.buildScopeItems(this.payload()));
  readonly calculationAssumptionItems = computed(() =>
    this.buildCalculationAssumptionItems(this.payload())
  );
  readonly editableAssumptionGroups = computed(() =>
    this.getRelevantAssumptionGroups(
      this.calculationAssumptionItems().filter(
        (item) =>
          item.section !== 'Profi-Einheitspreise' &&
          item.path !== 'linearMeters.profileLfm' &&
          item.path !== 'counts.profileCount'
      ),
      true
    )
  );
  readonly professionalPriceGroups = computed(() =>
    this.getRelevantAssumptionGroups(
      this.calculationAssumptionItems().filter(
        (item) => item.section === 'Profi-Einheitspreise'
      ),
      true
    )
  );
  readonly showElectricalCard = computed(() => {
    const assumptions = this.assumptions().electrical;
    return (
      assumptions.additionalSocketsCount > 0 ||
      assumptions.mirrorPowerConnectionCount > 0 ||
      assumptions.wallLightConnectionCount > 0 ||
      assumptions.ventilationOpeningCount > 0
    );
  });
  readonly showHeatingCard = computed(() => {
    const assumptions = this.assumptions().heating;
    return assumptions.towelRadiatorCount > 0;
  });

  readonly installationTypeOptions: Array<{
    value: ToiletInstallationType;
    label: string;
  }> = [
    { value: 'pre_wall_element', label: 'Vorwandelement' },
    { value: 'floor_standing', label: 'Standmontage' },
    { value: 'pre_wall_element_with_power', label: 'Vorwandelement mit Strom' },
    { value: 'unknown', label: 'Noch unklar' }
  ];

  async copyJson(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.payloadJson());
      this.copyFeedback.set('JSON wurde in die Zwischenablage kopiert.');
    } catch {
      this.copyFeedback.set('Kopieren war im Browser nicht moglich.');
    }
  }

  updateTilePricePerM2(value: number | string): void {
    this.wizardState.setTilePricePerM2(Number(value));
  }

  updateTileWasteFactorPercent(value: number | string): void {
    this.wizardState.updateCalculationAssumption('wastePercent', Number(value));
  }

  updateCalculationAssumption(path: string, value: number | string): void {
    this.wizardState.updateCalculationAssumption(path, Number(value));
    this.persistEditedRoom();
  }

  resetCalculationAssumption(path: string): void {
    this.wizardState.resetCalculationAssumption(path);
    this.persistEditedRoom();
  }

  resetAllCalculationAssumptions(): void {
    if (globalThis.confirm('Alle manuell geänderten Berechnungsannahmen zurücksetzen?')) {
      this.wizardState.resetAllCalculationAssumptions();
      this.persistEditedRoom();
    }
  }

  assumptionStatus(assumption: AssumptionValue<number>): string {
    if (!assumption.relevant || assumption.source === 'not_relevant') return 'Nicht relevant';
    if (assumption.source === 'user_override') return 'Manuell geändert';
    if (assumption.source === 'wizard') return 'Aus deinen Angaben';
    return 'Geschätzt';
  }

  updateBathtubLengthCm(value: number | string): void {
    this.wizardState.setBathtubLengthCm(Number(value));
  }

  updateBathtubWidthCm(value: number | string): void {
    this.wizardState.setBathtubWidthCm(Number(value));
  }

  updateShowerLengthCm(value: number | string): void {
    this.wizardState.setShowerLengthCm(Number(value));
  }

  updateShowerWidthCm(value: number | string): void {
    this.wizardState.setShowerWidthCm(Number(value));
  }

  updateSinkWidthCm(value: number | string): void {
    this.wizardState.setSinkWidthCm(Number(value));
  }

  updateSinkCount(value: number | string): void {
    this.wizardState.setSinkCount(Number(value));
  }

  updateToiletWidthCm(value: number | string): void {
    this.wizardState.setToiletWidthCm(Number(value));
  }

  updateToiletInstallationType(value: ToiletInstallationType): void {
    this.wizardState.setToiletInstallationType(value);
  }

  updateTowelRadiatorCount(value: number | string): void {
    this.wizardState.setTowelRadiatorCount(Number(value));
  }

  updateElectricalAssumption(
    key: keyof BathroomAssumptions['electrical'],
    value: number | string
  ): void {
    if (key === 'editable') {
      return;
    }

    this.wizardState.setElectricalAssumption(key, Number(value));
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value);
  }

  formatArea(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  private buildCalculationAssumptionItems(data: BathroomWizardData): CalculationAssumptionItem[] {
    const a = data.assumptions;
    const item = (
      path: string,
      section: string,
      assumption: AssumptionValue<number>,
      max = 999
    ): CalculationAssumptionItem => ({ path, section, assumption, max });
    return [
      item('materialPrices.tilePricePerM2', 'Allgemein', a.materialPrices.tilePricePerM2, 500),
      item('wastePercent', 'Allgemein', a.wastePercent, 30),
      ...Object.entries(a.linearMeters).map(([key, value]) =>
        item(`linearMeters.${key}`, 'Laufmeter', value)
      ),
      ...Object.entries(a.counts).map(([key, value]) =>
        item(`counts.${key}`, 'Stückzahlen', value)
      ),
      item('substrate.levelingThicknessMm', 'Untergrund', a.substrate.levelingThicknessMm, 50),
      item('substrate.levelingAreaM2', 'Untergrund', a.substrate.levelingAreaM2, data.areaSummary.floorTileAreaM2 ?? data.areaSummary.floorAreaM2),
      item('substrate.minorRepairAreaM2', 'Untergrund', a.substrate.minorRepairAreaM2, data.areaSummary.floorTileAreaM2 ?? data.areaSummary.floorAreaM2),
      item('areas.waterproofingAreaM2', 'Abdichtung', a.areas.waterproofingAreaM2, Math.max(data.areaSummary.totalTileAreaM2, 20)),
      ...Object.entries(a.professionalPrices).map(([key, value]) =>
        item(
          `professionalPrices.${key}`,
          'Profi-Einheitspreise',
          value,
          key === 'vatPercent' ? 30 : 9999
        )
      )
    ];
  }

  private getRelevantAssumptionGroups(
    items: CalculationAssumptionItem[],
    editableOnly: boolean
  ): AssumptionGroupViewModel[] {
    const labels = ['Allgemein', 'Laufmeter', 'Stückzahlen', 'Untergrund', 'Abdichtung', 'Profi-Einheitspreise'];
    return labels
      .map((label) => ({
        label,
        items: items.filter(({ section, assumption }) =>
          section === label &&
          assumption.relevant &&
          assumption.source !== 'not_relevant' &&
          (!editableOnly || assumption.editable)
        )
      }))
      .filter((group) => group.items.length > 0);
  }

  private persistEditedRoom(): void {
    const roomId = this.localProject.getEditingRoomId();
    if (roomId) {
      this.localProject.updateRoom(roomId, this.wizardState.getWizardData());
    }
  }

  labelForInstallationType(value: ToiletInstallationType): string {
    return (
      this.installationTypeOptions.find((option) => option.value === value)?.label ?? 'Noch unklar'
    );
  }

  private buildSummaryItems(payload: BathroomWizardData): SummaryItem[] {
    const roomType = payload.room?.roomType ?? 'bathroom';
    const isBathroom = roomType === 'bathroom' || roomType === 'guest_wc';
    const items: SummaryItem[] = [
      { label: 'Raum', value: payload.room?.roomName || ROOM_TYPE_DEFAULT_NAMES[roomType] },
      { label: 'Raumtyp', value: ROOM_TYPE_DEFAULT_NAMES[roomType] },
      { label: 'Bereich', value: payload.room?.isOutdoor ? 'Außenbereich' : 'Innenbereich' },
      { label: 'Raumgröße', value: `${this.formatNumber(payload.bathroomSizeM2)} m²` },
      { label: 'Fliesenbereich', value: this.tilingLabel(payload.tilingScope) },
      { label: 'Fliesenqualität', value: this.tileQualityLabel(payload.tileQuality) },
      { label: 'Boden-Fliesengröße', value: this.tileSizeLabel(payload.floorTileSize) },
      { label: 'Wand-Fliesengröße', value: this.tileSizeLabel(payload.wallTileSize) },
    ];

    if (isBathroom) {
      items.splice(4, 0,
        { label: 'Waschplatz', value: this.sinkLabel(payload.sinkOption) },
        { label: 'Unterschrank', value: this.vanityLabel(payload.vanityCabinet) },
        { label: 'Dusche / Badewanne', value: this.showerBathLabel(payload.showerBathOption) },
        { label: 'Dusche', value: this.showerLabel(payload.showerType) },
        { label: 'Badewanne', value: this.bathtubLabel(payload.bathtubType) },
        { label: 'Heizung', value: this.heatingLabel(payload.heatingOption) },
        { label: 'WC', value: this.toiletLabel(payload.toiletOption) },
        { label: 'Extras', value: this.extrasLabel(payload) }
      );
    }

    return items;
  }

  private buildPreparationItems(payload: BathroomWizardData): SummaryItem[] {
    const preparation = payload.preparation;

    return [
      this.relevantItem(
        'existing_covering',
        payload,
        'Alter Belag vorhanden',
        this.workStatusLabel(preparation.existingCovering.status),
        preparation.existingCovering.status === 'unknown'
      ),
      this.relevantItem(
        'existing_covering_removal',
        payload,
        'Rückbau alter Beläge',
        this.workStatusLabel(preparation.existingCovering.removeRequired),
        preparation.existingCovering.removeRequired === 'unknown'
      ),
      this.relevantItem(
        'old_sanitary_removal',
        payload,
        'Alte Sanitärobjekte entfernen',
        this.workStatusLabel(preparation.oldSanitaryObjects.removeRequired),
        preparation.oldSanitaryObjects.removeRequired === 'unknown'
      ),
      this.relevantItem(
        'substrate_condition',
        payload,
        'Vorhandener Untergrund geeignet',
        this.substrateConditionLabel(preparation.substrate.condition),
        preparation.substrate.condition === 'unknown'
      ),
      { label: 'Kleine Ausbesserungen', value: this.booleanLabel(preparation.substrate.condition === 'minor_repairs_needed') },
      { label: 'Ausgleichsmasse', value: this.booleanLabel(preparation.substrate.condition === 'leveling_compound_needed') },
      this.relevantItem(
        'substrate_leveling',
        payload,
        'Ausgleich / Nivellierung',
        this.workStatusLabel(preparation.substrate.levelingRequired),
        preparation.substrate.levelingRequired === 'unknown'
      ),
      this.relevantItem(
        'primer',
        payload,
        'Grundierung',
        this.workStatusLabel(preparation.substrate.primerRequired),
        preparation.substrate.primerRequired === 'unknown'
      ),
      this.relevantItem(
        'waterproofing',
        payload,
        'Abdichtung',
        this.workStatusLabel(preparation.waterproofing.required),
        preparation.waterproofing.required === 'unknown'
      ),
      this.relevantItem(
        'disposal',
        payload,
        'Entsorgung alter Fliesen/Beläge',
        this.workStatusLabel(preparation.disposal.required),
        preparation.disposal.required === 'unknown'
      )
    ];
  }

  private buildScopeItems(payload: BathroomWizardData): SummaryItem[] {
    const scope = payload.scope;

    return [
      { label: 'Fliesenmaterial enthalten', value: this.booleanLabel(scope.includeTileMaterial) },
      { label: 'Verlegematerial enthalten', value: this.booleanLabel(scope.includeInstallationMaterials) },
      this.relevantItem(
        'waterproofing',
        payload,
        'Abdichtung enthalten',
        this.booleanLabel(scope.includeWaterproofing),
        false
      ),
      { label: 'Fliesensockel enthalten', value: this.booleanLabel(scope.includeBaseboards) },
      { label: 'Werkzeug/Zubehör enthalten', value: this.booleanLabel(scope.includeTools) },
      this.relevantItem(
        'disposal',
        payload,
        'Entsorgung enthalten',
        this.booleanLabel(scope.includeDisposal),
        false
      ),
      { label: 'Untergrundausgleich enthalten', value: this.booleanLabel(scope.includeLevelingWork) }
    ];
  }

  booleanLabel(value: boolean): string {
    return value ? 'Ja' : 'Nein';
  }

  workStatusLabel(value: string): string {
    switch (value) {
      case 'yes':
        return 'Ja';
      case 'no':
        return 'Nein';
      case 'not_applicable':
        return 'Nicht relevant';
      default:
        return 'Noch unklar';
    }
  }

  substrateConditionLabel(value: string): string {
    switch (value) {
      case 'stable_even':
        return 'Eben und tragfähig';
      case 'minor_repairs_needed':
        return 'Kleine Ausbesserungen / Spachtelarbeiten nötig';
      case 'leveling_compound_needed':
        return 'Stärkere Unebenheiten, Ausgleichsmasse nötig';
      default:
        return 'Noch unklar';
    }
  }

  sinkLabel(value: BathroomWizardData['sinkOption']): string {
    switch (value) {
      case 'single_vanity':
        return 'Einzelwaschtisch';
      case 'double_vanity':
        return 'Doppelwaschtisch';
      case 'two_separate_sinks':
        return 'Zwei separate Waschbecken';
      case 'no_sink':
        return 'Kein Waschbecken';
      default:
        return 'Noch nicht ausgewählt';
    }
  }

  vanityLabel(value: BathroomWizardData['vanityCabinet']): string {
    switch (value) {
      case 'yes':
        return 'Ja';
      case 'no':
        return 'Nein';
      case 'unknown':
        return 'Noch unklar';
      default:
        return 'Nicht relevant';
    }
  }

  showerBathLabel(value: BathroomWizardData['showerBathOption']): string {
    switch (value) {
      case 'shower_only':
        return 'Nur Dusche';
      case 'bathtub_only':
        return 'Nur Badewanne';
      case 'shower_and_bathtub':
        return 'Dusche und Badewanne';
      case 'shower_bathtub_combination':
        return 'Duschbadewanne';
      case 'none':
        return 'Weder Dusche noch Badewanne';
      default:
        return 'Noch nicht ausgewählt';
    }
  }

  showerLabel(value: BathroomWizardData['showerType']): string {
    switch (value) {
      case 'standard_cabin':
        return 'Standard-Duschkabine';
      case 'floor_level':
        return 'Bodengleiche Dusche';
      case 'walk_in':
        return 'Walk-in-Dusche';
      case 'unknown':
        return 'Noch unklar';
      default:
        return 'Nicht relevant';
    }
  }

  bathtubLabel(value: BathroomWizardData['bathtubType']): string {
    switch (value) {
      case 'standard':
        return 'Standard-Badewanne';
      case 'freestanding':
        return 'Freistehende Badewanne';
      case 'corner':
        return 'Eckbadewanne';
      case 'unknown':
        return 'Noch unklar';
      default:
        return 'Nicht relevant';
    }
  }

  heatingLabel(value: BathroomWizardData['heatingOption']): string {
    switch (value) {
      case 'floor_heating':
        return 'Nur Fußbodenheizung';
      case 'towel_radiator':
        return 'Nur Handtuchheizkorper';
      case 'floor_heating_and_towel_radiator':
        return 'Fußbodenheizung und Handtuchheizkörper';
      case 'none':
        return 'Keine neue Heizung';
      case 'unknown':
        return 'Noch unklar';
      default:
        return 'Noch nicht ausgewählt';
    }
  }

  toiletLabel(value: BathroomWizardData['toiletOption']): string {
    switch (value) {
      case 'wall_hung':
        return 'Wand-WC';
      case 'floor_standing':
        return 'Stand-WC';
      case 'shower_toilet':
        return 'Dusch-WC';
      case 'none':
        return 'Kein WC';
      case 'unknown':
        return 'Noch unklar';
      default:
        return 'Noch nicht ausgewählt';
    }
  }

  tilingLabel(value: BathroomWizardData['tilingScope']): string {
    switch (value) {
      case 'floor_only':
        return 'Nur Boden';
      case 'floor_and_partial_walls':
        return 'Boden und Wände teilweise';
      case 'floor_and_full_walls':
        return 'Boden und Wände vollständig';
      case 'specific_areas':
        return 'Nur bestimmte Bereiche';
      case 'unknown':
        return 'Noch unklar';
      default:
        return 'Noch nicht ausgewählt';
    }
  }

  tileQualityLabel(value: BathroomWizardData['tileQuality']): string {
    switch (value) {
      case 'budget':
        return 'Einfach / günstig';
      case 'medium':
        return 'Mittel';
      case 'high':
        return 'Hochwertig';
      case 'premium':
        return 'Premium';
      case 'unknown':
        return 'Noch unklar';
      default:
        return 'Noch nicht ausgewählt';
    }
  }

  tileSizeLabel(value: BathroomWizardData['floorTileSize']): string {
    switch (value) {
      case '30x30_cm':
        return '30 x 30 cm';
      case '60x60_cm':
        return '60 x 60 cm';
      case '30x60_cm':
        return '30 x 60 cm';
      case '60x120_cm':
        return '60 x 120 cm';
      case '120x120_cm':
        return '120 x 120 cm';
      case 'mosaic':
        return 'Mosaik';
      case 'unknown':
        return 'Noch unklar';
      default:
        return 'Nicht relevant';
    }
  }

  extrasLabel(payload: BathroomWizardData): string {
    if (payload.extrasSelection === 'none') {
      return 'Keine zusätzliche Ausstattung';
    }

    if (payload.extrasSelection === 'unknown') {
      return 'Noch unklar';
    }

    const items: string[] = [];

    if (payload.extras.newLighting) {
      items.push('Neue Beleuchtung');
    }

    if (payload.extras.mirrorCabinetWithLight) {
      items.push('Spiegelschrank mit Licht');
    }

    if (payload.extras.additionalSockets) {
      items.push('Zusätzliche Steckdosen');
    }

    if (payload.extras.ventilation) {
      items.push('Lüfter / Abluft');
    }

    if (payload.extras.smartHome) {
      items.push('Elektro & Anschlüsse im Fliesenbereich');
    }

    return items.length > 0 ? items.join(', ') : 'Keine Auswahl';
  }

  private relevantItem(
    fieldKey: WizardFieldKey,
    payload: BathroomWizardData,
    label: string,
    value: string,
    unknown: boolean
  ): SummaryItem {
    const display = this.fieldRelevance.getFieldDisplayState(
      fieldKey,
      payload,
      label,
      value,
      unknown
    );
    return {
      label: display.label,
      value: display.valueLabel,
      muted: display.muted
    };
  }
}
