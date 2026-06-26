import { TestBed } from '@angular/core/testing';
import { SharedCalculation } from '../models/shared-calculation.model';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseSharedCalculationRepository } from './supabase-shared-calculation-repository';

function makeSnapshot(): SharedCalculation {
  return {
    version: 1,
    roomName: 'Bad',
    roomTypeLabel: 'Badezimmer',
    isOutdoor: false,
    createdAt: '2026-06-23T00:00:00.000Z',
    tileAreaM2: 12,
    tileAreaWithWasteM2: 13.2,
    diy: { materialCost: 1000, bufferPercent: 10, totalCost: 1100 },
    professional: {
      netTotal: 2000,
      materialCost: 1000,
      vatPercent: 19,
      vatAmount: 570,
      totalCost: 3570,
      lineItems: []
    },
    savings: { amount: 2470, percent: 69, label: 'Mögliche Ersparnis' }
  };
}

function makeClient(opts: {
  userId: string | null;
  onInsert?: (value: Record<string, unknown>) => void;
  rpcData?: unknown;
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: opts.userId ? { id: opts.userId } : null } })
    },
    from: () => ({
      insert: (value: Record<string, unknown>) => {
        opts.onInsert?.(value);
        return {
          select: () => ({
            single: async () => ({ data: { id: 'token-1' }, error: null })
          })
        };
      }
    }),
    rpc: async (_fn: string, _params: Record<string, unknown>) => ({
      data: opts.rpcData ?? null,
      error: null
    })
  };
}

function setup(client: unknown): SupabaseSharedCalculationRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseSharedCalculationRepository);
}

describe('SupabaseSharedCalculationRepository', () => {
  it('inserts with the session owner_id and returns the token', async () => {
    let captured: Record<string, unknown> | null = null;
    const repo = setup(
      makeClient({ userId: 'user-7', onInsert: (value) => (captured = value) })
    );

    const token = await repo.create(makeSnapshot());

    expect(token).toBe('token-1');
    expect(captured).toMatchObject({ owner_id: 'user-7' });
  });

  it('throws when creating a share without a session', async () => {
    const repo = setup(makeClient({ userId: null }));
    await expect(repo.create(makeSnapshot())).rejects.toThrow();
  });

  it('loads a snapshot by token via the public RPC', async () => {
    const snapshot = makeSnapshot();
    const repo = setup(makeClient({ userId: null, rpcData: snapshot }));

    expect(await repo.load('token-1')).toEqual(snapshot);
  });

  it('returns null when the token has no share', async () => {
    const repo = setup(makeClient({ userId: null, rpcData: null }));
    expect(await repo.load('missing')).toBeNull();
  });
});
