import { Injectable } from '@angular/core';
import {
  ArticleType,
  MaterialCatalogItem,
  WorkStepId
} from '../data/material-catalog-with-prices';
import {
  BathroomWizardData,
  defaultPreparationData,
  defaultScopeData
} from '../models/bathroom-wizard.model';
import {
  isAnyLargeFormat,
  isBathroomRoom,
  optionHasBathtub,
  optionHasShower,
  resolveFloorTileAreaM2
} from './wizard-data-derivations';

export interface MaterialRule {
  id: string;
  description: string;
  appliesWhen: (data: BathroomWizardData) => boolean;
  includeMaterialIds?: string[];
  includeWorkStepIds?: WorkStepId[];
  excludeMaterialIds?: string[];
  excludeArticleTypes?: ArticleType[];
}

@Injectable({ providedIn: 'root' })
export class MaterialRequirementService {
  getRequiredMaterials(
    wizardData: BathroomWizardData,
    catalog: MaterialCatalogItem[]
  ): MaterialCatalogItem[] {
    const data = this.withDefaults(wizardData);

    return catalog.filter((material) => {
      if (!material.includeInDiy || material.articleType === 'documentation') {
        return false;
      }

      if (!this.scopeAllows(material, data)) {
        return false;
      }

      if (material.requiredWhen.length > 0) {
        return material.requiredWhen.every((condition) => this.matches(condition, data));
      }

      if (material.optionalWhen.length > 0) {
        return material.optionalWhen.some((condition) => this.matches(condition, data));
      }

      return material.requiredLevel !== 'conditional';
    });
  }

  private scopeAllows(material: MaterialCatalogItem, data: BathroomWizardData): boolean {
    const scope = data.scope;

    if (material.scopeKeys.some((key) => !this.scopeValue(key, data))) {
      return false;
    }

    if ((material.articleType === 'tool' || material.articleType === 'psa') && !scope.includeTools) {
      return false;
    }

    if (material.articleType === 'waste_disposal' && !scope.includeDisposal) {
      return false;
    }

    if (material.workStepIds.includes('waterproofing') && !scope.includeWaterproofing) {
      return false;
    }

    if (
      material.workStepIds.includes('substrate_repair_leveling') &&
      !scope.includeLevelingWork
    ) {
      return false;
    }

    if (!scope.includeBaseboards && material.tags.includes('sockel')) {
      return false;
    }

    return true;
  }

  /** Unterstützt `pfad=wert` und `pfad>zahl`. */
  private matches(condition: string, data: BathroomWizardData): boolean {
    const match = condition.match(/^([^=>]+)(=|>)(.+)$/);
    if (!match) {
      return false;
    }

    const [, path, operator, expected] = match;
    const actual = this.conditionValue(path.trim(), data);

    if (operator === '>') {
      return Number(actual) > Number(expected.trim());
    }
    return String(actual) === expected.trim();
  }

  private conditionValue(path: string, data: BathroomWizardData): unknown {
    const wetArea =
      isBathroomRoom(data) &&
      data.showerBathOption !== null &&
      data.showerBathOption !== 'none';
    const aliases: Record<string, unknown> = {
      'substrate.condition': data.preparation.substrate.condition,
      'substrate.levelingRequired': data.preparation.substrate.levelingRequired,
      'substrate.primerRequired': data.preparation.substrate.primerRequired,
      'waterproofing.required': data.preparation.waterproofing.required,
      'disposal.required': data.preparation.disposal.required,
      'existingCovering.status': data.preparation.existingCovering.status,
      'existingCovering.removeRequired': data.preparation.existingCovering.removeRequired,
      'tile.isLargeFormat': isAnyLargeFormat(data),
      'tile.format': this.tileFormatCategory(data),
      'tile.hasWallTiles': data.areaSummary.totalWallTileAreaM2 > 0,
      'tile.hasFloorTiles': resolveFloorTileAreaM2(data) > 0,
      wallTiling: data.areaSummary.totalWallTileAreaM2 > 0,
      wet_area: wetArea,
      wetAreaCorners: data.assumptions?.counts?.sealingCornerCount?.value ?? (wetArea ? 4 : 0),
      exposed_edges_lfm: data.assumptions?.linearMeters?.profileLfm?.value ?? 0,
      transitions_lfm: 0,
      manual_spacing: !isAnyLargeFormat(data),
      visible_cracks: false,
      showerHasShower: optionHasShower(data.showerBathOption),
      showerHasBathtub: optionHasBathtub(data.showerBathOption)
    };

    if (path in aliases) {
      return aliases[path];
    }

    return path.split('.').reduce<unknown>((value, key) => {
      if (value && typeof value === 'object' && key in value) {
        return (value as Record<string, unknown>)[key];
      }
      return undefined;
    }, data);
  }

  private scopeValue(key: string, data: BathroomWizardData): boolean {
    return Boolean((data.scope as unknown as Record<string, unknown>)[key]);
  }

  private tileFormatCategory(data: BathroomWizardData): 'small_wall' | 'standard' | 'large' {
    if (isAnyLargeFormat(data)) {
      return 'large';
    }

    if (data.wallTileSize === 'mosaic' || data.wallTileSize === '30x30_cm') {
      return 'small_wall';
    }

    return 'standard';
  }

  private withDefaults(data: BathroomWizardData): BathroomWizardData {
    const floorAreaM2 = data.areaSummary?.floorAreaM2 ?? data.floorAreaM2 ?? 0;
    return {
      ...data,
      areaSummary: {
        floorAreaM2,
        floorTileAreaM2:
          data.areaSummary?.floorTileAreaM2 ??
          (data.tilingScope === 'specific_areas' ? 0 : floorAreaM2),
        totalWallTileAreaM2: data.areaSummary?.totalWallTileAreaM2 ?? 0,
        totalTileAreaM2: data.areaSummary?.totalTileAreaM2 ?? data.floorAreaM2 ?? 0
      },
      preparation: data.preparation ?? defaultPreparationData(),
      scope: {
        ...defaultScopeData(),
        ...(data.scope ?? {})
      }
    };
  }
}
