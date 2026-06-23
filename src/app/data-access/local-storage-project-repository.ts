import { Injectable } from '@angular/core';
import { LocalTileProject } from '../models/local-project.model';
import type { ProjectRepository } from './project-repository';

/** localStorage-Schlüssel des lokalen Projektstands. */
export const LOCAL_PROJECT_STORAGE_KEY = 'tileEstimator.localProject';

/**
 * Standard-Adapter: hält die Projekte im Browser-`localStorage`.
 *
 * Seit der Multi-Projekt-Erweiterung wird ein **Array** von Projekten gespeichert.
 * Ein evtl. vorhandener Altstand (einzelnes Projektobjekt) wird beim Lesen
 * transparent in ein einelementiges Array migriert. Macht ausschließlich rohes
 * Laden/Speichern – keine Normalisierung.
 */
@Injectable()
export class LocalStorageProjectRepository implements ProjectRepository {
  async loadProject(id?: string): Promise<LocalTileProject | null> {
    const all = this.readAll();
    if (id) {
      return all.find((project) => project.id === id) ?? null;
    }
    return all[0] ?? null;
  }

  async listProjects(): Promise<LocalTileProject[]> {
    return this.readAll();
  }

  async saveProject(project: LocalTileProject): Promise<void> {
    const all = this.readAll();
    const index = all.findIndex((existing) => existing.id === project.id);
    if (index >= 0) {
      all[index] = project;
    } else {
      all.push(project);
    }
    this.writeAll(all);
  }

  async deleteProject(id: string): Promise<void> {
    const remaining = this.readAll().filter((project) => project.id !== id);
    this.writeAll(remaining);
  }

  async clearProject(): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(LOCAL_PROJECT_STORAGE_KEY);
    } catch {
      // Nichts zu tun, wenn Storage nicht verfügbar ist.
    }
  }

  /** Liest alle Projekte (zuletzt geändert zuerst); migriert Altstand (Einzelobjekt). */
  private readAll(): LocalTileProject[] {
    try {
      const raw = globalThis.localStorage?.getItem(LOCAL_PROJECT_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as unknown;
      const list = Array.isArray(parsed)
        ? (parsed as LocalTileProject[])
        : this.isProjectLike(parsed)
          ? [parsed]
          : [];
      return [...list].sort((a, b) => this.updatedAt(b) - this.updatedAt(a));
    } catch {
      return [];
    }
  }

  private writeAll(projects: LocalTileProject[]): void {
    try {
      globalThis.localStorage?.setItem(
        LOCAL_PROJECT_STORAGE_KEY,
        JSON.stringify(projects)
      );
    } catch {
      // In-Memory-Stand bleibt nutzbar, wenn Storage nicht verfügbar ist.
    }
  }

  private isProjectLike(value: unknown): value is LocalTileProject {
    return (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as { rooms?: unknown }).rooms)
    );
  }

  private updatedAt(project: LocalTileProject): number {
    const time = Date.parse(project.updatedAt ?? '');
    return Number.isNaN(time) ? 0 : time;
  }
}
