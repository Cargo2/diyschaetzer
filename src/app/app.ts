import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConsentBannerComponent } from './components/consent-banner/consent-banner.component';
import { ConsentService } from './services/consent.service';
import { ROOM_TYPE_DEFAULT_NAMES } from './models/bathroom-wizard.model';
import { WizardStateService } from './services/wizard-state.service';
import { AuthService } from './services/auth.service';
import { LocalProjectService } from './services/local-project.service';
import { ProjectSessionSyncService } from './services/project-session-sync.service';
import { CatalogService } from './services/catalog.service';
import { ProfileAssumptionDefaultsService } from './services/profile-assumption-defaults.service';
import { AssignedLeadsBadgeService } from './services/assigned-leads-badge.service';
import { SubscriptionStatusService } from './services/subscription-status.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ConsentBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly wizardState = inject(WizardStateService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly consent = inject(ConsentService);
  private readonly localProject = inject(LocalProjectService);
  // Beim App-Start instanziieren, damit der Login→DB-Sync (Phase 12, Block 4) aktiv ist.
  private readonly projectSessionSync = inject(ProjectSessionSyncService);
  // Katalog früh laden, damit die DB-Daten vor den Ergebnisseiten bereitstehen.
  private readonly catalog = inject(CatalogService);
  // Profil-Standardannahmen früh laden, damit sie vor den Kalkulationen greifen.
  private readonly profileDefaults = inject(ProfileAssumptionDefaultsService);
  // Nav-Badges für Profis: „Anfragen" nur bei Zuteilung, Abo-Status für „Konto".
  private readonly assignedLeadsBadge = inject(AssignedLeadsBadgeService);
  private readonly subscriptionStatus = inject(SubscriptionStatusService);

  readonly resultsAvailable = this.wizardState.resultsAvailable;

  constructor() {
    // Nach dem Login eines Profis die Nav-Badges einmal laden (Anfragen-Zuteilung
    // + Abo-Status). Guards in den Services verhindern Calls beim Prerender/offline.
    effect(() => {
      if (this.auth.isAuthenticated() && this.auth.isContractor()) {
        void this.assignedLeadsBadge.refresh();
        void this.subscriptionStatus.refresh();
      }
    });
  }

  /**
   * Name des aktuell bearbeiteten/ausgewählten Raums (für den dynamischen Menüpunkt).
   * Quelle in dieser Reihenfolge: gespeicherter, gerade bearbeiteter Raum →
   * im Wizard eingegebener Name → Standardname des Raumtyps → „Raum".
   */
  readonly roomName = computed(() => {
    const editingId = this.localProject.editingRoomId();
    if (editingId) {
      const editedRoom = this.localProject
        .rooms()
        .find((room) => room.id === editingId);
      const editedName = editedRoom?.roomName?.trim();
      if (editedName) {
        return editedName;
      }
    }
    const room = this.wizardState.payload().room;
    const typed = room.roomName?.trim();
    if (typed) {
      return typed;
    }
    return room.roomType ? ROOM_TYPE_DEFAULT_NAMES[room.roomType] : 'Raum';
  });

  /** Auth-Zustand für die Kopfzeile. */
  readonly authConfigured = this.auth.isConfigured;
  readonly isAuthenticated = this.auth.isAuthenticated;
  /** Konto-Dropdown/Anfragen-Menüpunkt nur für angemeldete Profis. */
  readonly isContractor = this.auth.isContractor;
  /** Admin-Link nur für angemeldete Admins. */
  readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  /** „Anfragen"-Menüpunkt nur, wenn dem Profi mindestens eine Anfrage zugeteilt ist. */
  readonly hasAssignedLeads = this.assignedLeadsBadge.hasAssignedLeads;
  /** „Aktiv"-Punkt bei „Premium" + Freischaltung von „Anfragen empfangen". */
  readonly hasActiveSubscription = this.subscriptionStatus.isActive;

  /** Offen/zu-Zustand der mobilen Navigation (Hamburger). Auf Desktop ohne Wirkung. */
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Öffnet den Consent-Dialog aus dem Footer heraus (jederzeitiger Widerruf). */
  openCookieSettings(): void {
    this.consent.openSettings();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Disabled „Anfragen empfangen" (ohne Abo) verweist auf die Freischaltung. */
  goToPremium(): void {
    this.closeMenu();
    void this.router.navigate(['/konto/premium']);
  }

  openResultsPage(path: '/materialliste' | '/zusammenfassung' | '/zusammenfassung_raum'): void {
    this.closeMenu();

    if (this.resultsAvailable()) {
      void this.router.navigate([path]);
      return;
    }

    void this.router.navigate(['/raum-anlegen'], {
      queryParams: {
        resultsLocked: '1'
      }
    });
  }

  async logout(): Promise<void> {
    this.closeMenu();
    try {
      await this.auth.signOut();
    } finally {
      // Nav-Badges zurücksetzen, damit sie nach dem Abmelden nicht stehen bleiben.
      this.assignedLeadsBadge.reset();
      this.subscriptionStatus.reset();
      void this.router.navigateByUrl('/');
    }
  }
}
