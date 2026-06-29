import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-datenschutz',
  standalone: true,
  templateUrl: './datenschutz.component.html',
  styleUrl: './legal.css'
})
export class DatenschutzComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Datenschutzerklärung',
      description:
        'Datenschutzerklärung nach DSGVO/BDSG: welche Daten beim Besuch von fliesen-kosten.de ' +
        'verarbeitet werden und welche Rechte du hast.',
      path: '/datenschutz',
      noindex: true
    });
  }
}
