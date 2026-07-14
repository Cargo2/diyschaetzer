import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { injectShellNavState } from '../shell-nav-state';
import { CROSS_DOMAIN_PROJECT_HINT } from '../../services/app-host.service';

/**
 * Marketing-Shell (WP1): das heutige Topmenü + Footer + `<main class="content-stage">`
 * mit `router-outlet`. Aus `App` 1:1 extrahiert, damit das prerenderte HTML der
 * Inhaltsseiten strukturell identisch bleibt (SEO). Der Consent-Banner sowie die
 * appweiten eager Singletons/Effects bleiben in der Root-Komponente `App`, weil sie
 * unter BEIDEN Shells laufen müssen.
 *
 * Die Nav-Bedingungen (Raumname, Ergebnis-Verfügbarkeit, Rollen, Abo-/Lead-Status) und
 * Standardaktionen (Zusammenfassung/Materialliste öffnen, Abmelden, Cookie-Dialog)
 * teilt sie sich mit der AppShell über `injectShellNavState()` (Phase 18, WP2) – hier
 * nur als Delegation, damit das Markup unangetastet bleibt.
 */
@Component({
  selector: 'app-marketing-shell',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './marketing-shell.component.html',
  styleUrl: './marketing-shell.component.css'
})
export class MarketingShellComponent {
  private readonly nav = injectShellNavState();

  /** Zwei-Domain-Betrieb: entscheidet über relative vs. absolute Login-Links. */
  readonly host = this.nav.host;

  readonly resultsAvailable = this.nav.resultsAvailable;
  readonly roomName = this.nav.roomName;

  /** Auth-Zustand für die Kopfzeile. */
  readonly authConfigured = this.nav.authConfigured;
  readonly isAuthenticated = this.nav.isAuthenticated;
  /** Konto-Dropdown/Anfragen-Menüpunkt nur für angemeldete Profis. */
  readonly isContractor = this.nav.isContractor;
  /** Admin-Link nur für angemeldete Admins. */
  readonly isAdmin = this.nav.isAdmin;
  /** „Anfragen"-Menüpunkt nur, wenn dem Profi mindestens eine Anfrage zugeteilt ist. */
  readonly hasAssignedLeads = this.nav.hasAssignedLeads;
  /** „Aktiv"-Punkt bei „Premium" + Freischaltung von „Anfragen empfangen". */
  readonly hasActiveSubscription = this.nav.hasActiveSubscription;

  /**
   * Titel-Attribut für den „Anmelden"-Link: Hinweis, dass das anonyme lokale
   * Projekt bei Cross-Domain-Login auf dieser Domain bleibt. `null` (= kein
   * Attribut im DOM), solange Cross-Domain inaktiv ist oder kein Raum gespeichert
   * wurde – Markup bleibt für den Prerender sonst unverändert.
   */
  readonly loginHintTitle = computed(() =>
    this.host.crossDomainEnabled && this.nav.hasSavedRooms()
      ? CROSS_DOMAIN_PROJECT_HINT
      : null
  );

  /** Offen/zu-Zustand der mobilen Navigation (Hamburger). Auf Desktop ohne Wirkung. */
  readonly menuOpen = this.nav.menuOpen;

  toggleMenu(): void {
    this.nav.toggleMenu();
  }

  /** Öffnet den Consent-Dialog aus dem Footer heraus (jederzeitiger Widerruf). */
  openCookieSettings(): void {
    this.nav.openCookieSettings();
  }

  closeMenu(): void {
    this.nav.closeMenu();
  }

  /** Disabled „Anfragen empfangen" (ohne Abo) verweist auf die Freischaltung. */
  goToPremium(): void {
    this.nav.goToPremium();
  }

  openResultsPage(path: '/materialliste' | '/zusammenfassung' | '/zusammenfassung_raum'): void {
    this.nav.openResultsPage(path);
  }

  async logout(): Promise<void> {
    await this.nav.logout('/');
  }
}
