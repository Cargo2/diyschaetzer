import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  absoluteUrl,
  SITE_DEFAULT_DESCRIPTION,
  SITE_NAME
} from '../config/site.config';

export interface SeoPage {
  /** Seitentitel (ohne Marken-Suffix). */
  title: string;
  /** Meta-Description; leer → Default. */
  description?: string;
  /** Pfad für Canonical/og:url, z. B. '/ratgeber/...'. */
  path: string;
  /** og:type, Standard 'website'; Artikel = 'article'. */
  type?: 'website' | 'article';
  /** Optionales JSON-LD (wird als ld+json in den <head> gelegt). */
  jsonLd?: Record<string, unknown>;
}

/**
 * Setzt pro Route Title, Meta-Description, Canonical, Open-Graph/Twitter und
 * optionales JSON-LD. Läuft auch beim Prerendering (nutzt nur DOCUMENT/Meta/Title),
 * sodass die Tags ins statisch erzeugte HTML einfließen.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private static readonly JSON_LD_ID = 'seo-json-ld';

  setPage(page: SeoPage): void {
    const description = page.description?.trim() || SITE_DEFAULT_DESCRIPTION;
    const url = absoluteUrl(page.path);
    const fullTitle = `${page.title} · ${SITE_NAME}`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });

    this.setCanonical(url);

    // Open Graph / Twitter
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: page.type ?? 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

    this.setJsonLd(page.jsonLd ?? null);
  }

  private setCanonical(url: string): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(data: Record<string, unknown> | null): void {
    const head = this.document.head;
    const existing = head.querySelector(`script#${SeoService.JSON_LD_ID}`);
    if (existing) {
      existing.remove();
    }
    if (!data) {
      return;
    }
    const script = this.document.createElement('script');
    script.id = SeoService.JSON_LD_ID;
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data);
    head.appendChild(script);
  }
}
