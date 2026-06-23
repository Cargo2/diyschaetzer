import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { LocalTileProject, SavedRoomCalculation } from '../models/local-project.model';
import type { ProjectRepository } from './project-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer `projects`-Zeile. */
interface ProjectRow {
  id: string;
  name: string;
  status: LocalTileProject['status'];
  created_at: string;
  updated_at: string;
}

/** Rohform einer `rooms`-Zeile. */
interface RoomRow {
  id: string;
  room_name: string;
  room_type: SavedRoomCalculation['roomType'];
  is_outdoor: boolean;
  wizard_data: SavedRoomCalculation['wizardData'];
  material_list_user_state: SavedRoomCalculation['materialListUserState'];
  position: number;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase-Adapter für die Projekt-Persistenz (Phase 12).
 *
 * Mappt zwischen dem Domänenobjekt {@link LocalTileProject} und den Tabellen
 * `projects` (1) + `rooms` (n). Setzt eine angemeldete Session voraus; ohne
 * Login liefert {@link loadProject} `null` und {@link saveProject} wirft.
 *
 * Wird erst ab Block 3 (Auth) in app.config.ts als {@link ProjectRepository}
 * eingehängt – bis dahin bleibt der localStorage-Adapter aktiv.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseProjectRepository implements ProjectRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  private async currentUserId(): Promise<string | null> {
    const { data } = await this.requireClient().auth.getUser();
    return data.user?.id ?? null;
  }

  async loadProject(id?: string): Promise<LocalTileProject | null> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return null;
    }

    let query = client.from('projects').select('*').eq('owner_id', userId);
    query = id
      ? query.eq('id', id)
      : query.order('updated_at', { ascending: false }).limit(1);
    const { data: projects, error } = await query;
    if (error) {
      throw error;
    }
    const project = projects?.[0] as ProjectRow | undefined;
    if (!project) {
      return null;
    }
    return this.withRooms(client, project);
  }

  async listProjects(): Promise<LocalTileProject[]> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return [];
    }
    const { data: projects, error } = await client
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });
    if (error) {
      throw error;
    }
    return Promise.all(
      ((projects ?? []) as ProjectRow[]).map((project) =>
        this.withRooms(client, project)
      )
    );
  }

  async deleteProject(id: string): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return;
    }
    // rooms hängen per ON DELETE CASCADE an projects; RLS schützt zusätzlich über owner_id.
    const { error } = await client
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId);
    if (error) {
      throw error;
    }
  }

  /** Lädt die sortierten Räume zu einem Projekt und mappt das Domänenobjekt. */
  private async withRooms(
    client: SupabaseClient,
    project: ProjectRow
  ): Promise<LocalTileProject> {
    const { data: rooms, error: roomsError } = await client
      .from('rooms')
      .select('*')
      .eq('project_id', project.id)
      .order('position', { ascending: true });
    if (roomsError) {
      throw roomsError;
    }
    return this.mapProject(project, (rooms ?? []) as RoomRow[]);
  }

  async saveProject(project: LocalTileProject): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Speichern nicht möglich: keine angemeldete Session.');
    }

    const { error: projectError } = await client.from('projects').upsert({
      id: project.id,
      owner_id: userId,
      name: project.name,
      status: project.status,
      created_at: project.createdAt,
      updated_at: project.updatedAt
    });
    if (projectError) {
      throw projectError;
    }

    if (project.rooms.length > 0) {
      const roomRows = project.rooms.map((room, index) => ({
        id: room.id,
        project_id: project.id,
        room_name: room.roomName,
        room_type: room.roomType,
        is_outdoor: room.isOutdoor,
        wizard_data: room.wizardData,
        material_list_user_state: room.materialListUserState,
        position: index,
        created_at: room.createdAt,
        updated_at: room.updatedAt
      }));
      const { error: roomsError } = await client.from('rooms').upsert(roomRows);
      if (roomsError) {
        throw roomsError;
      }
    }

    // Gelöschte Räume aus der DB entfernen (Diff gegen aktuellen Stand).
    const keepIds = project.rooms.map((room) => room.id);
    const { data: existing, error: existingError } = await client
      .from('rooms')
      .select('id')
      .eq('project_id', project.id);
    if (existingError) {
      throw existingError;
    }
    const toDelete = ((existing ?? []) as { id: string }[])
      .map((row) => row.id)
      .filter((id) => !keepIds.includes(id));
    if (toDelete.length > 0) {
      const { error: deleteError } = await client.from('rooms').delete().in('id', toDelete);
      if (deleteError) {
        throw deleteError;
      }
    }
  }

  async clearProject(): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return;
    }
    // rooms hängen per ON DELETE CASCADE an projects.
    const { error } = await client.from('projects').delete().eq('owner_id', userId);
    if (error) {
      throw error;
    }
  }

  private mapProject(project: ProjectRow, rooms: RoomRow[]): LocalTileProject {
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      rooms: rooms.map((room) => this.mapRoom(room)),
      createdAt: project.created_at,
      updatedAt: project.updated_at
    };
  }

  private mapRoom(room: RoomRow): SavedRoomCalculation {
    return {
      id: room.id,
      roomName: room.room_name,
      roomType: room.room_type,
      isOutdoor: room.is_outdoor,
      wizardData: room.wizard_data,
      materialListUserState: room.material_list_user_state,
      createdAt: room.created_at,
      updatedAt: room.updated_at
    };
  }
}
