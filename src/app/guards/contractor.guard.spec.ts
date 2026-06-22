import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { contractorGuard } from './contractor.guard';

const REDIRECT = { redirect: true };

function run(auth: Partial<AuthService>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { ready: Promise.resolve(), ...auth } },
      { provide: Router, useValue: { createUrlTree: () => REDIRECT } }
    ]
  });
  return TestBed.runInInjectionContext(() =>
    contractorGuard({} as never, {} as never)
  ) as Promise<unknown>;
}

describe('contractorGuard', () => {
  it('allows an authenticated contractor', async () => {
    const result = await run({
      isAuthenticated: () => true,
      profile: () => ({ id: 'u', role: 'contractor', plan: 'pro', displayName: null })
    } as Partial<AuthService>);
    expect(result).toBe(true);
  });

  it('redirects an authenticated customer', async () => {
    const result = await run({
      isAuthenticated: () => true,
      profile: () => ({ id: 'u', role: 'customer', plan: 'free', displayName: null })
    } as Partial<AuthService>);
    expect(result).toBe(REDIRECT);
  });

  it('redirects an anonymous visitor', async () => {
    const result = await run({
      isAuthenticated: () => false,
      profile: () => null
    } as Partial<AuthService>);
    expect(result).toBe(REDIRECT);
  });
});
