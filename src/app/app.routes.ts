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
  { path: 'wizard', component: WizardPageComponent },
  { path: 'materialliste', component: MaterialListComponent, canActivate: [wizardCompletedGuard] },
  { path: 'summary', component: SummaryPageComponent, canActivate: [wizardCompletedGuard] },
  { path: 'gesamtschaetzung', component: ProjectSummaryComponent },
  { path: 'ratgeber', component: GuideComponent },
  { path: 'impressum', component: ImpressumComponent },
  { path: 'datenschutz', component: DatenschutzComponent },
  { path: 'kontakt', component: KontaktComponent },
  { path: '**', redirectTo: '' }
];
