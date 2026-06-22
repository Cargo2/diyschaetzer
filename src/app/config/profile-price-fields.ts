/**
 * Im Profi-Profil hinterlegbare Standard-Preise (Phase 13). Jeder Eintrag
 * verweist per `path` auf das entsprechende Feld in `RoomCalculationAssumptions`
 * – derselbe Pfad ist auch der Speicherschlüssel in `ProfileAssumptionDefaults`.
 *
 * Diese Liste ist die **einzige Quelle** für: UI-Formular, Overlay im
 * AssumptionService und die persistierten Schlüssel. Bewusst beschränkt auf die
 * Preis-Annahmen (Profi-Einheitspreise + Fliesen-Richtwert).
 */
import { PROFESSIONAL_OFFER_DEFAULTS as P } from './professional-offer-defaults';
import { tilePriceDefaults } from '../models/bathroom-wizard.model';

export interface ProfilePriceField {
  /** Pfad in RoomCalculationAssumptions = Speicherschlüssel. */
  path: string;
  label: string;
  unit: string;
  /** System-Standard (Platzhalter, falls der Profi keinen eigenen Wert setzt). */
  systemDefault: number;
}

export const PROFILE_PRICE_FIELDS: readonly ProfilePriceField[] = [
  { path: 'materialPrices.tilePricePerM2', label: 'Fliesen-Richtwert', unit: '€/m²', systemDefault: tilePriceDefaults.unknown },
  { path: 'professionalPrices.siteSetupFlatRate', label: 'Baustelle einrichten', unit: 'EUR', systemDefault: P.siteSetupFlatRate },
  { path: 'professionalPrices.floorTilingStandardPricePerM2', label: 'Bodenfliesen Standard', unit: 'EUR/m²', systemDefault: P.floorTilingStandardPricePerM2 },
  { path: 'professionalPrices.floorTilingLargeFormatPricePerM2', label: 'Bodenfliesen Großformat', unit: 'EUR/m²', systemDefault: P.floorTilingLargeFormatPricePerM2 },
  { path: 'professionalPrices.wallTilingPricePerM2', label: 'Wandfliesen verlegen', unit: 'EUR/m²', systemDefault: P.wallTilingPricePerM2 },
  { path: 'professionalPrices.waterproofingPricePerM2', label: 'Flächenabdichtung', unit: 'EUR/m²', systemDefault: P.waterproofingPricePerM2 },
  { path: 'professionalPrices.sealTapePricePerLfm', label: 'Dichtband setzen', unit: 'EUR/lfm', systemDefault: P.sealTapePricePerLfm },
  { path: 'professionalPrices.sealingCornerPricePerPiece', label: 'Dichtecken setzen', unit: 'EUR/Stück', systemDefault: P.sealingCornerPricePerPiece },
  { path: 'professionalPrices.sealingSleevePricePerPiece', label: 'Dichtmanschetten setzen', unit: 'EUR/Stück', systemDefault: P.sealingSleevePricePerPiece },
  { path: 'professionalPrices.drillHolePricePerPiece', label: 'Installationslöcher herstellen', unit: 'EUR/Stück', systemDefault: P.drillHolePricePerPiece },
  { path: 'professionalPrices.substrateMinorRepairPricePerM2', label: 'Kleine Spachtelarbeiten', unit: 'EUR/m²', systemDefault: P.substrateMinorRepairPricePerM2 },
  { path: 'professionalPrices.levelingCompoundPricePerM2', label: 'Ausgleichsmasse einbringen', unit: 'EUR/m²', systemDefault: P.levelingCompoundPricePerM2 },
  { path: 'professionalPrices.profilePricePerPiece', label: 'Profile setzen', unit: 'EUR/Stück', systemDefault: P.profilePricePerPiece },
  { path: 'professionalPrices.siliconeJointPricePerLfm', label: 'Silikonfugen herstellen', unit: 'EUR/lfm', systemDefault: P.siliconeJointPricePerLfm },
  { path: 'professionalPrices.baseboardPricePerLfm', label: 'Sockel setzen', unit: 'EUR/lfm', systemDefault: P.baseboardPricePerLfm },
  { path: 'professionalPrices.vatPercent', label: 'MwSt.', unit: '%', systemDefault: P.vatPercent }
];

/** Nur die Pfade/Speicherschlüssel der bearbeitbaren Profil-Defaults. */
export const PROFILE_PRICE_FIELD_PATHS: readonly string[] = PROFILE_PRICE_FIELDS.map(
  (field) => field.path
);

/**
 * Persistierte Profil-Standardannahmen: partielle Map `assumption-pfad -> wert`.
 * Fehlt ein Schlüssel, gilt der System-Default.
 */
export type ProfileAssumptionDefaults = Partial<Record<string, number>>;
