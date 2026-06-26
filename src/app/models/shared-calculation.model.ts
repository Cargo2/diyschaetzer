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
