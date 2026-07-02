import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { absoluteUrl, SITE_NAME } from '../../config/site.config';
import { RatgeberArticle } from '../../models/ratgeber.model';
import { RatgeberService } from '../../services/ratgeber.service';
import { SeoService } from '../../services/seo.service';

/**
 * Einzelner Ratgeber-Beitrag (Phase 16). Rendert das build-generierte Artikel-HTML
 * und setzt Artikel-SEO (Title/Description/Canonical/OG + Article-JSON-LD). Wird
 * fürs SEO prerendert (siehe Prerender-Routen).
 */
@Component({
  selector: 'app-ratgeber-article',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (article(); as a) {
      <article class="article">
        <nav class="article-back">
          <a routerLink="/ratgeber">← Alle Ratgeber-Beiträge</a>
        </nav>
        <header class="article-head">
          <p class="article-meta">
            <time [attr.datetime]="a.date">{{ formatDate(a.date) }}</time>
            <span aria-hidden="true">·</span>
            <span>{{ a.readingMinutes }} Min. Lesezeit</span>
          </p>
          <h1>{{ a.title }}</h1>
          <p class="article-lead">{{ a.description }}</p>
        </header>
        <div class="article-body" [innerHTML]="a.html"></div>
        <footer class="article-foot">
          <a routerLink="/raum-anlegen" class="article-cta">Jetzt Kosten schätzen</a>
        </footer>
      </article>
    } @else {
      <section class="article-missing">
        <h1>Beitrag nicht gefunden</h1>
        <p>Diesen Ratgeber-Beitrag gibt es nicht (mehr).</p>
        <a routerLink="/ratgeber">Zur Ratgeber-Übersicht</a>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .article {
        max-width: 44rem;
        margin: 0 auto;
        background: var(--card);
        border: 1px solid rgba(19, 23, 17, 0.07);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-card);
        padding: clamp(1.4rem, 3vw, 2.6rem);
      }

      .article-back {
        margin-bottom: 1rem;
      }

      .article-back a,
      .article-missing a {
        color: var(--verde-deep);
        font-weight: 700;
        font-size: 0.9rem;
        text-decoration: none;
      }

      .article-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0 0 0.6rem;
        font-size: 0.8rem;
        color: var(--ink-soft);
        opacity: 0.85;
      }

      .article-head h1 {
        margin: 0 0 0.6rem;
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        line-height: 1.1;
        text-wrap: balance;
      }

      .article-lead {
        margin: 0 0 1.4rem;
        font-size: 1.05rem;
        color: var(--ink-soft);
        line-height: 1.7;
      }

      .article-body {
        line-height: 1.8;
        color: var(--ink);
      }

      .article-body ::ng-deep h2 {
        margin: 1.8rem 0 0.7rem;
        font-size: clamp(1.3rem, 2.4vw, 1.6rem);
      }

      .article-body ::ng-deep h3 {
        margin: 1.4rem 0 0.5rem;
        font-size: 1.15rem;
      }

      .article-body ::ng-deep p,
      .article-body ::ng-deep li {
        color: var(--ink-soft);
      }

      .article-body ::ng-deep ul,
      .article-body ::ng-deep ol {
        padding-left: 1.3rem;
        display: grid;
        gap: 0.4rem;
      }

      .article-body ::ng-deep a {
        color: var(--verde-deep);
        font-weight: 600;
      }

      .article-body ::ng-deep img {
        display: block;
        width: 100%;
        height: auto;
        margin: 1.2rem 0;
        border: 1px solid rgba(19, 23, 17, 0.1);
        border-radius: var(--radius-lg);
      }

      .article-body ::ng-deep blockquote {
        margin: 1.2rem 0;
        padding: 0.6rem 1rem;
        border-left: 3px solid var(--copper);
        background: rgba(194, 112, 61, 0.06);
        border-radius: 0 0.5rem 0.5rem 0;
      }

      .article-body ::ng-deep table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.2rem 0;
        font-size: 0.92rem;
        /* Auf schmalen Screens horizontal scrollbar statt Layout-Überlauf. */
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .article-body ::ng-deep th,
      .article-body ::ng-deep td {
        border: 1px solid rgba(19, 23, 17, 0.12);
        padding: 0.45rem 0.6rem;
        text-align: left;
      }

      .article-body ::ng-deep th {
        background: rgba(17, 87, 74, 0.06);
      }

      .article-foot {
        margin-top: 2rem;
        padding-top: 1.4rem;
        border-top: 1px solid rgba(19, 23, 17, 0.08);
      }

      .article-cta {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: linear-gradient(120deg, var(--copper), #a9582c);
        color: #fff5ec;
        font-weight: 800;
        padding: 0.85rem 1.6rem;
        text-decoration: none;
      }

      .article-missing {
        max-width: 44rem;
        margin: 0 auto;
        text-align: center;
        display: grid;
        gap: 0.8rem;
      }
    `
  ]
})
export class RatgeberArticleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ratgeber = inject(RatgeberService);
  private readonly seo = inject(SeoService);

  readonly article = signal<RatgeberArticle | undefined>(undefined);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const article = this.ratgeber.bySlug(slug);
    this.article.set(article);
    if (!article) {
      this.seo.setPage({
        title: 'Beitrag nicht gefunden',
        description: 'Dieser Ratgeber-Beitrag existiert nicht.',
        path: `/ratgeber/${slug}`
      });
      return;
    }
    const articleLd = {
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.date,
      inLanguage: 'de-DE',
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
      mainEntityOfPage: absoluteUrl(`/ratgeber/${article.slug}`)
    };
    // Bei vorhandener FAQ Article + FAQPage in einem @graph ausliefern (Rich Results).
    const jsonLd =
      article.faq.length > 0
        ? {
            '@context': 'https://schema.org',
            '@graph': [
              articleLd,
              {
                '@type': 'FAQPage',
                mainEntity: article.faq.map((item) => ({
                  '@type': 'Question',
                  name: item.question,
                  acceptedAnswer: { '@type': 'Answer', text: item.answer }
                }))
              }
            ]
          }
        : { '@context': 'https://schema.org', ...articleLd };
    this.seo.setPage({
      title: article.title,
      description: article.description,
      path: `/ratgeber/${article.slug}`,
      type: 'article',
      jsonLd
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
