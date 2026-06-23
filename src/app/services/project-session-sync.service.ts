import { effect, inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { LocalProjectService } from './local-project.service';
import { SupabaseProjectRepository } from '../data-access/supabase-project-repository';

/**
 * Koordiniert den Projektstand mit dem Auth-Zustand (Phase 12, Block 4).
 *
 * Sitzt bewusst außerhalb von {@link LocalProjectService}, damit dieser frei von
 * Auth-Wissen bleibt. Wird beim App-Start einmal instanziiert (App-Shell) und
 * reagiert dann auf eine *neu* aktiv werdende Session (anonym → angemeldet):
 *
 * - Ist die DB des Nutzers leer, wird der lokale (anonyme) Stand **einmalig**
 *   importiert. Das trifft faktisch die Erst-Registrierung; ein bestehender
 *   Nutzer hat Daten in der DB und löst keinen Import aus.
 * - Hat die DB bereits Daten, wird der In-Memory-Stand aus der DB übernommen,
 *   damit nach dem Login nicht fälschlich der lokale Stand angezeigt wird.
 *
 * Der `localStorage` bleibt unangetastet (dient weiter als Offline-Fallback).
 * Der Stand beim App-Start (Session-Restore eines bereits angemeldeten Nutzers)
 * wird hier bewusst ignoriert – dort lädt {@link LocalProjectService} ohnehin
 * schon aus der DB.
 */
@Injectable({ providedIn: 'root' })
export class ProjectSessionSyncService {
  private readonly auth = inject(AuthService);
  private readonly localProject = inject(LocalProjectService);
  private readonly supabase = inject(SupabaseProjectRepository);

  /** Erst `true`, wenn die Ausgangslage (nach App-Start) festgelegt ist. */
  private baselineReady = false;
  /** Letzter beobachteter Auth-Zustand – erkennt den Übergang false → true. */
  private wasAuthenticated = false;

  /** Auflösbar, sobald die Ausgangslage (nach App-Start) festgelegt ist. */
  readonly ready: Promise<void>;

  constructor() {
    effect(() => {
      const authenticated = this.auth.isAuthenticated();
      // Bis zur Festlegung der Ausgangslage (App-Start) nichts tun: das
      // Wiederherstellen einer bestehenden Session ist kein „neuer Login".
      if (!this.baselineReady) {
        return;
      }
      if (authenticated && !this.wasAuthenticated) {
        this.wasAuthenticated = true;
        void this.handleNewSession();
      } else if (!authenticated) {
        this.wasAuthenticated = false;
      }
    });
    this.ready = this.initBaseline();
  }

  private async initBaseline(): Promise<void> {
    await this.auth.ready;
    await this.localProject.ready;
    this.wasAuthenticated = this.auth.isAuthenticated();
    this.baselineReady = true;
  }

  private async handleNewSession(): Promise<void> {
    try {
      const dbProjects = await this.supabase.listProjects();
      if (dbProjects.length === 0) {
        // DB leer → lokale Projekte einmalig importieren (nur die mit Räumen).
        for (const local of this.localProject.projects()) {
          if (local.rooms.length > 0) {
            await this.supabase.saveProject(local);
          }
        }
        // In-Memory-Stand == lokaler Stand == jetzt DB; nichts weiter nötig.
      } else {
        // DB hat bereits Daten → UI aus der DB übernehmen (ohne Rückschreiben).
        this.localProject.replaceProjects(dbProjects);
      }
    } catch {
      // Import/Sync fehlgeschlagen (z. B. Backend offline): der In-Memory-Stand
      // bleibt nutzbar, der nächste Schreibvorgang versucht die Persistenz erneut.
    }
  }
}
