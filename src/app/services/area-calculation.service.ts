import { Injectable } from '@angular/core';
import {
  AreaSummary,
  BathroomWall,
  BathroomWizardData,
  BathroomWizardFormState,
  WallOpening
} from '../models/bathroom-wizard.model';

@Injectable({ providedIn: 'root' })
export class AreaCalculationService {
  calculateFloorArea(bathroomSizeM2: number): number {
    return this.roundToTwoDecimals(Math.max(0, Number.isFinite(bathroomSizeM2) ? bathroomSizeM2 : 0));
  }

  calculateOpeningArea(opening: WallOpening): number {
    return this.roundToTwoDecimals(this.safePositive(opening.widthM) * this.safePositive(opening.heightM));
  }

  calculateWallAreas(wall: BathroomWall): BathroomWall {
    const openings = wall.openings.map((opening) => ({
      ...opening,
      areaM2: this.calculateOpeningArea(opening)
    }));
    const grossAreaM2 = this.roundToTwoDecimals(this.safePositive(wall.widthM) * Math.max(0, wall.tileHeightM));
    const openingsAreaM2 = this.roundToTwoDecimals(
      openings.reduce((total, opening) => total + opening.areaM2, 0)
    );

    return {
      ...wall,
      grossAreaM2,
      openings,
      openingsAreaM2,
      tileAreaM2: this.roundToTwoDecimals(Math.max(0, grossAreaM2 - openingsAreaM2))
    };
  }

  calculateAreaSummary(data: BathroomWizardData | BathroomWizardFormState): AreaSummary {
    const floorAreaM2 = this.calculateFloorArea(data.bathroomSizeM2);
    const walls = data.tilingScope === 'floor_only' ? [] : data.walls.map((wall) => this.calculateWallAreas(wall));
    const totalWallTileAreaM2 = this.roundToTwoDecimals(
      walls.reduce((total, wall) => total + wall.tileAreaM2, 0)
    );
    // Bei "nur bestimmte Bereiche" wird der Boden nicht gefliest; die erfassten
    // Teilflächen laufen über die Wand-/Bereichserfassung.
    const floorTileAreaM2 = data.tilingScope === 'specific_areas' ? 0 : floorAreaM2;

    let totalTileAreaM2 = floorTileAreaM2;

    if (data.tilingScope !== 'floor_only') {
      totalTileAreaM2 = floorTileAreaM2 + totalWallTileAreaM2;
    }

    return {
      floorAreaM2,
      floorTileAreaM2,
      totalWallTileAreaM2,
      totalTileAreaM2: this.roundToTwoDecimals(totalTileAreaM2)
    };
  }

  roundToTwoDecimals(value: number): number {
    return Number((Math.round((Number.isFinite(value) ? value : 0) * 100) / 100).toFixed(2));
  }

  private safePositive(value: number): number {
    return Math.max(0, Number.isFinite(value) ? value : 0);
  }
}
