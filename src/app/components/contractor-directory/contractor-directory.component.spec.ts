import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CONTRACTOR_DIRECTORY_REPOSITORY } from '../../data-access/contractor-directory-repository';
import { ContractorDirectoryEntry } from '../../models/contractor-directory.model';
import { FeatureAccessService } from '../../services/feature-access.service';
import { LeadRegionService } from '../../services/lead-region.service';
import { ContractorDirectoryComponent } from './contractor-directory.component';

const ENTRIES: ContractorDirectoryEntry[] = [
  {
    companyName: 'Fliesen Müller',
    city: 'Bamberg',
    phone: '0951 123',
    website: 'fliesen-mueller.de',
    leadRoomTypes: ['bathroom', 'kitchen']
  }
];

function setup(options: {
  canSubmitLeads?: boolean;
  entries?: ContractorDirectoryEntry[];
  fail?: boolean;
}): {
  fixture: ComponentFixture<ContractorDirectoryComponent>;
  component: ContractorDirectoryComponent;
  region: LeadRegionService;
} {
  const repository = {
    listActiveContractors: async () => {
      if (options.fail) {
        throw new Error('boom');
      }
      return options.entries ?? [];
    }
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: CONTRACTOR_DIRECTORY_REPOSITORY, useValue: repository },
      {
        provide: FeatureAccessService,
        useValue: { canSubmitLeads: () => options.canSubmitLeads ?? true }
      }
    ]
  });
  const fixture = TestBed.createComponent(ContractorDirectoryComponent);
  return {
    fixture,
    component: fixture.componentInstance,
    region: TestBed.inject(LeadRegionService)
  };
}

describe('ContractorDirectoryComponent', () => {
  it('renders nothing when the lead feature gate is off (no Supabase)', () => {
    const { fixture } = setup({ canSubmitLeads: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.directory-box')).toBeNull();
  });

  it('is expanded by default and shows the search field', () => {
    const { fixture, component } = setup({});
    fixture.detectChanges();
    expect(component.open()).toBe(true);
    expect(fixture.nativeElement.querySelector('.directory-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('input[name="directoryPostalCode"]')).not.toBeNull();
  });

  it('renders a tile per contractor with room-type chips as German labels', async () => {
    const { fixture, component } = setup({ entries: ENTRIES });
    fixture.detectChanges();
    component.postalCode = '96117';
    await component.search();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.directory-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].querySelector('h3').textContent).toContain('Fliesen Müller');
    const chips = Array.from(cards[0].querySelectorAll('.directory-chips li')).map(
      (li) => (li as HTMLElement).textContent?.trim()
    );
    expect(chips).toEqual(['Bad', 'Küche']);

    const tel = cards[0].querySelector('a[href^="tel:"]') as HTMLAnchorElement;
    expect(tel.getAttribute('href')).toBe('tel:0951 123');
    const web = cards[0].querySelector('a[rel="noopener"]') as HTMLAnchorElement;
    expect(web.getAttribute('href')).toBe('https://fliesen-mueller.de');
  });

  it('shows the empty-state message when no contractor matches', async () => {
    const { fixture, component } = setup({ entries: [] });
    fixture.detectChanges();
    component.postalCode = '99999';
    await component.search();
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.directory-empty');
    expect(empty).not.toBeNull();
    expect(empty.textContent).toContain('Noch kein Premium-Betrieb');
  });

  it('shares the postal code with the lead form (prefill both directions)', () => {
    const { component, region } = setup({});
    component.postalCode = '96117';
    expect(region.postalCode()).toBe('96117');

    region.postalCode.set('10115');
    expect(component.postalCode).toBe('10115');
  });

  it('does not search with an invalid postal code and shows an error on failure', async () => {
    const { fixture, component } = setup({ fail: true });
    fixture.detectChanges();

    component.postalCode = '123';
    expect(component.canSearch()).toBe(false);

    component.postalCode = '96117';
    await component.search();
    fixture.detectChanges();
    expect(component.error()).toBe(true);
    expect(fixture.nativeElement.querySelector('.directory-message.error')).not.toBeNull();
  });
});
