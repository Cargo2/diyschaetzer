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
      }
    ]
  }
];
