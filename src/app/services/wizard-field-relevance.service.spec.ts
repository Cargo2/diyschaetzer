import { TestBed } from '@angular/core/testing';
import { BathroomWizardData } from '../models/bathroom-wizard.model';
import { WizardFieldRelevanceService } from './wizard-field-relevance.service';
import { WizardStateService } from './wizard-state.service';

describe('WizardFieldRelevanceService', () => {
  let relevance: WizardFieldRelevanceService;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.configureTestingModule({});
    relevance = TestBed.inject(WizardFieldRelevanceService);
  });

  it('marks bathroom and legacy renovation fields as not relevant for a kitchen', () => {
    const data = createKitchenData();

    expect(relevance.isFieldRelevant('old_sanitary_removal', data)).toBe(false);
    expect(relevance.isFieldRelevant('existing_covering_removal', data)).toBe(false);
    expect(relevance.isFieldRelevant('shower', data)).toBe(false);
    expect(relevance.isFieldRelevant('toilet', data)).toBe(false);
    expect(relevance.isFieldRelevant('substrate_condition', data)).toBe(true);
  });

  it('keeps non-relevant legacy unknown values out of open issues', () => {
    const wizardState = TestBed.inject(WizardStateService);
    wizardState.loadWizardData(createKitchenData());

    const issues = wizardState.getWizardData().openIssues;

    expect(issues).not.toContain('Rückbau alter Beläge unklar');
    expect(issues).not.toContain('Rückbau alter Sanitärobjekte unklar');
    expect(issues).toContain(
      'Untergrundzustand unklar – vor der Fliesenverlegung prüfen.'
    );
  });
});

function createKitchenData(): BathroomWizardData {
  return {
    room: {
      roomType: 'kitchen',
      roomName: 'Küche',
      isOutdoor: false
    },
    bathroomSizeM2: 10,
    floorAreaM2: 10,
    preparation: {
      existingCovering: {
        status: 'unknown',
        location: 'unknown',
        removeRequired: 'unknown'
      },
      oldSanitaryObjects: {
        removeRequired: 'unknown'
      },
      substrate: {
        condition: 'unknown',
        levelingRequired: 'unknown',
        primerRequired: 'yes',
        repairRequired: 'unknown'
      },
      waterproofing: {
        required: 'unknown',
        reason: 'not_applicable',
        areaM2: null
      },
      disposal: {
        required: 'unknown',
        scope: 'unknown'
      }
    }
  } as unknown as BathroomWizardData;
}
