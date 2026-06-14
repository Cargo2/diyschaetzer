import {
  RequiredLevel,
  WorkStepId
} from '../data/material-catalog-with-prices';
import { ProductMonetizationData } from './monetization.model';

export interface TileSurfaceCalculation {
  areaM2: number;
  areaWithWasteM2: number;
  tileLengthCm: number;
  tileWidthCm: number;
  singleTileAreaM2: number;
  tileCount: number;
  isLargeFormat: boolean;
}

export interface TileCalculationResult {
  baseTileAreaM2: number;
  wasteFactorPercent: number;
  wasteAreaM2: number;
  tileAreaWithWasteM2: number;
  tileLengthCm: number;
  tileWidthCm: number;
  singleTileAreaM2: number;
  tileCount: number;
  actualTileAreaByCountM2: number;
  isLargeFormat: boolean;
  floor: TileSurfaceCalculation;
  wall: TileSurfaceCalculation;
}

export interface MaterialQuantityResult {
  materialId: string;
  quantity: number | null;
  unit: string | null;
  packageCount: number | null;
  packageUnit: string | null;
  /** Gebindegröße in der Einheit von `quantity`; null, wenn nicht gebindebasiert. */
  packageSize: number | null;
  estimatedCost: number | null;
  calculationNote: string;
  priceSource: string | null;
}

export interface MaterialListItemViewModel {
  materialId: string;
  name: string;
  description: string;
  articleType: string;
  requirementType: RequiredLevel;
  quantity: number | null;
  unit: string | null;
  packageCount: number | null;
  packageUnit: string | null;
  packageSize: number | null;
  unitPrice: number | null;
  priceUnit: string | null;
  calculatedCost: number | null;
  displayCost: number | null;
  priceRetailer: string | null;
  priceType: string | null;
  calculationNote: string;
  affiliateLink: string | null;
  monetization: ProductMonetizationData;
  productCatalogItemId: string | null;
  workStepIds: WorkStepId[];
  workStepLabels: string[];
  isActive: boolean;
  isExcludedByUser: boolean;
  isExcludedByOptionalToggle: boolean;
  excludedReason: 'user' | 'optional_toggle' | null;
}

export interface MaterialListSection {
  id: WorkStepId;
  title: string;
  description: string;
  totalCalculatedCost: number;
  totalDisplayCost: number;
  items: MaterialListItemViewModel[];
}

export interface MaterialListViewModel {
  tileCalculation: TileCalculationResult;
  totalCalculatedCost: number;
  totalDisplayCost: number;
  activeItemCount: number;
  inactiveItemCount: number;
  optionalExcludedCount: number;
  userExcludedCount: number;
  sections: MaterialListSection[];
  warnings: string[];
}

export interface MaterialListUserState {
  includeOptionalMaterials: boolean;
  excludedMaterialIds: string[];
}
