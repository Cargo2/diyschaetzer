import { inject, Injectable } from '@angular/core';
import { PROFESSIONAL_OFFER_DEFAULTS } from '../config/professional-offer-defaults';
import {
  ContractorOffer,
  ContractorOfferLine,
  ContractorOfferSection
} from '../models/contractor-offer.model';
import { offerTodayIso } from '../models/contractor-offer.model';
import { LocalTileProject } from '../models/local-project.model';
import { CostComparisonService } from './cost-comparison.service';
import { MaterialListService } from './material-list.service';
import { ProfessionalLineItem } from './professional-offer.service';

/** Materialkosten eines Raums (Fliesen + Verbrauchsmaterial, ohne Aufschlag). */
interface RoomMaterial {
  id: string;
  name: string;
  cost: number;
}

/** Einstellungen der Material-Sammelposition(en). */
export interface MaterialSettings {
  /** Material je Raum getrennt ausweisen statt einer Sammelposition. */
  breakdown: boolean;
  /** Aufschlag auf die Materialkosten in % (0 = ohne). */
  surchargePercent: number;
}

/** Profil-Standardwerte, die ein **neu erzeugtes** Angebot vorbefüllen. */
export interface ContractorOfferDefaults {
  introText?: string;
  outroText?: string;
  materialSurchargePercent?: number;
}

/**
 * Baut aus den Räumen eines Projekts ein **Profi-Angebot** (editierbares
 * Leistungsverzeichnis). Wiederverwendung der bestehenden Pipeline:
 * {@link MaterialListService} → {@link CostComparisonService} → Profi-Positionen.
 *
 * Aufbau (analog Handwerker-Leistungsverzeichnis):
 * - „Baustelle einrichten" **einmal** als Kopf-Pauschale (Dedup über alle Räume),
 * - je Raum eine Positionsgruppe mit den Leistungspositionen (ohne Fliesenmaterial),
 * - Material als **eine** Sammelposition **oder** – auf Wunsch – je Raum getrennt,
 *   jeweils optional mit Materialaufschlag.
 *
 * Summen werden bewusst nicht hier gespeichert, sondern aus dem Modell abgeleitet
 * (`offerNetTotal` etc.), damit Edits in Block C live wirken.
 */
@Injectable({ providedIn: 'root' })
export class ContractorOfferService {
  private readonly materialList = inject(MaterialListService);
  private readonly costComparison = inject(CostComparisonService);

  /**
   * Baut das Angebot aus dem Projekt. Wird `previous` übergeben, werden dessen
   * Kopfdaten, Preis-/Text-Edits und eigene (custom) Positionen/Gruppen in das
   * frisch erzeugte Angebot **übernommen** – so verwirft „Aus Projekt aktualisieren"
   * die Anpassungen des Profis nicht (nur die Kalkulationsbasis wird aufgefrischt).
   */
  buildOffer(
    project: LocalTileProject,
    previous?: ContractorOffer,
    defaults?: ContractorOfferDefaults
  ): ContractorOffer {
    // Beim Aktualisieren die Material-Einstellungen des vorigen Stands übernehmen,
    // sonst den Profil-Default; damit Aufschlag/Aufschlüsselung erhalten bleiben.
    const material: MaterialSettings = {
      breakdown: previous?.materialBreakdown ?? false,
      surchargePercent:
        previous?.materialSurchargePercent ?? defaults?.materialSurchargePercent ?? 0
    };
    const fresh = this.buildFromProject(project, material, defaults);
    return previous ? this.applyPreviousEdits(fresh, previous) : fresh;
  }

  /**
   * Berechnet nur die Material-Sektion(en) neu (für die Live-Umschaltung von
   * Aufschlüsselung/Aufschlag im Editor). Liefert 0 oder 1 Sektion.
   */
  rebuildMaterialSections(
    project: LocalTileProject,
    material: MaterialSettings
  ): ContractorOfferSection[] {
    return this.materialSectionsFor(this.collectRoomMaterials(project), material);
  }

  private buildFromProject(
    project: LocalTileProject,
    material: MaterialSettings,
    defaults?: ContractorOfferDefaults
  ): ContractorOffer {
    const roomSections: ContractorOfferSection[] = [];
    const roomMaterials: RoomMaterial[] = [];
    let siteSetup: ContractorOfferLine | null = null;
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
      roomMaterials.push({
        id: room.id,
        name: room.roomName,
        cost: comparison.professional.materialCost
      });

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
    sections.push(...this.materialSectionsFor(roomMaterials, material));

    return {
      id: this.createId(),
      projectId: project.id,
      projectName: project.name,
      version: 1,
      status: 'draft',
      label: '',
      vatPercent,
      sections,
      offerNumber: '',
      offerDate: offerTodayIso(),
      validUntil: '',
      customer: { name: '', address: '' },
      introText: defaults?.introText ?? '',
      outroText: defaults?.outroText ?? '',
      materialBreakdown: material.breakdown,
      materialSurchargePercent: material.surchargePercent,
      discountPercent: 0,
      sourceUpdatedAt: project.updatedAt
    };
  }

  private collectRoomMaterials(project: LocalTileProject): RoomMaterial[] {
    return project.rooms.map((room) => {
      const materialList = this.materialList.buildMaterialList(
        room.wizardData,
        room.materialListUserState
      );
      const comparison = this.costComparison.buildCostComparison(
        room.wizardData,
        materialList
      );
      return {
        id: room.id,
        name: room.roomName,
        cost: comparison.professional.materialCost
      };
    });
  }

  /** Baut die Material-Sektion – eine Sammelposition oder je Raum eine Zeile. */
  private materialSectionsFor(
    roomMaterials: RoomMaterial[],
    material: MaterialSettings
  ): ContractorOfferSection[] {
    const factor = material.surchargePercent > 0
      ? 1 + material.surchargePercent / 100
      : 1;
    const surchargeNote = material.surchargePercent > 0
      ? ` inkl. ${material.surchargePercent} % Materialaufschlag`
      : '';

    if (material.breakdown) {
      const lines: ContractorOfferLine[] = roomMaterials
        .filter((room) => room.cost > 0)
        .map((room) => ({
          id: `material:${room.id}`,
          label: `Material ${room.name}`.trim(),
          description: `Fliesen und Verbrauchsmaterial${surchargeNote}.`,
          quantity: 1,
          unit: 'pauschal',
          unitPrice: this.round(room.cost * factor),
          isActive: true,
          isOptional: false,
          origin: 'generated'
        }));
      if (lines.length === 0) {
        return [];
      }
      return [{ id: 'material', kind: 'material', title: 'Material', lines }];
    }

    const materialSum = roomMaterials.reduce((sum, room) => sum + room.cost, 0);
    if (materialSum <= 0) {
      return [];
    }
    return [
      {
        id: 'material',
        kind: 'material',
        title: 'Material',
        lines: [
          {
            id: 'material:tiles',
            label: 'Material (Fliesen)',
            description: `Geschätzte Materialkosten (Fliesen und Verbrauchsmaterial)${surchargeNote}.`,
            quantity: 1,
            unit: 'pauschal',
            unitPrice: this.round(materialSum * factor),
            isActive: true,
            isOptional: false,
            origin: 'generated'
          }
        ]
      }
    ];
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
      isOptional: item.isOptional,
      origin: 'generated'
    };
  }

  /**
   * Übernimmt Kopfdaten, Edits und eigene Positionen aus dem vorigen Stand ins
   * frische Angebot. Zuordnung generierter Positionen über die stabile `id`
   * (`sektion:position`); eigene (custom) Positionen/Gruppen bleiben erhalten.
   */
  private applyPreviousEdits(
    fresh: ContractorOffer,
    previous: ContractorOffer
  ): ContractorOffer {
    // Identität/Version des aktualisierten Angebots beibehalten (gleiche Zeile).
    fresh.id = previous.id ?? fresh.id;
    fresh.version = previous.version ?? fresh.version;
    fresh.status = previous.status ?? fresh.status;
    fresh.label = previous.label ?? fresh.label;
    fresh.vatPercent = previous.vatPercent;
    fresh.offerNumber = previous.offerNumber ?? '';
    fresh.offerDate = previous.offerDate ?? fresh.offerDate;
    fresh.validUntil = previous.validUntil ?? '';
    fresh.customer = previous.customer
      ? { ...previous.customer }
      : { name: '', address: '' };
    fresh.introText = previous.introText ?? '';
    fresh.outroText = previous.outroText ?? '';
    fresh.discountPercent = previous.discountPercent ?? 0;
    // Material-Einstellungen wurden bereits beim Bauen berücksichtigt (buildOffer).

    const previousLineById = new Map<string, ContractorOfferLine>();
    for (const section of previous.sections) {
      for (const line of section.lines) {
        previousLineById.set(line.id, line);
      }
    }

    for (const section of fresh.sections) {
      // 1. Edits an generierten Positionen zurückspielen.
      section.lines = section.lines.map((line) => {
        const prior = previousLineById.get(line.id);
        if (!prior) {
          return line;
        }
        return {
          ...line,
          label: prior.label,
          description: prior.description,
          quantity: prior.quantity,
          unitPrice: prior.unitPrice,
          isActive: prior.isActive,
          isOptional: prior.isOptional ?? line.isOptional
        };
      });
      // 2. Eigene Positionen, die in dieser Gruppe ergänzt wurden, wieder anhängen.
      const priorSection = previous.sections.find((entry) => entry.id === section.id);
      if (priorSection) {
        const knownIds = new Set(section.lines.map((line) => line.id));
        for (const line of priorSection.lines) {
          if (line.origin === 'custom' && !knownIds.has(line.id)) {
            section.lines.push({ ...line });
          }
        }
      }
    }

    // 3. Komplett eigene Gruppen (custom) übernehmen.
    const freshSectionIds = new Set(fresh.sections.map((section) => section.id));
    for (const section of previous.sections) {
      if (section.kind === 'custom' && !freshSectionIds.has(section.id)) {
        fresh.sections.push({ ...section, lines: section.lines.map((line) => ({ ...line })) });
      }
    }

    return fresh;
  }

  /** Erzeugt eine neue Version aus einem bestehenden Angebot (Kopie, neue ID). */
  duplicateAsNewVersion(offer: ContractorOffer, nextVersion: number): ContractorOffer {
    return {
      ...offer,
      id: this.createId(),
      version: nextVersion,
      status: 'draft',
      label: offer.label?.trim() ? offer.label : `Version ${nextVersion}`,
      sections: offer.sections.map((section) => ({
        ...section,
        lines: section.lines.map((line) => ({ ...line }))
      })),
      customer: offer.customer ? { ...offer.customer } : { name: '', address: '' }
    };
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.()
      ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  private round(value: number): number {
    return Number((Number.isFinite(value) ? value : 0).toFixed(2));
  }
}
