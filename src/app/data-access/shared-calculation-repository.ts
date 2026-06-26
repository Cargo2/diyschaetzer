import { inject, InjectionToken } from '@angular/core';
import { SharedCalculation } from '../models/shared-calculation.model';
import { SupabaseSharedCalculationRepository } from './supabase-shared-calculation-repository';

/**
 * Persistenz-Grenze für geteilte Kalkulationen (Phase 14). Das Erstellen setzt
 * eine angemeldete Session voraus; das Laden per Token ist öffentlich (anonym).
 */
export interface SharedCalculationRepository {
  /** Speichert eine Momentaufnahme und gibt den öffentlichen Token (UUID) zurück. */
  create(data: SharedCalculation): Promise<string>;
  /** Lädt die Momentaufnahme zum Token oder `null`, wenn es keine gibt. */
  load(token: string): Promise<SharedCalculation | null>;
}

export const SHARED_CALCULATION_REPOSITORY =
  new InjectionToken<SharedCalculationRepository>('SHARED_CALCULATION_REPOSITORY', {
    providedIn: 'root',
    factory: () => inject(SupabaseSharedCalculationRepository)
  });
