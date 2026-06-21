import { Injectable } from '@angular/core';
import { LocalTileProject } from '../models/local-project.model';
import type { ProjectRepository } from './project-repository';

/** localStorage-Schlüssel des lokalen Projektstands. */
export const LOCAL_PROJECT_STORAGE_KEY = 'tileEstimator.localProject';

/**
 * Standard-Adapter: hält das Projekt im Browser-`localStorage`.
 *
 * Erster (und bis Phase 12 einziger) Konkretisierung von {@link ProjectRepository}.
 * Macht ausschließlich rohes Laden/Speichern – keine Normalisierung.
 */
@Injectable()
export class LocalStorageProjectRepository implements ProjectRepository {
  async loadProject(): Promise<LocalTileProject | null> {
    try {
      const raw = globalThis.localStorage?.getItem(LOCAL_PROJECT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LocalTileProject) : null;
    } catch {
      return null;
    }
  }

  async saveProject(project: LocalTileProject): Promise<void> {
    try {
      globalThis.localStorage?.setItem(LOCAL_PROJECT_STORAGE_KEY, JSON.stringify(project));
    } catch {
      // In-Memory-Stand bleibt nutzbar, wenn Storage nicht verfügbar ist.
    }
  }

  async clearProject(): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(LOCAL_PROJECT_STORAGE_KEY);
    } catch {
      // Nichts zu tun, wenn Storage nicht verfügbar ist.
    }
  }
}
