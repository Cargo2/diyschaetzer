import { inject, Injectable } from '@angular/core';
import { ExportDocumentData } from '../models/export-document.model';
import { SHARED_OFFER_REPOSITORY } from '../data-access/shared-offer-repository';

/**
 * Erstellt und lädt geteilte Angebote (Phase 13). Speichert das neutrale
 * Exportdokument als **eingefrorene** Momentaufnahme und liefert einen
 * öffentlichen, schreibgeschützten Link. Teilen setzt eine angemeldete Session
 * voraus (das Erzeugen erfolgt owner-scoped in der Repository-Schicht).
 */
@Injectable({ providedIn: 'root' })
export class ContractorOfferShareService {
  private readonly repository = inject(SHARED_OFFER_REPOSITORY);

  /** Speichert die Momentaufnahme und liefert den öffentlichen Token. */
  async createShare(data: ExportDocumentData): Promise<string> {
    return this.repository.create(data);
  }

  /** Lädt ein geteiltes Angebot per Token (öffentlich). */
  async loadShare(token: string): Promise<ExportDocumentData | null> {
    return this.repository.load(token);
  }

  /** Voll qualifizierter Teilen-Link zum Token. */
  shareUrl(token: string): string {
    return `${globalThis.location.origin}/angebot/${token}`;
  }
}
