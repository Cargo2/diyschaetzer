import { ProfessionalLineItemUnit } from '../services/professional-offer.service';

/**
 * Wiederverwendbare Bausteine für den Angebotseditor (Phase R2). Ein Profi legt
 * Positionen und Einleitungs-/Schlusstexte einmal an und nutzt sie in mehreren
 * Angeboten. `kind` trennt Positions- von Textbausteinen; die Nutzdaten liegen
 * je nach Art in {@link ContractorSnippetPositionData} bzw.
 * {@link ContractorSnippetTextData}.
 */
export type ContractorSnippetKind = 'position' | 'intro' | 'outro';

/** Nutzdaten eines Positions-Bausteins (`kind === 'position'`). */
export interface ContractorSnippetPositionData {
  label: string;
  description: string;
  unit: ProfessionalLineItemUnit;
  unitPrice: number;
  quantity?: number;
  isOptional?: boolean;
}

/** Nutzdaten eines Textbausteins (`kind === 'intro' | 'outro'`). */
export interface ContractorSnippetTextData {
  text: string;
}

/** Ein gespeicherter Baustein (owner-scoped, siehe Migration 0025). */
export interface ContractorSnippet {
  id: string;
  kind: ContractorSnippetKind;
  label: string;
  data: ContractorSnippetPositionData | ContractorSnippetTextData;
  sortOrder: number;
  createdAt?: string;
}

/** Erlaubte Bausteinarten (spiegelt den DB-Check-Constraint aus 0025). */
const SNIPPET_KINDS: readonly ContractorSnippetKind[] = ['position', 'intro', 'outro'];

/** Erlaubte Einheiten eines Positions-Bausteins (spiegelt `ProfessionalLineItemUnit`). */
const SNIPPET_UNITS: readonly ProfessionalLineItemUnit[] = [
  'pauschal',
  'm2',
  'lfm',
  'piece',
  'hour'
];

/** Type-Guard: Positions-Baustein. */
export function isPositionSnippet(
  snippet: ContractorSnippet
): snippet is ContractorSnippet & { data: ContractorSnippetPositionData } {
  return snippet.kind === 'position';
}

/** Type-Guard: Textbaustein (Einleitung/Schluss). */
export function isTextSnippet(
  snippet: ContractorSnippet
): snippet is ContractorSnippet & { data: ContractorSnippetTextData } {
  return snippet.kind === 'intro' || snippet.kind === 'outro';
}

function toStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeUnit(value: unknown): ProfessionalLineItemUnit {
  return SNIPPET_UNITS.includes(value as ProfessionalLineItemUnit)
    ? (value as ProfessionalLineItemUnit)
    : 'pauschal';
}

/**
 * Defensiv normalisieren: aus einem (potenziell unvollständigen/alten) jsonb-Blob
 * einen vollständig getypten Baustein bauen. Unbekannte `kind` fallen auf `'intro'`
 * zurück; Positions-/Textdaten werden je nach `kind` mit Defaults aufgefüllt.
 */
export function normalizeContractorSnippet(raw: Partial<ContractorSnippet>): ContractorSnippet {
  const kind: ContractorSnippetKind = SNIPPET_KINDS.includes(raw.kind as ContractorSnippetKind)
    ? (raw.kind as ContractorSnippetKind)
    : 'intro';

  const rawData = (raw.data ?? {}) as Record<string, unknown>;
  const data: ContractorSnippetPositionData | ContractorSnippetTextData =
    kind === 'position'
      ? {
          label: toStr(rawData['label']),
          description: toStr(rawData['description']),
          unit: normalizeUnit(rawData['unit']),
          unitPrice: toNum(rawData['unitPrice']),
          quantity:
            rawData['quantity'] === undefined ? undefined : toNum(rawData['quantity']),
          isOptional:
            rawData['isOptional'] === undefined ? undefined : Boolean(rawData['isOptional'])
        }
      : { text: toStr(rawData['text']) };

  return {
    id: toStr(raw.id),
    kind,
    label: toStr(raw.label),
    data,
    sortOrder: toNum(raw.sortOrder),
    createdAt: raw.createdAt
  };
}
