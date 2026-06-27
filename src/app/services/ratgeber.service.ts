import { Injectable } from '@angular/core';
import { RATGEBER_ARTICLES } from '../content/ratgeber-articles';
import { RatgeberArticle } from '../models/ratgeber.model';

/**
 * Zugriff auf die (build-generierten) Ratgeber-Beiträge. Quelle ist das aus den
 * Markdown-Dateien erzeugte Modul `content/ratgeber-articles.ts`.
 */
@Injectable({ providedIn: 'root' })
export class RatgeberService {
  /** Alle Beiträge, neueste zuerst. */
  readonly articles: RatgeberArticle[] = RATGEBER_ARTICLES;

  bySlug(slug: string): RatgeberArticle | undefined {
    return RATGEBER_ARTICLES.find((article) => article.slug === slug);
  }
}
