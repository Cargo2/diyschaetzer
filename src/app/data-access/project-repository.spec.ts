import { TestBed } from '@angular/core/testing';
import { LocalTileProject } from '../models/local-project.model';
import { LocalProjectService } from '../services/local-project.service';
import { LocalStorageProjectRepository } from './local-storage-project-repository';
import { ProjectRepository, PROJECT_REPOSITORY } from './project-repository';

/** Einfacher In-Memory-Adapter, der den austauschbaren Backend-Charakter belegt. */
class InMemoryProjectRepository implements ProjectRepository {
  saved: LocalTileProject | null;
  cleared = false;

  constructor(initial: LocalTileProject | null = null) {
    this.saved = initial;
  }

  async loadProject(): Promise<LocalTileProject | null> {
    return this.saved;
  }

  async saveProject(project: LocalTileProject): Promise<void> {
    this.saved = project;
  }

  async clearProject(): Promise<void> {
    this.saved = null;
    this.cleared = true;
  }
}

function makeProject(roomName = 'Bad EG'): LocalTileProject {
  const now = new Date().toISOString();
  return {
    id: 'proj-1',
    name: 'Testprojekt',
    status: 'in_progress',
    rooms: [
      {
        id: 'room-1',
        roomName,
        roomType: 'bathroom',
        isOutdoor: false,
        wizardData: {
          room: { roomType: 'bathroom', roomName, isOutdoor: false },
          bathroomSizeM2: 8,
          floorAreaM2: 8,
          areaSummary: { floorAreaM2: 8, totalWallTileAreaM2: 0, totalTileAreaM2: 8 }
        } as never,
        materialListUserState: { includeOptionalMaterials: true, excludedMaterialIds: [] },
        createdAt: now,
        updatedAt: now
      }
    ],
    createdAt: now,
    updatedAt: now
  };
}

describe('LocalStorageProjectRepository', () => {
  beforeEach(() => globalThis.localStorage?.clear());

  it('round-trips a project through localStorage', async () => {
    const repo = new LocalStorageProjectRepository();
    expect(await repo.loadProject()).toBeNull();

    const project = makeProject();
    await repo.saveProject(project);
    expect(await repo.loadProject()).toEqual(project);

    await repo.clearProject();
    expect(await repo.loadProject()).toBeNull();
  });
});

describe('LocalProjectService with a swapped repository', () => {
  beforeEach(() => globalThis.localStorage?.clear());

  it('hydrates the project from whatever repository is provided', async () => {
    const repo = new InMemoryProjectRepository(makeProject('Gäste-WC'));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PROJECT_REPOSITORY, useValue: repo }]
    });

    const service = TestBed.inject(LocalProjectService);
    await service.ready;

    expect(service.getRooms()).toHaveLength(1);
    expect(service.getRooms()[0].roomName).toBe('Gäste-WC');
  });

  it('persists mutations back through the provided repository', async () => {
    const repo = new InMemoryProjectRepository();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PROJECT_REPOSITORY, useValue: repo }]
    });

    const service = TestBed.inject(LocalProjectService);
    await service.ready;

    service.saveCurrentRoom({
      room: { roomType: 'bathroom', roomName: 'Bad OG', isOutdoor: false },
      bathroomSizeM2: 8,
      floorAreaM2: 8,
      areaSummary: { floorAreaM2: 8, totalWallTileAreaM2: 0, totalTileAreaM2: 8 }
    } as never);

    expect(repo.saved?.rooms.map((room) => room.roomName)).toEqual(['Bad OG']);
  });

  it('does not overwrite an early mutation when hydration resolves late', async () => {
    let resolveLoad: (value: LocalTileProject | null) => void = () => {};
    const slowRepo: ProjectRepository = {
      loadProject: () => new Promise((resolve) => (resolveLoad = resolve)),
      saveProject: async () => {},
      clearProject: async () => {}
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PROJECT_REPOSITORY, useValue: slowRepo }]
    });

    const service = TestBed.inject(LocalProjectService);
    // Mutation passiert, bevor das (langsame) Laden zurückkommt.
    service.saveCurrentRoom({
      room: { roomType: 'bathroom', roomName: 'Sofort', isOutdoor: false },
      bathroomSizeM2: 8,
      floorAreaM2: 8,
      areaSummary: { floorAreaM2: 8, totalWallTileAreaM2: 0, totalTileAreaM2: 8 }
    } as never);

    resolveLoad(makeProject('Veraltet'));
    await service.ready;

    expect(service.getRooms().map((room) => room.roomName)).toEqual(['Sofort']);
  });
});
