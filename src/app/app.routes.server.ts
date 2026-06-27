import { RenderMode, ServerRoute } from '@angular/ssr';
import { RATGEBER_ARTICLES } from './content/ratgeber-articles';

/**
 * Render-Modi je Route (Phase 16, Prerendering). Nur die statischen Inhaltsseiten
 * werden zur Build-Zeit zu HTML prerendert (SEO); der interaktive Rechner, Admin,
 * Login und token-/parametrisierte Routen bleiben clientseitig (kein SEO-Bedarf,
 * brauchen Browser-State/Auth).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'ratgeber', renderMode: RenderMode.Prerender },
  {
    path: 'ratgeber/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => RATGEBER_ARTICLES.map((article) => ({ slug: article.slug }))
  },
  { path: 'impressum', renderMode: RenderMode.Prerender },
  { path: 'datenschutz', renderMode: RenderMode.Prerender },
  { path: 'kontakt', renderMode: RenderMode.Prerender },
  // Alles Übrige clientseitig rendern (Rechner, Admin, Login, /geteilt/:token, Redirects).
  { path: '**', renderMode: RenderMode.Client }
];
