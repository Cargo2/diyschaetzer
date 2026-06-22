import { TestBed } from '@angular/core/testing';
import { ProfileAssumptionDefaults } from '../config/profile-price-fields';
import {
  BathroomWizardData,
  defaultBathroomWizardFormState
} from '../models/bathroom-wizard.model';
import { AssumptionService } from './assumption.service';
import { ProfileAssumptionDefaultsService } from './profile-assumption-defaults.service';

function setup(defaults: ProfileAssumptionDefaults): AssumptionService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ProfileAssumptionDefaultsService,
        useValue: {
          current: () => defaults,
          ready: Promise.resolve(),
          refresh: async () => {},
          save: async () => {}
        }
      }
    ]
  });
  return TestBed.inject(AssumptionService);
}

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

describe('AssumptionService – Profil-Standardannahmen', () => {
  it('lets a profile default replace the system default', () => {
    const service = setup({
      'professionalPrices.vatPercent': 25,
      'materialPrices.tilePricePerM2': 99
    });
    const assumptions = service.createDefaultAssumptions(createData());

    expect(assumptions.professionalPrices.vatPercent.value).toBe(25);
    expect(assumptions.materialPrices.tilePricePerM2.value).toBe(99);
  });

  it('uses the system default when no profile default is set', () => {
    const service = setup({});
    const assumptions = service.createDefaultAssumptions(createData());

    expect(assumptions.professionalPrices.vatPercent.value).toBe(19);
  });

  it('lets a room user_override win over the profile default', () => {
    const service = setup({ 'professionalPrices.vatPercent': 25 });
    const data = createData();
    const normalized = {
      ...data,
      assumptions: { ...data.assumptions, ...service.normalizeAssumptions(data) }
    };
    const overridden = service.updateAssumption(normalized, 'professionalPrices.vatPercent', 7);

    const next = service.normalizeAssumptions(overridden);

    expect(next.professionalPrices.vatPercent.value).toBe(7);
    expect(next.professionalPrices.vatPercent.source).toBe('user_override');
  });

  it('ignores profile defaults for not-relevant fields', () => {
    const service = setup({ 'professionalPrices.wallTilingPricePerM2': 999 });
    const data = createData();
    data.areaSummary = {
      floorAreaM2: 8,
      floorTileAreaM2: 8,
      totalWallTileAreaM2: 0,
      totalTileAreaM2: 8
    };

    const assumptions = service.createDefaultAssumptions(data);

    expect(assumptions.professionalPrices.wallTilingPricePerM2.relevant).toBe(false);
    expect(assumptions.professionalPrices.wallTilingPricePerM2.value).not.toBe(999);
  });
});
