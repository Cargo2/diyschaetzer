import { Component, OnInit, inject } from '@angular/core';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-impressum',
  standalone: true,
  templateUrl: './impressum.component.html',
  styleUrl: './legal.css'
})
export class ImpressumComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Impressum',
      description: 'Impressum und Anbieterkennzeichnung gemäß § 5 DDG für fliesen-kosten.de.',
      path: '/impressum',
      noindex: true
    });
  }
}
