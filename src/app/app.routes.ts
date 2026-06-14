import { Routes } from '@angular/router';
import { wizardCompletedGuard } from './guards/wizard-completed.guard';
import { GuideComponent } from './pages/guide/guide.component';
import { HomeComponent } from './pages/home/home.component';
import { MaterialListComponent } from './pages/material-list/material-list.component';
import { SummaryPageComponent } from './pages/summary-page/summary-page.component';
import { WizardPageComponent } from './pages/wizard-page/wizard-page.component';
import { ProjectSummaryComponent } from './pages/project-summary/project-summary.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'wizard', component: WizardPageComponent },
  { path: 'materialliste', component: MaterialListComponent, canActivate: [wizardCompletedGuard] },
  { path: 'summary', component: SummaryPageComponent, canActivate: [wizardCompletedGuard] },
  { path: 'gesamtschaetzung', component: ProjectSummaryComponent },
  { path: 'ratgeber', component: GuideComponent },
  { path: '**', redirectTo: '' }
];
