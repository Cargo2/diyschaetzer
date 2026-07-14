import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthPageComponent } from './auth-page.component';

interface AuthStub {
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: () => Promise<{ needsEmailConfirmation: boolean }>;
}

function setup(options: {
  queryParams?: Record<string, string>;
  auth?: Partial<AuthStub>;
}): {
  component: AuthPageComponent;
  navigated: () => string | null;
} {
  let navigatedTo: string | null = null;
  const auth: AuthStub = {
    isConfigured: true,
    signIn: async () => {},
    signUp: async () => ({ needsEmailConfirmation: true }),
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

    await component.submit();

    expect(navigated()).toBe('/konto/premium');
  });
});
