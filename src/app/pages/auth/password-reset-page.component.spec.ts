import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppHostService } from '../../services/app-host.service';
import { AuthService } from '../../services/auth.service';
import { PasswordResetPageComponent } from './password-reset-page.component';

interface AuthStub {
  isConfigured: boolean;
  ready: Promise<void>;
  isAuthenticated: () => boolean;
  updatePassword: (password: string) => Promise<void>;
}

function setup(options: { auth?: Partial<AuthStub>; isAppHost?: boolean } = {}): {
  component: PasswordResetPageComponent;
  navigated: () => string | null;
} {
  let navigatedTo: string | null = null;
  const auth: AuthStub = {
    isConfigured: true,
    ready: Promise.resolve(),
    isAuthenticated: () => false,
    updatePassword: async () => {},
    ...options.auth
  };
  const router = { navigateByUrl: async (url: string) => { navigatedTo = url; } };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
      // RouterLink im Template injiziert ActivatedRoute – minimaler Stub reicht.
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap({}) } }
      },
      { provide: AppHostService, useValue: { isAppHost: options.isAppHost ?? false } },
      { provide: PLATFORM_ID, useValue: 'browser' }
    ]
  });
  const component = TestBed.createComponent(PasswordResetPageComponent).componentInstance;
  return { component, navigated: () => navigatedTo };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('PasswordResetPageComponent – Recovery-Session-Prüfung', () => {
  it('shows the invalid-link state when no session arrives (no token in URL)', async () => {
    const { component } = setup();

    await component.ngOnInit();

    expect(component.checking()).toBe(false);
    expect(component.hasSession()).toBe(false);
  });

  it('shows the form when a recovery session is present', async () => {
    const { component } = setup({ auth: { isAuthenticated: () => true } });

    await component.ngOnInit();

    expect(component.checking()).toBe(false);
    expect(component.hasSession()).toBe(true);
  });

  it('stops checking without touching auth when Supabase is not configured', async () => {
    const { component } = setup({ auth: { isConfigured: false } });

    await component.ngOnInit();

    expect(component.checking()).toBe(false);
    expect(component.hasSession()).toBe(false);
  });
});

describe('PasswordResetPageComponent – Passwort setzen', () => {
  it('blocks submit when the passwords do not match', async () => {
    let updateCalled = false;
    const { component } = setup({
      auth: {
        isAuthenticated: () => true,
        updatePassword: async () => {
          updateCalled = true;
        }
      }
    });
    component.password = 'geheim1';
    component.passwordConfirm = 'geheim2';

    await component.submit();

    expect(component.errorMsg()).toContain('stimmen nicht überein');
    expect(updateCalled).toBe(false);
  });

  it('blocks submit when the password is too short', async () => {
    let updateCalled = false;
    const { component } = setup({
      auth: {
        updatePassword: async () => {
          updateCalled = true;
        }
      }
    });
    component.password = 'kurz';
    component.passwordConfirm = 'kurz';

    await component.submit();

    expect(component.errorMsg()).toContain('zu kurz');
    expect(updateCalled).toBe(false);
  });

  it('updates the password and redirects to the app dashboard in the app host', async () => {
    vi.useFakeTimers();
    let updatedWith: string | null = null;
    const { component, navigated } = setup({
      auth: {
        isAuthenticated: () => true,
        updatePassword: async (password: string) => {
          updatedWith = password;
        }
      },
      isAppHost: true
    });
    component.password = 'geheim1';
    component.passwordConfirm = 'geheim1';

    await component.submit();

    expect(updatedWith).toBe('geheim1');
    expect(component.success()).toBe(true);
    expect(component.errorMsg()).toBeNull();
    await vi.advanceTimersByTimeAsync(3000);
    expect(navigated()).toBe('/projekt-dashboard');
  });

  it('shows a humanized error when the update fails', async () => {
    const { component } = setup({
      auth: {
        updatePassword: async () => {
          throw new Error('New password should be different from the old password.');
        }
      }
    });
    component.password = 'geheim1';
    component.passwordConfirm = 'geheim1';

    await component.submit();

    expect(component.success()).toBe(false);
    expect(component.errorMsg()).toContain('vom bisherigen unterscheiden');
  });
});
