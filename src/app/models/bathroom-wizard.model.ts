export type RoomType =
  | 'bathroom'
  | 'guest_wc'
  | 'kitchen'
  | 'hallway'
  | 'living_area'
  | 'basement'
  | 'utility_room'
  | 'terrace_balcony'
  | 'other';

export interface RoomData {
  roomType: RoomType | null;
  roomName: string;
  isOutdoor: boolean;
}

export const ROOM_TYPE_DEFAULT_NAMES: Record<RoomType, string> = {
  bathroom: 'Bad',
  guest_wc: 'Gäste-WC',
  kitchen: 'Küche',
  hallway: 'Flur',
  living_area: 'Wohnraum',
  basement: 'Keller',
  utility_room: 'Hauswirtschaftsraum',
  terrace_balcony: 'Terrasse / Balkon',
  other: 'Anderer Raum'
};

export const defaultRoomData = (): RoomData => ({
  roomType: 'bathroom',
  roomName: ROOM_TYPE_DEFAULT_NAMES.bathroom,
  isOutdoor: false
});

export type WorkStatus = 'yes' | 'no' | 'unknown' | 'not_applicable';

export type SinkOption =
  | 'single_vanity'
  | 'double_vanity'
  | 'two_separate_sinks'
  | 'no_sink';

export type VanityCabinetOption = 'yes' | 'no' | 'unknown' | 'not_applicable';

export type ShowerBathOption =
  | 'shower_only'
  | 'bathtub_only'
  | 'shower_and_bathtub'
  | 'shower_bathtub_combination'
  | 'none';

export type ShowerType =
  | 'standard_cabin'
  | 'floor_level'
  | 'walk_in'
  | 'unknown'
  | 'not_applicable';

export type BathtubType =
  | 'standard'
  | 'freestanding'
  | 'corner'
  | 'unknown'
  | 'not_applicable';

export type HeatingOption =
  | 'floor_heating'
  | 'towel_radiator'
  | 'floor_heating_and_towel_radiator'
  | 'none'
  | 'unknown';

export type ToiletOption =
  | 'wall_hung'
  | 'floor_standing'
  | 'shower_toilet'
  | 'none'
  | 'unknown';

export type TilingScope =
  | 'floor_only'
  | 'floor_and_partial_walls'
  | 'floor_and_full_walls'
  | 'specific_areas'
  | 'unknown';

export type TileQuality = 'budget' | 'medium' | 'high' | 'premium' | 'unknown';

export type TileSize =
  | '30x30_cm'
  | '60x60_cm'
  | '30x60_cm'
  | '60x120_cm'
  | '120x120_cm'
  | 'mosaic'
  | 'unknown';

export type ExistingCoveringLocation =
  | 'existing_floor'
  | 'existing_walls'
  | 'existing_floor_and_walls'
  | 'none'
  | 'unknown';

export type SubstrateCondition =
  | 'stable_even'
  | 'minor_repairs_needed'
  | 'leveling_compound_needed'
  | 'unknown';

export type WaterproofingReason =
  | 'wet_area_selected'
  | 'renovation_project'
  | 'new_bathroom_project'
  | 'bathroom_project'
  | 'manual'
  | 'unknown';

export interface PreparationData {
  existingCovering: {
    status: WorkStatus;
    location: ExistingCoveringLocation;
    removeRequired: WorkStatus;
  };
  oldSanitaryObjects: {
    removeRequired: WorkStatus;
  };
  substrate: {
    condition: SubstrateCondition;
    levelingRequired: WorkStatus;
    primerRequired: WorkStatus;
    repairRequired: WorkStatus;
  };
  waterproofing: {
    required: WorkStatus;
    reason: WaterproofingReason;
    areaM2: number | null;
  };
  disposal: {
    required: WorkStatus;
    scope: 'old_tiles_or_coverings' | 'not_applicable' | 'unknown';
  };
}

export interface HeatingData {
  option: HeatingOption | null;
  floorHeating: {
    selected: boolean;
  };
  towelRadiator: {
    selected: boolean;
    count: number;
  };
}

export interface ScopeData {
  includeTileMaterial: boolean;
  includeInstallationMaterials: boolean;
  includeWaterproofing: boolean;
  includeBaseboards: boolean;
  includeTools: boolean;
  includeDisposal: boolean;
  includeLevelingWork: boolean;
}

export interface ExcludedItems {
  tileMaterial: boolean;
  installationMaterials: boolean;
  waterproofing: boolean;
  baseboards: boolean;
  tools: boolean;
  disposal: boolean;
  levelingWork: boolean;
}

export type WallOpeningType = 'door' | 'window' | 'niche' | 'other';

export interface WallOpening {
  id: string;
  type: WallOpeningType;
  widthM: number;
  heightM: number;
  areaM2: number;
}

export interface BathroomWall {
  id: string;
  name: string;
  widthM: number;
  heightM: number;
  tileHeightM: number;
  grossAreaM2: number;
  openings: WallOpening[];
  openingsAreaM2: number;
  tileAreaM2: number;
}

export interface AreaSummary {
  floorAreaM2: number;
  /** Bodenfläche, die tatsächlich gefliest wird (0 bei "nur bestimmte Bereiche"). */
  floorTileAreaM2: number;
  totalWallTileAreaM2: number;
  totalTileAreaM2: number;
}

export interface BathroomExtras {
  newLighting: boolean;
  mirrorCabinetWithLight: boolean;
  additionalSockets: boolean;
  ventilation: boolean;
  smartHome: boolean;
}

export type ExtrasSelection = 'selected' | 'none' | 'unknown';

export type ToiletInstallationType =
  | 'pre_wall_element'
  | 'floor_standing'
  | 'pre_wall_element_with_power'
  | 'unknown';

export interface TileAssumption {
  quality: TileQuality;
  pricePerM2: number;
  wasteFactorPercent: number;
  outdoorSuitableRequired: boolean;
  frostResistantRequired: boolean;
  slipResistanceRecommended: string | null;
  recommendedTileType: string | null;
  editable: true;
}

export interface BathtubAssumption {
  type: BathtubType;
  lengthCm: number;
  widthCm: number;
  editable: true;
}

export interface ShowerAssumption {
  type: ShowerType;
  lengthCm: number;
  widthCm: number;
  editable: true;
}

export interface SinkAssumption {
  type: SinkOption;
  widthCm: number;
  count: number;
  editable: true;
}

export interface ToiletAssumption {
  type: ToiletOption;
  estimatedWidthCm: number;
  installationType: ToiletInstallationType;
  editable: true;
}

export interface HeatingAssumption {
  towelRadiatorCount: number;
  editable: true;
}

export interface ElectricalAssumption {
  additionalSocketsCount: number;
  mirrorPowerConnectionCount: number;
  wallLightConnectionCount: number;
  ventilationOpeningCount: number;
  editable: true;
}

export type AssumptionSource =
  | 'default'
  | 'wizard'
  | 'calculated'
  | 'user_override'
  | 'not_relevant';

export interface AssumptionValue<T> {
  value: T;
  source: AssumptionSource;
  label: string;
  description: string | null;
  unit: string | null;
  editable: boolean;
  relevant: boolean;
  updatedAt: string | null;
}

export interface RoomCalculationAssumptions {
  wastePercent: AssumptionValue<number>;
  materialPrices: {
    tilePricePerM2: AssumptionValue<number>;
  };
  linearMeters: {
    sealTapeLfm: AssumptionValue<number>;
    siliconeJointsLfm: AssumptionValue<number>;
    baseboardLfm: AssumptionValue<number>;
    profileLfm: AssumptionValue<number>;
  };
  counts: {
    sealingCornerCount: AssumptionValue<number>;
    sealingSleeveCount: AssumptionValue<number>;
    drillHoleCount: AssumptionValue<number>;
    profileCount: AssumptionValue<number>;
  };
  substrate: {
    levelingThicknessMm: AssumptionValue<number>;
    levelingAreaM2: AssumptionValue<number>;
    minorRepairAreaM2: AssumptionValue<number>;
  };
  areas: {
    waterproofingAreaM2: AssumptionValue<number>;
  };
  professionalPrices: {
    siteSetupFlatRate: AssumptionValue<number>;
    floorTilingStandardPricePerM2: AssumptionValue<number>;
    floorTilingLargeFormatPricePerM2: AssumptionValue<number>;
    wallTilingPricePerM2: AssumptionValue<number>;
    waterproofingPricePerM2: AssumptionValue<number>;
    sealTapePricePerLfm: AssumptionValue<number>;
    sealingCornerPricePerPiece: AssumptionValue<number>;
    sealingSleevePricePerPiece: AssumptionValue<number>;
    drillHolePricePerPiece: AssumptionValue<number>;
    substrateMinorRepairPricePerM2: AssumptionValue<number>;
    levelingCompoundPricePerM2: AssumptionValue<number>;
    profilePricePerPiece: AssumptionValue<number>;
    siliconeJointPricePerLfm: AssumptionValue<number>;
    baseboardPricePerLfm: AssumptionValue<number>;
    vatPercent: AssumptionValue<number>;
  };
}

export interface BathroomAssumptions extends RoomCalculationAssumptions {
  tile: TileAssumption | null;
  bathtub: BathtubAssumption | null;
  shower: ShowerAssumption | null;
  sink: SinkAssumption | null;
  toilet: ToiletAssumption | null;
  heating: HeatingAssumption;
  electrical: ElectricalAssumption;
}

export interface WizardMetadata {
  wizardCompleted: boolean;
  resultsValid: boolean;
  completedAt: string | null;
  lastModifiedAt: string | null;
  invalidatedAt: string | null;
  currentStep: number | 'completed';
}

export interface BathroomWizardData {
  room: RoomData;
  bathroomSizeM2: number;
  sinkOption: SinkOption | null;
  vanityCabinet: VanityCabinetOption;
  showerBathOption: ShowerBathOption | null;
  showerType: ShowerType;
  bathtubType: BathtubType;
  heatingOption: HeatingOption | null;
  heating: HeatingData;
  toiletOption: ToiletOption | null;
  tilingScope: TilingScope | null;
  tileQuality: TileQuality | null;
  floorTileSize: TileSize | null;
  wallTileSize: TileSize | null;
  floorAreaM2: number;
  walls: BathroomWall[];
  areaSummary: AreaSummary;
  extrasSelection: ExtrasSelection;
  extras: BathroomExtras;
  preparation: PreparationData;
  scope: ScopeData;
  excludedItems: ExcludedItems;
  openIssues: string[];
  recommendations: string[];
  assumptions: BathroomAssumptions;
  metadata: WizardMetadata;
}

export interface BathroomWizardFormState {
  room: RoomData;
  bathroomSizeM2: number;
  sinkOption: SinkOption | null;
  vanityCabinet: VanityCabinetOption;
  showerBathOption: ShowerBathOption | null;
  showerType: ShowerType;
  bathtubType: BathtubType;
  heatingOption: HeatingOption | null;
  heating: HeatingData;
  toiletOption: ToiletOption | null;
  tilingScope: TilingScope | null;
  tileQuality: TileQuality | null;
  floorTileSize: TileSize | null;
  wallTileSize: TileSize | null;
  walls: BathroomWall[];
  extrasSelection: ExtrasSelection | null;
  extras: BathroomExtras;
  preparation: PreparationData;
  scope: ScopeData;
  assumptions: BathroomAssumptions;
}

export const tilePriceDefaults: Record<TileQuality, number> = {
  budget: 25,
  medium: 46,
  high: 75,
  premium: 110,
  unknown: 46
};

export const tileWasteFactorPercent = 10;

export const bathtubDefaults: Record<
  BathtubType,
  { lengthCm: number; widthCm: number } | null
> = {
  standard: { lengthCm: 170, widthCm: 75 },
  freestanding: { lengthCm: 180, widthCm: 80 },
  corner: { lengthCm: 140, widthCm: 140 },
  unknown: { lengthCm: 170, widthCm: 75 },
  not_applicable: null
};

export const showerDefaults: Record<
  ShowerType,
  { lengthCm: number; widthCm: number } | null
> = {
  standard_cabin: { lengthCm: 90, widthCm: 90 },
  floor_level: { lengthCm: 120, widthCm: 90 },
  walk_in: { lengthCm: 120, widthCm: 90 },
  unknown: { lengthCm: 100, widthCm: 90 },
  not_applicable: null
};

export const sinkDefaults: Record<
  SinkOption,
  { widthCm: number; count: number } | null
> = {
  single_vanity: { widthCm: 80, count: 1 },
  double_vanity: { widthCm: 120, count: 2 },
  two_separate_sinks: { widthCm: 60, count: 2 },
  no_sink: null
};

export const toiletDefaults: Record<
  ToiletOption,
  { installationType: ToiletInstallationType; estimatedWidthCm: number } | null
> = {
  wall_hung: {
    installationType: 'pre_wall_element',
    estimatedWidthCm: 40
  },
  floor_standing: {
    installationType: 'floor_standing',
    estimatedWidthCm: 40
  },
  shower_toilet: {
    installationType: 'pre_wall_element_with_power',
    estimatedWidthCm: 40
  },
  none: null,
  unknown: {
    installationType: 'unknown',
    estimatedWidthCm: 40
  }
};

export const defaultBathroomExtras = (): BathroomExtras => ({
  newLighting: false,
  mirrorCabinetWithLight: false,
  additionalSockets: false,
  ventilation: false,
  smartHome: false
});

export const defaultBathroomAssumptions = (): BathroomAssumptions => ({
  // Calculation assumptions are completed by AssumptionService once room data is available.
  ...({} as RoomCalculationAssumptions),
  tile: {
    quality: 'unknown',
    pricePerM2: tilePriceDefaults.unknown,
    wasteFactorPercent: tileWasteFactorPercent,
    outdoorSuitableRequired: false,
    frostResistantRequired: false,
    slipResistanceRecommended: null,
    recommendedTileType: null,
    editable: true
  },
  bathtub: null,
  shower: null,
  sink: null,
  toilet: null,
  heating: {
    towelRadiatorCount: 0,
    editable: true
  },
  electrical: {
    additionalSocketsCount: 0,
    mirrorPowerConnectionCount: 0,
    wallLightConnectionCount: 0,
    ventilationOpeningCount: 0,
    editable: true
  }
});

export const heatingDataFromOption = (
  option: HeatingOption | null,
  current?: HeatingData
): HeatingData => {
  const hasFloorHeating =
    option === 'floor_heating' || option === 'floor_heating_and_towel_radiator';
  const hasTowelRadiator =
    option === 'towel_radiator' || option === 'floor_heating_and_towel_radiator';
  return {
    option,
    floorHeating: {
      selected: hasFloorHeating
    },
    towelRadiator: {
      selected: hasTowelRadiator,
      count: hasTowelRadiator ? Math.max(1, current?.towelRadiator.count ?? 1) : 0
    }
  };
};

export const defaultPreparationData = (): PreparationData => ({
  existingCovering: {
    status: 'unknown',
    location: 'unknown',
    removeRequired: 'unknown'
  },
  oldSanitaryObjects: {
    removeRequired: 'unknown'
  },
  substrate: {
    condition: 'unknown',
    levelingRequired: 'unknown',
    primerRequired: 'yes',
    repairRequired: 'unknown'
  },
  waterproofing: {
    required: 'unknown',
    reason: 'unknown',
    areaM2: null
  },
  disposal: {
    required: 'unknown',
    scope: 'unknown'
  }
});

// Scope-Schalter sind standardmäßig aktiv; ob eine Position tatsächlich anfällt,
// entscheiden die konkreten Wizard-Antworten (Untergrundzustand, Rückbau, Nassbereich).
export const defaultScopeData = (): ScopeData => ({
  includeTileMaterial: true,
  includeInstallationMaterials: true,
  includeWaterproofing: true,
  includeBaseboards: false,
  includeTools: true,
  includeDisposal: true,
  includeLevelingWork: true
});

export const excludedItemsFromScope = (scope: ScopeData): ExcludedItems => ({
  tileMaterial: !scope.includeTileMaterial,
  installationMaterials: !scope.includeInstallationMaterials,
  waterproofing: !scope.includeWaterproofing,
  baseboards: !scope.includeBaseboards,
  tools: !scope.includeTools,
  disposal: !scope.includeDisposal,
  levelingWork: !scope.includeLevelingWork
});

export const defaultWizardMetadata = (): WizardMetadata => ({
  wizardCompleted: false,
  resultsValid: false,
  completedAt: null,
  lastModifiedAt: null,
  invalidatedAt: null,
  currentStep: 1
});

export const defaultBathroomWizardFormState = (): BathroomWizardFormState => ({
  room: {
    roomType: null,
    roomName: '',
    isOutdoor: false
  },
  bathroomSizeM2: 8,
  sinkOption: null,
  vanityCabinet: 'not_applicable',
  showerBathOption: null,
  showerType: 'not_applicable',
  bathtubType: 'not_applicable',
  heatingOption: null,
  heating: heatingDataFromOption(null),
  toiletOption: null,
  tilingScope: null,
  tileQuality: 'unknown',
  floorTileSize: null,
  wallTileSize: null,
  walls: [],
  extrasSelection: null,
  extras: defaultBathroomExtras(),
  preparation: defaultPreparationData(),
  scope: defaultScopeData(),
  assumptions: defaultBathroomAssumptions()
});
