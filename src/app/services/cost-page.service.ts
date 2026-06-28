import { Injectable } from '@angular/core';
import { COST_PAGES } from '../content/cost-pages';
import { CostPage } from '../models/cost-page.model';

/**
 * Zugriff auf die SEO-Kostenseiten (Phase 17). Quelle ist die getippte Konfiguration
 * `content/cost-pages.ts`.
 */
@Injectable({ providedIn: 'root' })
export class CostPageService {
  /** Alle Kostenseiten. */
  readonly pages: CostPage[] = COST_PAGES;

  bySlug(slug: string): CostPage | undefined {
    return COST_PAGES.find((page) => page.slug === slug);
  }
}
