import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { injectShellNavState } from '../shell-nav-state';
import { absoluteUrl } from '../../config/site.config';

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {
  readonly nav = injectShellNavState();

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
