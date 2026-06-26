import { Routes } from '@angular/router';
import { wizardCompletedGuard } from './guards/wizard-completed.guard';
import { contractorGuard } from './guards/contractor.guard';
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
import { ProfilePageComponent } from './pages/profile/profile-page.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: AuthPageComponent },
  { path: 'profil', component: ProfilePageComponent, canActivate: [contractorGuard] },
  {
    path: 'angebote',
    canActivate: [contractorGuard],
    loadComponent: () =>
      import('./pages/contractor-offers/contractor-offers.component').then(
        (m) => m.ContractorOffersComponent
      )
  },
  { path: 'raum-anlegen', component: WizardPageComponent },
  { path: 'materialliste', component: MaterialListComponent, canActivate: [wizardCompletedGuard] },
  { path: 'zusammenfassung', component: SummaryPageComponent, canActivate: [wizardCompletedGuard] },
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
  { path: 'impressum', component: ImpressumComponent },
  { path: 'datenschutz', component: DatenschutzComponent },
  { path: 'kontakt', component: KontaktComponent },
  { path: '**', redirectTo: '' }
];
