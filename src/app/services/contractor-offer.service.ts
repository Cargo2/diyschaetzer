import { inject, Injectable } from '@angular/core';
import { PROFESSIONAL_OFFER_DEFAULTS } from '../config/professional-offer-defaults';
import {
  ContractorOffer,
  ContractorOfferLine,
  ContractorOfferSection
} from '../models/contractor-offer.model';
import { LocalTileProject } from '../models/local-project.model';
import { CostComparisonService } from './cost-comparison.service';
import { MaterialListService } from './material-list.service';
import { ProfessionalLineItem } from './professional-offer.service';

/**
 * Baut aus den Räumen eines Projekts ein **Profi-Angebot** (editierbares
 * Leistungsverzeichnis). Wiederverwendung der bestehenden Pipeline:
 * {@link MaterialListService} → {@link CostComparisonService} → Profi-Positionen.
 *
 * Aufbau (analog Handwerker-Leistungsverzeichnis):
 * - „Baustelle einrichten" **einmal** als Kopf-Pauschale (Dedup über alle Räume),
 * - je Raum eine Positionsgruppe mit den Leistungspositionen (ohne Fliesenmaterial),
 * - **eine** kompakte Material-Sammelposition (Handwerkerleistung im Vordergrund).
 *
 * Summen werden bewusst nicht hier gespeichert, sondern aus dem Modell abgeleitet
 * (`offerNetTotal` etc.), damit Edits in Block C live wirken.
 */
@Injectable({ providedIn: 'root' })
export class ContractorOfferService {
  private readonly materialList = inject(MaterialListService);
  private readonly costComparison = inject(CostComparisonService);

  buildOffer(project: LocalTileProject): ContractorOffer {
    const roomSections: ContractorOfferSection[] = [];
    let siteSetup: ContractorOfferLine | null = null;
    let materialSum = 0;
    let vatPercent: number = PROFESSIONAL_OFFER_DEFAULTS.vatPercent;

    for (const room of project.rooms) {
      const materialList = this.materialList.buildMaterialList(
        room.wizardData,
        room.materialListUserState
      );
      const comparison = this.costComparison.buildCostComparison(
        room.wizardData,
        materialList
      );
      const offer = comparison.professional.offer;
      vatPercent = offer.vatPercent;
      materialSum += comparison.professional.materialCost;

      const roomLines: ContractorOfferLine[] = [];
      for (const item of offer.lineItems) {
        if (item.category === 'site_setup') {
          // Baustelle einrichten projektweit nur einmal (erste Vorkommnis gewinnt).
          siteSetup ??= this.toLine('site_setup', item);
          continue;
        }
        roomLines.push(this.toLine(room.id, item));
      }
      if (roomLines.length > 0) {
        roomSections.push({
          id: room.id,
          kind: 'room',
          title: room.roomName,
          lines: roomLines
        });
      }
    }

    const sections: ContractorOfferSection[] = [];
    if (siteSetup) {
      sections.push({
        id: 'site_setup',
        kind: 'site_setup',
        title: 'Baustelle einrichten',
        lines: [siteSetup]
      });
    }
    sections.push(...roomSections);
    if (materialSum > 0) {
      sections.push({
        id: 'material',
        kind: 'material',
        title: 'Material',
        lines: [
          {
            id: 'material:tiles',
            label: 'Material (Fliesen)',
            description: 'Geschätzte Materialkosten (Fliesen und Verbrauchsmaterial).',
            quantity: 1,
            unit: 'pauschal',
            unitPrice: this.round(materialSum),
            isActive: true,
            origin: 'generated'
          }
        ]
      });
    }

    return {
      projectId: project.id,
      projectName: project.name,
      vatPercent,
      sections
    };
  }

  private toLine(sectionId: string, item: ProfessionalLineItem): ContractorOfferLine {
    return {
      // Über die Sektion eindeutig – dieselbe Positions-id kommt je Raum vor.
      id: `${sectionId}:${item.id}`,
      label: item.label,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      isActive: item.isActive,
      origin: 'generated'
    };
  }

  private round(value: number): number {
    return Number((Number.isFinite(value) ? value : 0).toFixed(2));
  }
}
