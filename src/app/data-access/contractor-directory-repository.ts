import { inject, InjectionToken } from '@angular/core';
import { ContractorDirectoryEntry } from '../models/contractor-directory.model';
import { SupabaseContractorDirectoryRepository } from './supabase-contractor-directory-repository';

/**
 * Persistenz-Grenze des öffentlichen Betriebe-Verzeichnisses (Nutzerauftrag
 * 12.07.2026). Reines Lese-Feature über die anon-callbare RPC
 * `list_active_contractors` – kein Schreibpfad, keine Auth nötig. Das Verzeichnis
 * erscheint nur bei konfiguriertem Supabase (gleiches Gate wie das Lead-Formular),
 * sodass dieses Repository sonst nie aufgerufen wird.
 */
export interface ContractorDirectoryRepository {
  /** Aktive Premium-Betriebe zur PLZ (max. 12, serverseitig sortiert/gefiltert). */
  listActiveContractors(postalCode: string): Promise<ContractorDirectoryEntry[]>;
}

export const CONTRACTOR_DIRECTORY_REPOSITORY =
  new InjectionToken<ContractorDirectoryRepository>('CONTRACTOR_DIRECTORY_REPOSITORY', {
    providedIn: 'root',
    factory: () => inject(SupabaseContractorDirectoryRepository)
  });
