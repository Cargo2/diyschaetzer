import { TestBed } from '@angular/core/testing';
import { ExportDocumentData } from '../models/export-document.model';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseSharedOfferRepository } from './supabase-shared-offer-repository';

function makeExportData(): ExportDocumentData {
  return { title: 'Angebot', kind: 'offer', sections: [] } as unknown as ExportDocumentData;
}

function makeClient(opts: {
  userId: string | null;
  selectRow?: Record<string, unknown> | null;
  insertId?: string;
  rpcData?: unknown;
  onInsert?: (value: Record<string, unknown>) => void;
  onUpdate?: (value: Record<string, unknown>) => void;
  onDelete?: (filters: Record<string, unknown>) => void;
  deleteError?: unknown;
  onRpc?: (fn: string, params: Record<string, unknown>) => void;
}) {
  const selectChain = {
    eq() {
      return selectChain;
    },
    maybeSingle: async () => ({ data: opts.selectRow ?? null, error: null })
  };
  return {
    auth: {
      getUser: async () => ({ data: { user: opts.userId ? { id: opts.userId } : null } })
    },
    from: () => ({
      select: () => selectChain,
      insert: (value: Record<string, unknown>) => {
        opts.onInsert?.(value);
        return {
          select: () => ({
            single: async () => ({ data: { id: opts.insertId ?? 'token-new' }, error: null })
          })
        };
      },
      update: (value: Record<string, unknown>) => {
        opts.onUpdate?.(value);
        return { eq: async () => ({ error: null }) };
      },
      delete: () => {
        const filters: Record<string, unknown> = {};
        const deleteChain = {
          eq(column: string, value: unknown) {
            filters[column] = value;
            return deleteChain;
          },
          then(resolve: (result: { error: unknown }) => void) {
            opts.onDelete?.(filters);
            resolve({ error: opts.deleteError ?? null });
          }
        };
        return deleteChain;
      }
    }),
    rpc: async (fn: string, params: Record<string, unknown>) => {
      opts.onRpc?.(fn, params);
      return { data: opts.rpcData ?? null, error: null };
    }
  };
}

function setup(client: unknown): SupabaseSharedOfferRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseSharedOfferRepository);
}

describe('SupabaseSharedOfferRepository', () => {
  it('createForOffer inserts a new share when none exists (stable token)', async () => {
    let inserted: Record<string, unknown> | null = null;
    const repo = setup(
      makeClient({
        userId: 'user-1',
        selectRow: null,
        insertId: 'token-new',
        onInsert: (value) => (inserted = value)
      })
    );

    const token = await repo.createForOffer('offer-1', makeExportData());

    expect(token).toBe('token-new');
    expect(inserted).toMatchObject({ owner_id: 'user-1', offer_id: 'offer-1' });
  });

  it('createForOffer updates data and keeps the existing token when a share exists', async () => {
    let updated: Record<string, unknown> | null = null;
    let insertCalled = false;
    const repo = setup(
      makeClient({
        userId: 'user-1',
        selectRow: { id: 'token-existing' },
        onUpdate: (value) => (updated = value),
        onInsert: () => (insertCalled = true)
      })
    );

    const token = await repo.createForOffer('offer-1', makeExportData());

    expect(token).toBe('token-existing');
    expect(updated).toMatchObject({ data: expect.anything() });
    expect(insertCalled).toBe(false);
  });

  it('createForOffer throws without a session', async () => {
    const repo = setup(makeClient({ userId: null }));
    await expect(repo.createForOffer('offer-1', makeExportData())).rejects.toThrow();
  });

  it('loadPage maps the RPC payload to a SharedOfferPage', async () => {
    const doc = makeExportData();
    const repo = setup(
      makeClient({
        userId: null,
        rpcData: { data: doc, accepted_at: '2026-07-01T00:00:00Z', accepted_by_name: 'Kunde' }
      })
    );

    const page = await repo.loadPage('token-1');

    expect(page).toEqual({
      data: doc,
      acceptedAt: '2026-07-01T00:00:00Z',
      acceptedByName: 'Kunde'
    });
  });

  it('loadPage returns null when the token is unknown', async () => {
    const repo = setup(makeClient({ userId: null, rpcData: null }));
    expect(await repo.loadPage('missing')).toBeNull();
  });

  it('accept maps the RPC result', async () => {
    let calledFn: string | null = null;
    const repo = setup(
      makeClient({
        userId: null,
        rpcData: { accepted_at: '2026-07-02T10:00:00Z', accepted_by_name: 'Max Muster' },
        onRpc: (fn) => (calledFn = fn)
      })
    );

    const result = await repo.accept('token-1', 'Max Muster');

    expect(calledFn).toBe('accept_shared_offer');
    expect(result).toEqual({
      acceptedAt: '2026-07-02T10:00:00Z',
      acceptedByName: 'Max Muster'
    });
  });

  it('accept returns null when the token is unknown', async () => {
    const repo = setup(makeClient({ userId: null, rpcData: null }));
    expect(await repo.accept('missing', 'Max Muster')).toBeNull();
  });

  it('pingView swallows RPC errors', async () => {
    const repo = setup({
      auth: { getUser: async () => ({ data: { user: null } }) },
      from: () => ({}),
      rpc: async () => {
        throw new Error('network');
      }
    });
    await expect(repo.pingView('token-1')).resolves.toBeUndefined();
  });

  it('getTrackingForOffer maps the owner-scoped row', async () => {
    const repo = setup(
      makeClient({
        userId: 'user-1',
        selectRow: {
          id: 'token-1',
          created_at: '2026-07-01T00:00:00Z',
          viewed_at: '2026-07-02T00:00:00Z',
          view_count: 3,
          accepted_at: null,
          accepted_by_name: ''
        }
      })
    );

    const tracking = await repo.getTrackingForOffer('offer-1');

    expect(tracking).toEqual({
      token: 'token-1',
      createdAt: '2026-07-01T00:00:00Z',
      viewedAt: '2026-07-02T00:00:00Z',
      viewCount: 3,
      acceptedAt: null,
      acceptedByName: ''
    });
  });

  it('getTrackingForOffer returns null when no share exists', async () => {
    const repo = setup(makeClient({ userId: 'user-1', selectRow: null }));
    expect(await repo.getTrackingForOffer('offer-x')).toBeNull();
  });

  it('deleteForOffer deletes only the owner-scoped share of the offer', async () => {
    let filters: Record<string, unknown> | null = null;
    const repo = setup(
      makeClient({ userId: 'user-1', onDelete: (value) => (filters = value) })
    );

    await repo.deleteForOffer('offer-1');

    expect(filters).toEqual({ owner_id: 'user-1', offer_id: 'offer-1' });
  });

  it('deleteForOffer throws without a session', async () => {
    const repo = setup(makeClient({ userId: null }));
    await expect(repo.deleteForOffer('offer-1')).rejects.toThrow();
  });

  it('deleteForOffer propagates a delete error', async () => {
    const repo = setup(
      makeClient({ userId: 'user-1', deleteError: new Error('rls') })
    );
    await expect(repo.deleteForOffer('offer-1')).rejects.toThrow('rls');
  });
});
