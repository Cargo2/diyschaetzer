import { inject, Injectable } from '@angular/core';
import { ExportDocumentData } from '../models/export-document.model';
import { SharedOfferPage, SharedOfferTracking } from '../models/shared-offer-tracking.model';
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

  /**
   * Erstellt/aktualisiert den Teilen-Link für ein konkretes Angebot und liefert den
   * **stabilen** Token (ein Link je Angebot, Tracking/Annahme bleiben erhalten).
   */
  async createShareForOffer(offerId: string, data: ExportDocumentData): Promise<string> {
    return this.repository.createForOffer(offerId, data);
  }

  /** Lädt die öffentliche read-only Ansicht (Dokument + Annahme-Status) per Token. */
  async loadSharePage(token: string): Promise<SharedOfferPage | null> {
    return this.repository.loadPage(token);
  }

  /** Zählt einen Aufruf des geteilten Angebots (serverseitig gedrosselt). */
  async pingView(token: string): Promise<void> {
    return this.repository.pingView(token);
  }

  /** Set-once Annahme durch den Empfänger; liefert den aktuellen Annahme-Stand. */
  async accept(
    token: string,
    name: string
  ): Promise<{ acceptedAt: string; acceptedByName: string } | null> {
    return this.repository.accept(token, name);
  }

  /** Owner-scoped Tracking (Aufrufe/Annahme) zum eigenen Angebots-Share. */
  async trackingForOffer(offerId: string): Promise<SharedOfferTracking | null> {
    return this.repository.getTrackingForOffer(offerId);
  }

  /** Voll qualifizierter Teilen-Link zum Token. */
  shareUrl(token: string): string {
    return `${globalThis.location.origin}/angebot/${token}`;
  }
}
