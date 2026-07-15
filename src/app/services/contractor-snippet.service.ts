import { inject, Injectable } from '@angular/core';
import { CONTRACTOR_SNIPPET_REPOSITORY } from '../data-access/contractor-snippet-repository';
import { ContractorSnippet, ContractorSnippetKind } from '../models/contractor-snippet.model';

/**
 * Dünne Fassade über das {@link CONTRACTOR_SNIPPET_REPOSITORY}: lädt/speichert/
 * löscht die wiederverwendbaren Angebots-Bausteine des angemeldeten Profis. Die
 * Konto-Verwaltungsseite und der Angebotseditor bauen darauf auf.
 */
@Injectable({ providedIn: 'root' })
export class ContractorSnippetService {
  private readonly repository = inject(CONTRACTOR_SNIPPET_REPOSITORY);

  /** Alle Bausteine des angemeldeten Profis (sortiert nach kind, sort_order, created_at). */
  async list(): Promise<ContractorSnippet[]> {
    return this.repository.listMine();
  }

  /** Nur die Bausteine einer Art (z. B. `'position'` für den Positionskatalog). */
  async listByKind(kind: ContractorSnippetKind): Promise<ContractorSnippet[]> {
    return (await this.repository.listMine()).filter((snippet) => snippet.kind === kind);
  }

  async save(snippet: ContractorSnippet): Promise<void> {
    await this.repository.save(snippet);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
