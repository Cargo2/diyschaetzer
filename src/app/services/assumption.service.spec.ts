import { TestBed } from '@angular/core/testing';
import {
  BathroomWizardData,
  defaultBathroomWizardFormState
} from '../models/bathroom-wizard.model';
import { AssumptionService } from './assumption.service';

describe('AssumptionService', () => {
  let service: AssumptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AssumptionService);
  });

  it('migrates legacy assumptions and fills metadata', () => {
    const data = createData();
    (data.assumptions as unknown as { wastePercent: number }).wastePercent = 14;

    const assumptions = service.normalizeAssumptions(data);

    expect(assumptions.wastePercent.value).toBe(14);
    expect(assumptions.materialPrices.tilePricePerM2.value).toBe(46);
    expect(assumptions.wastePercent.label).toBeTruthy();
    expect(assumptions.professionalPrices.vatPercent.value).toBe(19);
  });

  it('migrates the legacy tile price into material prices', () => {
    const data = createData();
    if (data.assumptions.tile) {
      data.assumptions.tile.pricePerM2 = 72;
    }

    const assumptions = service.normalizeAssumptions(data);

    expect(assumptions.materialPrices.tilePricePerM2.value).toBe(72);
  });

  it('marks bathroom-only assumptions as not relevant for a hallway', () => {
    const data = createData();
    data.room.roomType = 'hallway';
    data.preparation.waterproofing.required = 'no';

    const assumptions = service.normalizeAssumptions(data);

    expect(assumptions.counts.sealingSleeveCount.relevant).toBe(false);
    expect(assumptions.counts.sealingSleeveCount.source).toBe('not_relevant');
  });

  it('recalculates calculated assumptions when the room grows', () => {
    const data = createData();
    const normalized = {
      ...data,
      assumptions: { ...data.assumptions, ...service.normalizeAssumptions(data) }
    };
    const before = normalized.assumptions.linearMeters.siliconeJointsLfm.value;

    const grown = {
      ...normalized,
      areaSummary: {
        floorAreaM2: 32,
        floorTileAreaM2: 32,
        totalWallTileAreaM2: 20,
        totalTileAreaM2: 52
      }
    };
    const next = service.normalizeAssumptions(grown);

    expect(next.linearMeters.siliconeJointsLfm.value).toBeGreaterThan(before);
  });

  it('follows the tile quality default after the quality changes', () => {
    const data = createData();
    data.tileQuality = 'budget';
    if (data.assumptions.tile) {
      data.assumptions.tile.pricePerM2 = 25;
    }
    const budgetAssumptions = service.normalizeAssumptions(data);
    expect(budgetAssumptions.materialPrices.tilePricePerM2.value).toBe(25);

    // Qualitätswechsel im Wizard aktualisiert den Legacy-Träger (setTileQuality).
    data.tileQuality = 'premium';
    if (data.assumptions.tile) {
      data.assumptions.tile.pricePerM2 = 110;
    }
    const next = service.normalizeAssumptions({
      ...data,
      assumptions: { ...data.assumptions, ...budgetAssumptions }
    });

    expect(next.materialPrices.tilePricePerM2.value).toBe(110);
  });

  it('keeps a manual tile price override when other inputs change', () => {
    const data = createData();
    const normalized = {
      ...data,
      assumptions: { ...data.assumptions, ...service.normalizeAssumptions(data) }
    };
    const updated = service.updateAssumption(
      normalized,
      'materialPrices.tilePricePerM2',
      60
    );

    const next = service.normalizeAssumptions({
      ...updated,
      areaSummary: { ...updated.areaSummary, floorAreaM2: 20, floorTileAreaM2: 20 }
    });

    expect(next.materialPrices.tilePricePerM2.value).toBe(60);
    expect(next.materialPrices.tilePricePerM2.source).toBe('user_override');
  });

  it('keeps overrides, clamps areas and resets to the calculated value', () => {
    const data = createData();
    data.preparation.substrate.condition = 'leveling_compound_needed';
    data.scope.includeLevelingWork = true;
    data.areaSummary.floorAreaM2 = 8;
    const normalized = {
      ...data,
      assumptions: {
        ...data.assumptions,
        ...service.normalizeAssumptions(data)
      }
    };

    const updated = service.updateAssumption(
      normalized,
      'substrate.levelingAreaM2',
      99
    );
    expect(updated.assumptions.substrate.levelingAreaM2.value).toBe(8);
    expect(updated.assumptions.substrate.levelingAreaM2.source).toBe('user_override');

    const reset = service.resetAssumption(updated, 'substrate.levelingAreaM2');
    expect(reset.assumptions.substrate.levelingAreaM2.value).toBe(8);
    expect(reset.assumptions.substrate.levelingAreaM2.source).not.toBe('user_override');
  });
});

function createData(): BathroomWizardData {
  const state = defaultBathroomWizardFormState();
  return {
    ...state,
    room: { roomType: 'bathroom', roomName: 'Bad', isOutdoor: false },
    floorAreaM2: 8,
    areaSummary: {
      floorAreaM2: 8,
      floorTileAreaM2: 8,
      totalWallTileAreaM2: 20,
      totalTileAreaM2: 28
    },
    extrasSelection: 'none',
    excludedItems: {
      tileMaterial: false,
      installationMaterials: false,
      waterproofing: false,
      baseboards: true,
      tools: false,
      disposal: true,
      levelingWork: false
    },
    openIssues: [],
    recommendations: [],
    metadata: {
      wizardCompleted: true,
      resultsValid: true,
      completedAt: null,
      lastModifiedAt: null,
      invalidatedAt: null,
      currentStep: 'completed'
    }
  };
}
