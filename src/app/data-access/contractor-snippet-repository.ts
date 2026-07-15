import { inject, InjectionToken } from '@angular/core';
import { ContractorSnippet } from '../models/contractor-snippet.model';
import { SupabaseContractorSnippetRepository } from './supabase-contractor-snippet-repository';

/**
 * Persistenz-Grenze für die wiederverwendbaren Angebots-Bausteine (Phase R2).
 * Reines Backend-Feature (nur angemeldete Profis), daher kein localStorage-Fallback.
 * Das Frontend spricht ausschließlich gegen dieses Interface.
 */
export interface ContractorSnippetRepository {
  /** Alle Bausteine des angemeldeten Profis (sortiert nach kind, sort_order, created_at). */
  listMine(): Promise<ContractorSnippet[]>;
  /** Speichert (upsert über die Baustein-`id`) einen Baustein. */
  save(snippet: ContractorSnippet): Promise<void>;
  /** Löscht einen Baustein anhand seiner `id`. */
  delete(id: string): Promise<void>;
}

/**
 * Default ist der Supabase-Adapter – ein Offline-Variant gibt es bewusst nicht,
 * da das Feature eine angemeldete Session voraussetzt. Tests überschreiben das
 * Token mit einem Fake.
 */
export const CONTRACTOR_SNIPPET_REPOSITORY =
  new InjectionToken<ContractorSnippetRepository>('CONTRACTOR_SNIPPET_REPOSITORY', {
    providedIn: 'root',
    factory: () => inject(SupabaseContractorSnippetRepository)
  });
