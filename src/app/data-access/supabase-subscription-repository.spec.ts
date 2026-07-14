import { TestBed } from '@angular/core/testing';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseSubscriptionRepository } from './supabase-subscription-repository';

function httpError(status: number): FunctionsHttpError {
  return new FunctionsHttpError({ status } as unknown as Response);
}

function setup(client: unknown): SupabaseSubscriptionRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseSubscriptionRepository);
}

/** Minimaler Supabase-Query-Builder-Stub für `.from().select().maybeSingle()`. */
function selectClient(row: unknown, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        maybeSingle: async () => ({ data: row, error })
      })
    })
  };
}

describe('SupabaseSubscriptionRepository', () => {
  it('throws when Supabase is not configured', async () => {
    const repo = setup(null);
    await expect(repo.getMySubscription()).rejects.toThrow(/nicht konfiguriert/);
  });

  it('maps the own subscription row to the domain model', async () => {
    const repo = setup(
      selectClient({
        provider: 'paypal',
        plan_key: 'lead_pro',
        status: 'active',
        current_period_end: '2026-08-01T00:00:00Z'
      })
    );
    expect(await repo.getMySubscription()).toEqual({
      provider: 'paypal',
      planKey: 'lead_pro',
      status: 'active',
      currentPeriodEnd: '2026-08-01T00:00:00Z'
    });
  });

  it('returns null when there is no subscription row', async () => {
    const repo = setup(selectClient(null));
    expect(await repo.getMySubscription()).toBeNull();
  });

  it('invokes the subscription-activate edge function and returns the fresh row', async () => {
    let invokedName: string | null = null;
    let invokedBody: unknown = null;
    const client = {
      functions: {
        invoke: async (name: string, opts: { body: unknown }) => {
          invokedName = name;
          invokedBody = opts.body;
          return { data: { ok: true }, error: null };
        }
      },
      from: () => ({
        select: () => ({
          maybeSingle: async () => ({
            data: {
              provider: 'paypal',
              plan_key: 'lead_pro',
              status: 'active',
              current_period_end: null
            },
            error: null
          })
        })
      })
    };
    const repo = setup(client);

    const result = await repo.activate('I-ABC123');

    expect(invokedName).toBe('subscription-activate');
    expect(invokedBody).toEqual({ subscriptionId: 'I-ABC123' });
    expect(result).toEqual({
      ok: true,
      subscription: {
        provider: 'paypal',
        planKey: 'lead_pro',
        status: 'active',
        currentPeriodEnd: null
      }
    });
  });

  it('maps edge-function HTTP errors to differentiated reasons', async () => {
    const cases: Array<[number, string]> = [
      [400, 'invalid'],
      [403, 'owner_mismatch'],
      [409, 'not_active']
    ];
    for (const [status, reason] of cases) {
      const repo = setup({
        functions: { invoke: async () => ({ data: null, error: httpError(status) }) }
      });
      expect(await repo.activate('I-ABC123')).toEqual({ ok: false, reason });
    }
  });

  it('falls back to "unknown" for a non-HTTP activation error', async () => {
    const repo = setup({
      functions: { invoke: async () => ({ data: null, error: new Error('network down') }) }
    });
    expect(await repo.activate('I-ABC123')).toEqual({ ok: false, reason: 'unknown' });
  });
});
