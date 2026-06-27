import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { PROJECT_REPOSITORY } from './data-access/project-repository';
import { SessionAwareProjectRepository } from './data-access/session-aware-project-repository';
import { CATALOG_REPOSITORY, CatalogRepository } from './data-access/catalog-repository';
import { LocalCatalogRepository } from './data-access/local-catalog-repository';
import { SupabaseCatalogRepository } from './data-access/supabase-catalog-repository';
import { SUPABASE_CLIENT } from './data-access/supabase-client';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Persistenz-Backend des lokalen Projekts. Schaltet sessionabhängig zwischen
    // localStorage (anonym) und Supabase (angemeldet) um – Konsumenten bleiben
    // unverändert (siehe SessionAwareProjectRepository).
    { provide: PROJECT_REPOSITORY, useClass: SessionAwareProjectRepository },
    // Produktkatalog: DB ist Source of Truth, wenn Supabase konfiguriert ist;
    // sonst der gebündelte TS-Katalog (Offline-Fallback).
    {
      provide: CATALOG_REPOSITORY,
      useFactory: (): CatalogRepository =>
        inject(SUPABASE_CLIENT) ? inject(SupabaseCatalogRepository) : new LocalCatalogRepository(),
    },
    provideClientHydration(withEventReplay()),
  ],
};
