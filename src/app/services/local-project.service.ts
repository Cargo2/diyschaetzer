import { computed, inject, Injectable, signal } from '@angular/core';
import {
  BathroomWizardData,
  defaultBathroomWizardFormState,
  defaultRoomData,
  defaultScopeData,
  excludedItemsFromScope,
  ROOM_TYPE_DEFAULT_NAMES,
  RoomType
} from '../models/bathroom-wizard.model';
import {
  LocalTileProject,
  ProjectStatus,
  SavedRoomCalculation
} from '../models/local-project.model';
import { MaterialListUserState } from '../models/material-list.model';
import { AssumptionService } from './assumption.service';
import { WizardStateService } from './wizard-state.service';

export const LOCAL_PROJECT_STORAGE_KEY = 'tileEstimator.localProject';
const DEFAULT_MATERIAL_LIST_USER_STATE: MaterialListUserState = {
  includeOptionalMaterials: true,
  excludedMaterialIds: []
};

@Injectable({ providedIn: 'root' })
export class LocalProjectService {
  private readonly wizardState = inject(WizardStateService);
  private readonly assumptionService = inject(AssumptionService);
  private readonly projectSignal = signal<LocalTileProject>(this.loadProject());
  private readonly editingRoomIdSignal = signal<string | null>(null);

  readonly project = this.projectSignal.asReadonly();
  readonly rooms = computed(() => this.projectSignal().rooms);
  readonly editingRoomId = this.editingRoomIdSignal.asReadonly();

  getProject(): LocalTileProject {
    return this.projectSignal();
  }

  getRooms(): SavedRoomCalculation[] {
    return this.projectSignal().rooms;
  }

  saveCurrentRoom(
    wizardData: BathroomWizardData,
    materialListUserState: MaterialListUserState = DEFAULT_MATERIAL_LIST_USER_STATE
  ): SavedRoomCalculation {
    const editingId = this.editingRoomIdSignal();
    if (editingId) {
      return this.updateRoom(editingId, wizardData, materialListUserState);
    }

    const now = new Date().toISOString();
    const normalized = this.normalizeWizardData(wizardData);
    const room: SavedRoomCalculation = {
      id: this.createId(),
      roomName: normalized.room.roomName,
      roomType: normalized.room.roomType ?? 'bathroom',
      isOutdoor: normalized.room.isOutdoor,
      wizardData: normalized,
      materialListUserState: this.normalizeMaterialListUserState(materialListUserState),
      createdAt: now,
      updatedAt: now
    };
    this.updateProject((project) => ({
      ...project,
      status: 'in_progress',
      rooms: [...project.rooms, room],
      updatedAt: now
    }));
    this.editingRoomIdSignal.set(room.id);
    return room;
  }

  updateRoom(
    roomId: string,
    wizardData: BathroomWizardData,
    materialListUserState?: MaterialListUserState
  ): SavedRoomCalculation {
    const existing = this.projectSignal().rooms.find((room) => room.id === roomId);
    if (!existing) {
      this.editingRoomIdSignal.set(null);
      return this.saveCurrentRoom(
        wizardData,
        materialListUserState ?? DEFAULT_MATERIAL_LIST_USER_STATE
      );
    }

    const now = new Date().toISOString();
    const normalized = this.normalizeWizardData(wizardData);
    const updated: SavedRoomCalculation = {
      ...existing,
      roomName: normalized.room.roomName,
      roomType: normalized.room.roomType ?? 'bathroom',
      isOutdoor: normalized.room.isOutdoor,
      wizardData: normalized,
      materialListUserState: materialListUserState
        ? this.normalizeMaterialListUserState(materialListUserState)
        : existing.materialListUserState,
      updatedAt: now
    };
    this.updateProject((project) => ({
      ...project,
      status: 'in_progress',
      rooms: project.rooms.map((room) => room.id === roomId ? updated : room),
      updatedAt: now
    }));
    this.editingRoomIdSignal.set(roomId);
    return updated;
  }

  updateRoomMaterialListState(
    roomId: string,
    materialListUserState: MaterialListUserState
  ): void {
    const now = new Date().toISOString();
    const normalizedState = this.normalizeMaterialListUserState(materialListUserState);
    this.updateProject((project) => ({
      ...project,
      status: 'in_progress',
      rooms: project.rooms.map((room) =>
        room.id === roomId
          ? { ...room, materialListUserState: normalizedState, updatedAt: now }
          : room
      ),
      updatedAt: now
    }));
  }

  deleteRoom(roomId: string): void {
    this.updateProject((project) => ({
      ...project,
      status: project.rooms.length > 1 ? 'in_progress' : 'draft',
      rooms: project.rooms.filter((room) => room.id !== roomId),
      updatedAt: new Date().toISOString()
    }));
    if (this.editingRoomIdSignal() === roomId) {
      this.editingRoomIdSignal.set(null);
    }
  }

  duplicateRoom(roomId: string): SavedRoomCalculation {
    const source = this.projectSignal().rooms.find((room) => room.id === roomId);
    if (!source) {
      throw new Error('Der zu duplizierende Raum wurde nicht gefunden.');
    }

    const now = new Date().toISOString();
    const roomName = `${source.roomName} Kopie`;
    const copy: SavedRoomCalculation = {
      ...source,
      id: this.createId(),
      roomName,
      wizardData: {
        ...source.wizardData,
        room: {
          ...source.wizardData.room,
          roomName
        }
      },
      materialListUserState: this.normalizeMaterialListUserState(
        source.materialListUserState
      ),
      createdAt: now,
      updatedAt: now
    };
    this.updateProject((project) => ({
      ...project,
      status: 'in_progress',
      rooms: [...project.rooms, copy],
      updatedAt: now
    }));
    return copy;
  }

  setEditingRoom(roomId: string | null): void {
    this.editingRoomIdSignal.set(roomId);
  }

  getEditingRoomId(): string | null {
    return this.editingRoomIdSignal();
  }

  markProjectReadyForReview(): void {
    if (this.projectSignal().rooms.length === 0) {
      return;
    }
    this.updateProject((project) => ({
      ...project,
      status: 'ready_for_review',
      updatedAt: new Date().toISOString()
    }));
  }

  loadRoomIntoWizard(roomId: string): void {
    const room = this.projectSignal().rooms.find((item) => item.id === roomId);
    if (!room) {
      return;
    }
    this.editingRoomIdSignal.set(roomId);
    this.wizardState.loadCompletedRoomForEditing(room.wizardData);
  }

  startNewRoom(): void {
    this.editingRoomIdSignal.set(null);
    this.wizardState.startNewRoom();
  }

  private loadProject(): LocalTileProject {
    const now = new Date().toISOString();
    const fallback: LocalTileProject = {
      id: this.createId(),
      name: 'Mein Fliesenprojekt',
      status: 'draft',
      rooms: [],
      createdAt: now,
      updatedAt: now
    };

    try {
      const raw = globalThis.localStorage?.getItem(LOCAL_PROJECT_STORAGE_KEY);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw) as Partial<LocalTileProject>;
      const rooms = Array.isArray(parsed.rooms)
        ? parsed.rooms.map((room) => this.normalizeSavedRoom(room)).filter(Boolean) as SavedRoomCalculation[]
        : [];
      return {
        id: typeof parsed.id === 'string' ? parsed.id : fallback.id,
        name: typeof parsed.name === 'string' ? parsed.name : fallback.name,
        status: this.normalizeProjectStatus(parsed.status, rooms.length > 0),
        rooms,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : now,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : now
      };
    } catch {
      return fallback;
    }
  }

  private normalizeProjectStatus(
    status: unknown,
    hasRooms: boolean
  ): ProjectStatus {
    if (status === 'archived') {
      return 'archived';
    }
    if (status === 'ready_for_review' && hasRooms) {
      return 'ready_for_review';
    }
    return hasRooms ? 'in_progress' : 'draft';
  }

  private normalizeSavedRoom(value: unknown): SavedRoomCalculation | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const room = value as Partial<SavedRoomCalculation>;
    const wizardData = this.normalizeWizardData(room.wizardData as BathroomWizardData);
    const now = new Date().toISOString();
    return {
      id: typeof room.id === 'string' ? room.id : this.createId(),
      roomName: typeof room.roomName === 'string' ? room.roomName : wizardData.room.roomName,
      roomType: this.isRoomType(room.roomType) ? room.roomType : wizardData.room.roomType ?? 'bathroom',
      isOutdoor: room.isOutdoor === true || wizardData.room.isOutdoor,
      wizardData,
      materialListUserState: this.normalizeMaterialListUserState(
        room.materialListUserState
      ),
      createdAt: typeof room.createdAt === 'string' ? room.createdAt : now,
      updatedAt: typeof room.updatedAt === 'string' ? room.updatedAt : now
    };
  }

  private normalizeWizardData(data: BathroomWizardData | null | undefined): BathroomWizardData {
    const defaults = defaultBathroomWizardFormState();
    const source = (data ?? {}) as Partial<BathroomWizardData>;
    const roomType = this.isRoomType(source.room?.roomType)
      ? source.room.roomType
      : 'bathroom';
    const room = {
      ...defaultRoomData(),
      ...(source.room ?? {}),
      roomType,
      roomName: source.room?.roomName?.trim() || ROOM_TYPE_DEFAULT_NAMES[roomType],
      isOutdoor:
        roomType === 'terrace_balcony' ||
        (roomType === 'other' && source.room?.isOutdoor === true)
    };
    const fallbackFloorArea = source.bathroomSizeM2 ?? defaults.bathroomSizeM2;
    const areaSummary = source.areaSummary
      ? {
          ...source.areaSummary,
          floorTileAreaM2:
            source.areaSummary.floorTileAreaM2 ??
            (source.tilingScope === 'specific_areas'
              ? 0
              : source.areaSummary.floorAreaM2 ?? fallbackFloorArea)
        }
      : {
          floorAreaM2: fallbackFloorArea,
          floorTileAreaM2:
            source.tilingScope === 'specific_areas' ? 0 : fallbackFloorArea,
          totalWallTileAreaM2: 0,
          totalTileAreaM2: fallbackFloorArea
        };
    const normalized = {
      ...defaults,
      ...source,
      room,
      floorAreaM2: source.floorAreaM2 ?? fallbackFloorArea,
      areaSummary,
      excludedItems: source.excludedItems ?? excludedItemsFromScope(defaultScopeData()),
      openIssues: source.openIssues ?? [],
      recommendations: source.recommendations ?? [],
      metadata: source.metadata ?? {
        wizardCompleted: true,
        resultsValid: true,
        completedAt: null,
        lastModifiedAt: null,
        invalidatedAt: null,
        currentStep: 'completed'
      }
    } as BathroomWizardData;
    return {
      ...normalized,
      assumptions: {
        ...normalized.assumptions,
        ...this.assumptionService.normalizeAssumptions(normalized)
      }
    };
  }

  private updateProject(updater: (project: LocalTileProject) => LocalTileProject): void {
    this.projectSignal.update((project) => {
      const next = updater(project);
      try {
        globalThis.localStorage?.setItem(LOCAL_PROJECT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep the in-memory project usable when storage is unavailable.
      }
      return next;
    });
  }

  private normalizeMaterialListUserState(
    state: MaterialListUserState | null | undefined
  ): MaterialListUserState {
    return {
      includeOptionalMaterials: state?.includeOptionalMaterials !== false,
      excludedMaterialIds: Array.isArray(state?.excludedMaterialIds)
        ? [...new Set(state.excludedMaterialIds.filter(Boolean))]
        : []
    };
  }

  private isRoomType(value: unknown): value is RoomType {
    return [
      'bathroom', 'guest_wc', 'kitchen', 'hallway', 'living_area',
      'basement', 'utility_room', 'terrace_balcony', 'other'
    ].includes(String(value));
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.()
      ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}
