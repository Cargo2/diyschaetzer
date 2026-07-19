import { Routes } from '@angular/router';
import { wizardCompletedGuard } from '../guards/wizard-completed.guard';
import { contractorGuard } from '../guards/contractor.guard';
import { leadSubscriptionGuard } from '../guards/lead-subscription.guard';
import { adminGuard } from '../guards/admin.guard';
import { AuthPageComponent } from '../pages/auth/auth-page.component';
import { MaterialListComponent } from '../pages/material-list/material-list.component';
import { SummaryPageComponent } from '../pages/summary-page/summary-page.component';
import { WizardPageComponent } from '../pages/wizard-page/wizard-page.component';
import { ProjectSummaryComponent } from '../pages/project-summary/project-summary.component';
import { AppShellComponent } from '../layout/app-shell/app-shell.component';
import { ExternalRedirectComponent } from './external-redirect.component';

/**
 * App-Bereich (WP1): greift nur auf dem App-Host (`appHostMatchGuard`) bzw. per
 * Dev-Override. Enthält den Rechner-/Profi-Flow OHNE Marketing-Topmenü. `login`
 * liegt bewusst OHNE Shell drumherum; alles Übrige rendert in der Platzhalter-
 * `AppShellComponent` (WP2 ersetzt sie durch die Profi-Sidebar).
 *
 * ⚠️ Wizard-/App-Routen existieren in BEIDEN Bäumen (hier + app.routes.ts
 * `MARKETING_ROUTES`). Bei Änderungen synchron halten mit `app.routes.ts`.
 */
export const APP_AREA_ROUTES: Routes = [
  { path: 'login', component: AuthPageComponent },
  {
    // Ziel des Passwort-Reset-Mail-Links – wie `login` bewusst OHNE Shell.
    path: 'passwort-neu',
    loadComponent: () =>
      import('../pages/auth/password-reset-page.component').then(
        (m) => m.PasswordResetPageComponent
      )
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'projekt-dashboard' },
      { path: 'raum-anlegen', component: WizardPageComponent },
      {
        path: 'materialliste',
        component: MaterialListComponent,
        canActivate: [wizardCompletedGuard]
      },
      {
        path: 'zusammenfassung',
        component: SummaryPageComponent,
        canActivate: [wizardCompletedGuard]
      },
      {
        path: 'zusammenfassung_raum',
        canActivate: [wizardCompletedGuard],
        loadComponent: () =>
          import('../pages/room-summary-contractor/room-summary-contractor.component').then(
            (m) => m.RoomSummaryContractorComponent
          )
      },
      { path: 'projekt-dashboard', component: ProjectSummaryComponent },
      {
        path: 'angebote',
        canActivate: [contractorGuard],
        loadComponent: () =>
          import('../pages/contractor-offers/contractor-offers.component').then(
            (m) => m.ContractorOffersComponent
          )
      },
      {
        path: 'rechnungen',
        canActivate: [contractorGuard],
        loadComponent: () =>
          import('../pages/contractor-invoices/contractor-invoices.component').then(
            (m) => m.ContractorInvoicesComponent
          )
      },
      {
        path: 'anfragen',
        canActivate: [contractorGuard],
        loadComponent: () =>
          import('../pages/contractor-leads/contractor-leads.component').then(
            (m) => m.ContractorLeadsComponent
          )
      },
      {
        // Anwenderdoku „Rechnungen" – synchron mit app.routes.ts (MARKETING_ROUTES) halten.
        path: 'hilfe/rechnungen',
        canActivate: [contractorGuard],
        loadComponent: () =>
          import('../pages/help/hilfe-rechnungen.component').then(
            (m) => m.HilfeRechnungenComponent
          )
      },
      {
        path: 'feedback',
        canActivate: [contractorGuard],
        loadComponent: () =>
          import('../pages/feedback/feedback-page.component').then((m) => m.FeedbackPageComponent)
      },
      {
        // Profi-Konto: Firmendaten / Preise / Premium / Anfragen-Empfang.
        path: 'konto',
        canActivate: [contractorGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'firmenprofil' },
          {
            path: 'firmenprofil',
            loadComponent: () =>
              import('../pages/profile/konto-firmenprofil.component').then(
                (m) => m.KontoFirmenprofilComponent
              )
          },
          {
            path: 'preise',
            loadComponent: () =>
              import('../pages/profile/konto-preise.component').then((m) => m.KontoPreiseComponent)
          },
          {
            path: 'vorlagen',
            loadComponent: () =>
              import('../pages/profile/konto-vorlagen.component').then(
                (m) => m.KontoVorlagenComponent
              )
          },
          {
            path: 'premium',
            loadComponent: () =>
              import('../pages/profile/konto-premium.component').then((m) => m.KontoPremiumComponent)
          },
          {
            path: 'anfragen-empfang',
            canActivate: [leadSubscriptionGuard],
            loadComponent: () =>
              import('../pages/profile/konto-anfragen-empfang.component').then(
                (m) => m.KontoAnfragenEmpfangComponent
              )
          }
        ]
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('../pages/admin/admin.routes').then((m) => m.ADMIN_ROUTES)
      },
      // Unbekannte Pfade im App-Baum: Marketing-Präfixe → Marketing-Domain, sonst Dashboard.
      { path: '**', component: ExternalRedirectComponent }
    ]
  }
];
