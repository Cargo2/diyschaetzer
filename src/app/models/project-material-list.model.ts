export interface ProjectWarning {
  id: string;
  roomId: string | null;
  roomName: string | null;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface ProjectMaterialSourceBreakdown {
  roomId: string;
  roomName: string;
  quantity: number | null;
  packageCount: number | null;
  displayCost: number | null;
}

export interface ProjectMaterialListItem {
  materialId: string;
  name: string;
  articleType: string;
  /** Sektionszuordnung aus den Arbeitsschritten des Katalogartikels. */
  sectionId: string;
  roomIds: string[];
  roomNames: string[];
  quantity: number | null;
  unit: string | null;
  packageCount: number | null;
  packageUnit: string | null;
  /** Gebindegröße in der Einheit von `quantity`; Basis für projektweite Neuberechnung. */
  packageSize: number | null;
  unitPrice: number | null;
  displayCost: number | null;
  calculatedCost: number | null;
  isProjectLevelDeduplicated: boolean;
  isOutdoorRelevant: boolean;
  sourceRoomBreakdown: ProjectMaterialSourceBreakdown[];
  notes: string[];
}

export interface ProjectMaterialListSection {
  id: string;
  title: string;
  description: string;
  totalDisplayCost: number;
  items: ProjectMaterialListItem[];
}

export interface ProjectMaterialListViewModel {
  sections: ProjectMaterialListSection[];
  totalDisplayCost: number;
  totalCalculatedCost: number;
  totalDeduplicatedToolCost: number;
  totalConsumableCost: number;
  totalMainMaterialCost: number;
  activeItemCount: number;
  inactiveItemCount: number;
  deduplicatedMaterialIds: string[];
  warnings: ProjectWarning[];
}
