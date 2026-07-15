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
import { PROJECT_REPOSITORY } from '../data-access/project-repository';
import { LOCAL_PROJECT_STORAGE_KEY } from '../data-access/local-storage-project-repository';
import { AssumptionService } from './assumption.service';
import { WizardStateService } from './wizard-state.service';

// Re-Export für Rückwärtskompatibilität – der Schlüssel lebt jetzt im Repository.
export { LOCAL_PROJECT_STORAGE_KEY };

const DEFAULT_MATERIAL_LIST_USER_STATE: MaterialListUserState = {
  includeOptionalMaterials: true,
  excludedMaterialIds: []
};

@Injectable({ providedIn: 'root' })
export class LocalProjectService {
  private readonly wizardState = inject(WizardStateService);
  private readonly assumptionService = inject(AssumptionService);
  private readonly repository = inject(PROJECT_REPOSITORY);
  private readonly projectsSignal = signal<LocalTileProject[]>([
    this.createFallbackProject()
  ]);
  private readonly activeIdSignal = signal<string>(this.projectsSignal()[0].id);
  private readonly editingRoomIdSignal = signal<string | null>(null);

  /** `true`, sobald eine Mutation vor Abschluss der Hydration erfolgte (verhindert Überschreiben). */
  private mutatedBeforeHydration = false;
  /** Auflösbar, sobald der persistierte Stand geladen (oder als leer bestätigt) wurde. */
  readonly ready: Promise<void> = this.hydrate();

  /** Alle Projekte des aktuellen Scopes (zuletzt geändert zuerst). */
  readonly projects = this.projectsSignal.asReadonly();
  /** ID des aktiven Projekts – alle bestehenden Mutationen wirken auf dieses. */
  readonly activeProjectId = this.activeIdSignal.asReadonly();
  /** Das aktive Projekt (Name `project` für Abwärtskompatibilität der Konsumenten). */
  readonly project = computed(() => this.resolveActiveProject());
  readonly rooms = computed(() => this.resolveActiveProject().rooms);
  readonly editingRoomId = this.editingRoomIdSignal.asReadonly();

  getProject(): LocalTileProject {
    return this.resolveActiveProject();
  }

  /**
   * Ersetzt den In-Memory-Stand mit einem extern geladenen Projekt (z. B. nach
   * Login aus der DB), **ohne** erneut zu persistieren. Dünner Wrapper um
   * {@link replaceProjects}.
   */
  replaceProject(project: LocalTileProject): void {
    this.replaceProjects([project], project.id);
  }

  /**
   * Ersetzt die gesamte Projektliste mit extern geladenen Projekten (z. B. nach
   * Login aus der DB), **ohne** erneut zu persistieren – sonst entstünde ein
   * unnötiger Rückschreib-Zyklus. Der Stand wird wie beim Laden normalisiert.
   */
  replaceProjects(projects: LocalTileProject[], activeId?: string): void {
    const normalized = projects.map((project) => this.normalizeProject(project));
    if (normalized.length === 0) {
      const fresh = this.createFallbackProject();
      this.projectsSignal.set([fresh]);
      this.activeIdSignal.set(fresh.id);
    } else {
      this.projectsSignal.set(normalized);
      this.activeIdSignal.set(
        activeId && normalized.some((project) => project.id === activeId)
          ? activeId
          : normalized[0].id
      );
    }
    this.editingRoomIdSignal.set(null);
  }

  /**
   * Legt ein neues, leeres Projekt an, macht es aktiv und persistiert es.
   *
   * `resetWizard` (Default `true`): setzt Wizard/Ergebnisse zurück (frischer Start).
   * Auf `false`, wenn der aktuelle Wizard-Raum anschließend in dieses neue Projekt
   * gespeichert werden soll (z. B. „+ Neues Angebot" in der Profi-Zusammenfassung) –
   * sonst würde der noch nicht gespeicherte Raum verloren gehen.
   */
  createProject(name?: string, resetWizard = true): LocalTileProject {
    const now = new Date().toISOString();
    const project: LocalTileProject = {
      id: this.createId(),
      name: name?.trim() || 'Neues Projekt',
      status: 'draft',
      rooms: [],
      createdAt: now,
      updatedAt: now
    };
    this.mutatedBeforeHydration = true;
    this.projectsSignal.update((list) => [...list, project]);
    this.activeIdSignal.set(project.id);
    this.editingRoomIdSignal.set(null);
    if (resetWizard) {
      // Neues Projekt = frischer Start: Wizard/Ergebnisse (Zusammenfassung, Materialliste)
      // zurücksetzen, damit der Wizard für das neue Projekt neu durchlaufen wird.
      this.wizardState.startNewRoom();
    }
    this.persist(project);
    return project;
  }

  /** Wechselt das aktive Projekt (no-op, wenn die ID unbekannt ist). */
  switchProject(id: string): void {
    if (this.projectsSignal().some((project) => project.id === id)) {
      this.activeIdSignal.set(id);
      this.editingRoomIdSignal.set(null);
    }
  }

  /** Benennt ein Projekt um und persistiert es. */
  renameProject(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    this.mutatedBeforeHydration = true;
    let updated: LocalTileProject | null = null;
    this.projectsSignal.update((list) =>
      list.map((project) => {
        if (project.id !== id) {
          return project;
        }
        updated = { ...project, name: trimmed, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    if (updated) {
      this.persist(updated);
    }
  }

  /**
   * Löscht ein Projekt. Es bleibt stets mindestens ein Projekt erhalten; wird das
   * letzte gelöscht, tritt ein frisches leeres Projekt an seine Stelle.
   */
  deleteProject(id: string): void {
    this.mutatedBeforeHydration = true;
    const remaining = this.projectsSignal().filter((project) => project.id !== id);
    if (remaining.length === 0) {
      const fresh = this.createFallbackProject();
      this.projectsSignal.set([fresh]);
      this.activeIdSignal.set(fresh.id);
      this.persist(fresh);
    } else {
      this.projectsSignal.set(remaining);
      if (this.activeIdSignal() === id) {
        this.activeIdSignal.set(remaining[0].id);
      }
    }
    this.editingRoomIdSignal.set(null);
    this.repository.deleteProject(id).catch(() => {
      // Bewusst geschluckt: In-Memory-Stand bleibt konsistent.
    });
  }

  getRooms(): SavedRoomCalculation[] {
    return this.resolveActiveProject().rooms;
  }

  /** Aktives Projekt aus der Liste (garantiert nicht leer – mind. ein Projekt vorhanden). */
  private resolveActiveProject(): LocalTileProject {
    const list = this.projectsSignal();
    return list.find((project) => project.id === this.activeIdSignal()) ?? list[0];
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
    this.updateActiveProject((project) => ({
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
    const existing = this.resolveActiveProject().rooms.find((room) => room.id === roomId);
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
    this.updateActiveProject((project) => ({
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
    this.updateActiveProject((project) => ({
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

  /**
   * Hakt eine Position der projektweiten Materialliste als „bestellt" ab bzw.
   * entfernt die Markierung (Profi-Einkaufsliste). Wirkt auf das **aktive**
   * Projekt und persistiert. `key` = `aggregationKey` der Materialposition.
   *
   * Bewusst **ohne** `updatedAt`-Bump: Bestell-Häkchen sind reine Metadaten und
   * dürfen keine Kalkulations-Änderung signalisieren (sonst würden erzeugte
   * Angebote fälschlich als veraltet markiert).
   */
  setMaterialOrdered(key: string, ordered: boolean): void {
    const trimmed = typeof key === 'string' ? key.trim() : '';
    if (!trimmed) {
      return;
    }
    this.updateActiveProject((project) => {
      const keys = new Set(this.normalizeOrderedMaterialKeys(project.orderedMaterialKeys));
      if (ordered) {
        keys.add(trimmed);
      } else {
        keys.delete(trimmed);
      }
      return { ...project, orderedMaterialKeys: [...keys] };
    });
  }

  deleteRoom(roomId: string): void {
    this.updateActiveProject((project) => ({
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
    const source = this.resolveActiveProject().rooms.find((room) => room.id === roomId);
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
    this.updateActiveProject((project) => ({
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
    if (this.resolveActiveProject().rooms.length === 0) {
      return;
    }
    this.updateActiveProject((project) => ({
      ...project,
      status: 'ready_for_review',
      updatedAt: new Date().toISOString()
    }));
  }

  loadRoomIntoWizard(roomId: string): void {
    const room = this.resolveActiveProject().rooms.find((item) => item.id === roomId);
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

  private createFallbackProject(): LocalTileProject {
    const now = new Date().toISOString();
    return {
      id: this.createId(),
      name: 'Mein Fliesenprojekt',
      status: 'draft',
      rooms: [],
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Lädt die persistierten Projekte über das Repository und hydratisiert die Liste
   * (aktiv = zuletzt geändert). Erfolgte vor Abschluss bereits eine Nutzer-Mutation,
   * wird der geladene Stand verworfen, damit Eingaben nicht überschrieben werden.
   */
  private async hydrate(): Promise<void> {
    let list: LocalTileProject[] | null = null;
    try {
      list = await this.repository.listProjects();
    } catch {
      list = null;
    }
    if (this.mutatedBeforeHydration || !list || list.length === 0) {
      return;
    }
    const normalized = list.map((project) => this.normalizeProject(project));
    this.projectsSignal.set(normalized);
    this.activeIdSignal.set(normalized[0].id);
  }

  private normalizeProject(parsed: Partial<LocalTileProject>): LocalTileProject {
    const fallback = this.createFallbackProject();
    const rooms = Array.isArray(parsed.rooms)
      ? parsed.rooms.map((room) => this.normalizeSavedRoom(room)).filter(Boolean) as SavedRoomCalculation[]
      : [];
    return {
      id: typeof parsed.id === 'string' ? parsed.id : fallback.id,
      name: typeof parsed.name === 'string' ? parsed.name : fallback.name,
      status: this.normalizeProjectStatus(parsed.status, rooms.length > 0),
      rooms,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : fallback.createdAt,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : fallback.updatedAt,
      orderedMaterialKeys: this.normalizeOrderedMaterialKeys(parsed.orderedMaterialKeys)
    };
  }

  /**
   * Bereinigt die Profi-Bestellliste: nur nicht-leere Strings, dedupliziert.
   * Fremdformate (Nicht-Array, Nicht-Strings) fallen auf `[]` zurück – so
   * überlebt das Feld den Persistenz-Roundtrip, ohne Müll zu übernehmen.
   */
  private normalizeOrderedMaterialKeys(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return [
      ...new Set(
        value.filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
      )
    ];
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

  /** Wendet einen Updater auf das **aktive** Projekt in der Liste an und persistiert es. */
  private updateActiveProject(
    updater: (project: LocalTileProject) => LocalTileProject
  ): void {
    this.mutatedBeforeHydration = true;
    const activeId = this.activeIdSignal();
    let updated: LocalTileProject | null = null;
    this.projectsSignal.update((list) =>
      list.map((project) => {
        if (project.id !== activeId) {
          return project;
        }
        updated = updater(project);
        return updated;
      })
    );
    if (updated) {
      this.persist(updated);
    }
  }

  /**
   * Persistiert ein einzelnes Projekt über das Repository (austauschbares Backend);
   * fire-and-forget – der reaktive In-Memory-Stand bleibt Source of Truth für die UI.
   * Fehler (z. B. Backend offline) dürfen die UI nicht stören.
   */
  private persist(project: LocalTileProject): void {
    this.repository.saveProject(project).catch(() => {
      // Bewusst geschluckt: In-Memory-Stand bleibt nutzbar; Persistenz wird beim
      // nächsten Schreibvorgang erneut versucht.
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
