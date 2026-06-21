import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { PROJECT_REPOSITORY } from './data-access/project-repository';
import { LocalStorageProjectRepository } from './data-access/local-storage-project-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Persistenz-Backend des lokalen Projekts. Ab Phase 12 wird hier der
    // Supabase-Adapter eingehängt – Konsumenten bleiben unverändert.
    { provide: PROJECT_REPOSITORY, useClass: LocalStorageProjectRepository }
  ]
};
