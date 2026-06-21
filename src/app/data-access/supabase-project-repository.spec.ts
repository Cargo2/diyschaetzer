import { TestBed } from '@angular/core/testing';
import { LocalTileProject } from '../models/local-project.model';
import { SupabaseProjectRepository } from './supabase-project-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/**
 * Minimaler In-Memory-Fake des Supabase-Query-Builders – deckt genau die
 * Operationsketten ab, die der Adapter nutzt (select/upsert/delete + eq/in/order/limit).
 */
class FakeStore {
  projects: Record<string, unknown>[] = [];
  rooms: Record<string, unknown>[] = [];
}

class FakeQuery implements PromiseLike<{ data: unknown; error: unknown }> {
  private op: 'select' | 'upsert' | 'delete' = 'select';
  private payload: Record<string, unknown>[] = [];
  private filters: Array<['eq' | 'in', string, unknown]> = [];
  private limitN: number | null = null;

  constructor(private readonly rows: Record<string, unknown>[]) {}

  select(): this { this.op = 'select'; return this; }
  upsert(rows: Record<string, unknown> | Record<string, unknown>[]): this {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  delete(): this { this.op = 'delete'; return this; }
  eq(col: string, val: unknown): this { this.filters.push(['eq', col, val]); return this; }
  in(col: string, vals: unknown[]): this { this.filters.push(['in', col, vals]); return this; }
  order(): this { return this; }
  limit(n: number): this { this.limitN = n; return this; }

  private matches(row: Record<string, unknown>): boolean {
    return this.filters.every(([kind, col, val]) =>
      kind === 'eq' ? row[col] === val : (val as unknown[]).includes(row[col])
    );
  }

  private run(): { data: unknown; error: unknown } {
    if (this.op === 'upsert') {
      for (const incoming of this.payload) {
        const idx = this.rows.findIndex((row) => row['id'] === incoming['id']);
        if (idx >= 0) this.rows[idx] = { ...this.rows[idx], ...incoming };
        else this.rows.push({ ...incoming });
      }
      return { data: this.payload, error: null };
    }
    if (this.op === 'delete') {
      const remaining = this.rows.filter((row) => !this.matches(row));
      this.rows.splice(0, this.rows.length, ...remaining);
      return { data: null, error: null };
    }
    let data = this.rows.filter((row) => this.matches(row));
    if (this.limitN !== null) data = data.slice(0, this.limitN);
    return { data, error: null };
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

function makeFakeClient(store: FakeStore, userId: string | null) {
  return {
    auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) },
    from: (table: string) => new FakeQuery(table === 'projects' ? store.projects : store.rooms)
  };
}

function setup(store: FakeStore, userId: string | null): SupabaseProjectRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: makeFakeClient(store, userId) }]
  });
  return TestBed.inject(SupabaseProjectRepository);
}

function projectWithRooms(roomNames: string[]): LocalTileProject {
  const now = '2026-06-21T00:00:00.000Z';
  return {
    id: 'proj-1',
    name: 'Testprojekt',
    status: 'in_progress',
    rooms: roomNames.map((roomName, i) => ({
      id: `room-${i + 1}`,
      roomName,
      roomType: 'bathroom',
      isOutdoor: false,
      wizardData: { room: { roomName } } as never,
      materialListUserState: { includeOptionalMaterials: true, excludedMaterialIds: [] },
      createdAt: now,
      updatedAt: now
    })),
    createdAt: now,
    updatedAt: now
  };
}

describe('SupabaseProjectRepository', () => {
  it('returns null when no session is present', async () => {
    const repo = setup(new FakeStore(), null);
    expect(await repo.loadProject()).toBeNull();
  });

  it('round-trips a project with rooms for the signed-in user', async () => {
    const store = new FakeStore();
    const repo = setup(store, 'user-1');

    await repo.saveProject(projectWithRooms(['Bad EG', 'Gäste-WC']));

    expect(store.projects).toHaveLength(1);
    expect(store.projects[0]['owner_id']).toBe('user-1');
    expect(store.rooms).toHaveLength(2);

    const loaded = await repo.loadProject();
    expect(loaded?.rooms.map((r) => r.roomName)).toEqual(['Bad EG', 'Gäste-WC']);
    expect(loaded?.name).toBe('Testprojekt');
  });

  it('deletes rooms that were removed from the project', async () => {
    const store = new FakeStore();
    const repo = setup(store, 'user-1');

    await repo.saveProject(projectWithRooms(['Bad EG', 'Gäste-WC']));
    expect(store.rooms).toHaveLength(2);

    // Zweiten Raum entfernen.
    const reduced = projectWithRooms(['Bad EG']);
    await repo.saveProject(reduced);

    expect(store.rooms.map((r) => r['room_name'])).toEqual(['Bad EG']);
  });

  it('clears all of the user\'s projects', async () => {
    const store = new FakeStore();
    const repo = setup(store, 'user-1');
    await repo.saveProject(projectWithRooms(['Bad EG']));

    await repo.clearProject();
    expect(store.projects).toHaveLength(0);
  });

  it('throws on save without a session', async () => {
    const repo = setup(new FakeStore(), null);
    await expect(repo.saveProject(projectWithRooms(['Bad EG']))).rejects.toThrow();
  });
});
