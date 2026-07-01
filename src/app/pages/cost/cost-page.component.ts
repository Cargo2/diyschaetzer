import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CostPage } from '../../models/cost-page.model';
import { CostPageService } from '../../services/cost-page.service';
import { SeoService } from '../../services/seo.service';

/**
 * SEO-Themen-Kostenseite (Phase 17). Rendert das aus Markdown erzeugte Artikel-HTML
 * (antwort-zuerst, echtes Praxisbeispiel) und leitet in den Rechner – mit vorbelegtem
 * `RoomType` über den Query-Param `raum`. Wird fürs SEO prerendert; setzt
 * Title/Description/Canonical/OG + FAQPage-JSON-LD (aus den Body-FAQ).
 */
@Component({
  selector: 'app-cost-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (page(); as p) {
      <article class="cost">
        <div class="cost-body" [innerHTML]="p.html"></div>
        <footer class="cost-foot">
          <p>Die echten Zahlen für deinen Grundriss liefert der kostenlose Rechner – ohne Anmeldung.</p>
          <a
            routerLink="/raum-anlegen"
            [queryParams]="p.roomType ? { raum: p.roomType } : {}"
            class="cost-cta"
            >{{ p.ctaLabel }}</a
          >
        </footer>
      </article>
    } @else {
      <section class="cost-missing">
        <h1>Seite nicht gefunden</h1>
        <p>Diese Kostenübersicht gibt es nicht (mehr).</p>
        <a routerLink="/">Zur Startseite</a>
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .cost {
        max-width: 44rem;
        margin: 0 auto;
        background: var(--card);
        border: 1px solid rgba(19, 23, 17, 0.07);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-card);
        padding: clamp(1.4rem, 3vw, 2.6rem);
      }

      .cost-body {
        line-height: 1.8;
        color: var(--ink);
      }

      .cost-body ::ng-deep h1 {
        margin: 0 0 0.8rem;
        font-size: clamp(1.8rem, 4vw, 2.6rem);
        line-height: 1.1;
        text-wrap: balance;
      }

      .cost-body ::ng-deep h2 {
        margin: 1.8rem 0 0.7rem;
        font-size: clamp(1.3rem, 2.4vw, 1.6rem);
      }

      .cost-body ::ng-deep h3 {
        margin: 1.4rem 0 0.5rem;
        font-size: 1.15rem;
      }

      .cost-body ::ng-deep p,
      .cost-body ::ng-deep li {
        color: var(--ink-soft);
      }

      .cost-body ::ng-deep ul,
      .cost-body ::ng-deep ol {
        padding-left: 1.3rem;
        display: grid;
        gap: 0.4rem;
      }

      .cost-body ::ng-deep a {
        color: var(--verde-deep);
        font-weight: 600;
      }

      .cost-body ::ng-deep img {
        display: block;
        width: 100%;
        height: auto;
        margin: 1.2rem 0;
        border: 1px solid rgba(19, 23, 17, 0.1);
        border-radius: var(--radius-lg);
      }

      .cost-body ::ng-deep blockquote {
        margin: 1.2rem 0;
        padding: 0.6rem 1rem;
        border-left: 3px solid var(--copper);
        background: rgba(194, 112, 61, 0.06);
        border-radius: 0 0.5rem 0.5rem 0;
      }

      .cost-body ::ng-deep table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.2rem 0;
        font-size: 0.92rem;
      }

      .cost-body ::ng-deep th,
      .cost-body ::ng-deep td {
        border: 1px solid rgba(19, 23, 17, 0.12);
        padding: 0.45rem 0.6rem;
        text-align: left;
      }

      .cost-body ::ng-deep th {
        background: rgba(17, 87, 74, 0.06);
      }

      .cost-foot {
        margin-top: 2rem;
        padding-top: 1.4rem;
        border-top: 1px solid rgba(19, 23, 17, 0.08);
      }

      .cost-foot p {
        margin: 0 0 0.9rem;
        color: var(--ink-soft);
        line-height: 1.7;
      }

      .cost-cta {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: linear-gradient(120deg, var(--copper), #a9582c);
        color: #fff5ec;
        font-weight: 800;
        padding: 0.85rem 1.6rem;
        text-decoration: none;
      }

      .cost-missing {
        max-width: 44rem;
        margin: 0 auto;
        text-align: center;
        display: grid;
        gap: 0.8rem;
      }

      .cost-missing a {
        color: var(--verde-deep);
        font-weight: 700;
        text-decoration: none;
      }
    `
  ]
})
export class CostPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly costPages = inject(CostPageService);
  private readonly seo = inject(SeoService);

  readonly page = signal<CostPage | undefined>(undefined);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const page = this.costPages.bySlug(slug);
    this.page.set(page);
    if (!page) {
      this.seo.setPage({
        title: 'Seite nicht gefunden',
        description: 'Diese Kostenübersicht existiert nicht.',
        path: `/kosten/${slug}`
      });
      return;
    }
    this.seo.setPage({
      title: page.title,
      description: page.description,
      path: `/kosten/${page.slug}`,
      jsonLd:
        page.faq.length > 0
          ? {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: page.faq.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: { '@type': 'Answer', text: item.answer }
              }))
            }
          : undefined
    });
  }
}
