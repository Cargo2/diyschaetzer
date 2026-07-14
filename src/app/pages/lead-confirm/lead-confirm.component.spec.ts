import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LEAD_REPOSITORY, LeadRepository } from '../../data-access/lead-repository';
import { LeadConfirmResult } from '../../models/lead.model';
import { LeadConfirmComponent } from './lead-confirm.component';

function makeRepository(confirm: () => Promise<LeadConfirmResult>): LeadRepository {
  return {
    submit: async () => ({ ok: true }),
    confirm
  };
}

async function setup(options: {
  token: string | null;
  confirm: () => Promise<LeadConfirmResult>;
}): Promise<ComponentFixture<LeadConfirmComponent>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [LeadConfirmComponent],
    providers: [
      provideRouter([]),
      { provide: LEAD_REPOSITORY, useValue: makeRepository(options.confirm) },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => options.token } } }
      }
    ]
  });
  const fixture = TestBed.createComponent(LeadConfirmComponent);
  await fixture.componentInstance.ngOnInit();
  fixture.detectChanges();
  return fixture;
}

describe('LeadConfirmComponent', () => {
  it('shows the success state when the token confirms', async () => {
    const fixture = await setup({ token: 'a'.repeat(64), confirm: async () => 'confirmed' });
    expect(fixture.componentInstance.state()).toBe('confirmed');
    expect(fixture.nativeElement.textContent).toContain('Anfrage bestätigt');
    expect(fixture.nativeElement.textContent).toContain('3 passende Betriebe');
  });

  it('shows the invalid state when the token is not accepted', async () => {
    const fixture = await setup({ token: 'expired-token', confirm: async () => 'invalid' });
    expect(fixture.componentInstance.state()).toBe('invalid');
    expect(fixture.nativeElement.textContent).toContain('ungültig oder abgelaufen');
  });

  it('falls back to the invalid state on a repository error', async () => {
    const fixture = await setup({
      token: 'x'.repeat(64),
      confirm: async () => {
        throw new Error('network');
      }
    });
    expect(fixture.componentInstance.state()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('ungültig oder abgelaufen');
  });

  it('shows the invalid state when no token is present in the route', async () => {
    const fixture = await setup({ token: null, confirm: async () => 'confirmed' });
    expect(fixture.componentInstance.state()).toBe('invalid');
  });
});
