import { computed, inject, Injectable } from '@angular/core';
import { absoluteUrl } from '../config/site.config';
import { DIY_COST_DEFAULTS } from '../config/diy-cost-defaults';
import {
  BathroomWizardData,
  ROOM_TYPE_DEFAULT_NAMES
} from '../models/bathroom-wizard.model';
import { MaterialListViewModel } from '../models/material-list.model';
import {
  AnySharedCalculation,
  SharedCalculation,
  SharedProjectCalculation
} from '../models/shared-calculation.model';
import { SHARED_CALCULATION_REPOSITORY } from '../data-access/shared-calculation-repository';
import { AuthService } from './auth.service';
import { CostComparisonViewModel } from './cost-comparison.service';
import { ProjectAggregationResult } from './project-aggregation.service';

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

  /**
   * Projektweite Momentaufnahme (alle Räume) aus dem bereits aggregierten
   * Ergebnis – keine eigene Berechnung, nur Einfrieren der Kennzahlen.
   */
  buildProjectSnapshot(
    projectName: string,
    result: ProjectAggregationResult
  ): SharedProjectCalculation {
    const percent =
      result.totalProfessionalCost > 0
        ? this.round((result.totalSavings / result.totalProfessionalCost) * 100)
        : 0;
    const snapshot: SharedProjectCalculation = {
      version: 2,
      kind: 'project',
      projectName,
      createdAt: new Date().toISOString(),
      roomCount: result.roomCount,
      totalTileAreaM2: result.totalTileAreaM2,
      totalTileAreaWithWasteM2: result.totalTileAreaWithWasteM2,
      diy: {
        totalCost: result.totalDiyCost,
        materialCost: result.totalMaterialCost,
        bufferPercent: DIY_COST_DEFAULTS.riskBufferPercent
      },
      professional: {
        totalCost: result.totalProfessionalCost
      },
      savings: {
        amount: result.totalSavings,
        percent,
        // Die öffentliche Seite ist bewusst deutsch (analog Raum-Snapshot).
        label:
          result.totalSavings > 0
            ? 'Mögliche Ersparnis durch Eigenleistung'
            : 'Keine rechnerische Ersparnis'
      },
      rooms: result.roomSummaries.map((room) => ({
        name: room.roomName,
        tileAreaM2: room.tileAreaM2,
        diyCost: room.diyCost,
        professionalCost: room.professionalCost,
        savings: room.savings,
        professional: {
          netTotal: room.professional.netTotal,
          materialCost: room.professional.materialCost,
          vatPercent: room.professional.vatPercent,
          vatAmount: room.professional.vatAmount,
          totalCost: room.professional.totalCost,
          lineItems: room.professional.lineItems.map((item) => ({
            label: item.label,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            isActive: item.isActive,
            isOptional: item.isOptional
          }))
        }
      }))
    };
    if (result.deduplicationSavings > 0) {
      snapshot.deduplicationSavings = result.deduplicationSavings;
    }
    return snapshot;
  }

  /** Speichert die Momentaufnahme und liefert den öffentlichen Token. */
  async createShare(snapshot: AnySharedCalculation): Promise<string> {
    return this.repository.create(snapshot);
  }

  /** Lädt eine geteilte Kalkulation per Token (öffentlich). */
  async loadShare(token: string): Promise<AnySharedCalculation | null> {
    return this.repository.load(token);
  }

  /** Voll qualifizierter Teilen-Link zum Token. */
  shareUrl(token: string): string {
    return `${globalThis.location.origin}/geteilt/${token}`;
  }

  /**
   * Teilen-Link für Projekt-Snapshots: immer absolut auf die Marketing-Domain
   * (die Route `/geteilt/:token` existiert nur dort – vom App-Host aus würde
   * ein origin-relativer Link ins Leere laufen).
   */
  projectShareUrl(token: string): string {
    return absoluteUrl(`/geteilt/${token}`);
  }

  private round(value: number): number {
    return Number((Number.isFinite(value) ? value : 0).toFixed(2));
  }
}
