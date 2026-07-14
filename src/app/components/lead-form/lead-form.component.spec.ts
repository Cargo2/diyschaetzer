import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LEAD_REPOSITORY, LeadRepository } from '../../data-access/lead-repository';
import {
  LEAD_CONSENT_TEXT,
  LeadProjectSnapshot,
  LeadSubmission,
  LeadSubmitResult
} from '../../models/lead.model';
import { FeatureAccessService } from '../../services/feature-access.service';
import { LeadFormComponent } from './lead-form.component';

const SNAPSHOT: LeadProjectSnapshot = {
  roomName: 'Bad',
  roomType: 'Badezimmer',
  areaM2: 20,
  diyTotal: 1200,
  professionalTotal: 3400
};

function makeRepository(overrides: Partial<LeadRepository> = {}): LeadRepository & {
  submitted: LeadSubmission[];
} {
  const submitted: LeadSubmission[] = [];
  return {
    submitted,
    submit: async (input: LeadSubmission): Promise<LeadSubmitResult> => {
      submitted.push(input);
      return { ok: true };
    },
    confirm: async () => 'confirmed' as const,
    ...overrides
  };
}

async function setup(options: {
  canSubmitLeads: boolean;
  repository?: LeadRepository;
}): Promise<ComponentFixture<LeadFormComponent>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [LeadFormComponent],
    providers: [
      provideRouter([]),
      { provide: FeatureAccessService, useValue: { canSubmitLeads: () => options.canSubmitLeads } },
      { provide: LEAD_REPOSITORY, useValue: options.repository ?? makeRepository() }
    ]
  });
  const fixture = TestBed.createComponent(LeadFormComponent);
  fixture.componentRef.setInput('snapshot', SNAPSHOT);
  fixture.detectChanges();
  // NgModel innerhalb eines Formulars richtet seine Controls erst per Microtask
  // ein – erst danach sind die ValueAccessor-Listener aktiv (Input-Events wirken).
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function setInput(
  fixture: ComponentFixture<LeadFormComponent>,
  name: string,
  value: string
): void {
  const el = fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement;
  el.value = value;
  el.dispatchEvent(new Event('input'));
}

function setConsent(fixture: ComponentFixture<LeadFormComponent>, checked: boolean): void {
  const el = fixture.nativeElement.querySelector('input[name="consent"]') as HTMLInputElement;
  el.checked = checked;
  el.dispatchEvent(new Event('change'));
}

/** Setzt die Pflichtfelder über echte ngModel-Input-Events (vermeidet NG0100). */
function fillValid(fixture: ComponentFixture<LeadFormComponent>): void {
  setInput(fixture, 'name', 'Max Mustermann');
  setInput(fixture, 'postalCode', '96117');
  setInput(fixture, 'email', 'max@example.com');
}

describe('LeadFormComponent', () => {
  it('renders no lead markup at all when leads are not enabled (Feature-Gate)', async () => {
    const fixture = await setup({ canSubmitLeads: false });
    expect(fixture.nativeElement.querySelector('.lead-box')).toBeNull();
    expect(fixture.nativeElement.querySelector('form.lead-form')).toBeNull();
  });

  it('renders the form when leads are enabled', async () => {
    const fixture = await setup({ canSubmitLeads: true });
    expect(fixture.nativeElement.querySelector('.lead-box')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('form.lead-form')).not.toBeNull();
  });

  it('shows the consent text verbatim (matches the server consent wording)', async () => {
    const fixture = await setup({ canSubmitLeads: true });
    const consent = fixture.nativeElement.querySelector('.consent-text') as HTMLElement;
    const normalized = consent.textContent?.replace(/\s+/g, ' ').trim();
    expect(normalized).toBe(LEAD_CONSENT_TEXT);
  });

  it('keeps submit disabled until required fields AND consent checkbox are set', async () => {
    const fixture = await setup({ canSubmitLeads: true });
    const button = () =>
      fixture.nativeElement.querySelector('.lead-actions button') as HTMLButtonElement;

    // Nichts ausgefüllt → deaktiviert.
    expect(button().disabled).toBe(true);

    // Pflichtfelder valide, aber Einwilligung fehlt → weiterhin deaktiviert.
    fillValid(fixture);
    fixture.detectChanges();
    expect(button().disabled).toBe(true);
    expect(fixture.componentInstance.formValid()).toBe(false);

    // Einwilligung gesetzt → aktiv.
    setConsent(fixture, true);
    fixture.detectChanges();
    expect(button().disabled).toBe(false);
    expect(fixture.componentInstance.formValid()).toBe(true);
  });

  it('rejects an invalid postal code even with consent', async () => {
    const fixture = await setup({ canSubmitLeads: true });
    fillValid(fixture);
    setInput(fixture, 'postalCode', '123');
    setConsent(fixture, true);
    fixture.detectChanges();
    expect(fixture.componentInstance.formValid()).toBe(false);
  });

  it('submits the snapshot and shows the confirmation-pending success state', async () => {
    const repository = makeRepository();
    const fixture = await setup({ canSubmitLeads: true, repository });
    fillValid(fixture);
    setConsent(fixture, true);
    fixture.detectChanges();

    await fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(repository.submitted.length).toBe(1);
    expect(repository.submitted[0].projectSnapshot).toEqual(SNAPSHOT);
    expect(repository.submitted[0].consent).toBe(true);
    expect(fixture.nativeElement.querySelector('.lead-success')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('E-Mail bestätigen');
  });

  it('does not submit when the consent checkbox is unchecked (UI guard)', async () => {
    const repository = makeRepository();
    const fixture = await setup({ canSubmitLeads: true, repository });
    fillValid(fixture);
    // Einwilligung bewusst NICHT gesetzt.

    await fixture.componentInstance.submit();

    expect(repository.submitted.length).toBe(0);
  });

  it('shows a differentiated error message for a 409 rate limit', async () => {
    const repository = makeRepository({
      submit: async () => ({ ok: false, reason: 'rate_limited' })
    });
    const fixture = await setup({ canSubmitLeads: true, repository });
    fillValid(fixture);
    setConsent(fixture, true);
    fixture.detectChanges();

    await fixture.componentInstance.submit();
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('.lead-message.error') as HTMLElement;
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('bereits mehrere Anfragen');
    expect(fixture.nativeElement.querySelector('.lead-success')).toBeNull();
  });
});
