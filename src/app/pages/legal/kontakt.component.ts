import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  templateUrl: './kontakt.component.html',
  styleUrl: './legal.css'
})
export class KontaktComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Kontakt',
      description: 'Kontakt zum Betreiber von fliesen-kosten.de – Fragen, Hinweise und Feedback.',
      path: '/kontakt'
    });
  }
}
