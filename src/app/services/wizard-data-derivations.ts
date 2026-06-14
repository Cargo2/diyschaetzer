import {
  BathroomWizardData,
  ShowerBathOption,
  TileSize
} from '../models/bathroom-wizard.model';

/**
 * Zentrale, reine Ableitungsfunktionen aus den Wizard-Daten.
 * Alle Services (Materialliste, Annahmen, Profi-Angebot) nutzen dieselben
 * Regeln, damit DIY- und Profi-Seite nie auseinanderlaufen.
 */

const LARGE_FORMAT_SIZES: ReadonlySet<TileSize> = new Set<TileSize>([
  '60x120_cm',
  '120x120_cm'
]);

export function isLargeFormatTileSize(size: TileSize | null | undefined): boolean {
  return size != null && LARGE_FORMAT_SIZES.has(size);
}

export function isFloorLargeFormat(data: BathroomWizardData): boolean {
  return isLargeFormatTileSize(data.floorTileSize);
}

export function isWallLargeFormat(data: BathroomWizardData): boolean {
  return isLargeFormatTileSize(data.wallTileSize);
}

export function isAnyLargeFormat(data: BathroomWizardData): boolean {
  return isFloorLargeFormat(data) || isWallLargeFormat(data);
}

export function isBathroomRoom(data: BathroomWizardData): boolean {
  const roomType = data.room?.roomType;
  return roomType === 'bathroom' || roomType === 'guest_wc';
}

export function optionHasShower(option: ShowerBathOption | null | undefined): boolean {
  return (
    option === 'shower_only' ||
    option === 'shower_and_bathtub' ||
    option === 'shower_bathtub_combination'
  );
}

export function optionHasBathtub(option: ShowerBathOption | null | undefined): boolean {
  return (
    option === 'bathtub_only' ||
    option === 'shower_and_bathtub' ||
    option === 'shower_bathtub_combination'
  );
}

/** Bodenfläche, die tatsächlich gefliest wird (0 bei "nur bestimmte Bereiche"). */
export function resolveFloorTileAreaM2(data: BathroomWizardData): number {
  const explicit = data.areaSummary?.floorTileAreaM2;
  if (Number.isFinite(explicit)) {
    return Math.max(0, Number(explicit));
  }
  if (data.tilingScope === 'specific_areas') {
    return 0;
  }
  const fallback = data.areaSummary?.floorAreaM2 ?? data.floorAreaM2 ?? data.bathroomSizeM2;
  return Number.isFinite(fallback) ? Math.max(0, Number(fallback)) : 0;
}

/**
 * Installationslöcher aus der gewählten Ausstattung ableiten.
 * Liefert 0, wenn der Nutzer alle Positionen explizit abgewählt hat;
 * der Default greift nur, solange Antworten offen oder unklar sind.
 */
export function deriveDrillHoleCount(
  data: BathroomWizardData,
  defaultWhenUnclear: number
): number {
  if (!isBathroomRoom(data)) {
    return 0;
  }

  let count = 0;
  if (data.sinkOption && data.sinkOption !== 'no_sink') count += 2;
  if (optionHasShower(data.showerBathOption)) count += 2;
  if (optionHasBathtub(data.showerBathOption)) count += 2;
  if (
    data.toiletOption === 'wall_hung' ||
    data.toiletOption === 'floor_standing' ||
    data.toiletOption === 'shower_toilet'
  ) {
    count += 2;
  }
  if (
    data.heatingOption === 'towel_radiator' ||
    data.heatingOption === 'floor_heating_and_towel_radiator'
  ) {
    count += 2;
  }

  if (count > 0) {
    return count;
  }

  const allExplicitlyNone =
    data.sinkOption === 'no_sink' &&
    data.showerBathOption === 'none' &&
    data.toiletOption === 'none' &&
    (data.heatingOption === 'none' || data.heatingOption === 'floor_heating');
  return allExplicitlyNone ? 0 : defaultWhenUnclear;
}

/**
 * Dichtmanschetten für Rohrdurchführungen in der Abdichtungsebene.
 * Es zählen nur Nasszonen-Durchführungen (Dusche/Wanne), nicht Waschtisch oder WC.
 */
export function deriveSealingSleeveCount(
  data: BathroomWizardData,
  defaultWhenUnclear: number
): number {
  if (!isBathroomRoom(data)) {
    return 0;
  }

  let count = 0;
  if (optionHasShower(data.showerBathOption)) count += 2;
  if (optionHasBathtub(data.showerBathOption)) count += 2;

  if (count > 0) {
    return count;
  }
  return data.showerBathOption === 'none' ? 0 : defaultWhenUnclear;
}
