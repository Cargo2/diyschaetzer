import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseProfileAssumptionDefaultsRepository } from './supabase-profile-assumption-defaults-repository';

function makeClient(opts: {
  userId: string | null;
  row?: { assumption_defaults: Record<string, unknown> | null } | null;
  onUpsert?: (value: Record<string, unknown>) => void;
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: opts.userId ? { id: opts.userId } : null } })
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: opts.row ?? null, error: null }) })
      }),
      upsert: async (value: Record<string, unknown>) => {
        opts.onUpsert?.(value);
        return { error: null };
      }
    })
  };
}

function setup(client: unknown): SupabaseProfileAssumptionDefaultsRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseProfileAssumptionDefaultsRepository);
}

describe('SupabaseProfileAssumptionDefaultsRepository', () => {
  it('loads only known numeric paths and drops the rest', async () => {
    const repo = setup(
      makeClient({
        userId: 'user-1',
        row: {
          assumption_defaults: {
            'professionalPrices.vatPercent': 25,
            'materialPrices.tilePricePerM2': 99,
            'unknown.path': 5,
            'professionalPrices.siteSetupFlatRate': 'not-a-number'
          }
        }
      })
    );

    const defaults = await repo.load();

    expect(defaults).toEqual({
      'professionalPrices.vatPercent': 25,
      'materialPrices.tilePricePerM2': 99
    });
  });

  it('returns an empty map when no profile row or no session exists', async () => {
    expect(await setup(makeClient({ userId: 'user-1', row: null })).load()).toEqual({});
    expect(await setup(makeClient({ userId: null })).load()).toEqual({});
  });

  it('upserts the sanitized defaults with the id from the session', async () => {
    let captured: Record<string, unknown> | null = null;
    const repo = setup(makeClient({ userId: 'user-9', onUpsert: (v) => (captured = v) }));

    await repo.save({ 'professionalPrices.vatPercent': 25, 'unknown.path': 1 } as never);

    expect(captured).toEqual({
      id: 'user-9',
      assumption_defaults: { 'professionalPrices.vatPercent': 25 }
    });
  });
});
