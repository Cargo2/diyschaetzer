import { computed, inject, Injectable } from '@angular/core';
import {
  BathroomWizardData,
  ROOM_TYPE_DEFAULT_NAMES
} from '../models/bathroom-wizard.model';
import { MaterialListViewModel } from '../models/material-list.model';
import { SharedCalculation } from '../models/shared-calculation.model';
import { SHARED_CALCULATION_REPOSITORY } from '../data-access/shared-calculation-repository';
import { AuthService } from './auth.service';
import { CostComparisonViewModel } from './cost-comparison.service';

/**
 * Erstellt und lädt geteilte Kalkulationen (Phase 14). Baut aus dem aktuellen
 * Stand eine **eingefrorene** Momentaufnahme, speichert sie und liefert einen
 * öffentlichen Link. Teilen setzt eine angemeldete Session voraus (reine
 * localStorage-Stände sind nicht teilbar).
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly repository = inject(SHARED_CALCULATION_REPOSITORY);
  private readonly auth = inject(AuthService);

  /** Nur angemeldete Nutzer können teilen (Persistenz + öffentlicher Lese-Token). */
  readonly canShare = computed(() => this.auth.isAuthenticated());

  /** Erzeugt die neutrale Momentaufnahme aus dem aktuellen Berechnungsstand. */
  buildSnapshot(
    wizardData: BathroomWizardData,
    materialList: MaterialListViewModel,
    comparison: CostComparisonViewModel
  ): SharedCalculation {
    const roomType = wizardData.room.roomType ?? 'bathroom';
    const offer = comparison.professional.offer;
    const vatAmount = this.round(
      comparison.professional.totalCost - offer.netTotal - comparison.professional.materialCost
    );
    return {
      version: 1,
      roomName: wizardData.room.roomName,
      roomTypeLabel: ROOM_TYPE_DEFAULT_NAMES[roomType],
      isOutdoor: wizardData.room.isOutdoor,
      createdAt: new Date().toISOString(),
      tileAreaM2: materialList.tileCalculation.baseTileAreaM2,
      tileAreaWithWasteM2: materialList.tileCalculation.tileAreaWithWasteM2,
      diy: {
        materialCost: comparison.diy.materialCost,
        bufferPercent: comparison.diy.diyBufferPercent,
        totalCost: comparison.diy.totalCost
      },
      professional: {
        netTotal: offer.netTotal,
        materialCost: comparison.professional.materialCost,
        vatPercent: offer.vatPercent,
        vatAmount,
        totalCost: comparison.professional.totalCost,
        lineItems: offer.lineItems
          .filter((item) => item.isActive)
          .map((item) => ({
            label: item.label,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            isActive: item.isActive,
            isOptional: item.isOptional
          }))
      },
      savings: {
        amount: comparison.savings.amount,
        percent: comparison.savings.percent,
        label: comparison.savings.label
      }
    };
  }

  /** Speichert die Momentaufnahme und liefert den öffentlichen Token. */
  async createShare(snapshot: SharedCalculation): Promise<string> {
    return this.repository.create(snapshot);
  }

  /** Lädt eine geteilte Kalkulation per Token (öffentlich). */
  async loadShare(token: string): Promise<SharedCalculation | null> {
    return this.repository.load(token);
  }

  /** Voll qualifizierter Teilen-Link zum Token. */
  shareUrl(token: string): string {
    return `${globalThis.location.origin}/geteilt/${token}`;
  }

  private round(value: number): number {
    return Number((Number.isFinite(value) ? value : 0).toFixed(2));
  }
}
