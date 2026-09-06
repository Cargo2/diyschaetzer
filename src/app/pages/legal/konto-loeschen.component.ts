import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../services/seo.service';

/**
 * Öffentliche „Konto löschen"-Seite (`/konto-loeschen`, prerendert, ohne Login
 * erreichbar). Wird u. a. von Google Play (Data-Safety-Fragebogen) verlangt:
 * nennt App-Name + Betreiber, den Löschweg in nummerierten Schritten sowie
 * gelöschte/aufbewahrte Daten inkl. Fristen. `noindex` wie die Datenschutzerklärung.
 */
@Component({
  selector: 'app-konto-loeschen',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './konto-loeschen.component.html',
  styleUrl: './legal.css'
})
export class KontoLoeschenComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Konto löschen',
      description:
        'So löschst du dein FliesenPilot-Konto: Löschung per E-Mail anfordern, welche Daten ' +
        'gelöscht werden und welche Belege wir aus gesetzlichen Gründen aufbewahren.',
      path: '/konto-loeschen',
      noindex: true
    });
  }
}
