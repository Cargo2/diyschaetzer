import { inject, Injectable, signal } from '@angular/core';
import { MaterialListUserState } from '../models/material-list.model';
import { LocalProjectService } from './local-project.service';

const MATERIAL_LIST_STATE_STORAGE_KEY = 'tileEstimator.materialListState';

const DEFAULT_STATE: MaterialListUserState = {
  includeOptionalMaterials: true,
  excludedMaterialIds: []
};

@Injectable({ providedIn: 'root' })
export class MaterialListStateService {
  private readonly localProject = inject(LocalProjectService);
  private readonly stateSignal = signal<MaterialListUserState>(this.loadState());

  readonly state = this.stateSignal.asReadonly();

  getState(): MaterialListUserState {
    return this.stateSignal();
  }

  setState(state: MaterialListUserState): void {
    this.updateState(state);
  }

  loadStateForRoom(roomId: string): MaterialListUserState {
    const room = this.localProject.getRooms().find((item) => item.id === roomId);
    this.updateState(room?.materialListUserState ?? DEFAULT_STATE, false);
    return this.getState();
  }

  saveStateForRoom(roomId: string, state: MaterialListUserState): void {
    this.localProject.updateRoomMaterialListState(roomId, state);
  }

  updateCurrentRoomMaterialState(): void {
    const roomId = this.localProject.getEditingRoomId();
    if (roomId) {
      this.saveStateForRoom(roomId, this.stateSignal());
    }
  }

  setIncludeOptionalMaterials(value: boolean): void {
    this.updateState({
      ...this.stateSignal(),
      includeOptionalMaterials: value
    });
  }

  toggleOptionalMaterials(value: boolean): void {
    this.setIncludeOptionalMaterials(value);
  }

  excludeMaterial(materialId: string): void {
    const current = this.stateSignal();
    if (current.excludedMaterialIds.includes(materialId)) {
      return;
    }

    this.updateState({
      ...current,
      excludedMaterialIds: [...current.excludedMaterialIds, materialId]
    });
  }

  includeMaterial(materialId: string): void {
    const current = this.stateSignal();
    this.updateState({
      ...current,
      excludedMaterialIds: current.excludedMaterialIds.filter((id) => id !== materialId)
    });
  }

  isMaterialExcluded(materialId: string): boolean {
    return this.stateSignal().excludedMaterialIds.includes(materialId);
  }

  resetMaterialOverrides(): void {
    this.updateState(DEFAULT_STATE);
  }

  private updateState(state: MaterialListUserState, saveForCurrentRoom = true): void {
    const normalized = {
      includeOptionalMaterials: state.includeOptionalMaterials !== false,
      excludedMaterialIds: [...new Set(state.excludedMaterialIds.filter(Boolean))]
    };
    this.stateSignal.set(normalized);
    if (saveForCurrentRoom) {
      this.updateCurrentRoomMaterialState();
    }

    try {
      globalThis.localStorage?.setItem(
        MATERIAL_LIST_STATE_STORAGE_KEY,
        JSON.stringify(normalized)
      );
    } catch {
      // The reactive in-memory state remains usable when storage is unavailable.
    }
  }

  private loadState(): MaterialListUserState {
    try {
      const stored = globalThis.localStorage?.getItem(MATERIAL_LIST_STATE_STORAGE_KEY);
      if (!stored) {
        return DEFAULT_STATE;
      }

      const parsed = JSON.parse(stored) as Partial<MaterialListUserState>;
      return {
        includeOptionalMaterials: parsed.includeOptionalMaterials !== false,
        excludedMaterialIds: Array.isArray(parsed.excludedMaterialIds)
          ? [...new Set(parsed.excludedMaterialIds.filter((id): id is string => typeof id === 'string'))]
          : []
      };
    } catch {
      return DEFAULT_STATE;
    }
  }
}
