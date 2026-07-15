import { COMMERCIAL_CONFIG, DEFAULT_WHITE_LABEL_CONFIG } from '../config/commercial.config';
import { DEFAULT_FEATURE_ACCESS } from '../models/commercial.model';
import {
  ContractorInvoice,
  ContractorInvoiceKind,
  SettledPayment,
  emptyInvoiceCustomer,
  emptyInvoiceSeller,
  normalizeContractorInvoice
} from '../models/contractor-invoice.model';
import {
  ESTIMATE_EXPORT_LEGAL_NOTICE,
  ExportOfferGroup
} from '../models/export-document.model';
import { MaterialListViewModel } from '../models/material-list.model';
import { ProjectMaterialListItem } from '../models/project-material-list.model';
import { createNeutralProductMonetization } from '../models/monetization.model';
import { CostComparisonViewModel } from './cost-comparison.service';
import { ExportDataMapperService } from './export-data-mapper.service';
import { ProjectAggregationResult } from './project-aggregation.service';

function invoiceWithSeller(countryCode: string, vatPercent = 0): ContractorInvoice {
  return normalizeContractorInvoice({
    id: 'inv-1',
    projectName: 'Sanierung',
    invoiceNumber: 'RE-2026-001',
    invoiceDate: '2026-07-14',
    dueDate: '2026-07-28',
    buyerReference: 'n/a',
    status: 'draft',
    vatPercent,
    sections: [
      {
        id: 's0',
        kind: 'custom',
        title: 'Leistungen',
        lines: [
          {
            id: 'l0',
            label: 'Position',
            description: '',
            quantity: 1,
            unit: 'pauschal',
            unitPrice: 100,
            isActive: true,
            isOptional: false,
            origin: 'custom'
          }
        ]
      }
    ],
    customer: emptyInvoiceCustomer(),
    seller: { ...emptyInvoiceSeller(), countryCode }
  } as ContractorInvoice);
}

function settlement(overrides: Partial<SettledPayment> = {}): SettledPayment {
  return {
    invoiceId: 'dep-1',
    invoiceNumber: 'RE-2026-005',
    kind: 'deposit',
    invoiceDate: '2026-05-01',
    grossAmount: 5950,
    netAmount: 5000,
    vatAmount: 950,
    ...overrides
  };
}

function finalInvoice(
  kind: ContractorInvoiceKind,
  settledPayments: SettledPayment[] | undefined,
  unitPrice = 10000
): ContractorInvoice {
  return normalizeContractorInvoice({
    id: 'inv-final',
    projectName: 'Sanierung',
    invoiceNumber: 'RE-2026-010',
    invoiceDate: '2026-07-14',
    dueDate: '2026-07-28',
    buyerReference: 'n/a',
    status: 'draft',
    kind,
    settledPayments,
    vatPercent: 19,
    sections: [
      {
        id: 's0',
        kind: 'custom',
        title: 'Leistungen',
        lines: [
          {
            id: 'l0',
            label: 'Gesamtleistung',
            description: '',
            quantity: 1,
            unit: 'pauschal',
            unitPrice,
            isActive: true,
            isOptional: false,
            origin: 'custom'
          }
        ]
      }
    ],
    customer: emptyInvoiceCustomer(),
    seller: { ...emptyInvoiceSeller(), countryCode: 'DE' }
  } as ContractorInvoice);
}

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
    // Affiliate ist bewusst aktiviert (Shop-Icons mit hinterlegtem Link), der
    // Lead-Funnel (leadsEnabled) sowie das Contractor-Abo (contractorSubscriptionEnabled)
    // sind bewusst eingeschaltet (wirken nur mit Supabase und für angemeldete Profis);
    // alle übrigen kommerziellen Flags bleiben neutral/aus.
    expect(COMMERCIAL_CONFIG.affiliateEnabled).toBe(true);
    expect(COMMERCIAL_CONFIG.leadsEnabled).toBe(true);
    expect(COMMERCIAL_CONFIG.contractorSubscriptionEnabled).toBe(true);
    const intentionallyEnabled = new Set([
      'affiliateEnabled',
      'leadsEnabled',
      'contractorSubscriptionEnabled'
    ]);
    expect(
      Object.entries(COMMERCIAL_CONFIG)
        .filter(([key]) => !intentionallyEnabled.has(key))
        .every(([, enabled]) => !enabled)
    ).toBe(true);
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

  it('prefixes project material rows with an order glyph when orderedKeys is set', () => {
    const item = (aggregationKey: string, name: string): ProjectMaterialListItem =>
      ({ aggregationKey, name, materialId: name } as unknown as ProjectMaterialListItem);

    const result = service.buildProjectMaterialListExportData(
      {
        sections: [
          {
            id: 'installation',
            title: 'Verlegematerialien',
            description: '',
            totalDisplayCost: 0,
            items: [item('a::project', 'Kleber'), item('b::project', 'Fugenmasse')]
          }
        ],
        totalDisplayCost: 0,
        totalCalculatedCost: 0,
        totalDeduplicatedToolCost: 0,
        totalConsumableCost: 0,
        totalMainMaterialCost: 0,
        activeItemCount: 2,
        inactiveItemCount: 0,
        deduplicatedMaterialIds: [],
        warnings: []
      },
      new Set(['a::project'])
    );

    const rows = result.sections[0].content as Array<{ name: string }>;
    expect(rows.map((row) => row.name)).toEqual(['✓ Kleber', '☐ Fugenmasse']);
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

  it('builds structured customer address lines and email in the offer meta', () => {
    const result = service.buildContractorOfferExportData({
      projectId: 'p1',
      projectName: 'Sanierung',
      vatPercent: 19,
      customer: {
        name: 'Erika Beispiel',
        street: 'Musterweg 3',
        postalCode: '50667',
        city: 'Köln',
        countryCode: 'DE',
        email: 'erika@example.com',
        address: 'Musterweg 3\n50667 Köln'
      },
      sections: [
        {
          id: 'r1',
          kind: 'room',
          title: 'Bad',
          lines: [
            {
              id: 'r1:a',
              label: 'Verlegen',
              description: '',
              quantity: 1,
              unit: 'pauschal',
              unitPrice: 100,
              isActive: true,
              isOptional: false,
              origin: 'generated'
            }
          ]
        }
      ]
    });

    expect(result.offerMeta?.customerName).toBe('Erika Beispiel');
    expect(result.offerMeta?.customerAddressLines).toEqual(['Musterweg 3', '50667 Köln']);
    expect(result.offerMeta?.customerEmail).toBe('erika@example.com');
    // Legacy-Freitext bleibt als Fallback erhalten.
    expect(result.offerMeta?.customerAddress).toBe('Musterweg 3\n50667 Köln');
  });

  describe('buildContractorInvoiceExportData taxNote (Aufgabe X1: § 19-Hinweis nur für DE)', () => {
    it('adds the § 19 UStG notice for a German seller at 0 % VAT', () => {
      const result = service.buildContractorInvoiceExportData(invoiceWithSeller('DE', 0));
      expect(result.taxNote).toContain('§ 19 UStG');
    });

    it('omits the notice for a non-German seller at 0 % VAT', () => {
      const result = service.buildContractorInvoiceExportData(invoiceWithSeller('AT', 0));
      expect(result.taxNote).toBeNull();
    });

    it('omits the notice when the German seller charges VAT', () => {
      const result = service.buildContractorInvoiceExportData(invoiceWithSeller('DE', 19));
      expect(result.taxNote).toBeNull();
    });
  });

  describe('buildContractorInvoiceExportData settlement (R3-B: Anrechnungsblock)', () => {
    it('builds the settlement block for a final invoice with a frozen snapshot', () => {
      // Endbetrag: 10000 netto + 19 % = 11900 brutto; Anzahlung 5950 brutto.
      const result = service.buildContractorInvoiceExportData(
        finalInvoice('final', [settlement()])
      );
      expect(result.settlement).toBeDefined();
      expect(result.settlement!.rows).toHaveLength(1);
      const row = result.settlement!.rows[0];
      expect(row.invoiceNumber).toBe('RE-2026-005');
      expect(row.kindLabel).toBe('Anzahlung');
      expect(row.date).toBe('01.05.2026');
      expect(row.gross).toBe(5950);
      expect(row.vatContained).toBe(950);
      expect(result.settlement!.settledGross).toBe(5950);
      expect(result.settlement!.payableGross).toBe(5950);
      // Der Summenblock zeigt weiterhin die volle Bruttosumme der Schlussrechnung.
      expect(result.totals.grossTotal).toBe(11900);
    });

    it('sums multiple settled payments and can yield a negative payable (credit)', () => {
      const result = service.buildContractorInvoiceExportData(
        finalInvoice(
          'final',
          [
            settlement({ invoiceNumber: 'RE-2026-005', grossAmount: 5950, vatAmount: 950 }),
            settlement({
              invoiceId: 'dep-2',
              invoiceNumber: 'RE-2026-006',
              kind: 'partial',
              grossAmount: 7140,
              netAmount: 6000,
              vatAmount: 1140
            })
          ],
          10000
        )
      );
      expect(result.settlement!.settledGross).toBe(13090);
      // 11900 − 13090 = −1190 → Guthaben zugunsten des Kunden.
      expect(result.settlement!.payableGross).toBe(-1190);
    });

    it('omits the settlement for a standard invoice', () => {
      const result = service.buildContractorInvoiceExportData(invoiceWithSeller('DE', 19));
      expect(result.settlement).toBeUndefined();
    });

    it('omits the settlement for a deposit invoice even if a snapshot is present', () => {
      const result = service.buildContractorInvoiceExportData(
        finalInvoice('deposit', [settlement()])
      );
      expect(result.settlement).toBeUndefined();
    });

    it('omits the settlement for a final invoice without a snapshot', () => {
      const result = service.buildContractorInvoiceExportData(finalInvoice('final', undefined));
      expect(result.settlement).toBeUndefined();
    });
  });
});
