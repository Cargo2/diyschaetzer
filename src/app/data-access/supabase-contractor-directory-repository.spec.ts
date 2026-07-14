import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseContractorDirectoryRepository } from './supabase-contractor-directory-repository';

function setup(client: unknown): SupabaseContractorDirectoryRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseContractorDirectoryRepository);
}

describe('SupabaseContractorDirectoryRepository', () => {
  it('calls the RPC with the postal code and maps snake_case rows', async () => {
    let capturedName: string | null = null;
    let capturedArgs: unknown = null;
    const repo = setup({
      rpc: async (name: string, args: unknown) => {
        capturedName = name;
        capturedArgs = args;
        return {
          data: [
            {
              company_name: 'Fliesen Müller',
              city: 'Bamberg',
              phone: '0951 123',
              website: 'fliesen-mueller.de',
              lead_room_types: ['bathroom', 'kitchen']
            }
          ],
          error: null
        };
      }
    });

    const result = await repo.listActiveContractors('96117');

    expect(capturedName).toBe('list_active_contractors');
    expect(capturedArgs).toEqual({ p_postal_code: '96117' });
    expect(result).toEqual([
      {
        companyName: 'Fliesen Müller',
        city: 'Bamberg',
        phone: '0951 123',
        website: 'fliesen-mueller.de',
        leadRoomTypes: ['bathroom', 'kitchen']
      }
    ]);
  });

  it('returns an empty array when the RPC yields no rows', async () => {
    const repo = setup({ rpc: async () => ({ data: null, error: null }) });
    expect(await repo.listActiveContractors('99999')).toEqual([]);
  });

  it('maps null columns to empty values', async () => {
    const repo = setup({
      rpc: async () => ({
        data: [
          {
            company_name: 'Nur Name',
            city: null,
            phone: null,
            website: null,
            lead_room_types: null
          }
        ],
        error: null
      })
    });

    expect(await repo.listActiveContractors('96117')).toEqual([
      { companyName: 'Nur Name', city: '', phone: '', website: '', leadRoomTypes: [] }
    ]);
  });

  it('throws when the RPC returns an error', async () => {
    const repo = setup({ rpc: async () => ({ data: null, error: new Error('boom') }) });
    await expect(repo.listActiveContractors('96117')).rejects.toThrow('boom');
  });
});
