import { TestBed } from '@angular/core/testing';
import { ContractorOffer } from '../models/contractor-offer.model';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseContractorOfferRepository } from './supabase-contractor-offer-repository';

function makeOffer(): ContractorOffer {
  return {
    id: 'off-1',
    projectId: 'proj-1',
    projectName: 'Sanierung',
    version: 1,
    status: 'draft',
    label: '',
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
  rows?: Record<string, unknown>[];
  onUpsert?: (value: Record<string, unknown>) => void;
  onDelete?: (value: unknown) => void;
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: opts.userId ? { id: opts.userId } : null } })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: opts.rows ?? [], error: null })
        })
      }),
      upsert: async (value: Record<string, unknown>) => {
        opts.onUpsert?.(value);
        return { error: null };
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

function setup(client: unknown): SupabaseContractorOfferRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseContractorOfferRepository);
}

describe('SupabaseContractorOfferRepository', () => {
  it('lists a project\'s offers, columns overriding offer_data', async () => {
    const offer = makeOffer();
    const repo = setup(
      makeClient({
        userId: 'user-1',
        rows: [
          {
            id: 'off-99',
            project_id: 'proj-1',
            owner_id: 'user-1',
            offer_data: offer,
            version: 2,
            status: 'sent',
            label: 'nach Gespräch'
          }
        ]
      })
    );

    const list = await repo.listByProject('proj-1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'off-99',
      projectId: 'proj-1',
      version: 2,
      status: 'sent',
      label: 'nach Gespräch'
    });
  });

  it('returns an empty list when no session', async () => {
    const repo = setup(makeClient({ userId: null }));
    expect(await repo.listByProject('proj-x')).toEqual([]);
  });

  it('upserts the offer with id, project_id, version, status and the session owner_id', async () => {
    let captured: Record<string, unknown> | null = null;
    const repo = setup(
      makeClient({ userId: 'user-9', onUpsert: (value) => (captured = value) })
    );

    await repo.save(makeOffer());

    expect(captured).toMatchObject({
      id: 'off-1',
      project_id: 'proj-1',
      owner_id: 'user-9',
      version: 1,
      status: 'draft'
    });
  });

  it('deletes by offer id', async () => {
    let deleted: unknown = null;
    const repo = setup(makeClient({ userId: 'user-9', onDelete: (value) => (deleted = value) }));
    await repo.delete('off-1');
    expect(deleted).toBe('off-1');
  });

  it('throws on save without a session', async () => {
    const repo = setup(makeClient({ userId: null }));
    await expect(repo.save(makeOffer())).rejects.toThrow();
  });
});
