import { inject, Injectable } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { LocalTileProject } from '../models/local-project.model';
import { LocalStorageProjectRepository } from './local-storage-project-repository';
import type { ProjectRepository } from './project-repository';
import { SupabaseProjectRepository } from './supabase-project-repository';

/**
 * Aktives Persistenz-Backend für das Projekt – schaltet sessionabhängig um (Phase 12,
 * Block 4). Anonym (oder ohne konfiguriertes Supabase) wird in den `localStorage`
 * geschrieben; mit angemeldeter Session in die Datenbank.
 *
 * Bewusst ein dünner Delegierer: pro Aufruf wird – nach Abschluss der initialen
 * Auth-Prüfung (`auth.ready`) – der passende Adapter gewählt. Konsumenten
 * ({@link LocalProjectService}) kennen weder Supabase noch diese Umschaltung.
 */
@Injectable({ providedIn: 'root' })
export class SessionAwareProjectRepository implements ProjectRepository {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseProjectRepository);
  // Kein DI nötig (keine Abhängigkeiten) – entspricht der Token-Default-Factory.
  private readonly local = new LocalStorageProjectRepository();

  private async pick(): Promise<ProjectRepository> {
    await this.auth.ready;
    return this.auth.isAuthenticated() ? this.supabase : this.local;
  }

  async loadProject(): Promise<LocalTileProject | null> {
    return (await this.pick()).loadProject();
  }

  async saveProject(project: LocalTileProject): Promise<void> {
    return (await this.pick()).saveProject(project);
  }

  async clearProject(): Promise<void> {
    return (await this.pick()).clearProject();
  }
}
