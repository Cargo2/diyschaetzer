import { Routes } from '@angular/router';
import { wizardCompletedGuard } from './guards/wizard-completed.guard';
import { contractorGuard } from './guards/contractor.guard';
import { leadSubscriptionGuard } from './guards/lead-subscription.guard';
import { adminGuard } from './guards/admin.guard';
import { appHostMatchGuard } from './guards/app-host-match.guard';
import { appRedirectGuard } from './guards/app-redirect.guard';
import { GuideComponent } from './pages/guide/guide.component';
import { HomeComponent } from './pages/home/home.component';
import { MaterialListComponent } from './pages/material-list/material-list.component';
import { SummaryPageComponent } from './pages/summary-page/summary-page.component';
import { WizardPageComponent } from './pages/wizard-page/wizard-page.component';
import { ProjectSummaryComponent } from './pages/project-summary/project-summary.component';
import { ImpressumComponent } from './pages/legal/impressum.component';
import { DatenschutzComponent } from './pages/legal/datenschutz.component';
import { KontaktComponent } from './pages/legal/kontakt.component';
import { AuthPageComponent } from './pages/auth/auth-page.component';
import { MarketingShellComponent } from './layout/marketing-shell/marketing-shell.component';

/**
 * Marketing-Routen (WP1) – die heutigen Routen UNVERÄNDERT (gleiche Reihenfolge/
 * Guards/Lazy-Imports), jetzt als children der MarketingShell. Neu vorangestellt:
 * `appRedirectGuard` auf den App-only-Routen (login/konto/feedback/angebote/
 * rechnungen/anfragen/admin) – leitet im Cross-Domain-Betrieb auf die App-Domain
 * um, im `standalone`-Modus ein No-Op.
 *
 * ⚠️ Wizard-/App-Routen existieren in BEIDEN Bäumen (hier + app-area/app-area.routes.ts).
 * Bei Änderungen synchron halten mit `app-area/app-area.routes.ts`.
 */
export const MARKETING_ROUTES: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', canActivate: [appRedirectGuard], component: AuthPageComponent },
  {
    // Profi-Konto: Firmendaten / Preise / Premium / Anfragen-Empfang als
    // getrennte Unterseiten. contractorGuard schützt alle Kind-Routen.
    path: 'konto',
    canActivate: [appRedirectGuard, contractorGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'firmenprofil' },
      {
        path: 'firmenprofil',
        loadComponent: () =>
          import('./pages/profile/konto-firmenprofil.component').then(
            (m) => m.KontoFirmenprofilComponent
          )
      },
      {
        path: 'preise',
        loadComponent: () =>
          import('./pages/profile/konto-preise.component').then((m) => m.KontoPreiseComponent)
      },
      {
        path: 'premium',
        loadComponent: () =>
          import('./pages/profile/konto-premium.component').then((m) => m.KontoPremiumComponent)
      },
      {
        // Nur mit aktivem Lead-Abo erreichbar; sonst Redirect auf /konto/premium.
        path: 'anfragen-empfang',
        canActivate: [leadSubscriptionGuard],
        loadComponent: () =>
          import('./pages/profile/konto-anfragen-empfang.component').then(
            (m) => m.KontoAnfragenEmpfangComponent
          )
      }
    ]
  },
  {
    // Alte Profil-Route (Bookmarks/Deep-Links) → Konto. `#abo` → Premium-Abschnitt.
    path: 'profil',
    redirectTo: (data) => (data.fragment === 'abo' ? '/konto/premium' : '/konto/firmenprofil')
  },
  {
    path: 'feedback',
    canActivate: [appRedirectGuard, contractorGuard],
    loadComponent: () =>
      import('./pages/feedback/feedback-page.component').then((m) => m.FeedbackPageComponent)
  },
  {
    path: 'angebote',
    canActivate: [appRedirectGuard, contractorGuard],
    loadComponent: () =>
      import('./pages/contractor-offers/contractor-offers.component').then(
        (m) => m.ContractorOffersComponent
      )
  },
  {
    path: 'rechnungen',
    canActivate: [appRedirectGuard, contractorGuard],
    loadComponent: () =>
      import('./pages/contractor-invoices/contractor-invoices.component').then(
        (m) => m.ContractorInvoicesComponent
      )
  },
  {
    path: 'anfragen',
    canActivate: [appRedirectGuard, contractorGuard],
    loadComponent: () =>
      import('./pages/contractor-leads/contractor-leads.component').then(
        (m) => m.ContractorLeadsComponent
      )
  },
  // Double-Opt-in-Bestätigung: öffentlich (kein Guard), rein clientseitig – nie prerendern.
  {
    path: 'lead-bestaetigen/:token',
    loadComponent: () =>
      import('./pages/lead-confirm/lead-confirm.component').then((m) => m.LeadConfirmComponent)
  },
  {
    path: 'admin',
    canActivate: [appRedirectGuard, adminGuard],
    loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.ADMIN_ROUTES)
  },
  { path: 'raum-anlegen', component: WizardPageComponent },
  { path: 'materialliste', component: MaterialListComponent, canActivate: [wizardCompletedGuard] },
  { path: 'zusammenfassung', component: SummaryPageComponent, canActivate: [wizardCompletedGuard] },
  {
    path: 'zusammenfassung_raum',
    canActivate: [wizardCompletedGuard],
    loadComponent: () =>
      import('./pages/room-summary-contractor/room-summary-contractor.component').then(
        (m) => m.RoomSummaryContractorComponent
      )
  },
  { path: 'projekt-dashboard', component: ProjectSummaryComponent },
  // Alte Pfade (SEO/Bookmarks) dauerhaft auf die neuen umleiten.
  { path: 'wizard', redirectTo: 'raum-anlegen', pathMatch: 'full' },
  { path: 'summary', redirectTo: 'zusammenfassung', pathMatch: 'full' },
  { path: 'gesamtschaetzung', redirectTo: 'projekt-dashboard', pathMatch: 'full' },
  {
    path: 'geteilt/:token',
    loadComponent: () =>
      import('./pages/shared-calculation/shared-calculation.component').then(
        (m) => m.SharedCalculationComponent
      )
  },
  { path: 'ratgeber', component: GuideComponent },
  {
    path: 'ratgeber/:slug',
    loadComponent: () =>
      import('./pages/guide/ratgeber-article.component').then(
        (m) => m.RatgeberArticleComponent
      )
  },
  {
    path: 'kosten/:slug',
    loadComponent: () =>
      import('./pages/cost/cost-page.component').then((m) => m.CostPageComponent)
  },
  {
    path: 'vorlage/angebot-fliesen-muster',
    loadComponent: () =>
      import('./pages/templates/offer-template.component').then((m) => m.OfferTemplateComponent)
  },
  {
    path: 'vorlage/fliesen-verlegen-material-werkzeug',
    loadComponent: () =>
      import('./pages/templates/material-template.component').then((m) => m.MaterialTemplateComponent)
  },
  {
    path: 'fuer-fliesenleger',
    loadComponent: () =>
      import('./pages/fuer-fliesenleger/fuer-fliesenleger.component').then(
        (m) => m.FuerFliesenlegerComponent
      )
  },
  {
    path: 'agb-betriebe',
    loadComponent: () =>
      import('./pages/legal/agb-betriebe.component').then((m) => m.AgbBetriebeComponent)
  },
  { path: 'impressum', component: ImpressumComponent },
  { path: 'datenschutz', component: DatenschutzComponent },
  { path: 'kontakt', component: KontaktComponent },
  { path: '**', redirectTo: '' }
];

/**
 * Zwei-Baum-Routing (WP1, Host-Erkennung):
 * - Auf dem App-Host (bzw. Dev-Override) matcht der App-Baum (`appHostMatchGuard`
 *   → `AppHostService.isAppHost`) und lädt die schlanke App-Shell.
 * - Sonst (Marketing/standalone/Prerender – `canMatch` false) greift die
 *   MarketingShell mit den heutigen Routen. Auf dem Server ist `isAppHost` immer
 *   false, das prerenderte HTML bleibt der Marketing-Baum.
 * app.routes.server.ts NICHT anfassen: App-Pfade fallen unter `** → Client`.
 */
export const routes: Routes = [
  // Bewusst shell-los (Kundenansicht ohne Navigation): öffentliche Angebotsseite
  // ohne Marketing-Topmenü/Footer. Muss VOR dem App-Host-Baum stehen, sonst
  // schluckt dessen `**`-Fallback die Route auf dem App-Host. Gilt für beide Hosts.
  {
    path: 'angebot/:token',
    loadComponent: () =>
      import('./pages/shared-offer/shared-offer.component').then(
        (m) => m.SharedOfferComponent
      )
  },
  {
    path: '',
    canMatch: [appHostMatchGuard],
    loadChildren: () => import('./app-area/app-area.routes').then((m) => m.APP_AREA_ROUTES)
  },
  { path: '', component: MarketingShellComponent, children: MARKETING_ROUTES }
];
