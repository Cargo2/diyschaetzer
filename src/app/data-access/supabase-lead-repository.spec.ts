import { TestBed } from '@angular/core/testing';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { LeadSubmission } from '../models/lead.model';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseLeadRepository } from './supabase-lead-repository';

const SUBMISSION: LeadSubmission = {
  name: 'Max Mustermann',
  postalCode: '96117',
  email: 'max@example.com',
  phone: null,
  timeframe: 'asap',
  message: null,
  consent: true,
  projectSnapshot: {
    roomName: 'Bad',
    roomType: 'Badezimmer',
    areaM2: 20,
    diyTotal: 1000,
    professionalTotal: 3000
  },
  website: ''
};

function httpError(status: number): FunctionsHttpError {
  return new FunctionsHttpError({ status } as unknown as Response);
}

function setup(client: unknown): SupabaseLeadRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseLeadRepository);
}

describe('SupabaseLeadRepository', () => {
  it('returns ok when the edge function succeeds and forwards the body', async () => {
    let capturedBody: unknown = null;
    const repo = setup({
      functions: {
        invoke: async (_name: string, opts: { body: unknown }) => {
          capturedBody = opts.body;
          return { data: { ok: true }, error: null };
        }
      }
    });

    const result = await repo.submit(SUBMISSION);

    expect(result).toEqual({ ok: true });
    expect(capturedBody).toMatchObject({ postalCode: '96117', consent: true, website: '' });
  });

  it('maps HTTP status codes to differentiated reasons', async () => {
    const cases: Array<[number, string]> = [
      [400, 'validation'],
      [409, 'rate_limited'],
      [503, 'mail_unavailable']
    ];
    for (const [status, reason] of cases) {
      const repo = setup({
        functions: { invoke: async () => ({ data: null, error: httpError(status) }) }
      });
      expect(await repo.submit(SUBMISSION)).toEqual({ ok: false, reason });
    }
  });

  it('falls back to "unknown" for a non-HTTP error', async () => {
    const repo = setup({
      functions: { invoke: async () => ({ data: null, error: new Error('network down') }) }
    });
    expect(await repo.submit(SUBMISSION)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('confirms a valid token', async () => {
    const repo = setup({ rpc: async () => ({ data: true, error: null }) });
    expect(await repo.confirm('token')).toBe('confirmed');
  });

  it('reports an invalid token', async () => {
    const repo = setup({ rpc: async () => ({ data: false, error: null }) });
    expect(await repo.confirm('token')).toBe('invalid');
  });

  it('reports an error when the rpc fails', async () => {
    const repo = setup({ rpc: async () => ({ data: null, error: new Error('boom') }) });
    expect(await repo.confirm('token')).toBe('error');
  });
});
