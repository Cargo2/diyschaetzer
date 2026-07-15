import { TestBed } from '@angular/core/testing';
import { ContractorSnippet } from '../models/contractor-snippet.model';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseContractorSnippetRepository } from './supabase-contractor-snippet-repository';

function makePositionSnippet(): ContractorSnippet {
  return {
    id: 'snip-1',
    kind: 'position',
    label: 'Fliesen verlegen',
    data: {
      label: 'Fliesen verlegen',
      description: 'Wand- und Bodenfliesen im Verband',
      unit: 'm2',
      unitPrice: 45,
      quantity: 12,
      isOptional: false
    },
    sortOrder: 0
  };
}

/**
 * Mock des supabase-js Query-Builders: `select().order().order().order()` muss
 * dreifach verkettbar und am Ende awaitable sein (thenable, das die Zeilen liefert).
 */
function makeClient(opts: {
  userId: string | null;
  rows?: Record<string, unknown>[];
  onUpsert?: (value: Record<string, unknown>) => void;
  onDelete?: (value: unknown) => void;
  upsertError?: unknown;
}) {
  const result = { data: opts.rows ?? [], error: null };
  const orderable: {
    order: () => typeof orderable;
    then: (resolve: (value: typeof result) => unknown) => unknown;
  } = {
    order: () => orderable,
    then: (resolve) => resolve(result)
  };
  return {
    auth: {
      getUser: async () => ({ data: { user: opts.userId ? { id: opts.userId } : null } })
    },
    from: () => ({
      select: () => orderable,
      upsert: async (value: Record<string, unknown>) => {
        opts.onUpsert?.(value);
        return { error: opts.upsertError ?? null };
      },
      delete: () => ({
        eq: async (_column: string, value: unknown) => {
          opts.onDelete?.(value);
          return { error: null };
        }
      })
    })
  };
}

function setup(client: unknown): SupabaseContractorSnippetRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseContractorSnippetRepository);
}

describe('SupabaseContractorSnippetRepository', () => {
  it('lists own snippets and normalizes the jsonb data', async () => {
    const repo = setup(
      makeClient({
        userId: 'user-1',
        rows: [
          {
            id: 'snip-9',
            owner_id: 'user-1',
            kind: 'position',
            label: 'Silikonfuge',
            data: { label: 'Silikonfuge', unit: 'lfm', unitPrice: 8 },
            sort_order: 2,
            created_at: '2026-07-15T00:00:00Z'
          }
        ]
      })
    );

    const list = await repo.listMine();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'snip-9',
      kind: 'position',
      label: 'Silikonfuge',
      sortOrder: 2,
      createdAt: '2026-07-15T00:00:00Z'
    });
    // normalize füllt fehlende Positionsfelder mit Defaults auf.
    expect(list[0].data).toMatchObject({
      label: 'Silikonfuge',
      description: '',
      unit: 'lfm',
      unitPrice: 8
    });
  });

  it('returns an empty list when no session', async () => {
    const repo = setup(makeClient({ userId: null }));
    expect(await repo.listMine()).toEqual([]);
  });

  it('upserts the snippet with the session owner_id and mapped columns', async () => {
    let captured: Record<string, unknown> | null = null;
    const repo = setup(
      makeClient({ userId: 'user-9', onUpsert: (value) => (captured = value) })
    );

    await repo.save(makePositionSnippet());

    expect(captured).toMatchObject({
      id: 'snip-1',
      owner_id: 'user-9',
      kind: 'position',
      label: 'Fliesen verlegen',
      sort_order: 0
    });
  });

  it('propagates an error from the DB on save', async () => {
    const repo = setup(
      makeClient({
        userId: 'user-9',
        upsertError: { code: '23503', message: 'foreign key violation' }
      })
    );
    await expect(repo.save(makePositionSnippet())).rejects.toMatchObject({ code: '23503' });
  });

  it('deletes by snippet id', async () => {
    let deleted: unknown = null;
    const repo = setup(makeClient({ userId: 'user-9', onDelete: (value) => (deleted = value) }));
    await repo.delete('snip-1');
    expect(deleted).toBe('snip-1');
  });

  it('throws on save without a session', async () => {
    const repo = setup(makeClient({ userId: null }));
    await expect(repo.save(makePositionSnippet())).rejects.toThrow();
  });
});
