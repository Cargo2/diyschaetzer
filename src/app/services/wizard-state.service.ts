import { computed, inject, Injectable, signal } from '@angular/core';
import {
  BathroomAssumptions,
  BathroomExtras,
  BathroomWall,
  BathroomWizardData,
  BathroomWizardFormState,
  bathtubDefaults,
  BathtubType,
  defaultBathroomAssumptions,
  defaultBathroomExtras,
  defaultPreparationData,
  defaultScopeData,
  defaultBathroomWizardFormState,
  defaultRoomData,
  defaultWizardMetadata,
  ElectricalAssumption,
  excludedItemsFromScope,
  ExtrasSelection,
  HeatingOption,
  heatingDataFromOption,
  PreparationData,
  RoomType,
  ROOM_TYPE_DEFAULT_NAMES,
  ScopeData,
  showerDefaults,
  ShowerBathOption,
  ShowerType,
  sinkDefaults,
  SinkOption,
  tilePriceDefaults,
  TileQuality,
  TileSize,
  tileWasteFactorPercent,
  TilingScope,
  toiletDefaults,
  ToiletInstallationType,
  ToiletOption,
  VanityCabinetOption,
  WizardMetadata,
  WallOpening,
  WallOpeningType
} from '../models/bathroom-wizard.model';
import { AreaCalculationService } from './area-calculation.service';
import { AssumptionService } from './assumption.service';
import { WizardFieldRelevanceService } from './wizard-field-relevance.service';
@Injectable({ providedIn: 'root' })
export class WizardStateService {
  private readonly lastWizardStepIndex = 11;
  private readonly metadataStorageKey = 'badprojekt:wizard-metadata';
  private readonly areaCalculation = inject(AreaCalculationService);
  private readonly assumptionService = inject(AssumptionService);
  private readonly fieldRelevance = inject(WizardFieldRelevanceService);
  private readonly formStateSignal = signal<BathroomWizardFormState>(
    defaultBathroomWizardFormState()
  );
  private readonly currentStepIndexSignal = signal(0);
  private readonly metadataSignal = signal<WizardMetadata>(this.loadMetadata());

  readonly formState = this.formStateSignal.asReadonly();
  readonly currentStepIndex = this.currentStepIndexSignal.asReadonly();
  readonly metadata = this.metadataSignal.asReadonly();
  readonly wizardCompleted = computed(() => this.metadataSignal().wizardCompleted);
  readonly resultsAvailable = computed(() => {
    const metadata = this.metadataSignal();
    return metadata.wizardCompleted && metadata.resultsValid;
  });
  readonly assumptions = computed(() => this.formStateSignal().assumptions);
  readonly payload = computed(() => this.buildPayload(this.formStateSignal()));
  readonly payloadJson = computed(() => JSON.stringify(this.payload(), null, 2));

  setCurrentStepIndex(value: number): void {
    const safeValue = Number.isFinite(value)
      ? Math.max(0, Math.min(this.lastWizardStepIndex, Math.round(value)))
      : 0;
    this.currentStepIndexSignal.set(safeValue);

    if (safeValue < this.lastWizardStepIndex && this.resultsAvailable()) {
      this.invalidateResults();
      return;
    }

    this.updateMetadata((metadata) =>
      metadata.wizardCompleted
        ? metadata
        : {
            ...metadata,
            currentStep: safeValue + 1
          }
    );
  }

  markWizardCompleted(): void {
    if (this.resultsAvailable()) {
      return;
    }

    const completedAt = new Date().toISOString();
    this.updateMetadata((metadata) => ({
      ...metadata,
      wizardCompleted: true,
      resultsValid: true,
      completedAt,
      lastModifiedAt: completedAt,
      invalidatedAt: null,
      currentStep: 'completed'
    }));
  }

  isWizardCompleted(): boolean {
    return this.resultsAvailable();
  }

  isResultsAvailable(): boolean {
    return this.resultsAvailable();
  }

  getWizardData(): BathroomWizardData {
    return this.payload();
  }

  setRoomType(roomType: RoomType): void {
    this.updateState((state) => {
      const isOutdoor =
        roomType === 'terrace_balcony' ||
        (roomType === 'other' && state.room.isOutdoor);
      const isBathroom = roomType === 'bathroom' || roomType === 'guest_wc';
      return {
        ...state,
        room: {
          roomType,
          roomName: ROOM_TYPE_DEFAULT_NAMES[roomType],
          isOutdoor
        },
        sinkOption: isBathroom ? state.sinkOption : 'no_sink',
        vanityCabinet: isBathroom ? state.vanityCabinet : 'not_applicable',
        showerBathOption: isBathroom ? state.showerBathOption : 'none',
        showerType: isBathroom ? state.showerType : 'not_applicable',
        bathtubType: isBathroom ? state.bathtubType : 'not_applicable',
        toiletOption: isBathroom ? state.toiletOption : 'none',
        heatingOption: isBathroom ? state.heatingOption : 'none',
        scope: {
          ...state.scope,
          includeWaterproofing: isBathroom || isOutdoor,
          includeBaseboards: isOutdoor ? false : state.scope.includeBaseboards
        }
      };
    });
  }

  setRoomName(roomName: string): void {
    this.updateState((state) => ({
      ...state,
      room: {
        ...state.room,
        roomName: roomName.slice(0, 80)
      }
    }));
  }

  /** Nur für den Raumtyp "Anderer Raum" wählbar; Terrasse/Balkon ist immer außen. */
  setRoomOutdoor(isOutdoor: boolean): void {
    this.updateState((state) => ({
      ...state,
      room: {
        ...state.room,
        isOutdoor: state.room.roomType === 'other' ? isOutdoor : state.room.isOutdoor
      }
    }));
  }

  loadWizardData(data: BathroomWizardData): void {
    this.setWizardData(data);
    this.currentStepIndexSignal.set(0);
    this.updateMetadata(() => defaultWizardMetadata());
  }

  loadCompletedRoomForEditing(data: BathroomWizardData): void {
    this.setWizardData(data);
    this.currentStepIndexSignal.set(this.lastWizardStepIndex);
    const now = new Date().toISOString();
    this.updateMetadata((metadata) => ({
      ...metadata,
      wizardCompleted: true,
      resultsValid: true,
      completedAt: metadata.completedAt ?? now,
      lastModifiedAt: metadata.lastModifiedAt ?? now,
      invalidatedAt: null,
      currentStep: 'completed'
    }));
  }

  private setWizardData(data: BathroomWizardData): void {
    const defaults = defaultBathroomWizardFormState();
    const roomType = data.room?.roomType ?? 'bathroom';
    const room = {
      ...defaultRoomData(),
      ...(data.room ?? {}),
      roomType,
      roomName: data.room?.roomName?.trim() || ROOM_TYPE_DEFAULT_NAMES[roomType],
      isOutdoor:
        roomType === 'terrace_balcony' ||
        (roomType === 'other' && data.room?.isOutdoor === true)
    };
    this.formStateSignal.set(this.normalizeState({
      ...defaults,
      ...data,
      room,
      heating: {
        ...defaults.heating,
        ...(data.heating ?? {})
      },
      extras: {
        ...defaults.extras,
        ...(data.extras ?? {})
      },
      preparation: data.preparation ?? defaults.preparation,
      scope: {
        ...defaults.scope,
        ...(data.scope ?? {})
      },
      assumptions: {
        ...defaults.assumptions,
        ...(data.assumptions ?? {})
      }
    }));
  }

  startNewRoom(): void {
    this.formStateSignal.set(defaultBathroomWizardFormState());
    this.currentStepIndexSignal.set(0);
    this.updateMetadata(() => defaultWizardMetadata());
  }

  updatePreparation(preparation: Partial<PreparationData>): void {
    this.updateState((state) => ({
      ...state,
      preparation: this.mergePreparation(state.preparation, preparation)
    }));
  }

  updateScope(scope: Partial<ScopeData>): void {
    this.updateState((state) => ({
      ...state,
      scope: {
        ...this.normalizeScope(state.scope),
        ...scope
      }
    }));
  }

  recalculateExcludedItems() {
    return excludedItemsFromScope(this.formStateSignal().scope);
  }

  recalculateOpenIssues(): string[] {
    return this.buildOpenIssues(this.buildPayload(this.formStateSignal()));
  }

  recalculateRecommendations(): string[] {
    return this.buildRecommendations(this.formStateSignal());
  }

  setBathroomSizeM2(value: number): void {
    const bathroomSizeM2 = Number.isFinite(value) ? value : 8;
    this.updateState((state) => ({
      ...state,
      bathroomSizeM2: this.clampArea(bathroomSizeM2)
    }));
  }

  setSinkOption(sinkOption: SinkOption): void {
    this.updateState((state) => ({
      ...state,
      sinkOption,
      vanityCabinet:
        sinkOption === 'no_sink'
          ? 'not_applicable'
          : state.vanityCabinet === 'not_applicable'
            ? 'unknown'
            : state.vanityCabinet,
      assumptions: {
        ...state.assumptions,
        sink: this.defaultSinkAssumption(sinkOption)
      }
    }));
  }

  setVanityCabinet(vanityCabinet: VanityCabinetOption): void {
    this.updateState((state) => ({
      ...state,
      vanityCabinet
    }));
  }

  setShowerBathOption(showerBathOption: ShowerBathOption): void {
    this.updateState((state) => {
      const hasShower = this.optionHasShower(showerBathOption);
      const hasBathtub = this.optionHasBathtub(showerBathOption);
      const showerType =
        hasShower && state.showerType === 'not_applicable'
          ? 'unknown'
          : hasShower
            ? state.showerType
            : 'not_applicable';
      const bathtubType =
        hasBathtub && state.bathtubType === 'not_applicable'
          ? 'unknown'
          : hasBathtub
            ? state.bathtubType
            : 'not_applicable';

      return {
        ...state,
        showerBathOption,
        showerType,
        bathtubType,
        assumptions: {
          ...state.assumptions,
          shower: hasShower ? this.defaultShowerAssumption(showerType) : null,
          bathtub: hasBathtub ? this.defaultBathtubAssumption(bathtubType) : null
        },
        preparation: this.applyWaterproofingRule(state.preparation, showerBathOption)
      };
    });
  }

  setShowerType(showerType: ShowerType): void {
    this.updateState((state) => ({
      ...state,
      showerType,
      assumptions: {
        ...state.assumptions,
        shower: this.defaultShowerAssumption(showerType)
      }
    }));
  }

  setBathtubType(bathtubType: BathtubType): void {
    this.updateState((state) => ({
      ...state,
      bathtubType,
      assumptions: {
        ...state.assumptions,
        bathtub: this.defaultBathtubAssumption(bathtubType)
      }
    }));
  }

  setHeatingOption(heatingOption: HeatingOption): void {
    this.updateState((state) => {
      const nextState = {
        ...state,
        heatingOption,
        heating: heatingDataFromOption(heatingOption, state.heating),
        preparation: state.preparation
      };

      return {
        ...nextState,
        assumptions: {
          ...state.assumptions,
          heating: this.defaultHeatingAssumption(heatingOption, state.bathroomSizeM2),
          electrical: this.defaultElectricalAssumption(nextState)
        }
      };
    });
  }

  setToiletOption(toiletOption: ToiletOption): void {
    this.updateState((state) => ({
      ...state,
      toiletOption,
      assumptions: {
        ...state.assumptions,
        toilet: this.defaultToiletAssumption(toiletOption)
      }
    }));
  }

  setTilingScope(tilingScope: TilingScope): void {
    this.updateState((state) => ({
      ...state,
      tilingScope,
      walls: tilingScope === 'floor_only' ? [] : state.walls,
      wallTileSize: tilingScope === 'floor_only' ? null : state.wallTileSize
    }));
  }

  addWall(): void {
    this.updateState((state) => {
      const nextNumber = this.nextWallNumber(state.walls);
      const wallHeight = 2.5;
      const tileHeight = state.tilingScope === 'floor_and_partial_walls' ? 1.2 : wallHeight;

      return {
        ...state,
        walls: [
          ...state.walls,
          this.areaCalculation.calculateWallAreas({
            id: `wall_${nextNumber}`,
            name: `Wand ${nextNumber}`,
            widthM: 2,
            heightM: wallHeight,
            tileHeightM: tileHeight,
            grossAreaM2: 0,
            openings: [],
            openingsAreaM2: 0,
            tileAreaM2: 0
          })
        ]
      };
    });
  }

  updateWall(
    wallId: string,
    field: keyof Pick<BathroomWall, 'name' | 'widthM' | 'heightM' | 'tileHeightM'>,
    value: string | number
  ): void {
    this.updateState((state) => ({
      ...state,
      walls: state.walls.map((wall) =>
        wall.id === wallId
          ? this.normalizeWall({
              ...wall,
              [field]: field === 'name' ? String(value) : Number(value)
            })
          : wall
      )
    }));
  }

  removeWall(wallId: string): void {
    this.updateState((state) => ({
      ...state,
      walls: state.walls.filter((wall) => wall.id !== wallId)
    }));
  }

  addOpening(wallId: string): void {
    this.updateState((state) => ({
      ...state,
      walls: state.walls.map((wall) =>
        wall.id === wallId
          ? this.normalizeWall({
              ...wall,
              openings: [
                ...wall.openings,
                {
                  id: `opening_${this.nextOpeningNumber(wall.openings)}`,
                  type: 'window',
                  widthM: Math.min(0.8, wall.widthM),
                  heightM: Math.min(0.6, wall.tileHeightM || wall.heightM),
                  areaM2: 0
                }
              ]
            })
          : wall
      )
    }));
  }

  updateOpening(
    wallId: string,
    openingId: string,
    field: keyof Pick<WallOpening, 'type' | 'widthM' | 'heightM'>,
    value: string | number
  ): void {
    this.updateState((state) => ({
      ...state,
      walls: state.walls.map((wall) =>
        wall.id === wallId
          ? this.normalizeWall({
              ...wall,
              openings: wall.openings.map((opening) =>
                opening.id === openingId
                  ? {
                      ...opening,
                      [field]: field === 'type' ? (value as WallOpeningType) : Number(value)
                    }
                  : opening
              )
            })
          : wall
      )
    }));
  }

  removeOpening(wallId: string, openingId: string): void {
    this.updateState((state) => ({
      ...state,
      walls: state.walls.map((wall) =>
        wall.id === wallId
          ? this.normalizeWall({
              ...wall,
              openings: wall.openings.filter((opening) => opening.id !== openingId)
            })
          : wall
      )
    }));
  }

  setTileQuality(tileQuality: TileQuality): void {
    this.updateState((state) => ({
      ...state,
      tileQuality,
      assumptions: {
        ...state.assumptions,
        tile: this.defaultTileAssumption(tileQuality)
      }
    }));
  }

  setFloorTileSize(floorTileSize: TileSize): void {
    this.updateState((state) => ({
      ...state,
      floorTileSize
    }));
  }

  setWallTileSize(wallTileSize: TileSize): void {
    this.updateState((state) => ({
      ...state,
      wallTileSize
    }));
  }

  setExtrasSelection(extrasSelection: ExtrasSelection): void {
    this.updateState((state) => {
      const extras =
        extrasSelection === 'selected' ? state.extras : defaultBathroomExtras();
      const nextState = {
        ...state,
        extrasSelection,
        extras
      };

      return {
        ...nextState,
        assumptions: {
          ...state.assumptions,
          electrical: this.defaultElectricalAssumption(nextState)
        }
      };
    });
  }

  toggleExtra(key: keyof BathroomExtras): void {
    this.updateState((state) => {
      const extras = {
        ...state.extras,
        [key]: !state.extras[key]
      };
      const nextState = {
        ...state,
        extrasSelection: 'selected' as const,
        extras
      };

      return {
        ...nextState,
        assumptions: {
          ...state.assumptions,
          electrical: this.defaultElectricalAssumption(nextState)
        }
      };
    });
  }

  setTilePricePerM2(value: number): void {
    this.updateAssumptions((assumptions) => ({
      ...assumptions,
      tile: assumptions.tile
        ? {
            ...assumptions.tile,
            pricePerM2: this.clampNonNegative(value)
          }
        : assumptions.tile
    }));
  }

  updateCalculationAssumption(path: string, value: number): void {
    const updated = this.assumptionService.updateAssumption(this.payload(), path, value);
    this.updateAssumptions(() => updated.assumptions);
  }

  resetCalculationAssumption(path: string): void {
    const updated = this.assumptionService.resetAssumption(this.payload(), path);
    this.updateAssumptions(() => updated.assumptions);
  }

  resetAllCalculationAssumptions(): void {
    const updated = this.assumptionService.resetAll(this.payload());
    this.updateAssumptions(() => updated.assumptions);
  }

  setBathtubLengthCm(value: number): void {
    this.updateDimension('bathtub', 'lengthCm', value);
  }

  setBathtubWidthCm(value: number): void {
    this.updateDimension('bathtub', 'widthCm', value);
  }

  setShowerLengthCm(value: number): void {
    this.updateDimension('shower', 'lengthCm', value);
  }

  setShowerWidthCm(value: number): void {
    this.updateDimension('shower', 'widthCm', value);
  }

  setSinkWidthCm(value: number): void {
    this.updateAssumptions((assumptions) => ({
      ...assumptions,
      sink: assumptions.sink
        ? {
            ...assumptions.sink,
            widthCm: this.clampPositiveInteger(value)
          }
        : assumptions.sink
    }));
  }

  setSinkCount(value: number): void {
    this.updateAssumptions((assumptions) => ({
      ...assumptions,
      sink: assumptions.sink
        ? {
            ...assumptions.sink,
            count: this.clampNonNegativeInteger(value)
          }
        : assumptions.sink
    }));
  }

  setToiletWidthCm(value: number): void {
    this.updateAssumptions((assumptions) => ({
      ...assumptions,
      toilet: assumptions.toilet
        ? {
            ...assumptions.toilet,
            estimatedWidthCm: this.clampPositiveInteger(value)
          }
        : assumptions.toilet
    }));
  }

  setToiletInstallationType(value: ToiletInstallationType): void {
    this.updateAssumptions((assumptions) => ({
      ...assumptions,
      toilet: assumptions.toilet
        ? {
            ...assumptions.toilet,
            installationType: value
          }
        : assumptions.toilet
    }));
  }

  setTowelRadiatorCount(value: number): void {
    this.updateAssumptions((assumptions) => ({
      ...assumptions,
      heating: {
        ...assumptions.heating,
        towelRadiatorCount: this.clampNonNegativeInteger(value)
      }
    }));
  }

  setElectricalAssumption(
    key: keyof Omit<ElectricalAssumption, 'editable'>,
    value: number
  ): void {
    this.updateAssumptions((assumptions) => ({
      ...assumptions,
      electrical: {
        ...assumptions.electrical,
        [key]: this.clampNonNegativeInteger(value)
      }
    }));
  }

  private updateState(
    updater: (currentState: BathroomWizardFormState) => BathroomWizardFormState
  ): void {
    this.formStateSignal.update((currentState) => this.normalizeState(updater(currentState)));
    this.invalidateResults();
  }

  private updateAssumptions(
    updater: (current: BathroomAssumptions) => BathroomAssumptions
  ): void {
    this.updateState((state) => ({
      ...state,
      assumptions: updater(state.assumptions)
    }));
  }

  private updateDimension(
    key: 'bathtub' | 'shower',
    field: 'lengthCm' | 'widthCm',
    value: number
  ): void {
    this.updateAssumptions((assumptions) => ({
      ...assumptions,
      [key]: assumptions[key]
        ? {
            ...assumptions[key],
            [field]: this.clampPositiveInteger(value)
          }
        : assumptions[key]
    }));
  }

  private normalizeState(state: BathroomWizardFormState): BathroomWizardFormState {
    const roomType = state.room?.roomType ?? 'bathroom';
    const room = {
      ...defaultRoomData(),
      ...(state.room ?? {}),
      roomType,
      roomName: state.room?.roomName?.trim() || ROOM_TYPE_DEFAULT_NAMES[roomType],
      isOutdoor:
        roomType === 'terrace_balcony' ||
        (roomType === 'other' && state.room?.isOutdoor === true)
    };
    const preparation = this.normalizePreparation(
      this.applyWaterproofingRule(
        state.preparation ?? defaultPreparationData(),
        state.showerBathOption
      ),
      { ...state, room }
    );
    const scope = this.normalizeScope(state.scope);
    const normalizedState: BathroomWizardFormState = {
      ...state,
      room,
      heating: heatingDataFromOption(state.heatingOption, state.heating),
      preparation,
      scope,
      bathroomSizeM2: this.clampArea(state.bathroomSizeM2),
      walls: state.tilingScope === 'floor_only' ? [] : (state.walls ?? []).map((wall) => this.normalizeWall(wall))
    };

    if (normalizedState.tilingScope === 'floor_only') {
      normalizedState.wallTileSize = null;
    }

    if (normalizedState.sinkOption === 'no_sink') {
      normalizedState.vanityCabinet = 'not_applicable';
    }

    if (
      normalizedState.sinkOption !== null &&
      normalizedState.sinkOption !== 'no_sink' &&
      normalizedState.vanityCabinet === 'not_applicable'
    ) {
      normalizedState.vanityCabinet = 'unknown';
    }

    if (!normalizedState.showerBathOption) {
      normalizedState.showerType = 'not_applicable';
      normalizedState.bathtubType = 'not_applicable';
    } else {
      if (this.optionHasShower(normalizedState.showerBathOption)) {
        if (normalizedState.showerType === 'not_applicable') {
          normalizedState.showerType = 'unknown';
        }
      } else {
        normalizedState.showerType = 'not_applicable';
      }

      if (this.optionHasBathtub(normalizedState.showerBathOption)) {
        if (normalizedState.bathtubType === 'not_applicable') {
          normalizedState.bathtubType = 'unknown';
        }
      } else {
        normalizedState.bathtubType = 'not_applicable';
      }
    }

    if (normalizedState.extrasSelection !== 'selected') {
      normalizedState.extras = defaultBathroomExtras();
    }

    if (normalizedState.tileQuality === null) {
      normalizedState.tileQuality = 'unknown';
    }

    normalizedState.assumptions = this.normalizeAssumptions(normalizedState);

    return normalizedState;
  }

  private normalizeAssumptions(state: BathroomWizardFormState): BathroomAssumptions {
    const defaultAssumptions = defaultBathroomAssumptions();
    const current = state.assumptions ?? defaultAssumptions;

    return {
      ...current,
      tile: {
        quality: state.tileQuality ?? 'unknown',
        pricePerM2: this.clampNonNegative(current.tile?.pricePerM2 ?? tilePriceDefaults[state.tileQuality ?? 'unknown']),
        wasteFactorPercent: this.clampNonNegative(
          current.tile?.wasteFactorPercent ?? tileWasteFactorPercent
        ),
        outdoorSuitableRequired: state.room?.isOutdoor === true,
        frostResistantRequired: state.room?.isOutdoor === true,
        slipResistanceRecommended: state.room?.isOutdoor ? 'R10/R11' : null,
        recommendedTileType: state.room?.isOutdoor
          ? 'outdoor_porcelain_stoneware'
          : null,
        editable: true
      },
      bathtub: this.optionHasBathtub(state.showerBathOption)
        ? {
            type: state.bathtubType,
            lengthCm: this.clampPositiveInteger(
              current.bathtub?.lengthCm ??
                this.defaultBathtubAssumption(state.bathtubType)?.lengthCm ??
                170
            ),
            widthCm: this.clampPositiveInteger(
              current.bathtub?.widthCm ??
                this.defaultBathtubAssumption(state.bathtubType)?.widthCm ??
                75
            ),
            editable: true
          }
        : null,
      shower: this.optionHasShower(state.showerBathOption)
        ? {
            type: state.showerType,
            lengthCm: this.clampPositiveInteger(
              current.shower?.lengthCm ??
                this.defaultShowerAssumption(state.showerType)?.lengthCm ??
                100
            ),
            widthCm: this.clampPositiveInteger(
              current.shower?.widthCm ??
                this.defaultShowerAssumption(state.showerType)?.widthCm ??
                90
            ),
            editable: true
          }
        : null,
      sink:
        state.sinkOption && state.sinkOption !== 'no_sink'
          ? {
              type: state.sinkOption,
              widthCm: this.clampPositiveInteger(
                current.sink?.widthCm ??
                  this.defaultSinkAssumption(state.sinkOption)?.widthCm ??
                  80
              ),
              count: this.clampNonNegativeInteger(
                current.sink?.count ?? this.defaultSinkAssumption(state.sinkOption)?.count ?? 1
              ),
              editable: true
            }
          : null,
      toilet:
        state.toiletOption && state.toiletOption !== 'none'
          ? {
              type: state.toiletOption,
              estimatedWidthCm: this.clampPositiveInteger(
                current.toilet?.estimatedWidthCm ??
                  this.defaultToiletAssumption(state.toiletOption)?.estimatedWidthCm ??
                  40
              ),
              installationType:
                current.toilet?.installationType ??
                this.defaultToiletAssumption(state.toiletOption)?.installationType ??
                'unknown',
              editable: true
            }
          : null,
      heating: {
        towelRadiatorCount: this.hasTowelRadiator(state.heatingOption)
          ? this.clampNonNegativeInteger(current.heating?.towelRadiatorCount ?? 1)
          : 0,
        editable: true
      },
      electrical: {
        additionalSocketsCount: this.clampNonNegativeInteger(
          current.electrical?.additionalSocketsCount ??
            defaultAssumptions.electrical.additionalSocketsCount
        ),
        mirrorPowerConnectionCount: this.clampNonNegativeInteger(
          current.electrical?.mirrorPowerConnectionCount ??
            defaultAssumptions.electrical.mirrorPowerConnectionCount
        ),
        wallLightConnectionCount: this.clampNonNegativeInteger(
          current.electrical?.wallLightConnectionCount ??
            defaultAssumptions.electrical.wallLightConnectionCount
        ),
        ventilationOpeningCount: this.clampNonNegativeInteger(
          current.electrical?.ventilationOpeningCount ??
            defaultAssumptions.electrical.ventilationOpeningCount
        ),
        editable: true
      }
    };
  }

  private buildPayload(state: BathroomWizardFormState): BathroomWizardData {
    const assumptions = this.normalizeAssumptions(state);
    const walls = state.tilingScope === 'floor_only' ? [] : state.walls.map((wall) => this.normalizeWall(wall));
    const preparation = this.normalizePreparation(
      this.applyWaterproofingRule(state.preparation, state.showerBathOption),
      state
    );
    const scope = this.normalizeScope(state.scope);
    const floorAreaM2 = this.areaCalculation.calculateFloorArea(state.bathroomSizeM2);
    const areaSummary = this.areaCalculation.calculateAreaSummary({
      ...state,
      bathroomSizeM2: this.clampArea(state.bathroomSizeM2),
      walls
    });

    return {
      room: state.room ?? defaultRoomData(),
      bathroomSizeM2: this.clampArea(state.bathroomSizeM2),
      sinkOption: state.sinkOption,
      vanityCabinet:
        state.sinkOption === 'no_sink'
          ? 'not_applicable'
          : state.vanityCabinet === 'not_applicable'
            ? 'unknown'
            : state.vanityCabinet,
      showerBathOption: state.showerBathOption,
      showerType: state.showerType,
      bathtubType: state.bathtubType,
      heatingOption: state.heatingOption,
      heating: heatingDataFromOption(state.heatingOption, state.heating),
      toiletOption: state.toiletOption,
      tilingScope: state.tilingScope,
      tileQuality: state.tileQuality,
      floorTileSize: state.floorTileSize,
      wallTileSize: state.tilingScope === 'floor_only' ? null : state.wallTileSize,
      floorAreaM2,
      walls,
      areaSummary,
      extrasSelection: state.extrasSelection ?? 'unknown',
      extras: state.extrasSelection === 'selected' ? state.extras : defaultBathroomExtras(),
      preparation,
      scope,
      excludedItems: excludedItemsFromScope(scope),
      openIssues: this.buildOpenIssues({
        ...state,
        preparation,
        scope,
        room: state.room
      } as BathroomWizardData),
      recommendations: this.buildRecommendations({
        ...state,
        preparation,
        scope
      }),
      assumptions: {
        ...assumptions,
        ...this.assumptionService.normalizeAssumptions({
          ...state,
          assumptions,
          floorAreaM2,
          walls,
          areaSummary,
          preparation,
          scope
        } as BathroomWizardData)
      },
      metadata: this.metadataSignal()
    };
  }

  private mergePreparation(
    current: PreparationData,
    update: Partial<PreparationData>
  ): PreparationData {
    return {
      ...current,
      ...update,
      existingCovering: {
        ...current.existingCovering,
        ...update.existingCovering
      },
      oldSanitaryObjects: {
        ...current.oldSanitaryObjects,
        ...update.oldSanitaryObjects
      },
      substrate: {
        ...current.substrate,
        ...update.substrate
      },
      waterproofing: {
        ...current.waterproofing,
        ...update.waterproofing
      },
      disposal: {
        ...current.disposal,
        ...update.disposal
      }
    };
  }

  private normalizePreparation(
    preparation: PreparationData,
    state: BathroomWizardFormState
  ): PreparationData {
    const isBathroom =
      state.room?.roomType === 'bathroom' || state.room?.roomType === 'guest_wc';
    const noCovering = preparation.existingCovering.status === 'no';
    const coveringRemoveRequired = noCovering
      ? 'not_applicable'
      : preparation.existingCovering.removeRequired;
    const sanitaryRemoveRequired = !isBathroom || noCovering
      ? 'not_applicable'
      : preparation.oldSanitaryObjects.removeRequired;
    const nothingToDispose =
      coveringRemoveRequired === 'not_applicable' && sanitaryRemoveRequired !== 'yes' &&
      sanitaryRemoveRequired !== 'unknown';
    const disposalRequired =
      coveringRemoveRequired === 'yes' || sanitaryRemoveRequired === 'yes'
        ? 'yes'
        : nothingToDispose
          ? 'not_applicable'
          : preparation.disposal.required;
    const disposalScope =
      disposalRequired === 'yes'
        ? 'old_tiles_or_coverings'
        : disposalRequired === 'unknown'
          ? 'unknown'
          : 'not_applicable';

    return {
      existingCovering: {
        status: preparation.existingCovering.status,
        location: noCovering ? 'none' : preparation.existingCovering.location,
        removeRequired: coveringRemoveRequired
      },
      oldSanitaryObjects: {
        removeRequired: sanitaryRemoveRequired
      },
      substrate: this.normalizeSubstrate(preparation.substrate),
      waterproofing: {
        required: preparation.waterproofing.required,
        reason: preparation.waterproofing.reason,
        areaM2: preparation.waterproofing.areaM2
      },
      disposal: {
        required: disposalRequired,
        scope: disposalScope
      }
    };
  }

  private normalizeScope(scope: Partial<ScopeData> | undefined): ScopeData {
    const defaults = defaultScopeData();

    return {
      includeTileMaterial: scope?.includeTileMaterial ?? defaults.includeTileMaterial,
      includeInstallationMaterials:
        scope?.includeInstallationMaterials ?? defaults.includeInstallationMaterials,
      includeWaterproofing: scope?.includeWaterproofing ?? defaults.includeWaterproofing,
      includeBaseboards: scope?.includeBaseboards ?? defaults.includeBaseboards,
      includeTools: scope?.includeTools ?? defaults.includeTools,
      includeDisposal: scope?.includeDisposal ?? defaults.includeDisposal,
      includeLevelingWork: scope?.includeLevelingWork ?? defaults.includeLevelingWork
    };
  }

  private normalizeSubstrate(
    substrate: PreparationData['substrate']
  ): PreparationData['substrate'] {
    const condition =
      substrate.condition === 'stable_even' ||
      substrate.condition === 'minor_repairs_needed' ||
      substrate.condition === 'leveling_compound_needed' ||
      substrate.condition === 'unknown'
        ? substrate.condition
        : 'unknown';

    return {
      condition,
      levelingRequired:
        condition === 'stable_even'
          ? 'no'
          : condition === 'unknown'
            ? 'unknown'
            : 'yes',
      primerRequired: substrate.primerRequired ?? 'yes',
      repairRequired:
        condition === 'stable_even'
          ? 'no'
          : condition === 'unknown'
            ? 'unknown'
            : 'yes'
    };
  }

  private applyWaterproofingRule(
    preparation: PreparationData,
    showerBathOption: ShowerBathOption | null
  ): PreparationData {
    if (this.optionHasWetArea(showerBathOption)) {
      return {
        ...preparation,
        waterproofing: {
          ...preparation.waterproofing,
          required: 'yes',
          reason: 'wet_area_selected'
        }
      };
    }

    if (preparation.waterproofing.reason === 'wet_area_selected') {
      return {
        ...preparation,
        waterproofing: {
          ...preparation.waterproofing,
          required: 'unknown',
          reason: 'bathroom_project'
        }
      };
    }

    return preparation;
  }

  private buildOpenIssues(data: BathroomWizardData): string[] {
    const issues: string[] = [];
    const preparation = data.preparation;

    if (
      this.fieldRelevance.isFieldRelevant('substrate_condition', data) &&
      preparation.substrate.condition === 'unknown'
    ) {
      issues.push('Untergrundzustand unklar – vor der Fliesenverlegung prüfen.');
    }

    if (
      this.fieldRelevance.isFieldRelevant('existing_covering', data) &&
      preparation.existingCovering.status === 'unknown'
    ) {
      issues.push('Alter Belag unklar – Bestand vor der Planung prüfen.');
    }

    if (
      this.fieldRelevance.isFieldRelevant('disposal', data) &&
      preparation.disposal.required === 'unknown'
    ) {
      issues.push('Entsorgung muss geklärt werden');
    }

    if (
      this.fieldRelevance.isFieldRelevant('existing_covering_removal', data) &&
      preparation.existingCovering.removeRequired === 'unknown'
    ) {
      issues.push('Rückbau alter Beläge unklar');
    }

    if (
      this.fieldRelevance.isFieldRelevant('old_sanitary_removal', data) &&
      preparation.oldSanitaryObjects.removeRequired === 'unknown'
    ) {
      issues.push('Rückbau alter Sanitärobjekte unklar');
    }

    return issues;
  }

  private buildRecommendations(state: BathroomWizardFormState): string[] {
    const recommendations: string[] = [];
    const preparation = state.preparation;

    if (
      preparation.existingCovering.status === 'yes' &&
      preparation.existingCovering.removeRequired === 'no'
    ) {
      recommendations.push(
        'Das Überfliesen vorhandener Beläge ist nur möglich, wenn der Untergrund tragfähig, fest, sauber und geeignet ist.'
      );
    }

    if (preparation.waterproofing.required === 'yes') {
      recommendations.push(
        'Für Nassbereiche wie Dusche oder Badewanne sollte eine geeignete Abdichtung berücksichtigt werden.'
      );
    }

    if (preparation.substrate.condition === 'minor_repairs_needed') {
      recommendations.push(
        'Kleine Ausbesserungen am vorhandenen Untergrund werden als fliesenrelevante Vorarbeit berücksichtigt.'
      );
    }

    if (preparation.substrate.condition === 'leveling_compound_needed') {
      recommendations.push(
        'Für stärkere Unebenheiten wird Ausgleichsmasse als fliesenrelevante Vorarbeit berücksichtigt.'
      );
    }

    if (preparation.substrate.condition === 'unknown') {
      recommendations.push(
        'Der vorhandene Untergrund sollte vor der Fliesenverlegung geprüft werden.'
      );
    }

    if (
      state.floorTileSize === '60x120_cm' ||
      state.floorTileSize === '120x120_cm' ||
      state.wallTileSize === '60x120_cm' ||
      state.wallTileSize === '120x120_cm'
    ) {
      recommendations.push(
        'Großformatige Fliesen erfordern einen besonders ebenen Untergrund und sorgfältige Verlegung.'
      );
    }

    if (this.hasFloorHeating(state.heatingOption)) {
      recommendations.push(
        'Bei Fliesen auf Fußbodenheizung sollten geeignete Verlegematerialien, ein geeigneter Untergrund und Bewegungsfugen berücksichtigt werden.'
      );
    }

    if (state.room?.isOutdoor) {
      recommendations.push(
        'Für Außenbereiche werden frostsichere, witterungsbeständige Outdoor-Fliesen bzw. Feinsteinzeug-Terrassenplatten empfohlen.',
        'Achte auf eine geeignete Rutschhemmung, besonders bei Nässe.',
        'Häufig werden im Außenbereich stärkere Terrassenplatten, z. B. ca. 2 cm, verwendet.',
        'Der Untergrund, das Gefälle und die Entwässerung sind entscheidend für eine dauerhafte Verlegung.'
      );
    }

    return recommendations;
  }

  private updateMetadata(updater: (metadata: WizardMetadata) => WizardMetadata): void {
    this.metadataSignal.update((metadata) => {
      const nextMetadata = updater(metadata);
      this.saveMetadata(nextMetadata);
      return nextMetadata;
    });
  }

  private invalidateResults(): void {
    const metadata = this.metadataSignal();
    if (!metadata.wizardCompleted && !metadata.resultsValid) {
      return;
    }

    const modifiedAt = new Date().toISOString();
    this.updateMetadata((current) => ({
      ...current,
      wizardCompleted: false,
      resultsValid: false,
      lastModifiedAt: modifiedAt,
      invalidatedAt: modifiedAt,
      currentStep: this.currentStepIndexSignal() + 1
    }));
  }

  private loadMetadata(): WizardMetadata {
    const defaultMetadata = defaultWizardMetadata();

    try {
      const storedValue = globalThis.localStorage?.getItem(this.metadataStorageKey);
      if (!storedValue) {
        return defaultMetadata;
      }

      const parsedValue = JSON.parse(storedValue) as Partial<WizardMetadata>;
      const wizardCompleted = parsedValue.wizardCompleted === true;
      return {
        wizardCompleted,
        resultsValid:
          parsedValue.resultsValid === true ||
          (parsedValue.resultsValid === undefined && wizardCompleted),
        completedAt: typeof parsedValue.completedAt === 'string' ? parsedValue.completedAt : null,
        lastModifiedAt:
          typeof parsedValue.lastModifiedAt === 'string' ? parsedValue.lastModifiedAt : null,
        invalidatedAt:
          typeof parsedValue.invalidatedAt === 'string' ? parsedValue.invalidatedAt : null,
        currentStep:
          parsedValue.currentStep === 'completed'
            ? 'completed'
            : Number.isFinite(parsedValue.currentStep)
              ? Math.max(1, Math.min(12, Number(parsedValue.currentStep)))
              : defaultMetadata.currentStep
      };
    } catch {
      return defaultMetadata;
    }
  }

  private saveMetadata(metadata: WizardMetadata): void {
    try {
      globalThis.localStorage?.setItem(this.metadataStorageKey, JSON.stringify(metadata));
    } catch {
      // Ignore storage failures; the in-memory state still drives the current session.
    }
  }

  private defaultTileAssumption(tileQuality: TileQuality): BathroomAssumptions['tile'] {
    return {
      quality: tileQuality,
      pricePerM2: tilePriceDefaults[tileQuality],
      wasteFactorPercent: tileWasteFactorPercent,
      outdoorSuitableRequired: false,
      frostResistantRequired: false,
      slipResistanceRecommended: null,
      recommendedTileType: null,
      editable: true
    };
  }

  private defaultBathtubAssumption(
    bathtubType: BathtubType
  ): BathroomAssumptions['bathtub'] {
    const defaults = bathtubDefaults[bathtubType];
    return defaults
      ? {
          type: bathtubType,
          lengthCm: defaults.lengthCm,
          widthCm: defaults.widthCm,
          editable: true
        }
      : null;
  }

  private defaultShowerAssumption(showerType: ShowerType): BathroomAssumptions['shower'] {
    const defaults = showerDefaults[showerType];
    return defaults
      ? {
          type: showerType,
          lengthCm: defaults.lengthCm,
          widthCm: defaults.widthCm,
          editable: true
        }
      : null;
  }

  private defaultSinkAssumption(sinkOption: SinkOption): BathroomAssumptions['sink'] {
    const defaults = sinkDefaults[sinkOption];
    return defaults
      ? {
          type: sinkOption,
          widthCm: defaults.widthCm,
          count: defaults.count,
          editable: true
        }
      : null;
  }

  private defaultToiletAssumption(toiletOption: ToiletOption): BathroomAssumptions['toilet'] {
    const defaults = toiletDefaults[toiletOption];
    return defaults
      ? {
          type: toiletOption,
          estimatedWidthCm: defaults.estimatedWidthCm,
          installationType: defaults.installationType,
          editable: true
        }
      : null;
  }

  private defaultHeatingAssumption(
    heatingOption: HeatingOption,
    _bathroomSizeM2: number
  ): BathroomAssumptions['heating'] {
    return {
      towelRadiatorCount: this.hasTowelRadiator(heatingOption) ? 1 : 0,
      editable: true
    };
  }

  private defaultElectricalAssumption(state: BathroomWizardFormState): ElectricalAssumption {
    return {
      additionalSocketsCount: state.extras.additionalSockets ? 2 : 0,
      mirrorPowerConnectionCount: state.extras.mirrorCabinetWithLight ? 1 : 0,
      wallLightConnectionCount: state.extras.newLighting || state.extras.smartHome ? 1 : 0,
      ventilationOpeningCount: state.extras.ventilation ? 1 : 0,
      editable: true
    };
  }

  private optionHasShower(option: ShowerBathOption | null): boolean {
    return (
      option === 'shower_only' ||
      option === 'shower_and_bathtub' ||
      option === 'shower_bathtub_combination'
    );
  }

  private optionHasBathtub(option: ShowerBathOption | null): boolean {
    return (
      option === 'bathtub_only' ||
      option === 'shower_and_bathtub' ||
      option === 'shower_bathtub_combination'
    );
  }

  private optionHasWetArea(option: ShowerBathOption | null): boolean {
    return this.optionHasShower(option) || this.optionHasBathtub(option);
  }

  private hasFloorHeating(option: HeatingOption | null): boolean {
    return option === 'floor_heating' || option === 'floor_heating_and_towel_radiator';
  }

  private hasTowelRadiator(option: HeatingOption | null): boolean {
    return option === 'towel_radiator' || option === 'floor_heating_and_towel_radiator';
  }

  private clampArea(value: number): number {
    const boundedValue = Math.min(100, Math.max(1, value));
    return Number((Math.round(boundedValue * 2) / 2).toFixed(1));
  }

  private clampPositiveInteger(value: number): number {
    const safeValue = Number.isFinite(value) ? Math.round(value) : 1;
    return Math.max(1, safeValue);
  }

  private clampNonNegativeInteger(value: number): number {
    const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
    return Math.max(0, safeValue);
  }

  private clampNonNegative(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Number(value));
  }

  private normalizeWall(wall: BathroomWall): BathroomWall {
    const widthM = this.clampDecimal(wall.widthM, 0.1, 20);
    const heightM = this.clampDecimal(wall.heightM, 0.1, 5);
    const tileHeightM = this.clampDecimal(wall.tileHeightM, 0, heightM);
    const openings = (wall.openings ?? []).map((opening) => ({
      ...opening,
      type: opening.type ?? 'other',
      widthM: this.clampDecimal(opening.widthM, 0.1, widthM),
      heightM: this.clampDecimal(opening.heightM, 0.1, heightM),
      areaM2: opening.areaM2 ?? 0
    }));

    return this.areaCalculation.calculateWallAreas({
      ...wall,
      name: wall.name?.trim() ? wall.name : 'Wand',
      widthM,
      heightM,
      tileHeightM,
      openings,
      grossAreaM2: wall.grossAreaM2 ?? 0,
      openingsAreaM2: wall.openingsAreaM2 ?? 0,
      tileAreaM2: wall.tileAreaM2 ?? 0
    });
  }

  private clampDecimal(value: number, min: number, max: number): number {
    const safeValue = Number.isFinite(value) ? value : min;
    return Number(Math.min(max, Math.max(min, safeValue)).toFixed(2));
  }

  private nextWallNumber(walls: BathroomWall[]): number {
    return this.nextNumber(walls.map((wall) => wall.id), 'wall_');
  }

  private nextOpeningNumber(openings: WallOpening[]): number {
    return this.nextNumber(openings.map((opening) => opening.id), 'opening_');
  }

  private nextNumber(ids: string[], prefix: string): number {
    const usedNumbers = ids
      .map((id) => Number(id.replace(prefix, '')))
      .filter((value) => Number.isFinite(value));

    return usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
  }
}
