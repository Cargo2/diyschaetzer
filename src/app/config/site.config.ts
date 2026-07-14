/**
 * Site-weite SEO-Konstanten.
 *
 * WICHTIG vor Livegang: `SITE_URL` auf die echte Produktionsdomain setzen
 * (ohne abschließenden Slash). Sie speist Canonical-URLs, Open-Graph-`og:url`
 * und die generierte sitemap.xml. Eine falsche Domain schadet dem SEO mehr als
 * gar keine – daher hier bewusst als Platzhalter markiert.
 */
export const SITE_URL = 'https://fliesen-kosten.de';

/** Marken-/Seitenname für <title>-Suffix und og:site_name. */
export const SITE_NAME = 'Fliesenprojekt';

/** Standard-Beschreibung der Startseite/Fallback. */
export const SITE_DEFAULT_DESCRIPTION =
  'Kostenloser Fliesen-Kostenschätzer: Flächen, Materialmengen inkl. Verschnitt, ' +
  'DIY-Kosten und Profi-Kalkulation für dein Bad – schnell und ohne Anmeldung.';

/** Absolute URL zu einem Pfad (führender Slash erwartet). */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized === '/' ? '' : normalized}`;
}

/**
 * Zwei-Domain-Betrieb (WP1): Marketing (fliesen-kosten.de) vs. App-Bereich
 * (app.fliesen-kosten.de). EIN Build; die Host-Erkennung (AppHostService)
 * entscheidet zur Laufzeit, welcher Routen-Baum/Shell greift.
 */
export const APP_URL = 'https://app.fliesen-kosten.de';
export const MARKETING_HOSTNAMES = ['fliesen-kosten.de', 'www.fliesen-kosten.de'];
/** Go-Live-Schalter: erst auf true stellen, wenn app.* deployt ist. */
export const APP_DOMAIN_LIVE = false;
