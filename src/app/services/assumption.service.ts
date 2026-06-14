import { Injectable } from '@angular/core';
import { PROFESSIONAL_OFFER_DEFAULTS as P } from '../config/professional-offer-defaults';
import { MATERIAL_CALCULATION_DEFAULTS as M } from '../data/material-calculation-defaults';
import {
  AssumptionSource,
  AssumptionValue,
  BathroomWizardData,
  RoomCalculationAssumptions,
  tilePriceDefaults
} from '../models/bathroom-wizard.model';
import {
  deriveDrillHoleCount,
  deriveSealingSleeveCount,
  isBathroomRoom,
  resolveFloorTileAreaM2
} from './wizard-data-derivations';

type NumericAssumption = AssumptionValue<number>;

@Injectable({ providedIn: 'root' })
export class AssumptionService {
  createDefaultAssumptions(data: BathroomWizardData): RoomCalculationAssumptions {
    const bathroom = isBathroomRoom(data);
    const waterproofing =
      data.scope?.includeWaterproofing === true &&
      data.preparation?.waterproofing?.required === 'yes';
    const floorArea = this.area(data);
    const floorTileArea = resolveFloorTileAreaM2(data);
    const totalTileArea = this.totalTileArea(data);
    const perimeter = this.round(4 * Math.sqrt(floorArea));
    const leveling =
      data.scope?.includeLevelingWork === true &&
      floorTileArea > 0 &&
      data.preparation?.substrate?.condition === 'leveling_compound_needed';
    const repairs =
      data.scope?.includeLevelingWork === true &&
      floorTileArea > 0 &&
      data.preparation?.substrate?.condition === 'minor_repairs_needed';
    const walls = (data.areaSummary?.totalWallTileAreaM2 ?? 0) > 0;
    const baseboards = data.scope?.includeBaseboards === true;
    const profiles = walls;
    const hasWetFixture =
      bathroom && data.showerBathOption !== null && data.showerBathOption !== 'none';

    const value = (
      amount: number,
      label: string,
      unit: string,
      relevant = true,
      source: AssumptionSource = 'calculated',
      description: string | null = null
    ): NumericAssumption => ({
      value: this.round(Math.max(0, amount)),
      source: relevant ? source : 'not_relevant',
      label,
      description,
      unit,
      editable: relevant,
      relevant,
      updatedAt: null
    });

    const price = (amount: number, label: string, relevant = true, unit = 'EUR') =>
      value(amount, label, unit, relevant, 'default');

    const drillHoles = deriveDrillHoleCount(data, P.defaultDrillHoleCount);
    const sealingSleeves = deriveSealingSleeveCount(data, P.defaultSealingSleeveCount);
    const wizardWaterproofingArea = data.preparation?.waterproofing?.areaM2;

    return {
      wastePercent: value(
        // Defaults stammen ausschließlich aus den Wizard-Daten; manuelle
        // Änderungen überleben über mergeGroup (user_override).
        data.assumptions?.tile?.wasteFactorPercent ?? M.tileWastePercent,
        'Verschnitt',
        '%',
        true,
        'default',
        'Reserve fuer Zuschnitt, Bruch und spaetere Reparaturen.'
      ),
      materialPrices: {
        tilePricePerM2: value(
          data.assumptions?.tile?.pricePerM2 ??
            tilePriceDefaults[data.tileQuality ?? 'unknown'],
          'Fliesen-Richtwert',
          '€/m²',
          true,
          'wizard',
          'Materialpreis je Quadratmeter, abgeleitet aus der Fliesenqualitaet.'
        )
      },
      linearMeters: {
        sealTapeLfm: value(waterproofing ? perimeter : 0, 'Dichtband', 'lfm', waterproofing),
        siliconeJointsLfm: value(
          perimeter + (hasWetFixture ? P.wetAreaSiliconeExtraLfm : 0),
          'Silikonfugen',
          'lfm',
          totalTileArea > 0
        ),
        baseboardLfm: value(baseboards ? perimeter : 0, 'Sockel', 'lfm', baseboards),
        profileLfm: value(profiles ? 2.5 : 0, 'Profile', 'lfm', profiles)
      },
      counts: {
        sealingCornerCount: value(waterproofing ? 4 : 0, 'Dichtecken', 'Stueck', waterproofing),
        sealingSleeveCount: value(
          waterproofing ? sealingSleeves : 0,
          'Dichtmanschetten',
          'Stueck',
          waterproofing && bathroom
        ),
        drillHoleCount: value(drillHoles, 'Installationsloecher', 'Stueck', bathroom, 'wizard'),
        profileCount: value(profiles ? 1 : 0, 'Profile / Abschlussprofile', 'Stueck', profiles)
      },
      substrate: {
        levelingThicknessMm: value(
          leveling ? M.defaultLevelingThicknessMm : 0,
          'Ausgleichsdicke',
          'mm',
          leveling
        ),
        levelingAreaM2: value(leveling ? floorTileArea : 0, 'Ausgleichsflaeche', 'm2', leveling),
        minorRepairAreaM2: value(repairs ? floorTileArea : 0, 'Kleine Ausbesserungen', 'm2', repairs)
      },
      areas: {
        waterproofingAreaM2: value(
          waterproofing
            ? wizardWaterproofingArea ??
              Math.min(totalTileArea, P.maxEstimatedWaterproofingAreaM2)
            : 0,
          'Abdichtungsflaeche',
          'm2',
          waterproofing,
          wizardWaterproofingArea != null ? 'wizard' : 'calculated',
          'Gemeinsame Basis fuer DIY-Material und Profi-Position Flaechenabdichtung.'
        )
      },
      professionalPrices: {
        siteSetupFlatRate: price(P.siteSetupFlatRate, 'Baustelle einrichten'),
        floorTilingStandardPricePerM2: price(P.floorTilingStandardPricePerM2, 'Bodenfliesen Standard', floorTileArea > 0, 'EUR/m2'),
        floorTilingLargeFormatPricePerM2: price(P.floorTilingLargeFormatPricePerM2, 'Bodenfliesen Grossformat', floorTileArea > 0, 'EUR/m2'),
        wallTilingPricePerM2: price(P.wallTilingPricePerM2, 'Wandfliesen verlegen', walls, 'EUR/m2'),
        waterproofingPricePerM2: price(P.waterproofingPricePerM2, 'Flaechenabdichtung', waterproofing, 'EUR/m2'),
        sealTapePricePerLfm: price(P.sealTapePricePerLfm, 'Dichtband setzen', waterproofing, 'EUR/lfm'),
        sealingCornerPricePerPiece: price(P.sealingCornerPricePerPiece, 'Dichtecken setzen', waterproofing, 'EUR/Stueck'),
        sealingSleevePricePerPiece: price(P.sealingSleevePricePerPiece, 'Dichtmanschetten setzen', waterproofing && bathroom, 'EUR/Stueck'),
        drillHolePricePerPiece: price(P.drillHolePricePerPiece, 'Installationsloecher herstellen', bathroom, 'EUR/Stueck'),
        substrateMinorRepairPricePerM2: price(P.substrateMinorRepairPricePerM2, 'Kleine Spachtelarbeiten', repairs, 'EUR/m2'),
        levelingCompoundPricePerM2: price(P.levelingCompoundPricePerM2, 'Ausgleichsmasse einbringen', leveling, 'EUR/m2'),
        profilePricePerPiece: price(P.profilePricePerPiece, 'Profile setzen', profiles, 'EUR/Stueck'),
        siliconeJointPricePerLfm: price(P.siliconeJointPricePerLfm, 'Silikonfugen herstellen', totalTileArea > 0, 'EUR/lfm'),
        baseboardPricePerLfm: price(P.baseboardPricePerLfm, 'Sockel setzen', baseboards, 'EUR/lfm'),
        vatPercent: price(P.vatPercent, 'MwSt.', true, '%')
      }
    };
  }

  normalizeAssumptions(data: BathroomWizardData): RoomCalculationAssumptions {
    const defaults = this.createDefaultAssumptions(data);
    const current = data.assumptions as Partial<RoomCalculationAssumptions> | undefined;
    return this.mergeGroup(defaults, current);
  }

  updateAssumption<T>(data: BathroomWizardData, path: string, rawValue: T): BathroomWizardData {
    const assumptions = this.normalizeAssumptions(data);
    const target = this.get(assumptions, path);
    if (!target?.relevant || !target.editable) return data;
    const value = typeof target.value === 'number' ? Number(rawValue) : rawValue;
    if (typeof value === 'number' && !Number.isFinite(value)) return data;
    const next = structuredClone(assumptions);
    const nextTarget = this.get(next, path);
    nextTarget.value = this.clamp(data, path, value as number);
    nextTarget.source = 'user_override';
    nextTarget.updatedAt = new Date().toISOString();
    return { ...data, assumptions: { ...data.assumptions, ...next } };
  }

  resetAssumption(data: BathroomWizardData, path: string): BathroomWizardData {
    const defaults = this.createDefaultAssumptions(data);
    const current = this.normalizeAssumptions(data);
    const replacement = this.get(defaults, path);
    if (!replacement) return data;
    const next = structuredClone(current);
    Object.assign(this.get(next, path), replacement);
    return { ...data, assumptions: { ...data.assumptions, ...next } };
  }

  resetAll(data: BathroomWizardData): BathroomWizardData {
    return {
      ...data,
      assumptions: { ...data.assumptions, ...this.createDefaultAssumptions(data) }
    };
  }

  markNotRelevantAssumptions(data: BathroomWizardData): BathroomWizardData {
    const normalized = this.normalizeAssumptions(data);
    return { ...data, assumptions: { ...data.assumptions, ...normalized } };
  }

  /**
   * Frische Defaults bilden die Basis; nur manuelle Änderungen (user_override)
   * und Legacy-Zahlenwerte überleben. Berechnete Werte folgen damit immer den
   * aktuellen Wizard-Eingaben (Fläche, Qualität, Nassbereich).
   */
  private mergeGroup<T extends object>(defaults: T, current: unknown): T {
    const result = structuredClone(defaults) as Record<string, unknown>;
    if (!current || typeof current !== 'object') return result as T;
    for (const [key, defaultValue] of Object.entries(result)) {
      const oldValue = (current as Record<string, unknown>)[key];
      if (this.isAssumption(defaultValue)) {
        if (!defaultValue.relevant) {
          continue;
        }
        if (this.isAssumption(oldValue) && oldValue.source === 'user_override') {
          result[key] = {
            ...defaultValue,
            value: oldValue.value,
            source: 'user_override',
            updatedAt: oldValue.updatedAt ?? null,
            relevant: true,
            editable: true
          };
        } else if (typeof oldValue === 'number') {
          result[key] = { ...defaultValue, value: oldValue };
        }
      } else {
        result[key] = this.mergeGroup(defaultValue as object, oldValue);
      }
    }
    return result as T;
  }

  private isAssumption(value: unknown): value is NumericAssumption {
    return !!value && typeof value === 'object' && 'value' in value && 'source' in value;
  }

  private get(root: object, path: string): NumericAssumption {
    return path.split('.').reduce((value: any, key) => value?.[key], root as any);
  }

  private clamp(data: BathroomWizardData, path: string, value: number): number {
    const max = path === 'wastePercent' || path.endsWith('vatPercent')
      ? 30
      : path === 'materialPrices.tilePricePerM2'
        ? 500
      : path === 'areas.waterproofingAreaM2'
        ? Math.max(this.totalTileArea(data), P.maxEstimatedWaterproofingAreaM2)
      : path.endsWith('levelingThicknessMm')
        ? 50
        : path.endsWith('AreaM2')
          ? this.area(data)
        : path.startsWith('professionalPrices.')
          ? 9999
          : 999;
    return this.round(Math.min(max, Math.max(0, value)));
  }

  private area(data: BathroomWizardData): number {
    return Math.max(0, data.areaSummary?.floorAreaM2 ?? data.floorAreaM2 ?? data.bathroomSizeM2 ?? 0);
  }

  private totalTileArea(data: BathroomWizardData): number {
    const total = data.areaSummary?.totalTileAreaM2;
    return Number.isFinite(total) ? Math.max(0, Number(total)) : this.area(data);
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
