import { InjectionToken } from '@angular/core';
import { LocalTileProject } from '../models/local-project.model';
import { LocalStorageProjectRepository } from './local-storage-project-repository';

/**
 * Persistenz-Grenze für das (aktuell einzige, lokale) Fliesenprojekt.
 *
 * Hinter diesem Interface liegt heute der {@link LocalStorageProjectRepository},
 * ab Phase 12 ein Supabase-Adapter. Das Frontend (insb. {@link LocalProjectService})
 * kennt das konkrete Backend nicht – es spricht ausschließlich gegen dieses Interface.
 *
 * Die Methoden sind bewusst asynchron: ein entferntes Backend ist inhärent async.
 * Die Normalisierung der Domänendaten (fehlende Felder, Altstand-Migration) bleibt
 * Sache des konsumierenden Service, nicht des Repositories – das Repository macht
 * reines IO.
 */
export interface ProjectRepository {
  /**
   * Lädt ein Projekt: mit `id` gezielt, ohne `id` das zuletzt geänderte
   * (Abwärtskompatibilität, z. B. für den Session-Sync). `null`, wenn nichts passt.
   */
  loadProject(id?: string): Promise<LocalTileProject | null>;
  /** Listet alle Projekte des aktuellen Scopes (zuletzt geändert zuerst; leer, wenn keines). */
  listProjects(): Promise<LocalTileProject[]>;
  /** Persistiert den vollständigen Projektstand (Upsert über `id`). */
  saveProject(project: LocalTileProject): Promise<void>;
  /** Entfernt ein einzelnes Projekt (inkl. seiner Räume). */
  deleteProject(id: string): Promise<void>;
  /** Entfernt den gesamten persistierten Stand des Scopes. */
  clearProject(): Promise<void>;
}

/**
 * Default ist der offline-sichere localStorage-Adapter – so funktionieren Tests und
 * der heutige Stand ohne weitere Konfiguration. Das produktive Wiring (und ab Phase 12
 * der Supabase-Adapter) wird in `app.config.ts` explizit überschrieben.
 */
export const PROJECT_REPOSITORY = new InjectionToken<ProjectRepository>('PROJECT_REPOSITORY', {
  providedIn: 'root',
  factory: () => new LocalStorageProjectRepository()
});
