import { BathroomWizardData } from '../models/bathroom-wizard.model';
import { MaterialListViewModel } from '../models/material-list.model';
import { ProfessionalOfferService } from './professional-offer.service';

describe('ProfessionalOfferService', () => {
  it('prepares automatic estimate positions for future contractor editing', () => {
    const service = new ProfessionalOfferService();
    const wizardData = {
      bathroomSizeM2: 7.123,
      floorAreaM2: 7.123,
      floorTileSize: '30x60_cm',
      wallTileSize: null,
      showerBathOption: 'none',
      room: {
        roomType: 'other',
        roomName: 'Test',
        isOutdoor: false
      },
      assumptions: {}
    } as BathroomWizardData;

    const result = service.buildProfessionalOffer(
      wizardData,
      {} as MaterialListViewModel
    );

    expect(result.calculationMode).toBe('estimate');
    expect(result.lineItems.length).toBeGreaterThan(0);

    for (const item of result.lineItems) {
      expect(item.editableByContractor).toBe(true);
      expect(item.contractorModified).toBe(false);
      expect(item.contractorNote).toBeNull();
      expect(item.originalQuantity).toBe(item.quantity);
      expect(item.originalUnitPrice).toBe(item.unitPrice);
      expect(item.originalTotalPrice).toBe(item.totalPrice);
    }

    expect(result.lineItems.find((item) => item.id === 'site_setup')?.source).toBe(
      'default'
    );
    expect(result.lineItems.find((item) => item.id === 'floor_tiling')?.source).toBe(
      'wizard'
    );
  });

  it.each([
    {
      condition: 'minor_repairs_needed',
      id: 'substrate_minor_repairs',
      unitPrice: 18
    },
    {
      condition: 'leveling_compound_needed',
      id: 'substrate_leveling_compound',
      unitPrice: 28
    }
  ] as const)(
    'adds the substrate position for $condition',
    ({ condition, id, unitPrice }) => {
      const service = new ProfessionalOfferService();
      const wizardData = {
        bathroomSizeM2: 8,
        floorAreaM2: 8,
        floorTileSize: '30x60_cm',
        room: {
          roomType: 'kitchen',
          roomName: 'Küche',
          isOutdoor: false
        },
        preparation: {
          substrate: { condition },
          waterproofing: { required: 'no' }
        },
        scope: {
          includeLevelingWork: true,
          includeWaterproofing: false
        }
      } as BathroomWizardData;

      const result = service.buildProfessionalOffer(
        wizardData,
        {} as MaterialListViewModel
      );
      const item = result.lineItems.find((lineItem) => lineItem.id === id);

      expect(item?.category).toBe('substrate_preparation');
      expect(item?.quantity).toBe(8);
      expect(item?.unitPrice).toBe(unitPrice);
      expect(
        result.lineItems.some((lineItem) => lineItem.id === 'drill_holes')
      ).toBe(false);
    }
  );

  it('does not offer floor tiling when only specific areas are tiled', () => {
    const service = new ProfessionalOfferService();
    const wizardData = {
      bathroomSizeM2: 8,
      floorAreaM2: 8,
      tilingScope: 'specific_areas',
      areaSummary: {
        floorAreaM2: 8,
        floorTileAreaM2: 0,
        totalWallTileAreaM2: 6,
        totalTileAreaM2: 6
      },
      room: { roomType: 'bathroom', roomName: 'Bad', isOutdoor: false },
      showerBathOption: 'shower_only',
      assumptions: {}
    } as unknown as BathroomWizardData;

    const result = service.buildProfessionalOffer(
      wizardData,
      {} as MaterialListViewModel
    );

    expect(result.lineItems.some((item) => item.id === 'floor_tiling')).toBe(false);
    expect(result.lineItems.some((item) => item.id === 'wall_tiling')).toBe(true);
  });

  it('does not apply the large-format floor price for large wall tiles', () => {
    const service = new ProfessionalOfferService();
    const wizardData = {
      bathroomSizeM2: 8,
      floorAreaM2: 8,
      floorTileSize: '30x30_cm',
      wallTileSize: '60x120_cm',
      areaSummary: {
        floorAreaM2: 8,
        floorTileAreaM2: 8,
        totalWallTileAreaM2: 10,
        totalTileAreaM2: 18
      },
      room: { roomType: 'kitchen', roomName: 'Küche', isOutdoor: false },
      preparation: {
        substrate: { condition: 'stable_even' },
        waterproofing: { required: 'no' }
      },
      scope: { includeWaterproofing: false },
      assumptions: {}
    } as unknown as BathroomWizardData;

    const result = service.buildProfessionalOffer(
      wizardData,
      {} as MaterialListViewModel
    );
    const floorTiling = result.lineItems.find((item) => item.id === 'floor_tiling');

    expect(floorTiling?.label).toBe('Bodenfliesen verlegen');
    expect(floorTiling?.unitPrice).toBe(79.82);
  });

  it('derives zero drill holes when all fixtures are explicitly deselected', () => {
    const service = new ProfessionalOfferService();
    const wizardData = {
      bathroomSizeM2: 8,
      floorAreaM2: 8,
      sinkOption: 'no_sink',
      showerBathOption: 'none',
      toiletOption: 'none',
      heatingOption: 'none',
      areaSummary: {
        floorAreaM2: 8,
        floorTileAreaM2: 8,
        totalWallTileAreaM2: 0,
        totalTileAreaM2: 8
      },
      room: { roomType: 'bathroom', roomName: 'Bad', isOutdoor: false },
      preparation: {
        substrate: { condition: 'stable_even' },
        waterproofing: { required: 'no' }
      },
      scope: { includeWaterproofing: false },
      assumptions: {}
    } as unknown as BathroomWizardData;

    const result = service.buildProfessionalOffer(
      wizardData,
      {} as MaterialListViewModel
    );

    expect(result.lineItems.some((item) => item.id === 'drill_holes')).toBe(false);
  });

  it('omits substrate preparation when leveling work is excluded', () => {
    const service = new ProfessionalOfferService();
    const wizardData = {
      bathroomSizeM2: 8,
      floorAreaM2: 8,
      room: { roomType: 'kitchen', roomName: 'Küche', isOutdoor: false },
      preparation: {
        substrate: { condition: 'leveling_compound_needed' },
        waterproofing: { required: 'no' }
      },
      scope: {
        includeLevelingWork: false,
        includeWaterproofing: false
      }
    } as BathroomWizardData;

    const result = service.buildProfessionalOffer(
      wizardData,
      {} as MaterialListViewModel
    );

    expect(
      result.lineItems.some((item) => item.category === 'substrate_preparation')
    ).toBe(false);
  });
});
