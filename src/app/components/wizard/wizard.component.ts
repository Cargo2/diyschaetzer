import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  BathroomExtras,
  BathroomWall,
  BathtubType,
  ExistingCoveringLocation,
  ExtrasSelection,
  HeatingOption,
  RoomType,
  ScopeData,
  ShowerBathOption,
  ShowerType,
  SinkOption,
  SubstrateCondition,
  TileQuality,
  TileSize,
  TilingScope,
  ToiletOption,
  VanityCabinetOption,
  WallOpening,
  WallOpeningType,
  WorkStatus
} from '../../models/bathroom-wizard.model';
import { WizardStateService } from '../../services/wizard-state.service';
import { SummaryAssumptionsComponent } from '../summary-assumptions/summary-assumptions.component';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

type StepId =
  | 'project-type'
  | 'bathroom-size'
  | 'sink'
  | 'shower-bath'
  | 'heating'
  | 'toilet'
  | 'tiling'
  | 'walls'
  | 'preparation'
  | 'scope'
  | 'extras'
  | 'summary';

interface CardOption<T extends string> {
  value: T;
  title: string;
  description: string;
}

interface WizardStep {
  id: StepId;
  eyebrow: string;
  title: string;
  description: string;
}

/**
 * Datengetriebene Wizard-Config als Modul-Konstanten (statt Klassen-Properties):
 * ermöglicht die statische Erfassung der `title`/`description`/`eyebrow`-Felder
 * als Übersetzungs-Keys über `DYNAMIC_SOURCES` in `i18n-coverage.spec.ts`. Die
 * deutschen Texte sind UNVERÄNDERT die Werte – sie sind zugleich der Key
 * (Deutsch-als-Schlüssel, siehe `I18nService`). `value`/`key`-Felder bleiben
 * unangetastet (persistierte Enums, keine Übersetzungs-Keys).
 */
export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'project-type',
    eyebrow: 'Schritt 1 von 12',
    title: 'Welchen Raum oder Bereich möchtest du fliesen?',
    description: 'Wähle den Raumtyp und vergib einen eindeutigen Namen für diese Kalkulation.'
  },
  {
    id: 'bathroom-size',
    eyebrow: 'Schritt 2 von 12',
    title: 'Wie groß ist der Raum oder Bereich?',
    description: 'Nutze den Slider für eine erste Grobplanung zwischen 1,0 und 100,0 m².'
  },
  {
    id: 'sink',
    eyebrow: 'Schritt 3 von 12',
    title: 'Welche Waschplatz-Lösung möchtest du?',
    description: 'Wähle die passende Lösung für den Waschbereich.'
  },
  {
    id: 'shower-bath',
    eyebrow: 'Schritt 4 von 12',
    title: 'Was soll eingebaut werden?',
    description: 'Definiere, ob Dusche, Badewanne oder eine Kombination geplant ist.'
  },
  {
    id: 'heating',
    eyebrow: 'Schritt 5 von 12',
    title: 'Welche Heizlösung möchtest du?',
    description: 'Wähle die gewünschte Heizoption für den neuen Badkomfort.'
  },
  {
    id: 'toilet',
    eyebrow: 'Schritt 6 von 12',
    title: 'Soll ein WC eingeplant werden?',
    description: 'Lege fest, welche WC-Variante in die Planung gehort.'
  },
  {
    id: 'tiling',
    eyebrow: 'Schritt 7 von 12',
    title: 'Welche Bereiche sollen gefliest werden?',
    description: 'Erfasse Fliesenumfang und die ungefähr gewünschte Materialqualität.'
  },
  {
    id: 'walls',
    eyebrow: 'Schritt 8 von 12',
    title: 'Wandflaechen erfassen',
    description:
      'Fuege hier die Waende oder Teilbereiche hinzu, die gefliest werden sollen. Du kannst jede Wand einzeln benennen und die Masse anpassen.'
  },
  {
    id: 'preparation',
    eyebrow: 'Schritt 9 von 12',
    title: 'Vorarbeiten & Untergrund',
    description: 'Kläre Rückbau, vorhandenen Untergrund, Grundierung, Abdichtung und Entsorgung.'
  },
  {
    id: 'scope',
    eyebrow: 'Schritt 10 von 12',
    title: 'Leistungsumfang & Ausschlüsse',
    description: 'Lege fest, welche Positionen in der späteren Schätzung enthalten sein sollen.'
  },
  {
    id: 'extras',
    eyebrow: 'Schritt 11 von 12',
    title: 'Welche zusätzliche Ausstattung soll berücksichtigt werden?',
    description: 'Wähle einzelne Extras aus oder markiere den Bereich als offen.'
  },
  {
    id: 'summary',
    eyebrow: 'Schritt 12 von 12',
    title: 'Zusammenfassung und Annahmen',
    description: 'Prüfe alle Angaben und öffne anschließend die JSON-Ausgabe im Menü.'
  }
];

export const ROOM_TYPE_OPTIONS: CardOption<RoomType>[] = [
  { value: 'bathroom', title: 'Bad', description: 'Bad mit optionalen Sanitär- und Nassbereichsfragen.' },
  { value: 'guest_wc', title: 'Gäste-WC', description: 'Kompakter Sanitärraum mit passenden Zusatzfragen.' },
  { value: 'kitchen', title: 'Küche', description: 'Boden und optionaler Fliesenspiegel oder Wandbereich.' },
  { value: 'hallway', title: 'Flur', description: 'Robuste Bodenfläche mit optionalen Sockeln.' },
  { value: 'living_area', title: 'Wohnraum', description: 'Wohnbereich mit Boden- und optionalen Wandfliesen.' },
  { value: 'basement', title: 'Keller', description: 'Kellerfläche mit Fokus auf Untergrund und Boden.' },
  { value: 'utility_room', title: 'Hauswirtschaftsraum', description: 'Nutzraum mit Boden- und optionalen Wandflächen.' },
  { value: 'terrace_balcony', title: 'Terrasse / Balkon', description: 'Außenbereich mit Frost-, Gefälle- und Entwässerungshinweisen.' },
  { value: 'other', title: 'Anderer Raum', description: 'Freie Raumbezeichnung mit allgemeiner Fliesenplanung.' }
];

export const SINK_OPTIONS: CardOption<SinkOption>[] = [
  {
    value: 'single_vanity',
    title: 'Einzelwaschtisch',
    description: 'Klassische Lösung für kompakte oder mittelgroße Bäder.'
  },
  {
    value: 'double_vanity',
    title: 'Doppelwaschtisch',
    description: 'Gemeinsamer Waschplatz mit zwei Armaturen an einem Möbel.'
  },
  {
    value: 'two_separate_sinks',
    title: 'Zwei separate Waschbecken',
    description: 'Getrennte Waschplätze für mehr Flexibilität in der Raumaufteilung.'
  },
  {
    value: 'no_sink',
    title: 'Kein Waschbecken',
    description: 'Falls kein Waschplatz vorgesehen ist oder später entschieden wird.'
  }
];

export const VANITY_CABINET_OPTIONS: CardOption<VanityCabinetOption>[] = [
  {
    value: 'yes',
    title: 'Ja',
    description: 'Ein Unterschrank soll direkt mitgedacht werden.'
  },
  {
    value: 'no',
    title: 'Nein',
    description: 'Der Waschplatz wird ohne Unterschrank geplant.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Die Entscheidung soll erst in einer späteren Phase fallen.'
  }
];

export const SHOWER_BATH_OPTIONS: CardOption<ShowerBathOption>[] = [
  {
    value: 'shower_only',
    title: 'Nur Dusche',
    description: 'Fokus auf eine reine Duschlösung.'
  },
  {
    value: 'bathtub_only',
    title: 'Nur Badewanne',
    description: 'Es wird ausschliesslich eine Badewanne eingeplant.'
  },
  {
    value: 'shower_and_bathtub',
    title: 'Dusche und Badewanne',
    description: 'Beide Elemente sind separat vorgesehen.'
  },
  {
    value: 'shower_bathtub_combination',
    title: 'Duschbadewanne',
    description: 'Eine kombinierte Lösung für kompaktere Grundrisse.'
  },
  {
    value: 'none',
    title: 'Weder Dusche noch Badewanne',
    description: 'Für Sonderfälle wie ein reines WC oder Gästebad.'
  }
];

export const SHOWER_TYPE_OPTIONS: CardOption<ShowerType>[] = [
  {
    value: 'standard_cabin',
    title: 'Standard-Duschkabine',
    description: 'Klassische Kabine mit klarer Trennung zum restlichen Raum.'
  },
  {
    value: 'floor_level',
    title: 'Bodengleiche Dusche',
    description: 'Barrierearme Lösung mit flachem Einstieg.'
  },
  {
    value: 'walk_in',
    title: 'Walk-in-Dusche',
    description: 'Offene, moderne Dusche mit großzügigem Einstieg.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Die Duschart ist für den MVP noch offen.'
  }
];

export const BATHTUB_TYPE_OPTIONS: CardOption<BathtubType>[] = [
  {
    value: 'standard',
    title: 'Standard-Badewanne',
    description: 'Die klassische Einbaulösung für viele Grundrisse.'
  },
  {
    value: 'freestanding',
    title: 'Freistehende Badewanne',
    description: 'Designorientierte Variante mit hoher Raumwirkung.'
  },
  {
    value: 'corner',
    title: 'Eckbadewanne',
    description: 'Spezielle Form zur Raumnutzung in Ecken.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Die genaue Wannenart ist noch nicht festgelegt.'
  }
];

export const HEATING_OPTIONS: CardOption<HeatingOption>[] = [
  {
    value: 'floor_heating',
    title: 'Nur Fußbodenheizung',
    description: 'Flächenwärme für hohen Komfort und freie Wandflächen.'
  },
  {
    value: 'towel_radiator',
    title: 'Nur Handtuchheizkörper',
    description: 'Kompakte Zusatzheizung mit Platz für Handtücher.'
  },
  {
    value: 'floor_heating_and_towel_radiator',
    title: 'Fußbodenheizung und Handtuchheizkörper',
    description: 'Die MVP-Variante für die Kombination beider Systeme.'
  },
  {
    value: 'none',
    title: 'Keine neue Heizung',
    description: 'Die vorhandene Heizsituation bleibt unberuhrt.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Die Heizungsfrage wird später entschieden.'
  }
];

export const TOILET_OPTIONS: CardOption<ToiletOption>[] = [
  {
    value: 'wall_hung',
    title: 'Wand-WC',
    description: 'Moderne, pflegeleichte Lösung mit Unterputztechnik.'
  },
  {
    value: 'floor_standing',
    title: 'Stand-WC',
    description: 'Klassische Aufstellung direkt auf dem Boden.'
  },
  {
    value: 'shower_toilet',
    title: 'Dusch-WC',
    description: 'Komfortoption mit integrierter Reinigungsfunktion.'
  },
  {
    value: 'none',
    title: 'Kein WC',
    description: 'Für Badkonzepte ohne Toilette im Raum.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Die Entscheidung zur WC-Art ist noch offen.'
  }
];

export const TILING_OPTIONS: CardOption<TilingScope>[] = [
  {
    value: 'floor_only',
    title: 'Nur Boden',
    description: 'Es wird ausschließlich der Fußboden gefliest.'
  },
  {
    value: 'floor_and_partial_walls',
    title: 'Boden und Wände teilweise',
    description: 'Typische Lösung mit Teilverfliesung an ausgewählten Flächen.'
  },
  {
    value: 'floor_and_full_walls',
    title: 'Boden und Wände vollständig',
    description: 'Umfassende Verfliesung für ein homogenes Erscheinungsbild.'
  },
  {
    value: 'specific_areas',
    title: 'Nur bestimmte Bereiche',
    description: 'Zum Beispiel nur in der Dusche oder an einzelnen Zonen.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Der Fliesenumfang wird später festgelegt.'
  }
];

export const TILE_QUALITY_OPTIONS: CardOption<TileQuality>[] = [
  {
    value: 'budget',
    title: 'Einfach / günstig',
    description: 'Preisbewusste Auswahl mit funktionalem Anspruch.'
  },
  {
    value: 'medium',
    title: 'Mittel',
    description: 'Ausgewogene Wahl aus Preis und Qualität.'
  },
  {
    value: 'high',
    title: 'Hochwertig',
    description: 'Deutlich höhere Material- und Oberflächenanmutung.'
  },
  {
    value: 'premium',
    title: 'Premium',
    description: 'Anspruchsvolle Design- und Materialqualität.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Die genaue Fliesenqualität ist noch offen.'
  }
];

export const TILE_SIZE_OPTIONS: CardOption<TileSize>[] = [
  {
    value: '30x30_cm',
    title: '30 x 30 cm',
    description: 'Kompaktes Format für kleinere Flächen oder klassische Raster.'
  },
  {
    value: '60x60_cm',
    title: '60 x 60 cm',
    description: 'Modernes Standardformat mit ruhigem Fugenbild.'
  },
  {
    value: '30x60_cm',
    title: '30 x 60 cm',
    description: 'Rechteckiges Format für flexible Verlegemuster.'
  },
  {
    value: '60x120_cm',
    title: '60 x 120 cm',
    description: 'Großformatig für wenige Fugen und eine ruhige Fläche.'
  },
  {
    value: '120x120_cm',
    title: '120 x 120 cm',
    description: 'Quadratisches Großformat mit 1,44 m² Fläche pro Fliese.'
  },
  {
    value: 'mosaic',
    title: 'Mosaik',
    description: 'Kleine Fliesen für Akzente, Nischen oder besondere Bereiche.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Die genaue Fliesengröße wird später entschieden.'
  }
];

export const EXTRAS_SELECTION_OPTIONS: CardOption<ExtrasSelection>[] = [
  {
    value: 'selected',
    title: 'Extras auswählen',
    description: 'Einzelne Zusatzoptionen werden jetzt aktiv markiert.'
  },
  {
    value: 'none',
    title: 'Keine zusätzliche Ausstattung',
    description: 'Es sollen keine weiteren Extras aufgenommen werden.'
  },
  {
    value: 'unknown',
    title: 'Noch unklar',
    description: 'Zusatzwünsche sind für den MVP noch offen.'
  }
];

export const EXTRA_OPTIONS: CardOption<keyof BathroomExtras>[] = [
  {
    value: 'newLighting',
    title: 'Neue Beleuchtung',
    description: 'Neue Decken-, Wand- oder Akzentbeleuchtung.'
  },
  {
    value: 'mirrorCabinetWithLight',
    title: 'Spiegelschrank mit Licht',
    description: 'Stauraum mit integrierter Beleuchtung.'
  },
  {
    value: 'additionalSockets',
    title: 'Zusätzliche Steckdosen',
    description: 'Mehr Anschlussmöglichkeiten am Waschplatz oder im Raum.'
  },
  {
    value: 'ventilation',
    title: 'Lüfter / Abluft',
    description: 'Mechanische Entlüftung für Feuchte und Geruch.'
  },
  {
    value: 'smartHome',
    title: 'Elektro & Anschlüsse im Fliesenbereich',
    description: 'Zusätzliche Elektro-Anschlusspunkte für die weitere Detailplanung.'
  }
];

export const EXISTING_COVERING_OPTIONS: CardOption<ExistingCoveringLocation>[] = [
  { value: 'existing_floor', title: 'Ja, am Boden', description: 'Ein alter Bodenbelag ist vorhanden.' },
  { value: 'existing_walls', title: 'Ja, an den Wänden', description: 'Alte Wandbeläge sind vorhanden.' },
  { value: 'existing_floor_and_walls', title: 'Ja, Boden und Wände', description: 'Boden und Wände haben alte Beläge.' },
  { value: 'none', title: 'Nein', description: 'Es ist kein alter Belag vorhanden.' },
  { value: 'unknown', title: 'Unklar', description: 'Der Bestand muss noch geprüft werden.' }
];

export const WORK_STATUS_OPTIONS: CardOption<WorkStatus>[] = [
  { value: 'yes', title: 'Ja', description: 'Die Position soll berücksichtigt werden.' },
  { value: 'no', title: 'Nein', description: 'Die Position wird nicht berücksichtigt.' },
  { value: 'unknown', title: 'Unklar', description: 'Die Entscheidung bleibt als offener Punkt sichtbar.' }
];

export const SUBSTRATE_OPTIONS: CardOption<SubstrateCondition>[] = [
  { value: 'stable_even', title: 'Ja, eben und tragfähig', description: 'Der vorhandene Untergrund ist für das Fliesenlegen geeignet.' },
  { value: 'minor_repairs_needed', title: 'Kleine Ausbesserungen / Spachtelarbeiten nötig', description: 'Kleine Reparaturen werden als fliesenrelevante Vorarbeit berücksichtigt.' },
  { value: 'leveling_compound_needed', title: 'Stärkere Unebenheiten, Ausgleichsmasse nötig', description: 'Ausgleichsmasse wird als fliesenrelevante Vorarbeit berücksichtigt.' },
  { value: 'unknown', title: 'Unklar', description: 'Der vorhandene Untergrund muss vor der Fliesenverlegung geprüft werden.' }
];

export const SCOPE_OPTIONS: Array<{ key: keyof ScopeData; title: string; description: string }> = [
  { key: 'includeTileMaterial', title: 'Fliesenmaterial einbeziehen', description: 'Fliesen bleiben Teil der Schätzung.' },
  { key: 'includeInstallationMaterials', title: 'Verlegematerial einbeziehen', description: 'Kleber, Fuge und ähnliche Materialien bleiben enthalten.' },
  { key: 'includeWaterproofing', title: 'Abdichtung einbeziehen', description: 'Abdichtmaterialien werden berücksichtigt.' },
  { key: 'includeBaseboards', title: 'Fliesensockel einbeziehen', description: 'Sockelfliesen werden aufgenommen.' },
  { key: 'includeTools', title: 'Werkzeug / Zubehör einbeziehen', description: 'Werkzeug und Zubehör bleiben enthalten.' },
  { key: 'includeDisposal', title: 'Entsorgung einbeziehen', description: 'Entsorgung wird berücksichtigt.' },
  { key: 'includeLevelingWork', title: 'Untergrundausgleich einbeziehen', description: 'Ausgleichsarbeiten werden berücksichtigt.' }
];

@Component({
  selector: 'app-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, SummaryAssumptionsComponent, TranslatePipe],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.css'
})
export class WizardComponent {
  private readonly wizardState = inject(WizardStateService);
  private readonly i18n = inject(I18nService);

  @Output() readonly progressChanged = new EventEmitter<{
    current: number;
    total: number;
    percent: number;
  }>();
  @Output() readonly completed = new EventEmitter<void>();

  readonly currentStepIndex = this.wizardState.currentStepIndex;
  readonly showValidation = signal(false);
  readonly formState = this.wizardState.formState;

  readonly steps: WizardStep[] = WIZARD_STEPS;
  readonly roomTypeOptions: CardOption<RoomType>[] = ROOM_TYPE_OPTIONS;
  readonly sinkOptions: CardOption<SinkOption>[] = SINK_OPTIONS;
  readonly vanityCabinetOptions: CardOption<VanityCabinetOption>[] = VANITY_CABINET_OPTIONS;
  readonly showerBathOptions: CardOption<ShowerBathOption>[] = SHOWER_BATH_OPTIONS;
  readonly showerTypeOptions: CardOption<ShowerType>[] = SHOWER_TYPE_OPTIONS;
  readonly bathtubTypeOptions: CardOption<BathtubType>[] = BATHTUB_TYPE_OPTIONS;
  readonly heatingOptions: CardOption<HeatingOption>[] = HEATING_OPTIONS;
  readonly toiletOptions: CardOption<ToiletOption>[] = TOILET_OPTIONS;
  readonly tilingOptions: CardOption<TilingScope>[] = TILING_OPTIONS;
  readonly tileQualityOptions: CardOption<TileQuality>[] = TILE_QUALITY_OPTIONS;
  readonly tileSizeOptions: CardOption<TileSize>[] = TILE_SIZE_OPTIONS;
  readonly extrasSelectionOptions: CardOption<ExtrasSelection>[] = EXTRAS_SELECTION_OPTIONS;
  readonly extraOptions: CardOption<keyof BathroomExtras>[] = EXTRA_OPTIONS;
  readonly existingCoveringOptions: CardOption<ExistingCoveringLocation>[] = EXISTING_COVERING_OPTIONS;
  readonly workStatusOptions: CardOption<WorkStatus>[] = WORK_STATUS_OPTIONS;
  readonly substrateOptions: CardOption<SubstrateCondition>[] = SUBSTRATE_OPTIONS;
  readonly scopeOptions: Array<{ key: keyof ScopeData; title: string; description: string }> = SCOPE_OPTIONS;

  readonly progressPercent = computed(
    () => ((this.currentStepIndex() + 1) / this.steps.length) * 100
  );
  readonly currentStep = computed(() => this.steps[this.currentStepIndex()]);

  nextStep(): void {
    if (!this.isCurrentStepValid()) {
      this.showValidation.set(true);
      return;
    }

    const nextIndex =
      this.currentStep().id === 'tiling' && this.formState().tilingScope === 'floor_only'
        ? this.stepIndexAfter('walls')
        : this.nextVisibleStepIndex(this.currentStepIndex());

    if (nextIndex < this.steps.length) {
      this.wizardState.setCurrentStepIndex(nextIndex);
      if (nextIndex === this.steps.length - 1 && this.isCurrentStepValid()) {
        this.wizardState.markWizardCompleted();
      }
      this.showValidation.set(false);
      this.emitProgress();
      return;
    }

    this.wizardState.markWizardCompleted();
    this.completed.emit();
  }

  previousStep(): void {
    if (this.currentStepIndex() > 0) {
      this.wizardState.setCurrentStepIndex(this.previousVisibleStepIndex(this.currentStepIndex()));
      this.showValidation.set(false);
      this.emitProgress();
    }
  }

  selectRoomType(value: RoomType): void {
    this.wizardState.setRoomType(value);
  }

  updateRoomName(value: string): void {
    this.wizardState.setRoomName(value);
  }

  toggleRoomOutdoor(value: boolean): void {
    this.wizardState.setRoomOutdoor(value);
  }

  isOtherRoomType(): boolean {
    return this.formState().room.roomType === 'other';
  }

  updateBathroomSize(value: number | string): void {
    this.wizardState.setBathroomSizeM2(Number(value));
  }

  selectSinkOption(value: SinkOption): void {
    this.wizardState.setSinkOption(value);
  }

  selectVanityCabinet(value: VanityCabinetOption): void {
    this.wizardState.setVanityCabinet(value);
  }

  selectShowerBathOption(value: ShowerBathOption): void {
    this.wizardState.setShowerBathOption(value);
  }

  selectShowerType(value: ShowerType): void {
    this.wizardState.setShowerType(value);
  }

  selectBathtubType(value: BathtubType): void {
    this.wizardState.setBathtubType(value);
  }

  selectHeatingOption(value: HeatingOption): void {
    this.wizardState.setHeatingOption(value);
  }

  selectToiletOption(value: ToiletOption): void {
    this.wizardState.setToiletOption(value);
  }

  selectTilingScope(value: TilingScope): void {
    this.wizardState.setTilingScope(value);
  }

  addWall(): void {
    this.wizardState.addWall();
  }

  updateWall(
    wallId: string,
    field: keyof Pick<BathroomWall, 'name' | 'widthM' | 'heightM' | 'tileHeightM'>,
    value: string | number
  ): void {
    this.wizardState.updateWall(wallId, field, value);
  }

  removeWall(wallId: string): void {
    this.wizardState.removeWall(wallId);
  }

  addOpening(wallId: string): void {
    this.wizardState.addOpening(wallId);
  }

  updateOpening(
    wallId: string,
    openingId: string,
    field: keyof Pick<WallOpening, 'type' | 'widthM' | 'heightM'>,
    value: string | number
  ): void {
    this.wizardState.updateOpening(wallId, openingId, field, value);
  }

  removeOpening(wallId: string, openingId: string): void {
    this.wizardState.removeOpening(wallId, openingId);
  }

  selectTileQuality(value: TileQuality): void {
    this.wizardState.setTileQuality(value);
  }

  selectFloorTileSize(value: TileSize): void {
    this.wizardState.setFloorTileSize(value);
  }

  selectWallTileSize(value: TileSize): void {
    this.wizardState.setWallTileSize(value);
  }

  selectExtrasSelection(value: ExtrasSelection): void {
    this.wizardState.setExtrasSelection(value);
  }

  toggleExtra(value: keyof BathroomExtras): void {
    this.wizardState.toggleExtra(value);
  }

  selectExistingCovering(value: ExistingCoveringLocation): void {
    this.wizardState.updatePreparation({
      existingCovering: {
        status: value === 'none' ? 'no' : value === 'unknown' ? 'unknown' : 'yes',
        location: value,
        removeRequired: value === 'none' ? 'not_applicable' : this.formState().preparation.existingCovering.removeRequired
      }
    });
  }

  selectExistingCoveringRemoval(value: WorkStatus): void {
    this.wizardState.updatePreparation({
      existingCovering: {
        ...this.formState().preparation.existingCovering,
        removeRequired: value
      },
      disposal: {
        required:
          value === 'yes' || this.formState().preparation.oldSanitaryObjects.removeRequired === 'yes'
            ? 'yes'
            : this.formState().preparation.disposal.required,
        scope:
          value === 'yes'
            ? 'old_tiles_or_coverings'
            : this.formState().preparation.disposal.scope
      }
    });
  }

  selectOldSanitaryRemoval(value: WorkStatus): void {
    this.wizardState.updatePreparation({
      oldSanitaryObjects: {
        removeRequired: value
      },
      disposal: {
        required:
          value === 'yes' || this.formState().preparation.existingCovering.removeRequired === 'yes'
            ? 'yes'
            : this.formState().preparation.disposal.required,
        scope: this.formState().preparation.disposal.scope
      }
    });
  }

  selectSubstrateCondition(value: SubstrateCondition): void {
    this.wizardState.updatePreparation({
      substrate: {
        ...this.formState().preparation.substrate,
        condition: value,
        levelingRequired: value === 'stable_even' ? 'no' : value === 'unknown' ? 'unknown' : 'yes',
        repairRequired: value === 'stable_even' ? 'no' : value === 'unknown' ? 'unknown' : 'yes'
      }
    });
  }

  selectPrimerRequired(value: WorkStatus): void {
    this.wizardState.updatePreparation({
      substrate: {
        ...this.formState().preparation.substrate,
        primerRequired: value
      }
    });
  }

  selectDisposalRequired(value: WorkStatus): void {
    this.wizardState.updatePreparation({
      disposal: {
        required: value,
        scope:
          value === 'yes'
            ? 'old_tiles_or_coverings'
            : value === 'no' || value === 'not_applicable'
              ? 'not_applicable'
              : 'unknown'
      }
    });
  }

  toggleScope(key: keyof ScopeData): void {
    this.wizardState.updateScope({
      [key]: !this.formState().scope[key]
    });
  }

  hasShowerSelection(): boolean {
    const option = this.formState().showerBathOption;
    return option === 'shower_only' || option === 'shower_and_bathtub' || option === 'shower_bathtub_combination';
  }

  hasBathtubSelection(): boolean {
    const option = this.formState().showerBathOption;
    return option === 'bathtub_only' || option === 'shower_and_bathtub' || option === 'shower_bathtub_combination';
  }

  hasCustomExtras(): boolean {
    return this.formState().extrasSelection === 'selected';
  }

  isExtraSelected(value: keyof BathroomExtras): boolean {
    return this.formState().extras[value];
  }

  isScopeIncluded(key: keyof ScopeData): boolean {
    return this.formState().scope[key];
  }

  shouldShowCoveringRemoval(): boolean {
    return this.formState().preparation.existingCovering.status === 'yes';
  }

  shouldShowSanitaryRemoval(): boolean {
    const state = this.formState();
    const isBathroom =
      state.room.roomType === 'bathroom' || state.room.roomType === 'guest_wc';
    return isBathroom && state.preparation.existingCovering.status === 'yes';
  }

  shouldShowDisposal(): boolean {
    const preparation = this.formState().preparation;
    return (
      (preparation.existingCovering.status === 'yes' &&
        preparation.existingCovering.removeRequired !== 'no') ||
      preparation.oldSanitaryObjects.removeRequired === 'yes'
    );
  }

  shouldShowWallStep(): boolean {
    return this.formState().tilingScope !== 'floor_only';
  }

  hasAreaWarning(wall: BathroomWall): boolean {
    return wall.openingsAreaM2 > wall.grossAreaM2;
  }

  openingTypeLabel(value: WallOpeningType): string {
    switch (value) {
      case 'door':
        return this.i18n.t('Tuer');
      case 'window':
        return this.i18n.t('Fenster');
      case 'niche':
        return this.i18n.t('Nische');
      default:
        return this.i18n.t('Sonstige');
    }
  }

  formatArea(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  isCurrentStepValid(): boolean {
    const state = this.formState();

    switch (this.currentStep().id) {
      case 'project-type':
        return state.room.roomType !== null && state.room.roomName.trim().length > 0;
      case 'bathroom-size':
        return state.bathroomSizeM2 >= 1 && state.bathroomSizeM2 <= 100;
      case 'sink':
        return state.sinkOption !== null;
      case 'shower-bath':
        return state.showerBathOption !== null;
      case 'heating':
        return state.heatingOption !== null;
      case 'toilet':
        return state.toiletOption !== null;
      case 'tiling':
        return state.tilingScope !== null && state.tileQuality !== null && state.floorTileSize !== null;
      case 'walls':
        return (
          state.wallTileSize !== null &&
          state.walls.every(
            (wall) =>
              wall.name.trim().length > 0 &&
              wall.widthM > 0 &&
              wall.widthM <= 20 &&
              wall.heightM > 0 &&
              wall.heightM <= 5 &&
              wall.tileHeightM >= 0 &&
              wall.tileHeightM <= wall.heightM &&
              wall.openingsAreaM2 <= wall.grossAreaM2 &&
              wall.openings.every(
                (opening) =>
                  opening.widthM > 0 &&
                  opening.widthM <= wall.widthM &&
                  opening.heightM > 0 &&
                  opening.heightM <= wall.heightM
              )
          )
        );
      case 'preparation':
        return true;
      case 'scope':
        return true;
      case 'extras':
        return (
          state.extrasSelection === 'none' ||
          state.extrasSelection === 'unknown' ||
          (state.extrasSelection === 'selected' && Object.values(state.extras).some(Boolean))
        );
      case 'summary':
        return true;
      default:
        return false;
    }
  }

  validationMessage(): string {
    switch (this.currentStep().id) {
      case 'project-type':
        return this.i18n.t('Bitte wähle einen Raumtyp und gib einen Raumnamen ein.');
      case 'bathroom-size':
        return this.i18n.t('Bitte wähle eine Raumgröße zwischen 1,0 und 100,0 m².');
      case 'sink':
        return this.i18n.t('Bitte entscheide dich für eine Waschplatz-Lösung.');
      case 'shower-bath':
        return this.i18n.t('Bitte wähle eine Option für Dusche und Badewanne.');
      case 'heating':
        return this.i18n.t('Bitte wähle eine Heizlösung aus.');
      case 'toilet':
        return this.i18n.t('Bitte wähle eine WC-Option aus.');
      case 'tiling':
        return this.i18n.t('Bitte wähle Fliesenumfang, Fliesenqualität und Fliesengröße aus.');
      case 'walls':
        return this.i18n.t('Bitte wähle die Wand-Fliesengröße und prüfe die Wandangaben.');
      case 'preparation':
        return this.i18n.t('Bitte beantworte die sichtbaren Fragen zu Vorarbeiten und Untergrund. "Unklar" ist erlaubt.');
      case 'extras':
        return this.i18n.t('Bitte wähle Extras aus oder markiere den Bereich als keine Zusatzleistung oder noch unklar.');
      default:
        return '';
    }
  }

  formattedSize(): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(this.formState().bathroomSizeM2);
  }

  private emitProgress(): void {
    this.progressChanged.emit({
      current: this.currentStepIndex() + 1,
      total: this.steps.length,
      percent: this.progressPercent()
    });
  }

  private nextVisibleStepIndex(currentIndex: number): number {
    let index = currentIndex + 1;

    while (index < this.steps.length && this.isStepSkipped(this.steps[index].id)) {
      index++;
    }

    return index;
  }

  private previousVisibleStepIndex(currentIndex: number): number {
    let index = currentIndex - 1;

    while (index > 0 && this.isStepSkipped(this.steps[index].id)) {
      index--;
    }

    return Math.max(0, index);
  }

  private isStepSkipped(stepId: StepId): boolean {
    if (stepId === 'walls' && !this.shouldShowWallStep()) {
      return true;
    }

    const bathroomRoom =
      this.formState().room.roomType === 'bathroom' ||
      this.formState().room.roomType === 'guest_wc';
    return !bathroomRoom && ['sink', 'shower-bath', 'heating', 'toilet', 'extras'].includes(stepId);
  }

  private stepIndexAfter(stepId: StepId): number {
    const stepIndex = this.steps.findIndex((step) => step.id === stepId);
    return stepIndex >= 0 ? stepIndex + 1 : this.nextVisibleStepIndex(this.currentStepIndex());
  }
}
