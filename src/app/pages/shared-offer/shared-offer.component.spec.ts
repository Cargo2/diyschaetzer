import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ExportDocumentData } from '../../models/export-document.model';
import { SharedOfferPage } from '../../models/shared-offer-tracking.model';
import { ContractorOfferShareService } from '../../services/contractor-offer-share.service';
import { SharedOfferComponent } from './shared-offer.component';

function makeDoc(): ExportDocumentData {
  return {
    documentType: 'contractor_offer',
    title: 'Angebot Badsanierung',
    subtitle: null,
    projectName: 'Bad OG',
    roomName: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    sections: [{ id: 'offer', title: 'Leistungsverzeichnis', type: 'offer', content: [] }],
    totals: { netTotal: 1000, vatPercent: 19, vatAmount: 190, grossTotal: 1190 },
    legalNotice: null
  };
}

function makeShareService(overrides: Partial<ContractorOfferShareService> = {}): ContractorOfferShareService {
  return {
    createShare: async () => 'token',
    loadShare: async () => makeDoc(),
    createShareForOffer: async () => 'token',
    loadSharePage: async (): Promise<SharedOfferPage | null> => ({
      data: makeDoc(),
      acceptedAt: null,
      acceptedByName: ''
    }),
    pingView: async () => undefined,
    accept: async () => ({ acceptedAt: '2026-07-14T10:00:00.000Z', acceptedByName: 'Max Mustermann' }),
    trackingForOffer: async () => null,
    shareUrl: (token: string) => `https://example.test/angebot/${token}`,
    ...overrides
  } as ContractorOfferShareService;
}

async function setup(
  serviceOverrides: Partial<ContractorOfferShareService> = {},
  token: string | null = 'abc-token'
): Promise<ComponentFixture<SharedOfferComponent>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SharedOfferComponent],
    providers: [
      provideRouter([]),
      { provide: ContractorOfferShareService, useValue: makeShareService(serviceOverrides) },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => token } } } }
    ]
  });
  const fixture = TestBed.createComponent(SharedOfferComponent);
  await fixture.componentInstance.ngOnInit();
  fixture.detectChanges();
  return fixture;
}

describe('SharedOfferComponent', () => {
  it('loads the share page and shows the acceptance form when not yet accepted', async () => {
    const fixture = await setup();
    expect(fixture.componentInstance.doc()).not.toBeNull();
    expect(fixture.componentInstance.isAccepted()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Angebot verbindlich annehmen');
  });

  it('pings the view after successful load (fire-and-forget)', async () => {
    const pingView = vi.fn(async () => undefined);
    await setup({ pingView });
    expect(pingView).toHaveBeenCalledWith('abc-token');
  });

  it('shows the accepted banner when the page was already accepted', async () => {
    const fixture = await setup({
      loadSharePage: async () => ({
        data: makeDoc(),
        acceptedAt: '2026-07-10T08:30:00.000Z',
        acceptedByName: 'Erika Musterfrau'
      })
    });
    expect(fixture.componentInstance.isAccepted()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Angenommen von Erika Musterfrau');
    expect(fixture.nativeElement.textContent).not.toContain('Angebot verbindlich annehmen');
  });

  it('falls back to loadShare when loadSharePage returns null (e.g. migration missing)', async () => {
    const fixture = await setup({ loadSharePage: async () => null });
    expect(fixture.componentInstance.doc()).not.toBeNull();
    expect(fixture.componentInstance.notFound()).toBe(false);
    // Ohne Annahme-Daten aus dem Fallback bleibt der Zustand "nicht angenommen".
    expect(fixture.componentInstance.isAccepted()).toBe(false);
  });

  it('falls back to loadShare when loadSharePage throws', async () => {
    const fixture = await setup({
      loadSharePage: async () => {
        throw new Error('missing rpc');
      }
    });
    expect(fixture.componentInstance.doc()).not.toBeNull();
    expect(fixture.componentInstance.notFound()).toBe(false);
  });

  it('shows not found when both loadSharePage and loadShare fail', async () => {
    const fixture = await setup({
      loadSharePage: async () => null,
      loadShare: async () => null
    });
    expect(fixture.componentInstance.notFound()).toBe(true);
  });

  it('blocks acceptance for an invalid name (client-side validation)', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.acceptName.set('A');
    fixture.detectChanges();
    expect(component.nameValid()).toBe(false);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.accept-btn');
    expect(button.disabled).toBe(true);
  });

  it('submits acceptance successfully and shows the banner', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.acceptName.set('Max Mustermann');
    fixture.detectChanges();
    expect(component.nameValid()).toBe(true);

    await component.submitAcceptance();
    fixture.detectChanges();

    expect(component.isAccepted()).toBe(true);
    expect(component.acceptedByName()).toBe('Max Mustermann');
    expect(fixture.nativeElement.textContent).toContain('Angenommen von Max Mustermann');
  });

  it('shows a German error message when accept fails with invalid_name', async () => {
    const fixture = await setup({
      accept: async () => {
        throw new Error('invalid_name');
      }
    });
    const component = fixture.componentInstance;
    component.acceptName.set('Max Mustermann');
    fixture.detectChanges();

    await component.submitAcceptance();
    fixture.detectChanges();

    expect(component.acceptError()).toContain('Vor- und Nachnamen');
    expect(component.isAccepted()).toBe(false);
  });

  it('shows a generic German error message on network failure', async () => {
    const fixture = await setup({
      accept: async () => {
        throw new Error('network error');
      }
    });
    const component = fixture.componentInstance;
    component.acceptName.set('Max Mustermann');
    fixture.detectChanges();

    await component.submitAcceptance();
    fixture.detectChanges();

    expect(component.acceptError()).toContain('Internetverbindung');
  });
});
