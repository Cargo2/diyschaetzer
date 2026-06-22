import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CookieNoticeComponent } from './components/cookie-notice/cookie-notice.component';
import { WizardStateService } from './services/wizard-state.service';
import { AuthService } from './services/auth.service';
import { ProjectSessionSyncService } from './services/project-session-sync.service';
import { CatalogService } from './services/catalog.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, CookieNoticeComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly wizardState = inject(WizardStateService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  // Beim App-Start instanziieren, damit der Login→DB-Sync (Phase 12, Block 4) aktiv ist.
  private readonly projectSessionSync = inject(ProjectSessionSyncService);
  // Katalog früh laden, damit die DB-Daten vor den Ergebnisseiten bereitstehen.
  private readonly catalog = inject(CatalogService);

  readonly resultsAvailable = this.wizardState.resultsAvailable;

  /** Auth-Zustand für die Kopfzeile. */
  readonly authConfigured = this.auth.isConfigured;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly userEmail = this.auth.userEmail;
  /** Firmenprofil-Link nur für angemeldete Profis. */
  readonly isContractor = computed(() => this.auth.profile()?.role === 'contractor');

  /** Offen/zu-Zustand der mobilen Navigation (Hamburger). Auf Desktop ohne Wirkung. */
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openResultsPage(path: '/materialliste' | '/summary'): void {
    this.closeMenu();

    if (this.resultsAvailable()) {
      void this.router.navigate([path]);
      return;
    }

    void this.router.navigate(['/wizard'], {
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
      void this.router.navigateByUrl('/');
    }
  }
}
