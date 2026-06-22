import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { PROJECT_REPOSITORY } from './data-access/project-repository';
import { SessionAwareProjectRepository } from './data-access/session-aware-project-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Persistenz-Backend des lokalen Projekts. Schaltet sessionabhängig zwischen
    // localStorage (anonym) und Supabase (angemeldet) um – Konsumenten bleiben
    // unverändert (siehe SessionAwareProjectRepository).
    { provide: PROJECT_REPOSITORY, useClass: SessionAwareProjectRepository }
  ]
};
