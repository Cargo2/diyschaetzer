import { Injectable } from '@angular/core';
import {
  ESTIMATE_EXPORT_LEGAL_NOTICE,
  ExportDocumentData,
  ExportDocumentSection
} from '../models/export-document.model';
import { BathroomWizardData, ROOM_TYPE_DEFAULT_NAMES } from '../models/bathroom-wizard.model';
import { MaterialListViewModel } from '../models/material-list.model';
import { ProjectMaterialListViewModel } from '../models/project-material-list.model';
import { CostComparisonViewModel } from './cost-comparison.service';
import { ProjectAggregationResult } from './project-aggregation.service';

@Injectable({ providedIn: 'root' })
export class ExportDataMapperService {
  buildRoomSummaryExportData(
    wizardData: BathroomWizardData,
    materialListViewModel: MaterialListViewModel,
    costComparisonViewModel: CostComparisonViewModel
  ): ExportDocumentData {
    const roomType = wizardData.room.roomType ?? 'bathroom';
    const sections: ExportDocumentSection[] = [
      {
        id: 'room',
        title: 'Raumübersicht',
        type: 'summary_cards',
        content: {
          roomName: wizardData.room.roomName,
          roomType: ROOM_TYPE_DEFAULT_NAMES[roomType],
          tileAreaM2: materialListViewModel.tileCalculation.baseTileAreaM2,
          tileAreaWithWasteM2: materialListViewModel.tileCalculation.tileAreaWithWasteM2
        }
      },
      {
        id: 'important_assumptions',
        title: 'Wichtige Annahmen',
        type: 'text',
        content: {
          wastePercent: wizardData.assumptions.wastePercent.value,
          tilePricePerM2: wizardData.assumptions.materialPrices.tilePricePerM2.value
        }
      }
    ];
    this.addWarningsSection(sections, [
      ...materialListViewModel.warnings,
      ...costComparisonViewModel.warnings
    ]);
    return this.createDocument({
      documentType: 'room_summary',
      title: 'Raum-Zusammenfassung',
      subtitle: ROOM_TYPE_DEFAULT_NAMES[roomType],
      roomName: wizardData.room.roomName,
      sections,
      totals: {
        materialTotal: materialListViewModel.totalDisplayCost,
        diyTotal: costComparisonViewModel.diy.totalCost,
        professionalTotal: costComparisonViewModel.professional.totalCost
      }
    });
  }

  buildMaterialListExportData(
    wizardDataOrMaterialList: BathroomWizardData | MaterialListViewModel,
    optionalMaterialList?: MaterialListViewModel
  ): ExportDocumentData {
    const wizardData = optionalMaterialList
      ? wizardDataOrMaterialList as BathroomWizardData
      : null;
    const materialListViewModel = optionalMaterialList
      ?? wizardDataOrMaterialList as MaterialListViewModel;
    const sections: ExportDocumentSection[] = materialListViewModel.sections.map(
      (section) => ({
        id: section.id,
        title: section.title,
        type: 'table',
        content: section.items.map((item) => ({
          id: item.materialId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          packageCount: item.packageCount,
          packageUnit: item.packageUnit,
          unitPrice: item.unitPrice,
          total: item.displayCost,
          active: item.isActive,
          note: item.calculationNote
        }))
      })
    );

    this.addWarningsSection(sections, materialListViewModel.warnings);

    return this.createDocument({
      documentType: 'material_list',
      title: 'Materialliste',
      subtitle: 'Materialbedarf und unverbindliche Kostenschätzung',
      roomName: wizardData?.room.roomName ?? null,
      sections,
      totals: {
        grossTotal: materialListViewModel.totalDisplayCost,
        materialTotal: materialListViewModel.totalDisplayCost
      }
    });
  }

  buildProjectMaterialListExportData(
    projectMaterialListViewModel: ProjectMaterialListViewModel
  ): ExportDocumentData {
    const sections: ExportDocumentSection[] =
      projectMaterialListViewModel.sections.map((section) => ({
        id: section.id,
        title: section.title,
        type: 'table',
        content: section.items
      }));
    this.addWarningsSection(
      sections,
      projectMaterialListViewModel.warnings.map((warning) => warning.message)
    );
    return this.createDocument({
      documentType: 'project_material_list',
      title: 'Projekt-Materialliste',
      subtitle: 'Materialbedarf aller gespeicherten Räume',
      sections,
      totals: {
        materialTotal: projectMaterialListViewModel.totalDisplayCost
      }
    });
  }

  buildProjectSummaryExportData(
    projectAggregationResult: ProjectAggregationResult
  ): ExportDocumentData {
    const sections: ExportDocumentSection[] = [
      {
        id: 'project_totals',
        title: 'Projektübersicht',
        type: 'summary_cards',
        content: {
          roomCount: projectAggregationResult.roomCount,
          totalTileAreaM2: projectAggregationResult.totalTileAreaM2,
          totalTileAreaWithWasteM2:
            projectAggregationResult.totalTileAreaWithWasteM2,
          totalMaterialCost: projectAggregationResult.totalMaterialCost,
          totalToolCostDeduplicated:
            projectAggregationResult.totalToolCostDeduplicated,
          totalSavings: projectAggregationResult.totalSavings
        }
      },
      {
        id: 'rooms',
        title: 'Räume',
        type: 'table',
        content: projectAggregationResult.roomSummaries
      }
    ];

    this.addWarningsSection(
      sections,
      projectAggregationResult.warnings.map((warning) =>
        warning.roomName
          ? `${warning.roomName}: ${warning.message}`
          : warning.message
      )
    );

    return this.createDocument({
      documentType: 'project_summary',
      title: 'Projektzusammenfassung',
      subtitle: 'Zusammenfassung aller gespeicherten Räume',
      sections,
      totals: {
        diyTotal: projectAggregationResult.totalDiyCost,
        professionalTotal: projectAggregationResult.totalProfessionalCost
      }
    });
  }

  buildProfessionalComparisonExportData(
    costComparisonViewModel: CostComparisonViewModel
  ): ExportDocumentData {
    const offer = costComparisonViewModel.professional.offer;
    const sections: ExportDocumentSection[] = [
      {
        id: 'comparison',
        title: 'Kostenvergleich',
        type: 'summary_cards',
        content: {
          diyTotal: costComparisonViewModel.diy.totalCost,
          professionalTotal: costComparisonViewModel.professional.totalCost,
          savingsAmount: costComparisonViewModel.savings.amount,
          savingsPercent: costComparisonViewModel.savings.percent
        }
      },
      {
        id: 'professional_line_items',
        title: 'Profi-Leistungspositionen',
        type: 'line_items',
        content: offer.lineItems
      },
      {
        id: 'assumptions',
        title: 'Annahmen',
        type: 'text',
        content: costComparisonViewModel.assumptions
      }
    ];

    this.addWarningsSection(sections, costComparisonViewModel.warnings);

    return this.createDocument({
      documentType: 'professional_comparison',
      title: 'Profi-Vergleich',
      subtitle: 'DIY-Kosten und geschätzte Fachbetriebskosten',
      sections,
      totals: {
        netTotal: offer.netTotal,
        vatPercent: offer.vatPercent,
        vatAmount: offer.vatAmount,
        grossTotal: offer.grossTotal,
        diyTotal: costComparisonViewModel.diy.totalCost,
        professionalTotal: costComparisonViewModel.professional.totalCost
      }
    });
  }

  private createDocument(
    values: Pick<
      ExportDocumentData,
      'documentType' | 'title' | 'subtitle' | 'sections' | 'totals'
    > &
      Partial<Pick<ExportDocumentData, 'projectName' | 'roomName'>>
  ): ExportDocumentData {
    return {
      ...values,
      projectName: values.projectName ?? null,
      roomName: values.roomName ?? null,
      createdAt: new Date().toISOString(),
      legalNotice: ESTIMATE_EXPORT_LEGAL_NOTICE
    };
  }

  private addWarningsSection(
    sections: ExportDocumentSection[],
    warnings: string[]
  ): void {
    if (warnings.length > 0) {
      sections.push({
        id: 'warnings',
        title: 'Hinweise',
        type: 'warnings',
        content: warnings
      });
    }
  }
}
