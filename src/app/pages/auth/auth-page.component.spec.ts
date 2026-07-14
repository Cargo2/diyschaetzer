import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { AppHostService } from '../../services/app-host.service';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../models/auth.model';
import { AuthPageComponent } from './auth-page.component';

interface AuthStub {
  isConfigured: boolean;
  ready: Promise<void>;
  isAuthenticated: () => boolean;
  profile: () => UserProfile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: () => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  claimContractorRole: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

function setup(options: {
  queryParams?: Record<string, string>;
  auth?: Partial<AuthStub>;
  isAppHost?: boolean;
}): {
  component: AuthPageComponent;
  navigated: () => string | null;
} {
  let navigatedTo: string | null = null;
  const auth: AuthStub = {
    isConfigured: true,
    ready: Promise.resolve(),
    isAuthenticated: () => false,
    profile: () => null,
    signIn: async () => {},
    signUp: async () => ({ needsEmailConfirmation: true }),
    signInWithGoogle: async () => {},
    claimContractorRole: async () => true,
    refreshProfile: async () => {},
    ...options.auth
  };
  const router = { navigateByUrl: async (url: string) => { navigatedTo = url; } };
  const route = {
    snapshot: { queryParamMap: convertToParamMap(options.queryParams ?? {}) }
  };
  try {
    globalThis.sessionStorage?.clear();
  } catch {
    /* kein sessionStorage in dieser Umgebung */
  }
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: route },
      { provide: AppHostService, useValue: { isAppHost: options.isAppHost ?? false } },
      { provide: PLATFORM_ID, useValue: 'browser' }
    ]
  });
  const component = TestBed.createComponent(AuthPageComponent).componentInstance;
  return { component, navigated: () => navigatedTo };
}

describe('AuthPageComponent – Deep-Link-Query-Parameter', () => {
  it('activates the register tab and preselects the contractor role', () => {
    const { component } = setup({
      queryParams: { modus: 'registrieren', rolle: 'betrieb', weiter: '/konto/premium' }
    });
    component.ngOnInit();
    expect(component.mode()).toBe('register');
    expect(component.role()).toBe('contractor');
    expect(component.redirectTarget()).toBe('/konto/premium');
  });

  it('ignores an external redirect target (open-redirect protection)', () => {
    const { component } = setup({ queryParams: { weiter: 'https://evil.example.com' } });
    component.ngOnInit();
    expect(component.redirectTarget()).toBeNull();
  });

  it('ignores a protocol-relative redirect target', () => {
    const { component } = setup({ queryParams: { weiter: '//evil.example.com' } });
    component.ngOnInit();
    expect(component.redirectTarget()).toBeNull();
  });

  it('redirects to the weiter target after a successful login', async () => {
    const { component, navigated } = setup({ queryParams: { weiter: '/konto/premium' } });
    component.ngOnInit();
    component.email = 'a@b.de';
    component.password = 'secret1';

    await component.submit();

    expect(navigated()).toBe('/konto/premium');
  });

  it('falls back to home when no redirect target is present', async () => {
    const { component, navigated } = setup({});
    component.ngOnInit();
    component.email = 'a@b.de';
    component.password = 'secret1';

    await component.submit();

    expect(navigated()).toBe('/');
  });

  it('keeps the redirect target and shows a Premium hint after sign-up confirmation', async () => {
    const { component, navigated } = setup({
      queryParams: { modus: 'registrieren', rolle: 'betrieb', weiter: '/konto/premium' },
      auth: { signUp: async () => ({ needsEmailConfirmation: true }) }
    });
    component.ngOnInit();
    component.email = 'a@b.de';
    component.password = 'secret1';
    component.passwordConfirm = 'secret1';

    await component.submit();

    expect(component.mode()).toBe('login');
    expect(component.infoMsg()).toContain('Premium');
    // Ziel bleibt für die spätere Anmeldung erhalten, es wird nicht navigiert.
    expect(component.redirectTarget()).toBe('/konto/premium');
    expect(navigated()).toBeNull();
  });

  it('redirects immediately when sign-up returns an active session', async () => {
    const { component, navigated } = setup({
      queryParams: { weiter: '/konto/premium', modus: 'registrieren' },
      auth: { signUp: async () => ({ needsEmailConfirmation: false }) }
    });
    component.ngOnInit();
    component.email = 'a@b.de';
    component.password = 'secret1';
    component.passwordConfirm = 'secret1';

    await component.submit();

    expect(navigated()).toBe('/konto/premium');
  });
});

describe('AuthPageComponent – Passwort-Bestätigung', () => {
  it('blocks submit and shows a message when the passwords do not match', async () => {
    let signUpCalled = false;
    const { component } = setup({
      queryParams: { modus: 'registrieren' },
      auth: {
        signUp: async () => {
          signUpCalled = true;
          return { needsEmailConfirmation: true };
        }
      }
    });
    component.ngOnInit();
    component.email = 'a@b.de';
    component.password = 'secret1';
    component.passwordConfirm = 'secret2';

    await component.submit();

    expect(component.errorMsg()).toContain('stimmen nicht überein');
    expect(signUpCalled).toBe(false);
  });

  it('calls signUp when the passwords match', async () => {
    let signUpCalled = false;
    const { component } = setup({
      queryParams: { modus: 'registrieren' },
      auth: {
        signUp: async () => {
          signUpCalled = true;
          return { needsEmailConfirmation: true };
        }
      }
    });
    component.ngOnInit();
    component.email = 'a@b.de';
    component.password = 'secret1';
    component.passwordConfirm = 'secret1';

    await component.submit();

    expect(signUpCalled).toBe(true);
  });
});

describe('AuthPageComponent – OAuth-Rückkehr / bereits eingeloggt', () => {
  it('consumes the redirect target on init when already authenticated', async () => {
    const { component, navigated } = setup({
      queryParams: { weiter: '/konto/premium' },
      auth: { isAuthenticated: () => true }
    });

    await component.ngOnInit();

    expect(navigated()).toBe('/konto/premium');
  });

  it('navigates to the app dashboard by default in the app host', async () => {
    const { component, navigated } = setup({
      auth: { isAuthenticated: () => true },
      isAppHost: true
    });

    await component.ngOnInit();

    expect(navigated()).toBe('/projekt-dashboard');
  });

  it('claims the contractor role after a Google signup as Betrieb', async () => {
    let claimCalled = false;
    let refreshCalled = false;
    const { component } = setup({
      auth: {
        isAuthenticated: () => true,
        profile: () => ({ id: 'u1', role: 'customer', plan: 'free', displayName: null }),
        claimContractorRole: async () => {
          claimCalled = true;
          return true;
        },
        refreshProfile: async () => {
          refreshCalled = true;
        }
      }
    });
    // Rollen-Flag wie vor dem OAuth-Redirect gesetzt.
    globalThis.sessionStorage?.setItem('auth_signup_role', 'contractor');

    await component.ngOnInit();

    expect(claimCalled).toBe(true);
    expect(refreshCalled).toBe(true);
  });

  it('does not claim a role for a Google login without the contractor flag', async () => {
    let claimCalled = false;
    const { component } = setup({
      auth: {
        isAuthenticated: () => true,
        profile: () => ({ id: 'u1', role: 'customer', plan: 'free', displayName: null }),
        claimContractorRole: async () => {
          claimCalled = true;
          return true;
        }
      }
    });

    await component.ngOnInit();

    expect(claimCalled).toBe(false);
  });
});
