import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

/**
 * AGB für das B2B-Lead-Abo (`/agb-betriebe`, prerendert). Enthält bewusst
 * markierte `[Platzhalter: rechtlich prüfen]`-Blöcke – der finale Wortlaut wird
 * vor Livegang anwaltlich geprüft. Indexierbar (in Sitemap), Footer-Link.
 */
@Component({
  selector: 'app-agb-betriebe',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agb-betriebe.component.html',
  styleUrl: './legal.css'
})
export class AgbBetriebeComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'AGB für Betriebe (Lead-Abo)',
      description:
        'Allgemeine Geschäftsbedingungen für das Lead-Abo von Fliesenleger-Fachbetrieben: ' +
        'Leistungsbeschreibung, Laufzeit, Kündigung, Preise und Zahlungsabwicklung.',
      path: '/agb-betriebe'
    });
  }
}
