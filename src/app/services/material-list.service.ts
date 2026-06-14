import { inject, Injectable } from '@angular/core';
import {
  MATERIAL_CATALOG,
  MaterialCatalogItem,
  RequiredLevel,
  WORK_STEPS,
  WorkStepId
} from '../data/material-catalog-with-prices';
import { BathroomWizardData, defaultScopeData } from '../models/bathroom-wizard.model';
import {
  MaterialListItemViewModel,
  MaterialListSection,
  MaterialListUserState,
  MaterialListViewModel
} from '../models/material-list.model';
import { createNeutralProductMonetization } from '../models/monetization.model';
import { MaterialQuantityService } from './material-quantity.service';
import { MaterialRequirementService } from './material-requirement.service';
import { TileCalculationService } from './tile-calculation.service';

const REQUIREMENT_ORDER: Record<RequiredLevel, number> = {
  required: 0,
  conditional: 1,
  recommended: 2,
  optional: 3
};

@Injectable({ providedIn: 'root' })
export class MaterialListService {
  private readonly tileCalculation = inject(TileCalculationService);
  private readonly materialRequirement = inject(MaterialRequirementService);
  private readonly materialQuantity = inject(MaterialQuantityService);

  buildMaterialList(
    wizardData: BathroomWizardData,
    userState: MaterialListUserState
  ): MaterialListViewModel {
    const tileCalculation = this.tileCalculation.calculate(wizardData);
    const materials = this.materialRequirement.getRequiredMaterials(wizardData, MATERIAL_CATALOG);
    const stepMap = new Map(WORK_STEPS.map((step) => [step.id, step]));
    const sectionItems = new Map<WorkStepId, MaterialListItemViewModel[]>();

    for (const material of materials) {
      const primaryStep = this.primaryStep(material);
      if (!primaryStep) {
        continue;
      }

      const quantity = this.materialQuantity.calculateQuantity(material, wizardData, tileCalculation);
      const isExcludedByUser = userState.excludedMaterialIds.includes(material.id);
      const isExcludedByOptionalToggle =
        !userState.includeOptionalMaterials && material.requiredLevel === 'optional';
      const isActive = !isExcludedByUser && !isExcludedByOptionalToggle;
      const item: MaterialListItemViewModel = {
        materialId: material.id,
        name: material.name,
        description: material.description,
        articleType: material.articleType,
        requirementType: material.requiredLevel,
        quantity: quantity.quantity,
        unit: quantity.unit,
        packageCount: quantity.packageCount,
        packageUnit: quantity.packageUnit,
        packageSize: quantity.packageSize,
        unitPrice: material.id === 'tiles_main'
          ? wizardData.assumptions?.materialPrices?.tilePricePerM2?.value
            ?? wizardData.assumptions?.tile?.pricePerM2
            ?? material.price.amount
          : material.price.amount,
        priceUnit: material.price.priceUnit,
        calculatedCost: quantity.estimatedCost,
        displayCost: isActive ? quantity.estimatedCost : 0,
        priceRetailer: material.price.retailer,
        priceType: material.price.priceType,
        calculationNote: quantity.calculationNote,
        affiliateLink: material.affiliateLink,
        monetization: material.monetization
          ? { ...material.monetization }
          : createNeutralProductMonetization(),
        productCatalogItemId: material.productCatalogItemId ?? null,
        workStepIds: material.workStepIds,
        workStepLabels: material.workStepIds
          .map((id) => stepMap.get(id)?.label)
          .filter((label): label is string => Boolean(label)),
        isActive,
        isExcludedByUser,
        isExcludedByOptionalToggle,
        excludedReason: isExcludedByUser
          ? 'user'
          : isExcludedByOptionalToggle
            ? 'optional_toggle'
            : null
      };

      sectionItems.set(primaryStep, [...(sectionItems.get(primaryStep) ?? []), item]);
    }

    const sections: MaterialListSection[] = WORK_STEPS
      .filter((step) => sectionItems.has(step.id))
      .map((step) => {
        const items = (sectionItems.get(step.id) ?? []).sort(
          (a, b) =>
            REQUIREMENT_ORDER[a.requirementType] - REQUIREMENT_ORDER[b.requirementType] ||
            a.name.localeCompare(b.name, 'de')
        );
        return {
          id: step.id,
          title: step.label,
          description: step.description,
          totalCalculatedCost: this.round(
            items.reduce((sum, item) => sum + (item.calculatedCost ?? 0), 0)
          ),
          totalDisplayCost: this.round(
            items.reduce((sum, item) => sum + (item.displayCost ?? 0), 0)
          ),
          items
        };
      });

    const allItems = sections.flatMap((section) => section.items);
    return {
      tileCalculation,
      totalCalculatedCost: this.round(
        sections.reduce((sum, section) => sum + section.totalCalculatedCost, 0)
      ),
      totalDisplayCost: this.round(
        sections.reduce((sum, section) => sum + section.totalDisplayCost, 0)
      ),
      activeItemCount: allItems.filter((item) => item.isActive).length,
      inactiveItemCount: allItems.filter((item) => !item.isActive).length,
      optionalExcludedCount: allItems.filter((item) => item.isExcludedByOptionalToggle).length,
      userExcludedCount: allItems.filter((item) => item.isExcludedByUser).length,
      sections,
      warnings: this.buildWarnings(wizardData, tileCalculation.isLargeFormat)
    };
  }

  private primaryStep(material: MaterialCatalogItem): WorkStepId | null {
    return WORK_STEPS
      .filter((step) => material.workStepIds.includes(step.id))
      .sort((a, b) => a.order - b.order)[0]?.id ?? null;
  }

  private buildWarnings(data: BathroomWizardData, isLargeFormat: boolean): string[] {
    const scope = { ...defaultScopeData(), ...(data.scope ?? {}) };
    const warnings: string[] = [];

    if (!scope.includeTileMaterial) {
      warnings.push('Fliesenmaterial ist ausgeschlossen. Die Fliesenmenge wird nur zur Orientierung angezeigt.');
    }
    if (
      !scope.includeWaterproofing &&
      (data.preparation?.waterproofing?.required === 'yes' ||
        (data.showerBathOption !== null && data.showerBathOption !== 'none'))
    ) {
      warnings.push('Abdichtung wurde ausgeschlossen, obwohl ein Nassbereich ausgewählt wurde.');
    }
    if (!data.preparation || data.preparation.substrate.condition === 'unknown') {
      warnings.push('Untergrundzustand ist unklar. Materialbedarf für Ausgleichsarbeiten kann abweichen.');
    }
    if (isLargeFormat) {
      warnings.push('Großformatige Fliesen erfordern einen sehr ebenen Untergrund und geeignetes Verlegematerial.');
    }
    if (data.room?.isOutdoor) {
      warnings.push(
        'Außenbereiche sind deutlich anspruchsvoller als Innenräume. Die Schätzung ist nur eine grobe Orientierung.',
        'Frost, Feuchtigkeit, Temperaturwechsel und Entwässerung können die Verlegung stark beeinflussen.',
        'Ein geeignetes Gefälle und eine funktionierende Entwässerung müssen bauseits geprüft werden.',
        'Nicht jede Innenraumfliese ist für Terrasse oder Balkon geeignet. Verwende ausdrücklich frostsichere Outdoor-Fliesen.',
        'Prüfe Flexkleber und Fugenmasse auf Außeneignung sowie ein passendes Abdichtungs-, Entkopplungs- oder Drainagesystem.'
      );
    }

    return warnings;
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
