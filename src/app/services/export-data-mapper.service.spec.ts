import { COMMERCIAL_CONFIG, DEFAULT_WHITE_LABEL_CONFIG } from '../config/commercial.config';
import { DEFAULT_FEATURE_ACCESS } from '../models/commercial.model';
import {
  ESTIMATE_EXPORT_LEGAL_NOTICE,
  ExportOfferGroup
} from '../models/export-document.model';
import { MaterialListViewModel } from '../models/material-list.model';
import { createNeutralProductMonetization } from '../models/monetization.model';
import { CostComparisonViewModel } from './cost-comparison.service';
import { ExportDataMapperService } from './export-data-mapper.service';
import { ProjectAggregationResult } from './project-aggregation.service';

describe('commercial preparation', () => {
  it('keeps monetization and future commercial features neutral by default', () => {
    expect(createNeutralProductMonetization()).toEqual({
      monetizationType: 'none',
      merchantName: null,
      merchantProductId: null,
      productUrl: null,
      affiliateUrl: null,
      sponsored: false,
      sponsoredLabelRequired: false,
      commissionNote: null
    });
    expect(Object.values(COMMERCIAL_CONFIG).every((enabled) => !enabled)).toBe(true);
    const pdfAccess = DEFAULT_FEATURE_ACCESS.find((access) => access.feature === 'pdf_export');
    expect(pdfAccess).toEqual({
      feature: 'pdf_export',
      enabled: true,
      requiredPlan: 'pro',
      allowedRoles: ['contractor', 'admin']
    });
    expect(DEFAULT_WHITE_LABEL_CONFIG.enabled).toBe(false);
  });
});

describe('ExportDataMapperService', () => {
  const service = new ExportDataMapperService();

  it('maps material sections and their estimated total', () => {
    const result = service.buildMaterialListExportData({
      sections: [
        {
          id: 'floor_tiling',
          title: 'Bodenfliesen verlegen',
          description: 'Material',
          totalCalculatedCost: 50,
          totalDisplayCost: 50,
          items: []
        }
      ],
      totalCalculatedCost: 50,
      totalDisplayCost: 50,
      activeItemCount: 0,
      inactiveItemCount: 0,
      optionalExcludedCount: 0,
      userExcludedCount: 0,
      warnings: [],
      tileCalculation: {} as MaterialListViewModel['tileCalculation']
    } satisfies MaterialListViewModel);

    expect(result.documentType).toBe('material_list');
    expect(result.sections[0].type).toBe('table');
    expect(result.totals.grossTotal).toBe(50);
  });

  it('maps a project aggregation into neutral export data', () => {
    const result = service.buildProjectSummaryExportData({
      roomCount: 1,
      totalTileAreaM2: 12,
      totalTileAreaWithWasteM2: 13.2,
      totalDiyCost: 1200,
      roomDiyCostSum: 1400,
      deduplicationSavings: 200,
      totalProfessionalCost: 2500,
      totalSavings: 1300,
      totalMaterialCost: 1000,
      totalToolCostDeduplicated: 200,
      roomSummaries: [],
      projectMaterialList: {
        sections: [],
        totalDisplayCost: 1000,
        totalCalculatedCost: 1000,
        totalDeduplicatedToolCost: 200,
        totalConsumableCost: 800,
        totalMainMaterialCost: 0,
        activeItemCount: 0,
        inactiveItemCount: 0,
        deduplicatedMaterialIds: [],
        warnings: []
      },
      warnings: [
        {
          id: 'project-warning',
          roomId: null,
          roomName: null,
          severity: 'warning',
          message: 'Mengen prüfen.'
        }
      ]
    } satisfies ProjectAggregationResult);

    expect(result.documentType).toBe('project_summary');
    expect(result.totals.diyTotal).toBe(1200);
    expect(result.totals.professionalTotal).toBe(2500);
    expect(result.legalNotice).toBe(ESTIMATE_EXPORT_LEGAL_NOTICE);
    expect(result.sections.at(-1)?.type).toBe('warnings');
  });

  it('maps the project material list independently from project totals', () => {
    const result = service.buildProjectMaterialListExportData({
      sections: [],
      totalDisplayCost: 300,
      totalCalculatedCost: 300,
      totalDeduplicatedToolCost: 50,
      totalConsumableCost: 250,
      totalMainMaterialCost: 0,
      activeItemCount: 0,
      inactiveItemCount: 0,
      deduplicatedMaterialIds: [],
      warnings: []
    });

    expect(result.documentType).toBe('project_material_list');
    expect(result.totals.materialTotal).toBe(300);
    expect(result.legalNotice).toBe(ESTIMATE_EXPORT_LEGAL_NOTICE);
  });

  it('maps professional totals without treating the estimate as an offer', () => {
    const result = service.buildProfessionalComparisonExportData({
      diy: {
        materialCost: 100,
        diyBufferPercent: 10,
        diyBufferCost: 10,
        totalCost: 110,
        activeMaterialItems: 1,
        inactiveMaterialItems: 0,
        costGroups: []
      },
      professional: {
        materialCost: 100,
        totalCost: 219,
        offer: {
          calculationMode: 'estimate',
          lineItems: [],
          netTotal: 100,
          vatPercent: 19,
          vatAmount: 19,
          grossTotal: 119,
          activeLineItemCount: 0,
          inactiveLineItemCount: 0,
          assumptions: [],
          warnings: []
        }
      },
      savings: {
        amount: 109,
        percent: 49.8,
        label: 'Mögliche Ersparnis'
      },
      assumptions: [],
      warnings: []
    } satisfies CostComparisonViewModel);

    expect(result.documentType).toBe('professional_comparison');
    expect(result.totals.netTotal).toBe(100);
    expect(result.totals.professionalTotal).toBe(219);
    expect(result.legalNotice).toContain('unverbindliche Kostenschätzung');
  });

  it('maps a contractor offer into an offer section with grouped positions and totals', () => {
    const result = service.buildContractorOfferExportData({
      projectId: 'p1',
      projectName: 'Sanierung Musterstr.',
      vatPercent: 19,
      sections: [
        {
          id: 'site_setup',
          kind: 'site_setup',
          title: 'Baustelle einrichten',
          lines: [
            {
              id: 'site_setup:site_setup',
              label: 'Baustelle einrichten',
              description: '',
              quantity: 1,
              unit: 'pauschal',
              unitPrice: 235,
              isActive: true,
              origin: 'generated'
            }
          ]
        },
        {
          id: 'r1',
          kind: 'room',
          title: 'Bad OG',
          lines: [
            {
              id: 'r1:floor_tiling',
              label: 'Bodenfliesen verlegen',
              description: 'ohne Material',
              quantity: 10,
              unit: 'm2',
              unitPrice: 80,
              isActive: true,
              origin: 'generated'
            }
          ]
        },
        {
          id: 'material',
          kind: 'material',
          title: 'Material',
          lines: [
            {
              id: 'material:tiles',
              label: 'Material (Fliesen)',
              description: '',
              quantity: 1,
              unit: 'pauschal',
              unitPrice: 1000,
              isActive: true,
              origin: 'generated'
            }
          ]
        }
      ]
    });

    expect(result.documentType).toBe('contractor_offer');
    expect(result.subtitle).toBe('Sanierung Musterstr.');

    const offerSection = result.sections.find((section) => section.type === 'offer');
    const groups = offerSection?.content as ExportOfferGroup[];
    expect(groups.map((group) => group.positionLabel)).toEqual([null, 'Pos. 1', 'Pos. 2']);
    // Baustelle/Material ohne Zwischensumme, Raum-Gruppe mit Zwischensumme.
    expect(groups[0].subtotal).toBeNull();
    expect(groups[1].subtotal).toBe(800);
    expect(groups[1].rows[0].number).toBe('1.001');

    // 235 + 800 + 1000 = 2035 netto, 19 % MwSt.
    expect(result.totals.netTotal).toBe(2035);
    expect(result.totals.vatAmount).toBe(386.65);
    expect(result.totals.grossTotal).toBe(2421.65);
  });
});
