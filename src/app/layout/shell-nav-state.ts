import { computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ConsentService } from '../services/consent.service';
import { ROOM_TYPE_DEFAULT_NAMES } from '../models/bathroom-wizard.model';
import { WizardStateService } from '../services/wizard-state.service';
import { AuthService } from '../services/auth.service';
import { LocalProjectService } from '../services/local-project.service';
import { AssignedLeadsBadgeService } from '../services/assigned-leads-badge.service';
import { SubscriptionStatusService } from '../services/subscription-status.service';
import { AppHostService } from '../services/app-host.service';

/**
 * Geteilte Nav-Logik für MarketingShell + AppShell (Phase 18, WP2).
 *
 * Beide Shells zeigen (teils überlappende) Navigation basierend auf denselben
 * Signalen/Bedingungen (Raumname, Ergebnis-Verfügbarkeit, Rollen, Abo-/Lead-Status).
 * Um Copy-Paste-Drift zu vermeiden, kapselt diese Funktion die komplette Ableitung +
 * die Standardaktionen (Zusammenfassung/Materialliste öffnen, Abmelden, Cookie-Dialog).
 *
 * Muss synchron im Injection-Context eines Components aufgerufen werden (z. B. als
 * Feld-Initialisierer `readonly nav = injectShellNavState();`), analog zu Angulars
 * eigenen `inject()`-Composables.
 */
export function injectShellNavState() {
  const wizardState = inject(WizardStateService);
  const router = inject(Router);
  const auth = inject(AuthService);
  const consent = inject(ConsentService);
  const localProject = inject(LocalProjectService);
  const assignedLeadsBadge = inject(AssignedLeadsBadgeService);
  const subscriptionStatus = inject(SubscriptionStatusService);
  const host = inject(AppHostService);

  const resultsAvailable = wizardState.resultsAvailable;

  /**
   * Name des aktuell bearbeiteten/ausgewählten Raums (für dynamische Menüpunkte).
   * Quelle in dieser Reihenfolge: gespeicherter, gerade bearbeiteter Raum →
   * im Wizard eingegebener Name → Standardname des Raumtyps → „Raum".
   */
  const roomName = computed(() => {
    const editingId = localProject.editingRoomId();
    if (editingId) {
      const editedRoom = localProject.rooms().find((room) => room.id === editingId);
      const editedName = editedRoom?.roomName?.trim();
      if (editedName) {
        return editedName;
      }
    }
    const room = wizardState.payload().room;
    const typed = room.roomName?.trim();
    if (typed) {
      return typed;
    }
    return room.roomType ? ROOM_TYPE_DEFAULT_NAMES[room.roomType] : 'Raum';
  });

  /** Auth-Zustand für die Kopfzeile/Sidebar. */
  const authConfigured = auth.isConfigured;
  const isAuthenticated = auth.isAuthenticated;
  /** Konto-/Angebote-Bereich nur für angemeldete Profis. */
  const isContractor = auth.isContractor;
  /** Admin-Link nur für angemeldete Admins. */
  const isAdmin = computed(() => auth.profile()?.role === 'admin');
  const userEmail = auth.userEmail;
  /** „Anfragen"-Menüpunkt nur, wenn dem Profi mindestens eine Anfrage zugeteilt ist. */
  const hasAssignedLeads = assignedLeadsBadge.hasAssignedLeads;
  /** Anzahl zugeteilter Anfragen fürs Badge (`null`, solange nicht geladen). */
  const leadsCount = assignedLeadsBadge.count;
  /** „Aktiv"-Punkt bei „Premium" + Freischaltung von „Anfragen empfangen". */
  const hasActiveSubscription = subscriptionStatus.isActive;

  /** Offen/zu-Zustand der mobilen Navigation (Hamburger/Drawer). Auf Desktop ohne Wirkung. */
  const menuOpen = signal(false);

  function toggleMenu(): void {
    menuOpen.update((open) => !open);
  }

  function closeMenu(): void {
    menuOpen.set(false);
  }

  /** Öffnet den Consent-Dialog aus dem Footer heraus (jederzeitiger Widerruf). */
  function openCookieSettings(): void {
    consent.openSettings();
  }

  /** Disabled „Anfragen empfangen" (ohne Abo) verweist auf die Freischaltung. */
  function goToPremium(): void {
    closeMenu();
    void router.navigate(['/konto/premium']);
  }

  function openResultsPage(path: '/materialliste' | '/zusammenfassung' | '/zusammenfassung_raum'): void {
    closeMenu();

    if (resultsAvailable()) {
      void router.navigate([path]);
      return;
    }

    void router.navigate(['/raum-anlegen'], {
      queryParams: {
        resultsLocked: '1'
      }
    });
  }

  /**
   * @param afterLogoutPath Ziel nach dem Abmelden. Marketing-Shell navigiert auf
   * `/` (Startseite), die AppShell auf `/login` (kein Marketing-Baum im App-Host).
   */
  async function logout(afterLogoutPath: string): Promise<void> {
    closeMenu();
    try {
      await auth.signOut();
    } finally {
      // Nav-Badges zurücksetzen, damit sie nach dem Abmelden nicht stehen bleiben.
      assignedLeadsBadge.reset();
      subscriptionStatus.reset();
      void router.navigateByUrl(afterLogoutPath);
    }
  }

  return {
    host,
    resultsAvailable,
    roomName,
    authConfigured,
    isAuthenticated,
    isContractor,
    isAdmin,
    userEmail,
    hasAssignedLeads,
    leadsCount,
    hasActiveSubscription,
    menuOpen,
    toggleMenu,
    closeMenu,
    openCookieSettings,
    goToPremium,
    openResultsPage,
    logout
  };
}
