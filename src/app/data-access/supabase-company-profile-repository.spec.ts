import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from './supabase-client';
import { SupabaseCompanyProfileRepository } from './supabase-company-profile-repository';

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

function setup(client: unknown): SupabaseCompanyProfileRepository {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(SupabaseCompanyProfileRepository);
}

describe('SupabaseCompanyProfileRepository', () => {
  it('maps a row to the domain profile', async () => {
    const repo = setup(
      makeClient({
        userId: 'user-1',
        row: {
          id: 'user-1',
          company_name: 'Fliesen Müller',
          contact_name: 'Anna Müller',
          street: 'Hauptstr. 1',
          postal_code: '12345',
          city: 'Musterstadt',
          phone: '0123',
          email: 'info@mueller.de',
          website: 'https://mueller.de',
          vat_id: 'DE123',
          offer_intro_text: 'Guten Tag',
          offer_outro_text: 'Zahlbar in 14 Tagen',
          material_surcharge_percent: 12
        }
      })
    );

    const profile = await repo.load();

    expect(profile).toEqual({
      companyName: 'Fliesen Müller',
      contactName: 'Anna Müller',
      street: 'Hauptstr. 1',
      postalCode: '12345',
      city: 'Musterstadt',
      phone: '0123',
      email: 'info@mueller.de',
      website: 'https://mueller.de',
      vatId: 'DE123',
      offerIntroText: 'Guten Tag',
      offerOutroText: 'Zahlbar in 14 Tagen',
      materialSurchargePercent: 12
    });
  });

  it('returns null when no profile row exists', async () => {
    const repo = setup(makeClient({ userId: 'user-1', row: null }));
    expect(await repo.load()).toBeNull();
  });

  it('upserts snake_case fields with the id from the session', async () => {
    let captured: Record<string, unknown> | null = null;
    const repo = setup(
      makeClient({ userId: 'user-9', onUpsert: (value) => (captured = value) })
    );

    await repo.save({
      companyName: 'X GmbH',
      contactName: '',
      street: '',
      postalCode: '',
      city: '',
      phone: '',
      email: '',
      website: '',
      vatId: 'DE999',
      offerIntroText: 'Hallo',
      offerOutroText: 'Danke',
      materialSurchargePercent: 15
    });

    expect(captured).toMatchObject({
      id: 'user-9',
      company_name: 'X GmbH',
      vat_id: 'DE999',
      offer_intro_text: 'Hallo',
      offer_outro_text: 'Danke',
      material_surcharge_percent: 15
    });
  });

  it('throws on save without a session', async () => {
    const repo = setup(makeClient({ userId: null }));
    await expect(
      repo.save({
        companyName: '',
        contactName: '',
        street: '',
        postalCode: '',
        city: '',
        phone: '',
        email: '',
        website: '',
        vatId: '',
        offerIntroText: '',
        offerOutroText: '',
        materialSurchargePercent: 0
      })
    ).rejects.toThrow();
  });
});
