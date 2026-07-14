import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConsentBannerComponent } from './components/consent-banner/consent-banner.component';
import { AuthService } from './services/auth.service';
import { ProjectSessionSyncService } from './services/project-session-sync.service';
import { CatalogService } from './services/catalog.service';
import { ProfileAssumptionDefaultsService } from './services/profile-assumption-defaults.service';
import { AssignedLeadsBadgeService } from './services/assigned-leads-badge.service';
import { SubscriptionStatusService } from './services/subscription-status.service';

/**
 * Root-Komponente (WP1, Zwei-Domain-Vorbereitung): bewusst minimal – nur der
 * Top-Level-`router-outlet` (Marketing- vs. App-Baum, siehe app.routes.ts) und
 * der Consent-Banner, plus die appweiten eager Singletons/Effects, die unter
 * BEIDEN Shells laufen müssen. Das heutige Topmenü/Footer lebt jetzt in der
 * MarketingShell (`layout/marketing-shell/`).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConsentBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly auth = inject(AuthService);
  // Beim App-Start instanziieren, damit der Login→DB-Sync (Phase 12, Block 4) aktiv ist.
  private readonly projectSessionSync = inject(ProjectSessionSyncService);
  // Katalog früh laden, damit die DB-Daten vor den Ergebnisseiten bereitstehen.
  private readonly catalog = inject(CatalogService);
  // Profil-Standardannahmen früh laden, damit sie vor den Kalkulationen greifen.
  private readonly profileDefaults = inject(ProfileAssumptionDefaultsService);
  // Nav-Badges für Profis: „Anfragen" nur bei Zuteilung, Abo-Status für „Konto".
  private readonly assignedLeadsBadge = inject(AssignedLeadsBadgeService);
  private readonly subscriptionStatus = inject(SubscriptionStatusService);

  constructor() {
    // Nach dem Login eines Profis die Nav-Badges einmal laden (Anfragen-Zuteilung
    // + Abo-Status). Guards in den Services verhindern Calls beim Prerender/offline.
    // Bleibt im Root, damit die Badges unter beiden Shells (Marketing/App) gefüllt sind.
    effect(() => {
      if (this.auth.isAuthenticated() && this.auth.isContractor()) {
        void this.assignedLeadsBadge.refresh();
        void this.subscriptionStatus.refresh();
      }
    });
  }
}
