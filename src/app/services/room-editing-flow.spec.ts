import { TestBed } from '@angular/core/testing';
import { BathroomWizardData } from '../models/bathroom-wizard.model';
import { LocalProjectService } from './local-project.service';
import { MaterialListStateService } from './material-list-state.service';
import { ProjectAggregationService } from './project-aggregation.service';
import { WizardStateService } from './wizard-state.service';

describe('saved room editing flow', () => {
  let localProject: LocalProjectService;
  let materialListState: MaterialListStateService;
  let projectAggregation: ProjectAggregationService;
  let wizardState: WizardStateService;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    wizardState = TestBed.inject(WizardStateService);
    localProject = TestBed.inject(LocalProjectService);
    materialListState = TestBed.inject(MaterialListStateService);
    projectAggregation = TestBed.inject(ProjectAggregationService);
  });

  it('loads a saved room at the final step and invalidates results when going back', () => {
    const room = localProject.saveCurrentRoom(createWizardData());
    expect(localProject.getProject().status).toBe('in_progress');

    localProject.loadRoomIntoWizard(room.id);

    expect(localProject.getEditingRoomId()).toBe(room.id);
    expect(wizardState.currentStepIndex()).toBe(11);
    expect(wizardState.isResultsAvailable()).toBe(true);

    wizardState.setCurrentStepIndex(10);

    expect(wizardState.isResultsAvailable()).toBe(false);
    expect(wizardState.metadata().currentStep).toBe(11);

    wizardState.setCurrentStepIndex(11);
    wizardState.markWizardCompleted();

    expect(wizardState.isResultsAvailable()).toBe(true);

    localProject.markProjectReadyForReview();
    expect(localProject.getProject().status).toBe('ready_for_review');
  });

  it('stores material overrides per room and copies them when duplicating', () => {
    const firstRoom = localProject.saveCurrentRoom(createWizardData('Bad EG'));
    localProject.startNewRoom();
    const secondRoom = localProject.saveCurrentRoom(createWizardData('Bad OG'));

    localProject.loadRoomIntoWizard(firstRoom.id);
    materialListState.loadStateForRoom(firstRoom.id);
    materialListState.excludeMaterial('cement_grout');

    expect(
      localProject.getRooms().find((room) => room.id === firstRoom.id)
        ?.materialListUserState.excludedMaterialIds
    ).toEqual(['cement_grout']);
    expect(
      localProject.getRooms().find((room) => room.id === secondRoom.id)
        ?.materialListUserState.excludedMaterialIds
    ).toEqual([]);

    const copy = localProject.duplicateRoom(firstRoom.id);

    expect(copy.id).not.toBe(firstRoom.id);
    expect(copy.roomName).toBe('Bad EG Kopie');
    expect(copy.materialListUserState.excludedMaterialIds).toEqual(['cement_grout']);
  });

  it('updates the saved room and project totals after wizard and material changes', () => {
    const room = localProject.saveCurrentRoom(createWizardData());
    const totalBefore = projectAggregation.aggregateProject(
      localProject.getRooms()
    ).totalDiyCost;

    localProject.loadRoomIntoWizard(room.id);
    materialListState.loadStateForRoom(room.id);
    materialListState.excludeMaterial('tiles_main');

    const editedData = {
      ...wizardState.getWizardData(),
      room: {
        ...wizardState.getWizardData().room,
        roomName: 'Bad EG geändert'
      },
      bathroomSizeM2: 12,
      floorAreaM2: 12,
      areaSummary: {
        ...wizardState.getWizardData().areaSummary,
        floorAreaM2: 12,
        totalTileAreaM2: 12
      }
    };
    localProject.saveCurrentRoom(editedData, materialListState.getState());

    const updatedRoom = localProject.getRooms()[0];
    const totalAfter = projectAggregation.aggregateProject(
      localProject.getRooms()
    ).totalDiyCost;

    expect(localProject.getRooms()).toHaveLength(1);
    expect(updatedRoom.roomName).toBe('Bad EG geändert');
    expect(updatedRoom.wizardData.floorAreaM2).toBe(12);
    expect(updatedRoom.materialListUserState.excludedMaterialIds).toContain('tiles_main');
    expect(totalAfter).not.toBe(totalBefore);
  });
});

function createWizardData(roomName = 'Bad EG'): BathroomWizardData {
  return {
    room: {
      roomType: 'bathroom',
      roomName,
      isOutdoor: false
    },
    bathroomSizeM2: 8,
    floorAreaM2: 8,
    areaSummary: {
      floorAreaM2: 8,
      totalWallTileAreaM2: 0,
      totalTileAreaM2: 8
    }
  } as BathroomWizardData;
}
