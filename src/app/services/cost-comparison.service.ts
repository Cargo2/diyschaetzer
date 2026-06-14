import { inject, Injectable } from '@angular/core';
import { DIY_COST_DEFAULTS } from '../config/diy-cost-defaults';
import { BathroomWizardData, defaultScopeData } from '../models/bathroom-wizard.model';
import {
  MaterialListItemViewModel,
  MaterialListViewModel
} from '../models/material-list.model';
import {
  ProfessionalOfferResult,
  ProfessionalOfferService
} from './professional-offer.service';

export interface DiyCostGroup {
  id: string;
  label: string;
  cost: number;
}

export interface DiyCostSummary {
  materialCost: number;
  diyBufferPercent: number;
  diyBufferCost: number;
  totalCost: number;
  activeMaterialItems: number;
  inactiveMaterialItems: number;
  costGroups: DiyCostGroup[];
}

export interface SavingsSummary {
  amount: number;
  percent: number;
  label: string;
}

export interface CostComparisonViewModel {
  diy: DiyCostSummary;
  professional: {
    offer: ProfessionalOfferResult;
    materialCost: number;
    totalCost: number;
  };
  savings: SavingsSummary;
  assumptions: string[];
  warnings: string[];
}

const COST_GROUPS: Record<string, string> = {
  tiles: 'Fliesenmaterial',
  installation: 'Verlegematerial',
  waterproofing: 'Abdichtung',
  substrate: 'Untergrundvorbereitung',
  tools: 'Werkzeug & Schutz',
  disposal: 'Entsorgung',
  other: 'Sonstiges'
};

@Injectable({ providedIn: 'root' })
export class CostComparisonService {
  private readonly professionalOffer = inject(ProfessionalOfferService);

  buildCostComparison(
    wizardData: BathroomWizardData,
    materialListViewModel: MaterialListViewModel
  ): CostComparisonViewModel {
    const materialCost = this.nonNegative(materialListViewModel?.totalDisplayCost);
    const offer = this.professionalOffer.buildProfessionalOffer(
      wizardData,
      materialListViewModel
    );
    const professionalMaterialCost = this.getProfessionalMaterialCost(
      materialListViewModel
    );
    const professionalTotal = offer.grossTotal + professionalMaterialCost;
    const diyBufferCost = materialCost * DIY_COST_DEFAULTS.riskBufferPercent / 100;
    const diyTotalCost = materialCost + diyBufferCost;
    const savingsAmount = Math.max(0, professionalTotal - diyTotalCost);
    const savingsPercent =
      professionalTotal > 0 && savingsAmount > 0
        ? savingsAmount / professionalTotal * 100
        : 0;
    const scope = {
      ...defaultScopeData(),
      ...(wizardData.scope ?? {})
    };
    const warnings = [...offer.warnings];

    if ((materialListViewModel?.inactiveItemCount ?? 0) > 0) {
      warnings.push(
        'Die Materialliste wurde angepasst. Entfernte Positionen sind nicht in der aktuellen Schätzung enthalten.'
      );
    }
    if (!scope.includeTileMaterial) {
      warnings.push(
        'Fliesenmaterial wurde im Wizard ausgeschlossen und wird im Vergleich nicht eingerechnet.'
      );
    }

    return {
      diy: {
        materialCost: this.round(materialCost),
        diyBufferPercent: DIY_COST_DEFAULTS.riskBufferPercent,
        diyBufferCost: this.round(diyBufferCost),
        totalCost: this.round(diyTotalCost),
        activeMaterialItems: materialListViewModel?.activeItemCount ?? 0,
        inactiveMaterialItems: materialListViewModel?.inactiveItemCount ?? 0,
        costGroups: this.buildCostGroups(materialListViewModel)
      },
      professional: {
        offer,
        materialCost: this.round(professionalMaterialCost),
        totalCost: this.round(professionalTotal)
      },
      savings: {
        amount: this.round(savingsAmount),
        percent: this.round(savingsPercent, 1),
        label:
          savingsAmount > 0
            ? 'Mögliche Ersparnis durch Eigenleistung'
            : 'Keine rechnerische Ersparnis'
      },
      assumptions: [
        ...offer.assumptions,
        `DIY-Puffer: ${DIY_COST_DEFAULTS.riskBufferPercent} %`,
        'Profi-Materialkosten enthalten keine DIY-Werkzeuge, PSA oder Dokumentation.'
      ],
      warnings: [...new Set(warnings)]
    };
  }

  getProfessionalMaterialCost(materialList: MaterialListViewModel): number {
    const excludedTypes = new Set(['tool', 'psa', 'documentation']);
    const items = materialList?.sections?.flatMap((section) => section.items) ?? [];

    return this.round(
      items
        .filter(
          (item) =>
            item.isActive &&
            !excludedTypes.has(item.articleType) &&
            this.nonNegative(item.displayCost) > 0
        )
        .reduce((sum, item) => sum + this.nonNegative(item.displayCost), 0)
    );
  }

  private buildCostGroups(materialList: MaterialListViewModel): DiyCostGroup[] {
    const totals = new Map<string, number>();
    const items = materialList?.sections?.flatMap((section) => section.items) ?? [];

    for (const item of items) {
      const cost = this.nonNegative(item.displayCost);
      if (!item.isActive || cost <= 0) {
        continue;
      }

      const groupId = this.groupId(item);
      totals.set(groupId, (totals.get(groupId) ?? 0) + cost);
    }

    return Object.entries(COST_GROUPS)
      .map(([id, label]) => ({
        id,
        label,
        cost: this.round(totals.get(id) ?? 0)
      }))
      .filter((group) => group.cost > 0);
  }

  private groupId(item: MaterialListItemViewModel): string {
    if (item.articleType === 'waste_disposal') return 'disposal';
    if (item.articleType === 'tool' || item.articleType === 'psa') return 'tools';
    if (item.workStepIds.includes('waterproofing')) return 'waterproofing';
    if (
      item.workStepIds.includes('substrate_inspection') ||
      item.workStepIds.includes('substrate_cleaning') ||
      item.workStepIds.includes('substrate_repair_leveling') ||
      item.workStepIds.includes('priming')
    ) {
      return 'substrate';
    }
    if (item.articleType === 'main_material' || item.materialId === 'tiles_main') {
      return 'tiles';
    }
    if (item.articleType === 'consumable' || item.articleType === 'accessory') {
      return 'installation';
    }
    return 'other';
  }

  private nonNegative(value: number | null | undefined): number {
    return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
  }

  private round(value: number, digits = 2): number {
    return Number(value.toFixed(digits));
  }
}
