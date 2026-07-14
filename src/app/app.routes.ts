import { Routes } from '@angular/router';
import { wizardCompletedGuard } from './guards/wizard-completed.guard';
import { contractorGuard } from './guards/contractor.guard';
import { leadSubscriptionGuard } from './guards/lead-subscription.guard';
import { adminGuard } from './guards/admin.guard';
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

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: AuthPageComponent },
  {
    // Profi-Konto: Firmendaten / Preise / Premium / Anfragen-Empfang als
    // getrennte Unterseiten. contractorGuard schützt alle Kind-Routen.
    path: 'konto',
    canActivate: [contractorGuard],
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
    canActivate: [contractorGuard],
    loadComponent: () =>
      import('./pages/feedback/feedback-page.component').then((m) => m.FeedbackPageComponent)
  },
  {
    path: 'angebote',
    canActivate: [contractorGuard],
    loadComponent: () =>
      import('./pages/contractor-offers/contractor-offers.component').then(
        (m) => m.ContractorOffersComponent
      )
  },
  {
    path: 'rechnungen',
    canActivate: [contractorGuard],
    loadComponent: () =>
      import('./pages/contractor-invoices/contractor-invoices.component').then(
        (m) => m.ContractorInvoicesComponent
      )
  },
  {
    path: 'anfragen',
    canActivate: [contractorGuard],
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
    canActivate: [adminGuard],
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
  {
    path: 'angebot/:token',
    loadComponent: () =>
      import('./pages/shared-offer/shared-offer.component').then(
        (m) => m.SharedOfferComponent
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
