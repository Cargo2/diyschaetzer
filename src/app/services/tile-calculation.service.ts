import { Injectable } from '@angular/core';
import { MATERIAL_CALCULATION_DEFAULTS } from '../data/material-calculation-defaults';
import { BathroomWizardData, TileSize } from '../models/bathroom-wizard.model';
import {
  TileCalculationResult,
  TileSurfaceCalculation
} from '../models/material-list.model';
import {
  isLargeFormatTileSize,
  resolveFloorTileAreaM2
} from './wizard-data-derivations';

const TILE_FORMATS: Record<TileSize, { lengthCm: number; widthCm: number }> = {
  '30x30_cm': { lengthCm: 30, widthCm: 30 },
  '60x60_cm': { lengthCm: 60, widthCm: 60 },
  '30x60_cm': { lengthCm: 60, widthCm: 30 },
  '60x120_cm': { lengthCm: 120, widthCm: 60 },
  '120x120_cm': { lengthCm: 120, widthCm: 120 },
  mosaic: { lengthCm: 5, widthCm: 5 },
  unknown: {
    lengthCm: MATERIAL_CALCULATION_DEFAULTS.defaultTileLengthCm,
    widthCm: MATERIAL_CALCULATION_DEFAULTS.defaultTileWidthCm
  }
};

@Injectable({ providedIn: 'root' })
export class TileCalculationService {
  calculate(wizardData: BathroomWizardData): TileCalculationResult {
    const wasteFactorPercent = this.nonNegative(
      wizardData.assumptions?.wastePercent?.value ??
        wizardData.assumptions?.tile?.wasteFactorPercent,
      MATERIAL_CALCULATION_DEFAULTS.tileWastePercent
    );
    const floorAreaM2 = this.nonNegative(resolveFloorTileAreaM2(wizardData));
    const wallAreaM2 = this.nonNegative(wizardData.areaSummary?.totalWallTileAreaM2);
    const floorSize = this.effectiveSize(wizardData.floorTileSize, wizardData.wallTileSize);
    const wallSize = this.effectiveSize(wizardData.wallTileSize, wizardData.floorTileSize);

    const floor = this.calculateSurface(floorAreaM2, floorSize, wasteFactorPercent);
    const wall = this.calculateSurface(wallAreaM2, wallSize, wasteFactorPercent);

    const baseTileAreaM2 = this.nonNegative(
      wizardData.areaSummary?.totalTileAreaM2,
      floorAreaM2 + wallAreaM2
    );
    const wasteAreaM2 = baseTileAreaM2 * wasteFactorPercent / 100;
    const tileAreaWithWasteM2 = baseTileAreaM2 + wasteAreaM2;
    // Das Anzeigeformat folgt der größeren Teilfläche; Stückzahlen werden je
    // Teilfläche mit dem jeweils eigenen Format gerechnet.
    const displaySurface = floor.areaM2 >= wall.areaM2 ? floor : wall;

    return {
      baseTileAreaM2: this.round(baseTileAreaM2),
      wasteFactorPercent: this.round(wasteFactorPercent),
      wasteAreaM2: this.round(wasteAreaM2),
      tileAreaWithWasteM2: this.round(tileAreaWithWasteM2),
      tileLengthCm: displaySurface.tileLengthCm,
      tileWidthCm: displaySurface.tileWidthCm,
      singleTileAreaM2: displaySurface.singleTileAreaM2,
      tileCount: floor.tileCount + wall.tileCount,
      actualTileAreaByCountM2: this.round(
        floor.tileCount * floor.singleTileAreaM2 + wall.tileCount * wall.singleTileAreaM2
      ),
      isLargeFormat: floor.isLargeFormat || wall.isLargeFormat,
      floor,
      wall
    };
  }

  private calculateSurface(
    areaM2: number,
    size: TileSize,
    wasteFactorPercent: number
  ): TileSurfaceCalculation {
    const format = TILE_FORMATS[size];
    const areaWithWasteM2 = areaM2 * (1 + wasteFactorPercent / 100);
    const singleTileAreaM2 = (format.lengthCm / 100) * (format.widthCm / 100);
    return {
      areaM2: this.round(areaM2),
      areaWithWasteM2: this.round(areaWithWasteM2),
      tileLengthCm: format.lengthCm,
      tileWidthCm: format.widthCm,
      singleTileAreaM2: this.round(singleTileAreaM2),
      tileCount: singleTileAreaM2 > 0 ? Math.ceil(areaWithWasteM2 / singleTileAreaM2) : 0,
      isLargeFormat: isLargeFormatTileSize(size)
    };
  }

  private effectiveSize(
    primary: TileSize | null,
    fallback: TileSize | null
  ): TileSize {
    if (primary && primary !== 'unknown') {
      return primary;
    }
    if (fallback && fallback !== 'unknown') {
      return fallback;
    }
    return 'unknown';
  }

  private nonNegative(value: number | null | undefined, fallback = 0): number {
    return Number.isFinite(value) ? Math.max(0, Number(value)) : fallback;
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
