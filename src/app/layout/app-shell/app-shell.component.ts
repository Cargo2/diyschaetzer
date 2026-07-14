import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { injectShellNavState } from '../shell-nav-state';
import { absoluteUrl } from '../../config/site.config';
import { I18nService, UiLang } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * App-Shell (Phase 18, WP2): echte Profi-Sidebar-Navigation (Ubersuggest-Stil) für
 * den App-Baum (`app-area.routes.ts`). Ersetzt den WP1-Platzhalter (schmale Topbar).
 *
 * Desktop: linke, sticky Sidebar (Gruppen Projekt/Angebote/Konto/Admin) + Router-
 * Outlet rechts. Unter 768px wird die Sidebar zum Off-Canvas-Drawer (Hamburger in
 * einer schmalen Topbar). Die Nav-Bedingungen teilt sie sich mit der MarketingShell
 * über `injectShellNavState()`.
 */
@Component({
  selector: 'app-app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {
  readonly nav = injectShellNavState();

  /** Laufzeit-Übersetzung (nur App-Bereich). Template nutzt `i18n.lang()` + `| t`. */
  readonly i18n = inject(I18nService);

  constructor() {
    // Gespeicherte Sprachwahl übernehmen – greift NUR im App-Host (Gate im Service),
    // damit Marketing/Prerender immer Deutsch bleiben.
    this.i18n.initFromStorage();
  }

  /** Sprachumschalter (change-Event des <select>). */
  onLangChange(value: string): void {
    void this.i18n.setLang(value as UiLang);
  }

  /** Mikro-Footer verlinkt absolut auf die Marketing-Domain (SITE_URL). */
  readonly legalUrls = {
    impressum: absoluteUrl('/impressum'),
    datenschutz: absoluteUrl('/datenschutz'),
    kontakt: absoluteUrl('/kontakt')
  };

  /** Escape schließt den mobilen Drawer (Desktop ohne Wirkung, da menuOpen dort ungenutzt bleibt). */
  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.nav.menuOpen()) {
      this.nav.closeMenu();
    }
  }

  /** Im App-Baum gibt es keine Marketing-Startseite – nach dem Abmelden auf `/login`. */
  async logout(): Promise<void> {
    await this.nav.logout('/login');
  }
}
