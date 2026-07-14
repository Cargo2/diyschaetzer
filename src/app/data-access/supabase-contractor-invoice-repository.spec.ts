import { TestBed } from '@angular/core/testing';
import {
  ContractorInvoice,
  emptyInvoiceCustomer,
  emptyInvoiceSeller
} from '../models/contractor-invoice.model';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseContractorInvoiceRepository } from './supabase-contractor-invoice-repository';

function makeInvoice(): ContractorInvoice {
  return {
    id: 'inv-1',
    projectId: 'proj-1',
    offerId: 'off-1',
    projectName: 'Sanierung',
    invoiceNumber: 'RE-2026-001',
    invoiceDate: '2026-07-11',
    serviceDate: '2026-07-11',
    dueDate: '2026-07-25',
    buyerReference: 'n/a',
    status: 'draft',
    vatPercent: 19,
    discountPercent: 0,
    sections: [],
    customer: emptyInvoiceCustomer(),
    seller: emptyInvoiceSeller()
  };
}

function makeClient(opts: {
  userId: string | null;
  rows?: Record<string, unknown>[];
  onUpsert?: (value: Record<string, unknown>) => void;
  onDelete?: (value: unknown) => void;
  upsertError?: unknown;
}) {
  return {
    auth: {
      getUser: async () => ({ data: { user: opts.userId ? { id: opts.userId } : null } })
    },
    from: () => ({
      select: () => ({
        order: async () => ({ data: opts.rows ?? [], error: null })
      }),
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

function setup(client: unknown): SupabaseContractorInvoiceRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseContractorInvoiceRepository);
}

describe('SupabaseContractorInvoiceRepository', () => {
  it('lists own invoices, columns overriding invoice_data', async () => {
    const invoice = makeInvoice();
    const repo = setup(
      makeClient({
        userId: 'user-1',
        rows: [
          {
            id: 'inv-99',
            owner_id: 'user-1',
            project_id: 'proj-7',
            offer_id: 'off-7',
            invoice_number: 'RE-2026-042',
            invoice_data: invoice
          }
        ]
      })
    );

    const list = await repo.listMine();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'inv-99',
      projectId: 'proj-7',
      offerId: 'off-7',
      invoiceNumber: 'RE-2026-042'
    });
  });

  it('returns an empty list when no session', async () => {
    const repo = setup(makeClient({ userId: null }));
    expect(await repo.listMine()).toEqual([]);
  });

  it('upserts the invoice with id, number, herkunft and the session owner_id', async () => {
    let captured: Record<string, unknown> | null = null;
    const repo = setup(
      makeClient({ userId: 'user-9', onUpsert: (value) => (captured = value) })
    );

    await repo.save(makeInvoice());

    expect(captured).toMatchObject({
      id: 'inv-1',
      owner_id: 'user-9',
      project_id: 'proj-1',
      offer_id: 'off-1',
      invoice_number: 'RE-2026-001'
    });
  });

  it('propagates a unique-violation error from the DB', async () => {
    const repo = setup(
      makeClient({
        userId: 'user-9',
        upsertError: { code: '23505', message: 'duplicate key value violates unique constraint' }
      })
    );
    await expect(repo.save(makeInvoice())).rejects.toMatchObject({ code: '23505' });
  });

  it('deletes by invoice id', async () => {
    let deleted: unknown = null;
    const repo = setup(makeClient({ userId: 'user-9', onDelete: (value) => (deleted = value) }));
    await repo.delete('inv-1');
    expect(deleted).toBe('inv-1');
  });

  it('throws on save without a session', async () => {
    const repo = setup(makeClient({ userId: null }));
    await expect(repo.save(makeInvoice())).rejects.toThrow();
  });
});
