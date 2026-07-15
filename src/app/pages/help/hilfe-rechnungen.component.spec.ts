import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HilfeRechnungenComponent } from './hilfe-rechnungen.component';

describe('HilfeRechnungenComponent', () => {
  let fixture: ComponentFixture<HilfeRechnungenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HilfeRechnungenComponent],
      providers: [provideRouter([])]
    });
    fixture = TestBed.createComponent(HilfeRechnungenComponent);
    fixture.detectChanges();
  });

  it('renders the key sections (Rechnungsarten, XRechnung, Aufbewahrung, Kündigung)', () => {
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Rechnungsarten');
    expect(text).toContain('Schlussrechnung');
    expect(text).toContain('XRechnung');
    expect(text).toContain('Wichtig: Aufbewahrung');
    expect(text).toContain('§ 147 AO');
    expect(text).toContain('Kündigung & Löschung');
  });

  it('links back to the invoices page and to the privacy policy', () => {
    const links: HTMLAnchorElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('a')
    );
    const hrefs = links.map((a) => a.getAttribute('routerLink') ?? a.getAttribute('href'));
    expect(hrefs).toContain('/rechnungen');
    expect(hrefs).toContain('/datenschutz');
  });
});
