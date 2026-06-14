import { inject, Injectable } from '@angular/core';
import { DIY_COST_DEFAULTS } from '../config/diy-cost-defaults';
import { RoomType } from '../models/bathroom-wizard.model';
import { SavedRoomCalculation } from '../models/local-project.model';
import {
  ProjectMaterialListViewModel,
  ProjectWarning
} from '../models/project-material-list.model';
import { CostComparisonService } from './cost-comparison.service';
import { MaterialListService } from './material-list.service';
import { ProjectMaterialListService } from './project-material-list.service';

export interface RoomCalculationSummary {
  roomId: string;
  roomName: string;
  roomType: RoomType;
  isOutdoor: boolean;
  tileAreaM2: number;
  tileAreaWithWasteM2: number;
  diyCost: number;
  professionalCost: number;
  savings: number;
  warnings: string[];
}

export interface ProjectAggregationResult {
  roomCount: number;
  totalTileAreaM2: number;
  totalTileAreaWithWasteM2: number;
  totalDiyCost: number;
  /** Summe der einzelnen Raum-DIY-Kosten, ohne projektweite Deduplizierung. */
  roomDiyCostSum: number;
  /** Differenz zwischen Raum-Summe und Projektsumme, v. a. einmalige Werkzeuge. */
  deduplicationSavings: number;
  totalProfessionalCost: number;
  totalSavings: number;
  totalMaterialCost: number;
  totalToolCostDeduplicated: number;
  roomSummaries: RoomCalculationSummary[];
  projectMaterialList: ProjectMaterialListViewModel;
  warnings: ProjectWarning[];
}

@Injectable({ providedIn: 'root' })
export class ProjectAggregationService {
  private readonly materialListService = inject(MaterialListService);
  private readonly projectMaterialListService = inject(ProjectMaterialListService);
  private readonly costComparisonService = inject(CostComparisonService);

  aggregateProject(rooms: SavedRoomCalculation[]): ProjectAggregationResult {
    const roomSummaries: RoomCalculationSummary[] = [];
    const warnings: ProjectWarning[] = [];
    const projectMaterialList =
      this.projectMaterialListService.buildProjectMaterialList(rooms);
    let totalProfessionalCost = 0;

    for (const room of rooms) {
      const materialList = this.materialListService.buildMaterialList(
        room.wizardData,
        room.materialListUserState
      );
      const comparison = this.costComparisonService.buildCostComparison(
        room.wizardData,
        materialList
      );
      totalProfessionalCost += comparison.professional.totalCost;

      const roomWarnings = [
        ...new Set([...materialList.warnings, ...comparison.warnings])
      ];
      warnings.push(
        ...roomWarnings.map((message, index) => ({
          id: `${room.id}-${index}-${this.warningId(message)}`,
          roomId: room.id,
          roomName: room.roomName,
          severity: 'warning' as const,
          message
        }))
      );
      roomSummaries.push({
        roomId: room.id,
        roomName: room.roomName,
        roomType: room.roomType,
        isOutdoor: room.isOutdoor,
        tileAreaM2: materialList.tileCalculation.baseTileAreaM2,
        tileAreaWithWasteM2: materialList.tileCalculation.tileAreaWithWasteM2,
        diyCost: comparison.diy.totalCost,
        professionalCost: comparison.professional.totalCost,
        savings: comparison.savings.amount,
        warnings: roomWarnings
      });
    }

    const totalMaterialCost = projectMaterialList.totalDisplayCost;
    const totalDiyCost =
      totalMaterialCost * (1 + DIY_COST_DEFAULTS.riskBufferPercent / 100);
    const roomDiyCostSum = roomSummaries.reduce((sum, room) => sum + room.diyCost, 0);

    return {
      roomCount: rooms.length,
      totalTileAreaM2: this.round(
        roomSummaries.reduce((sum, room) => sum + room.tileAreaM2, 0)
      ),
      totalTileAreaWithWasteM2: this.round(
        roomSummaries.reduce((sum, room) => sum + room.tileAreaWithWasteM2, 0)
      ),
      totalDiyCost: this.round(totalDiyCost),
      roomDiyCostSum: this.round(roomDiyCostSum),
      deduplicationSavings: this.round(Math.max(0, roomDiyCostSum - totalDiyCost)),
      totalProfessionalCost: this.round(totalProfessionalCost),
      totalSavings: this.round(Math.max(0, totalProfessionalCost - totalDiyCost)),
      totalMaterialCost: this.round(totalMaterialCost),
      totalToolCostDeduplicated:
        projectMaterialList.totalDeduplicatedToolCost,
      roomSummaries,
      projectMaterialList,
      warnings: this.deduplicateWarnings([
        ...warnings,
        ...projectMaterialList.warnings
      ])
    };
  }

  private warningId(message: string): string {
    return message
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
  }

  private deduplicateWarnings(warnings: ProjectWarning[]): ProjectWarning[] {
    const seen = new Set<string>();
    return warnings.filter((warning) => {
      const key = `${warning.roomId ?? 'project'}::${warning.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
