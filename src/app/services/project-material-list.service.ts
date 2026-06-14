import { inject, Injectable } from '@angular/core';
import { MaterialListItemViewModel } from '../models/material-list.model';
import { SavedRoomCalculation } from '../models/local-project.model';
import {
  ProjectMaterialListItem,
  ProjectMaterialListSection,
  ProjectMaterialListViewModel,
  ProjectWarning
} from '../models/project-material-list.model';
import { MaterialListService } from './material-list.service';

const PROJECT_LEVEL_ARTICLE_TYPES = new Set(['tool', 'psa', 'documentation']);

const SECTION_DEFINITIONS: Array<{
  id: string;
  title: string;
  description: string;
}> = [
  {
    id: 'tiles',
    title: 'Fliesen je Raum',
    description: 'Hauptmaterialien bleiben wegen Format, Qualität und Einsatzbereich raumbezogen.'
  },
  {
    id: 'installation',
    title: 'Verlegematerialien',
    description: 'Kleber, Fugenmaterial und weitere Verbrauchsmaterialien.'
  },
  {
    id: 'waterproofing',
    title: 'Abdichtung',
    description: 'Materialien für Flächen, Ecken, Anschlüsse und Durchdringungen.'
  },
  {
    id: 'substrate',
    title: 'Untergrundvorbereitung',
    description: 'Reinigung, Grundierung, Reparatur und Ausgleich.'
  },
  {
    id: 'finishes',
    title: 'Profile & Fugen',
    description: 'Profile, Sockel sowie elastische Anschluss- und Bewegungsfugen.'
  },
  {
    id: 'tools',
    title: 'Werkzeug & Schutz',
    description: 'Projektweit nur einmal berechnete Werkzeuge, PSA und Dokumentation.'
  },
  {
    id: 'disposal',
    title: 'Entsorgung',
    description: 'Entsorgungs- und Rückbaupositionen.'
  },
  {
    id: 'other',
    title: 'Sonstiges',
    description: 'Weitere aktive Projektmaterialien.'
  }
];

@Injectable({ providedIn: 'root' })
export class ProjectMaterialListService {
  private readonly materialListService = inject(MaterialListService);

  buildProjectMaterialList(
    rooms: SavedRoomCalculation[]
  ): ProjectMaterialListViewModel {
    const aggregatedItems = new Map<string, ProjectMaterialListItem>();
    const deduplicatedMaterialIds = new Set<string>();
    const warnings: ProjectWarning[] = [];
    let inactiveItemCount = 0;

    for (const room of rooms) {
      const materialList = this.materialListService.buildMaterialList(
        room.wizardData,
        room.materialListUserState
      );
      const items = materialList.sections.flatMap((section) => section.items);
      inactiveItemCount += items.filter((item) => !item.isActive).length;

      for (const item of items.filter((candidate) => candidate.isActive)) {
        const projectLevel = PROJECT_LEVEL_ARTICLE_TYPES.has(item.articleType);
        const keepPerRoom = item.articleType === 'main_material';
        const key = keepPerRoom
          ? `${item.materialId}::room::${room.id}`
          : projectLevel
            ? `${item.materialId}::project`
            : `${item.materialId}::unit::${item.unit ?? 'none'}::package::${item.packageUnit ?? 'none'}`;
        const existing = aggregatedItems.get(key);

        if (existing) {
          this.mergeItem(existing, item, room, projectLevel);
        } else {
          aggregatedItems.set(
            key,
            this.createItem(item, room, projectLevel, keepPerRoom)
          );
        }

        if (projectLevel) {
          deduplicatedMaterialIds.add(item.materialId);
        }
      }
    }

    if (rooms.some((room) => room.isOutdoor)) {
      warnings.push({
        id: 'outdoor-product-suitability',
        roomId: null,
        roomName: null,
        severity: 'warning',
        message:
          'Für Außenbereiche müssen frostsichere, witterungsbeständige und rutschhemmende Fliesen sowie geeignete Verlegematerialien verwendet werden. Bitte Produkte prüfen.'
      });
    }

    const allItems = [...aggregatedItems.values()];
    const sections = SECTION_DEFINITIONS.map((definition) => {
      const items = allItems
        .filter((item) => item.sectionId === definition.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
      return {
        ...definition,
        totalDisplayCost: this.round(
          items.reduce((sum, item) => sum + this.nonNegative(item.displayCost), 0)
        ),
        items
      } satisfies ProjectMaterialListSection;
    }).filter((section) => section.items.length > 0);

    return {
      sections,
      totalDisplayCost: this.round(
        allItems.reduce((sum, item) => sum + this.nonNegative(item.displayCost), 0)
      ),
      totalCalculatedCost: this.round(
        allItems.reduce((sum, item) => sum + this.nonNegative(item.calculatedCost), 0)
      ),
      totalDeduplicatedToolCost: this.round(
        allItems
          .filter((item) => item.isProjectLevelDeduplicated)
          .reduce((sum, item) => sum + this.nonNegative(item.displayCost), 0)
      ),
      totalConsumableCost: this.round(
        allItems
          .filter((item) => item.articleType === 'consumable')
          .reduce((sum, item) => sum + this.nonNegative(item.displayCost), 0)
      ),
      totalMainMaterialCost: this.round(
        allItems
          .filter((item) => item.articleType === 'main_material')
          .reduce((sum, item) => sum + this.nonNegative(item.displayCost), 0)
      ),
      activeItemCount: allItems.length,
      inactiveItemCount,
      deduplicatedMaterialIds: [...deduplicatedMaterialIds],
      warnings
    };
  }

  private createItem(
    item: MaterialListItemViewModel,
    room: SavedRoomCalculation,
    projectLevel: boolean,
    keepPerRoom: boolean
  ): ProjectMaterialListItem {
    return {
      materialId: item.materialId,
      name: keepPerRoom ? `${item.name} - ${room.roomName}` : item.name,
      articleType: item.articleType,
      sectionId: this.resolveSectionId(item, projectLevel),
      roomIds: [room.id],
      roomNames: [room.roomName],
      quantity: item.quantity,
      unit: item.unit,
      packageCount: item.packageCount,
      packageUnit: item.packageUnit,
      packageSize: item.packageSize,
      unitPrice: item.unitPrice,
      displayCost: item.displayCost,
      calculatedCost: item.calculatedCost,
      isProjectLevelDeduplicated: projectLevel,
      isOutdoorRelevant: room.isOutdoor,
      sourceRoomBreakdown: [
        {
          roomId: room.id,
          roomName: room.roomName,
          quantity: item.quantity,
          packageCount: item.packageCount,
          displayCost: item.displayCost
        }
      ],
      notes: this.itemNotes(item, room.isOutdoor, projectLevel)
    };
  }

  private mergeItem(
    target: ProjectMaterialListItem,
    source: MaterialListItemViewModel,
    room: SavedRoomCalculation,
    projectLevel: boolean
  ): void {
    target.roomIds = [...new Set([...target.roomIds, room.id])];
    target.roomNames = [...new Set([...target.roomNames, room.roomName])];
    target.isOutdoorRelevant ||= room.isOutdoor;
    target.sourceRoomBreakdown.push({
      roomId: room.id,
      roomName: room.roomName,
      quantity: source.quantity,
      packageCount: source.packageCount,
      displayCost: source.displayCost
    });

    if (!projectLevel) {
      target.quantity = this.sumNullable(target.quantity, source.quantity);

      // Gebinde werden projektweit aus der Gesamtmenge neu gerundet, statt die
      // bereits aufgerundeten Raum-Gebinde zu addieren. Das vermeidet Überkauf
      // (z. B. 3 × 1,2 Sack ergibt 4 Säcke statt 6).
      const canRepackage =
        target.packageSize !== null &&
        target.packageSize > 0 &&
        target.packageSize === source.packageSize &&
        target.quantity !== null &&
        target.unitPrice !== null;
      if (canRepackage) {
        const packageCount = Math.ceil(this.nonNegative(target.quantity) / Number(target.packageSize));
        target.packageCount = packageCount;
        target.displayCost = this.round(packageCount * this.nonNegative(target.unitPrice));
        target.calculatedCost = target.displayCost;
        target.notes = [
          ...new Set([...target.notes, 'Gebinde projektweit aus der Gesamtmenge berechnet.'])
        ];
      } else {
        target.packageCount = this.sumNullable(
          target.packageCount,
          source.packageCount
        );
        target.displayCost = this.sumNullable(target.displayCost, source.displayCost);
        target.calculatedCost = this.sumNullable(
          target.calculatedCost,
          source.calculatedCost
        );
      }
    } else {
      target.quantity = this.maxNullable(target.quantity, source.quantity);
      target.packageCount = this.maxNullable(
        target.packageCount,
        source.packageCount
      );
      target.displayCost = this.maxNullable(
        target.displayCost,
        source.displayCost
      );
      target.calculatedCost = this.maxNullable(
        target.calculatedCost,
        source.calculatedCost
      );
    }

    target.notes = [
      ...new Set([
        ...target.notes,
        ...this.itemNotes(source, room.isOutdoor, projectLevel)
      ])
    ];
  }

  private itemNotes(
    item: MaterialListItemViewModel,
    isOutdoor: boolean,
    projectLevel: boolean
  ): string[] {
    return [
      ...(projectLevel
        ? ['Einmalig fürs Gesamtprojekt berücksichtigt.']
        : []),
      ...(isOutdoor ? ['Outdoor-Eignung prüfen.'] : []),
      ...(item.calculationNote ? [item.calculationNote] : [])
    ];
  }

  /**
   * Sektionszuordnung über Artikeltyp und Arbeitsschritte aus dem Katalog
   * statt über Namens- oder ID-Heuristiken.
   */
  private resolveSectionId(
    item: MaterialListItemViewModel,
    projectLevel: boolean
  ): string {
    if (item.articleType === 'main_material') return 'tiles';
    if (projectLevel) return 'tools';
    if (item.articleType === 'waste_disposal') return 'disposal';

    const steps = new Set(item.workStepIds);
    if (steps.has('waterproofing')) {
      return 'waterproofing';
    }
    if (
      steps.has('substrate_inspection') ||
      steps.has('substrate_cleaning') ||
      steps.has('substrate_repair_leveling') ||
      steps.has('priming')
    ) {
      return 'substrate';
    }
    if (
      steps.has('profiles_baseboards_finishes') ||
      steps.has('silicone_joints') ||
      steps.has('grouting')
    ) {
      return 'finishes';
    }
    if (item.articleType === 'consumable' || item.articleType === 'accessory') {
      return 'installation';
    }
    return 'other';
  }

  private sumNullable(
    first: number | null,
    second: number | null
  ): number | null {
    if (!Number.isFinite(first) && !Number.isFinite(second)) {
      return null;
    }
    return this.round(this.nonNegative(first) + this.nonNegative(second));
  }

  private maxNullable(
    first: number | null,
    second: number | null
  ): number | null {
    if (!Number.isFinite(first) && !Number.isFinite(second)) {
      return null;
    }
    return this.round(Math.max(this.nonNegative(first), this.nonNegative(second)));
  }

  private nonNegative(value: number | null | undefined): number {
    return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
