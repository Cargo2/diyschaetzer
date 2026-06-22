import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from '../data-access/supabase-client';

/** Baut einen minimalen Fake-Client für die vom AuthService genutzten Aufrufe. */
function makeClient(options: {
  session: { user: { id: string; email: string } } | null;
  profileRow?: { id: string; role: string; plan: string; display_name: string | null };
  signInError?: string;
}) {
  let authCallback: ((event: string, session: unknown) => void) | null = null;
  return {
    /** Zählt, wie oft die `profiles`-Tabelle abgefragt wurde. */
    profileFetchCount: 0,
    /** Löst manuell ein onAuthStateChange-Event aus (für Dedup-Tests). */
    emitAuthEvent(event: string, session: unknown) {
      authCallback?.(event, session);
    },
    auth: {
      getSession: async () => ({ data: { session: options.session } }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        authCallback = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      signInWithPassword: async () => ({
        error: options.signInError ? { message: options.signInError } : null
      }),
      signUp: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null })
    },
    from() {
      this.profileFetchCount += 1;
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: options.profileRow ?? null, error: null })
          })
        })
      };
    }
  };
}

function setup(client: unknown): AuthService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: SUPABASE_CLIENT, useValue: client }]
  });
  return TestBed.inject(AuthService);
}

describe('AuthService', () => {
  it('is anonymous and non-blocking when Supabase is not configured', async () => {
    const service = setup(null);
    await service.ready;

    expect(service.isConfigured).toBe(false);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.initializing()).toBe(false);
    await expect(service.signIn('a@b.de', 'pw')).rejects.toThrow();
  });

  it('reports no session when none exists', async () => {
    const service = setup(makeClient({ session: null }));
    await service.ready;

    expect(service.isConfigured).toBe(true);
    expect(service.isAuthenticated()).toBe(false);
    expect(service.profile()).toBeNull();
  });

  it('loads session and profile (role/plan) when signed in', async () => {
    const service = setup(
      makeClient({
        session: { user: { id: 'user-1', email: 'profi@example.de' } },
        profileRow: { id: 'user-1', role: 'contractor', plan: 'pro', display_name: 'Fliesen Müller' }
      })
    );
    await service.ready;

    expect(service.isAuthenticated()).toBe(true);
    expect(service.userEmail()).toBe('profi@example.de');
    expect(service.profile()?.role).toBe('contractor');
    expect(service.profile()?.plan).toBe('pro');
  });

  it('loads the profile only once for repeated auth events with the same user', async () => {
    const session = { user: { id: 'user-1', email: 'profi@example.de' } };
    const client = makeClient({
      session,
      profileRow: { id: 'user-1', role: 'contractor', plan: 'pro', display_name: 'Fliesen Müller' }
    });
    const service = setup(client);
    await service.ready;

    // Nach der Initialisierung ist genau ein profiles-Call erfolgt.
    expect(client.profileFetchCount).toBe(1);

    // Wiederholte Events mit derselben user.id dürfen keinen weiteren Call auslösen.
    client.emitAuthEvent('INITIAL_SESSION', session);
    client.emitAuthEvent('SIGNED_IN', session);
    client.emitAuthEvent('TOKEN_REFRESHED', session);
    await service.ready;

    expect(client.profileFetchCount).toBe(1);
    expect(service.profile()?.role).toBe('contractor');
  });

  it('surfaces a sign-in error from the backend', async () => {
    const service = setup(makeClient({ session: null, signInError: 'Invalid login credentials' }));
    await service.ready;

    await expect(service.signIn('a@b.de', 'wrong')).rejects.toThrow();
  });
});
