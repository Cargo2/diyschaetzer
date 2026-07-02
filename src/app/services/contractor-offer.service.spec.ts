import { TestBed } from '@angular/core/testing';
import { LocalTileProject, SavedRoomCalculation } from '../models/local-project.model';
import { ContractorOfferService } from './contractor-offer.service';
import { CostComparisonService } from './cost-comparison.service';
import { MaterialListService } from './material-list.service';
import {
  ProfessionalLineItem,
  ProfessionalLineItemCategory,
  ProfessionalLineItemUnit
} from './professional-offer.service';
import {
  ContractorOffer,
  offerGrossTotal,
  offerNetAfterDiscount,
  offerNetTotal,
  offerVatAmount
} from '../models/contractor-offer.model';

function lineItem(
  id: string,
  category: ProfessionalLineItemCategory,
  unitPrice: number,
  quantity = 1,
  unit: ProfessionalLineItemUnit = 'm2'
): ProfessionalLineItem {
  return {
    id,
    category,
    label: id,
    description: '',
    quantity,
    unit,
    unitPrice,
    totalPrice: quantity * unitPrice,
    isActive: true,
    isOptional: false,
    source: 'wizard',
    editableByContractor: true,
    contractorModified: false,
    contractorNote: null,
    originalQuantity: quantity,
    originalUnitPrice: unitPrice,
    originalTotalPrice: quantity * unitPrice,
    calculationNote: ''
  };
}

function room(id: string, roomName: string): SavedRoomCalculation {
  const now = '2026-06-23T00:00:00.000Z';
  return {
    id,
    roomName,
    roomType: 'bathroom',
    isOutdoor: false,
    wizardData: { room: { roomName } } as never,
    materialListUserState: { includeOptionalMaterials: true, excludedMaterialIds: [] },
    createdAt: now,
    updatedAt: now
  };
}

function project(rooms: SavedRoomCalculation[]): LocalTileProject {
  const now = '2026-06-23T00:00:00.000Z';
  return {
    id: 'proj-1',
    name: 'Sanierung Musterstr.',
    status: 'in_progress',
    rooms,
    createdAt: now,
    updatedAt: now
  };
}

/** Liefert je Raum ein kontrolliertes Profi-Ergebnis (site_setup + 1 Verlegeposition). */
function fakeComparison(materialCost: number) {
  return {
    professional: {
      materialCost,
      totalCost: 0,
      offer: {
        calculationMode: 'estimate',
        lineItems: [
          lineItem('site_setup', 'site_setup', 235, 1, 'pauschal'),
          lineItem('floor_tiling', 'tiling', 80, 10, 'm2')
        ],
        netTotal: 1035,
        vatPercent: 19,
        vatAmount: 0,
        grossTotal: 0,
        activeLineItemCount: 2,
        inactiveLineItemCount: 0,
        assumptions: [],
        warnings: []
      }
    }
  };
}

function setup(materialCostPerRoom: number): ContractorOfferService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: MaterialListService, useValue: { buildMaterialList: () => ({}) } },
      {
        provide: CostComparisonService,
        useValue: { buildCostComparison: () => fakeComparison(materialCostPerRoom) }
      }
    ]
  });
  return TestBed.inject(ContractorOfferService);
}

describe('ContractorOfferService', () => {
  it('dedupes the site setup and builds one group per room plus a material line', () => {
    const service = setup(500);
    const offer = service.buildOffer(
      project([room('r1', 'Bad OG'), room('r2', 'EG')])
    );

    // Reihenfolge: Baustelle (1x) → Raum-Gruppen → Material
    expect(offer.sections.map((section) => section.kind)).toEqual([
      'site_setup',
      'room',
      'room',
      'material'
    ]);
    expect(offer.sections.filter((s) => s.kind === 'site_setup')).toHaveLength(1);
    expect(offer.sections.filter((s) => s.kind === 'room').map((s) => s.title)).toEqual([
      'Bad OG',
      'EG'
    ]);

    // Material = eine Sammelposition über alle Räume (2 × 500).
    const material = offer.sections.find((s) => s.kind === 'material');
    expect(material?.lines).toHaveLength(1);
    expect(material?.lines[0].unitPrice).toBe(1000);
    expect(material?.lines[0].unit).toBe('pauschal');

    // Räume enthalten die Verlegeposition, aber NICHT das Baustellen-Setup.
    const badOg = offer.sections.find((s) => s.id === 'r1');
    expect(badOg?.lines.map((l) => l.label)).toEqual(['floor_tiling']);

    expect(offer.vatPercent).toBe(19);
  });

  it('nets out: site setup once (235) + 2×(10×80) tiling + 2×500 material = 2835', () => {
    const service = setup(500);
    const offer = service.buildOffer(
      project([room('r1', 'Bad OG'), room('r2', 'EG')])
    );
    // 235 + 800 + 800 + 1000
    expect(offerNetTotal(offer)).toBe(2835);
  });

  it('omits the material section when there is no material cost', () => {
    const service = setup(0);
    const offer = service.buildOffer(project([room('r1', 'Bad OG')]));
    expect(offer.sections.some((s) => s.kind === 'material')).toBe(false);
  });

  it('sets header defaults and the source timestamp from the project', () => {
    const service = setup(500);
    const proj = project([room('r1', 'Bad OG')]);
    const offer = service.buildOffer(proj);
    expect(offer.customer).toEqual({ name: '', address: '' });
    expect(offer.offerNumber).toBe('');
    expect(offer.sourceUpdatedAt).toBe(proj.updatedAt);
  });

  it('prefills a fresh offer from profile defaults (texts + surcharge)', () => {
    const service = setup(500);
    const offer = service.buildOffer(project([room('r1', 'Bad OG')]), undefined, {
      introText: 'Guten Tag',
      outroText: 'Zahlbar in 14 Tagen',
      materialSurchargePercent: 10
    });
    expect(offer.introText).toBe('Guten Tag');
    expect(offer.outroText).toBe('Zahlbar in 14 Tagen');
    expect(offer.materialSurchargePercent).toBe(10);
    const material = offer.sections.find((s) => s.kind === 'material');
    expect(material?.lines[0].unitPrice).toBe(550); // 500 × 1,10
  });

  it('merge: keeps edits, custom lines and custom sections on rebuild', () => {
    const service = setup(500);
    const proj = project([room('r1', 'Bad OG')]);
    const first = service.buildOffer(proj);

    const roomSection = first.sections.find((s) => s.id === 'r1')!;
    roomSection.lines[0].unitPrice = 999;
    roomSection.lines[0].label = 'Boden verlegen (angepasst)';
    roomSection.lines.push({
      id: 'custom-1',
      label: 'Zulage',
      description: '',
      quantity: 1,
      unit: 'pauschal',
      unitPrice: 50,
      isActive: true,
      isOptional: false,
      origin: 'custom'
    });
    first.sections.push({
      id: 'sec-custom',
      kind: 'custom',
      title: 'Extra',
      lines: [
        {
          id: 'c2',
          label: 'Anfahrt',
          description: '',
          quantity: 1,
          unit: 'pauschal',
          unitPrice: 30,
          isActive: true,
          isOptional: false,
          origin: 'custom'
        }
      ]
    });
    first.offerNumber = '2026-1';

    const rebuilt = service.buildOffer(proj, first);
    const rebuiltRoom = rebuilt.sections.find((s) => s.id === 'r1')!;
    expect(rebuiltRoom.lines[0].unitPrice).toBe(999);
    expect(rebuiltRoom.lines[0].label).toBe('Boden verlegen (angepasst)');
    expect(rebuiltRoom.lines.some((l) => l.id === 'custom-1')).toBe(true);
    expect(rebuilt.sections.some((s) => s.id === 'sec-custom')).toBe(true);
    expect(rebuilt.offerNumber).toBe('2026-1');
  });

  it('rebuilds material as one surcharged lump position', () => {
    const service = setup(500);
    const proj = project([room('r1', 'Bad OG'), room('r2', 'EG')]);
    const sections = service.rebuildMaterialSections(proj, {
      breakdown: false,
      surchargePercent: 10
    });
    expect(sections).toHaveLength(1);
    expect(sections[0].lines).toHaveLength(1);
    // (500 + 500) × 1,10 = 1100
    expect(sections[0].lines[0].unitPrice).toBe(1100);
  });

  it('rebuilds material per room when breakdown is enabled', () => {
    const service = setup(500);
    const proj = project([room('r1', 'Bad OG'), room('r2', 'EG')]);
    const sections = service.rebuildMaterialSections(proj, {
      breakdown: true,
      surchargePercent: 0
    });
    expect(sections[0].lines).toHaveLength(2);
    expect(sections[0].lines.map((l) => l.unitPrice)).toEqual([500, 500]);
    expect(sections[0].lines.map((l) => l.label)).toEqual([
      'Material Bad OG',
      'Material EG'
    ]);
  });

  it('applies the discount before VAT', () => {
    const offer: ContractorOffer = {
      projectId: 'p',
      projectName: 'x',
      vatPercent: 19,
      discountPercent: 10,
      sections: [
        {
          id: 's',
          kind: 'room',
          title: 'R',
          lines: [
            { id: 'a', label: 'A', description: '', quantity: 1, unit: 'pauschal', unitPrice: 100, isActive: true, isOptional: false, origin: 'generated' }
          ]
        }
      ]
    };
    expect(offerNetTotal(offer)).toBe(100);
    expect(offerNetAfterDiscount(offer)).toBe(90);
    expect(offerVatAmount(offer)).toBe(17.1);
    expect(offerGrossTotal(offer)).toBe(107.1);
  });

  it('excludes optional (Bedarf) positions from the net total', () => {
    const offer: ContractorOffer = {
      projectId: 'p',
      projectName: 'x',
      vatPercent: 19,
      sections: [
        {
          id: 's',
          kind: 'room',
          title: 'R',
          lines: [
            { id: 'a', label: 'A', description: '', quantity: 1, unit: 'pauschal', unitPrice: 100, isActive: true, isOptional: false, origin: 'generated' },
            { id: 'b', label: 'B', description: '', quantity: 1, unit: 'pauschal', unitPrice: 50, isActive: true, isOptional: true, origin: 'custom' }
          ]
        }
      ]
    };
    expect(offerNetTotal(offer)).toBe(100);
  });
});
