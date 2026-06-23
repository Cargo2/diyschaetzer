import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LocalTileProject } from '../models/local-project.model';
import { PROJECT_REPOSITORY, ProjectRepository } from '../data-access/project-repository';
import { SUPABASE_CLIENT } from '../data-access/supabase-client';
import { SupabaseProjectRepository } from '../data-access/supabase-project-repository';
import { AuthService } from './auth.service';
import { LocalProjectService } from './local-project.service';
import { ProjectSessionSyncService } from './project-session-sync.service';

function makeProject(roomName: string): LocalTileProject {
  const now = new Date().toISOString();
  return {
    id: `proj-${roomName}`,
    name: 'Testprojekt',
    status: 'in_progress',
    rooms: [
      {
        id: `room-${roomName}`,
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

/** Minimaler In-Memory-Adapter für den (anonymen) Ausgangsstand. */
class InMemoryProjectRepository implements ProjectRepository {
  constructor(private saved: LocalTileProject | null) {}
  async loadProject() {
    return this.saved;
  }
  async listProjects() {
    return this.saved ? [this.saved] : [];
  }
  async saveProject(project: LocalTileProject) {
    this.saved = project;
  }
  async deleteProject(id: string) {
    if (this.saved?.id === id) {
      this.saved = null;
    }
  }
  async clearProject() {
    this.saved = null;
  }
}

/** Fake-Supabase-Adapter: kontrollierbarer DB-Stand, merkt sich Importe. */
class FakeSupabaseRepository {
  saved: LocalTileProject | null = null;
  constructor(private loaded: LocalTileProject | null) {}
  async loadProject() {
    return this.loaded;
  }
  async listProjects() {
    return this.loaded ? [this.loaded] : [];
  }
  async saveProject(project: LocalTileProject) {
    this.saved = project;
  }
  async deleteProject() {}
  async clearProject() {}
}

/** Fake-Supabase-Client; erlaubt das Auslösen eines Login-Events. */
function makeFakeClient() {
  let authCallback: ((event: string, session: unknown) => void) | null = null;
  return {
    emitSignIn(session: unknown) {
      authCallback?.('SIGNED_IN', session);
    },
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signOut: async () => ({ error: null })
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) })
      })
    })
  };
}

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function setup(local: LocalTileProject | null, db: LocalTileProject | null) {
  const client = makeFakeClient();
  const supabase = new FakeSupabaseRepository(db);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: SUPABASE_CLIENT, useValue: client },
      { provide: PROJECT_REPOSITORY, useValue: new InMemoryProjectRepository(local) },
      { provide: SupabaseProjectRepository, useValue: supabase }
    ]
  });
  const sync = TestBed.inject(ProjectSessionSyncService);
  const localProject = TestBed.inject(LocalProjectService);
  TestBed.inject(AuthService);
  return { client, supabase, sync, localProject };
}

describe('ProjectSessionSyncService', () => {
  beforeEach(() => globalThis.localStorage?.clear());

  it('imports the local project on first login when the DB is empty', async () => {
    const { client, supabase, sync } = setup(makeProject('Anonym'), null);
    await sync.ready;

    client.emitSignIn({ user: { id: 'user-1', email: 'neu@example.de' } });
    TestBed.inject(ApplicationRef).tick();
    await flushMicrotasks();

    expect(supabase.saved?.rooms.map((room) => room.roomName)).toEqual(['Anonym']);
  });

  it('adopts the DB project on login and does not import when the DB has data', async () => {
    const { client, supabase, sync, localProject } = setup(
      makeProject('Anonym'),
      makeProject('AusDB')
    );
    await sync.ready;

    client.emitSignIn({ user: { id: 'user-1', email: 'bestand@example.de' } });
    TestBed.inject(ApplicationRef).tick();
    await flushMicrotasks();

    expect(localProject.getRooms().map((room) => room.roomName)).toEqual(['AusDB']);
    expect(supabase.saved).toBeNull();
  });
});
