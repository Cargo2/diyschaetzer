import { TestBed } from '@angular/core/testing';
import { BathroomWizardData } from '../models/bathroom-wizard.model';
import { SavedRoomCalculation } from '../models/local-project.model';
import { ProjectMaterialListService } from './project-material-list.service';

describe('ProjectMaterialListService', () => {
  let service: ProjectMaterialListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProjectMaterialListService);
  });

  it('keeps tiles per room and deduplicates project-level items', () => {
    const result = service.buildProjectMaterialList([
      createRoom('room-1', 'Bad EG'),
      createRoom('room-2', 'Bad OG')
    ]);
    const items = result.sections.flatMap((section) => section.items);
    const tiles = items.filter((item) => item.materialId === 'tiles_main');
    const sharedProjectItem = items.find(
      (item) =>
        item.isProjectLevelDeduplicated &&
        item.roomIds.includes('room-1') &&
        item.roomIds.includes('room-2')
    );

    expect(tiles).toHaveLength(2);
    expect(tiles.map((item) => item.roomNames[0])).toEqual(
      expect.arrayContaining(['Bad EG', 'Bad OG'])
    );
    expect(sharedProjectItem).toBeTruthy();
    expect(sharedProjectItem?.notes).toContain(
      'Einmalig fürs Gesamtprojekt berücksichtigt.'
    );
  });

  it('recalculates project-wide package counts from the summed quantity', () => {
    const result = service.buildProjectMaterialList([
      createRoom('room-1', 'Bad EG'),
      createRoom('room-2', 'Bad OG')
    ]);
    const adhesive = result.sections
      .flatMap((section) => section.items)
      .find((item) => item.materialId === 'flexible_tile_adhesive');

    // 2 × 8 m² × 4 kg/m² = 64 kg → 3 Säcke à 25 kg statt 2 + 2 aus den Einzelräumen.
    expect(adhesive?.quantity).toBe(64);
    expect(adhesive?.packageCount).toBe(3);
    expect(adhesive?.notes).toContain(
      'Gebinde projektweit aus der Gesamtmenge berechnet.'
    );
  });

  it('respects room exclusions and adds outdoor guidance', () => {
    const indoor = createRoom('room-1', 'Bad EG');
    const outdoor = createRoom('room-2', 'Terrasse', true);
    indoor.materialListUserState.excludedMaterialIds = ['tiles_main'];

    const result = service.buildProjectMaterialList([indoor, outdoor]);
    const tileItems = result.sections
      .flatMap((section) => section.items)
      .filter((item) => item.materialId === 'tiles_main');

    expect(tileItems).toHaveLength(1);
    expect(tileItems[0].roomNames).toEqual(['Terrasse']);
    expect(tileItems[0].isOutdoorRelevant).toBe(true);
    expect(result.warnings.some((warning) => warning.id === 'outdoor-product-suitability')).toBe(
      true
    );
  });
});

function createRoom(
  id: string,
  roomName: string,
  isOutdoor = false
): SavedRoomCalculation {
  const now = '2026-06-10T12:00:00.000Z';
  return {
    id,
    roomName,
    roomType: isOutdoor ? 'terrace_balcony' : 'bathroom',
    isOutdoor,
    wizardData: {
      room: {
        roomType: isOutdoor ? 'terrace_balcony' : 'bathroom',
        roomName,
        isOutdoor
      },
      bathroomSizeM2: 8,
      floorAreaM2: 8,
      areaSummary: {
        floorAreaM2: 8,
        totalWallTileAreaM2: 0,
        totalTileAreaM2: 8
      }
    } as BathroomWizardData,
    materialListUserState: {
      includeOptionalMaterials: true,
      excludedMaterialIds: []
    },
    createdAt: now,
    updatedAt: now
  };
}
