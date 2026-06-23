import { TestBed } from '@angular/core/testing';
import { ContractorOffer } from '../models/contractor-offer.model';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseContractorOfferRepository } from './supabase-contractor-offer-repository';

function makeOffer(): ContractorOffer {
  return {
    projectId: 'proj-1',
    projectName: 'Sanierung',
    vatPercent: 19,
    sections: [
      {
        id: 'site_setup',
        kind: 'site_setup',
        title: 'Baustelle einrichten',
        lines: [
          {
            id: 'site_setup:site_setup',
            label: 'Baustelle einrichten',
            description: '',
            quantity: 1,
            unit: 'pauschal',
            unitPrice: 235,
            isActive: true,
            origin: 'generated'
          }
        ]
      }
    ]
  };
}

function makeClient(opts: {
  userId: string | null;
  row?: Record<string, unknown> | null;
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

function setup(client: unknown): SupabaseContractorOfferRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseContractorOfferRepository);
}

describe('SupabaseContractorOfferRepository', () => {
  it('returns the stored offer_data for the project', async () => {
    const offer = makeOffer();
    const repo = setup(
      makeClient({ userId: 'user-1', row: { project_id: 'proj-1', offer_data: offer } })
    );

    expect(await repo.load('proj-1')).toEqual(offer);
  });

  it('returns null when no offer is stored', async () => {
    const repo = setup(makeClient({ userId: 'user-1', row: null }));
    expect(await repo.load('proj-x')).toBeNull();
  });

  it('upserts the offer with project_id and the session owner_id', async () => {
    let captured: Record<string, unknown> | null = null;
    const repo = setup(
      makeClient({ userId: 'user-9', onUpsert: (value) => (captured = value) })
    );

    await repo.save(makeOffer());

    expect(captured).toMatchObject({ project_id: 'proj-1', owner_id: 'user-9' });
  });

  it('throws on save without a session', async () => {
    const repo = setup(makeClient({ userId: null }));
    await expect(repo.save(makeOffer())).rejects.toThrow();
  });
});
