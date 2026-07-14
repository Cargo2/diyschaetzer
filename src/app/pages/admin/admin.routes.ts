import { Routes } from '@angular/router';
import { AdminShellComponent } from './admin-shell.component';

/**
 * Abgekapselte Routen des Admin-Bereichs (Phase 15). Lazy geladen unter `/admin`,
 * eigener Routen-Prefix, eigene Shell – keine Kopplung an Endkunden-/Profi-Flows.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShellComponent,
    children: [
      { path: '', redirectTo: 'material', pathMatch: 'full' },
      {
        path: 'material',
        loadComponent: () =>
          import('./admin-materials.component').then((m) => m.AdminMaterialsComponent)
      },
      {
        path: 'material/:id',
        loadComponent: () =>
          import('./admin-material-edit.component').then((m) => m.AdminMaterialEditComponent)
      },
      {
        path: 'nutzer',
        loadComponent: () =>
          import('./admin-users.component').then((m) => m.AdminUsersComponent)
      },
      {
        path: 'feedback',
        loadComponent: () =>
          import('./admin-feedback.component').then((m) => m.AdminFeedbackComponent)
      },
      {
        path: 'leads',
        loadComponent: () =>
          import('./admin-leads.component').then((m) => m.AdminLeadsComponent)
      }
    ]
  }
];
