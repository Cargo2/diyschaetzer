import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { absoluteUrl, SITE_NAME } from '../../config/site.config';
import { RatgeberService } from '../../services/ratgeber.service';
import { SeoService } from '../../services/seo.service';

/**
 * Ratgeber-Übersicht (Phase 16). Listet die build-generierten Beiträge und setzt
 * Seiten-SEO (Title/Description/Canonical/OG + ItemList-JSON-LD).
 */
@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './guide.component.html',
  styleUrl: './guide.component.css'
})
export class GuideComponent implements OnInit {
  private readonly ratgeber = inject(RatgeberService);
  private readonly seo = inject(SeoService);

  readonly articles = this.ratgeber.articles;

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Ratgeber rund ums Fliesen',
      description:
        'Praktische Ratgeber-Beiträge zu Fliesen, Material, Eigenleistung und ' +
        'Kostenplanung – verständlich erklärt für Heimwerker.',
      path: '/ratgeber',
      type: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Ratgeber – ${SITE_NAME}`,
        itemListElement: this.articles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(`/ratgeber/${article.slug}`),
          name: article.title
        }))
      }
    });
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}
