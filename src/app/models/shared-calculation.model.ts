/**
 * Eingefrorene Momentaufnahme einer Kalkulation für den Teilen-Link (Phase 14).
 * Bewusst self-contained (keine Live-Neuberechnung): Ein geteilter Stand bleibt
 * stabil, auch wenn sich Katalogpreise später ändern.
 */
export interface SharedCalculationLineItem {
  label: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  isActive: boolean;
  isOptional: boolean;
}

export interface SharedCalculation {
  /** Schema-Version für spätere Migrationen des Snapshots. */
  version: 1;
  roomName: string;
  roomTypeLabel: string;
  isOutdoor: boolean;
  createdAt: string;
  tileAreaM2: number;
  tileAreaWithWasteM2: number;
  diy: {
    materialCost: number;
    bufferPercent: number;
    totalCost: number;
  };
  professional: {
    netTotal: number;
    materialCost: number;
    vatPercent: number;
    /** MwSt. auf Leistung + Material zusammen. */
    vatAmount: number;
    totalCost: number;
    lineItems: SharedCalculationLineItem[];
  };
  savings: {
    amount: number;
    percent: number;
    label: string;
  };
}

/**
 * Profi-Leistungspositionen + Summen eines Raums im Projekt-Snapshot.
 * Struktur wie `SharedCalculation['professional']` (v1-Raum-Snapshot).
 */
export interface SharedProjectRoomProfessional {
  netTotal: number;
  materialCost: number;
  vatPercent: number;
  /** MwSt. auf Leistung + Material zusammen. */
  vatAmount: number;
  totalCost: number;
  lineItems: SharedCalculationLineItem[];
}

/** Raumzeile im projektweiten Snapshot (version 2). */
export interface SharedProjectRoomSummary {
  name: string;
  tileAreaM2: number;
  diyCost: number;
  professionalCost: number;
  savings: number;
  /**
   * Optional (additiv ergänzt): ältere v2-Snapshots haben dieses Feld nicht –
   * die öffentliche Seite rendert die Positionen dann schlicht nicht.
   */
  professional?: SharedProjectRoomProfessional;
}

/**
 * Projektweite Momentaufnahme (alle Räume) für den Teilen-Link der
 * Projekt-Zusammenfassung. Nutzt dieselbe `shared_calculations`-Infrastruktur
 * (jsonb, migrationsfrei); unterschieden wird über `kind: 'project'` –
 * Alt-Snapshots (version 1) haben kein `kind`-Feld.
 */
export interface SharedProjectCalculation {
  version: 2;
  kind: 'project';
  projectName: string;
  createdAt: string;
  roomCount: number;
  totalTileAreaM2: number;
  totalTileAreaWithWasteM2: number;
  diy: {
    totalCost: number;
    materialCost: number;
    bufferPercent: number;
  };
  professional: {
    totalCost: number;
  };
  savings: {
    amount: number;
    percent: number;
    label: string;
  };
  rooms: SharedProjectRoomSummary[];
  /** Ersparnis durch projektweit nur einmal gerechnete Werkzeuge (nur wenn > 0). */
  deduplicationSavings?: number;
}

/** Union aller teilbaren Snapshots (Raum version 1 | Projekt version 2). */
export type AnySharedCalculation = SharedCalculation | SharedProjectCalculation;

/** Defensiver Type-Guard: Alt-Snapshots ohne `kind` fallen auf den Raum-Zweig zurück. */
export function isSharedProjectCalculation(
  value: AnySharedCalculation
): value is SharedProjectCalculation {
  return (value as SharedProjectCalculation).kind === 'project';
}
