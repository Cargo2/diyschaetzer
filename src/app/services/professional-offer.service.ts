import { Injectable } from '@angular/core';
import { PROFESSIONAL_OFFER_DEFAULTS as D } from '../config/professional-offer-defaults';
import {
  AssumptionValue,
  BathroomWizardData,
  defaultPreparationData,
  defaultScopeData
} from '../models/bathroom-wizard.model';
import { MaterialListViewModel } from '../models/material-list.model';
import {
  deriveDrillHoleCount,
  isBathroomRoom,
  isFloorLargeFormat,
  isWallLargeFormat,
  resolveFloorTileAreaM2
} from './wizard-data-derivations';

export type ProfessionalLineItemUnit = 'pauschal' | 'm2' | 'lfm' | 'piece' | 'hour';

export type CalculationMode = 'estimate' | 'contractor_draft' | 'contractor_offer';

export type ProfessionalLineItemSource =
  | 'default'
  | 'wizard'
  | 'assumption'
  | 'manual'
  | 'contractor';

export type ProfessionalLineItemCategory =
  | 'site_setup'
  | 'tiling'
  | 'waterproofing'
  | 'substrate_preparation'
  | 'profiles'
  | 'joints'
  | 'baseboards'
  | 'drilling'
  | 'material'
  | 'other';

export interface ProfessionalLineItem {
  id: string;
  category: ProfessionalLineItemCategory;
  label: string;
  description: string;
  quantity: number;
  unit: ProfessionalLineItemUnit;
  unitPrice: number;
  totalPrice: number;
  isActive: boolean;
  isOptional: boolean;
  source: ProfessionalLineItemSource;
  editableByContractor: boolean;
  contractorModified: boolean;
  contractorNote: string | null;
  originalQuantity: number | null;
  originalUnitPrice: number | null;
  originalTotalPrice: number | null;
  calculationNote: string;
}

export interface ProfessionalOfferResult {
  calculationMode: CalculationMode;
  lineItems: ProfessionalLineItem[];
  netTotal: number;
  vatPercent: number;
  vatAmount: number;
  grossTotal: number;
  activeLineItemCount: number;
  inactiveLineItemCount: number;
  assumptions: string[];
  warnings: string[];
}

interface ExtendedAssumptions {
  linearMeters?: {
    sealTapeLfm?: number | AssumptionValue<number>;
    siliconeJointsLfm?: number | AssumptionValue<number>;
    roomPerimeterLfm?: number;
    baseboardLfm?: number | AssumptionValue<number>;
  };
  counts?: {
    sealingCornerCount?: number | AssumptionValue<number>;
    sealingSleeveCount?: number | AssumptionValue<number>;
    drillHoleCount?: AssumptionValue<number>;
    profileCount?: number | AssumptionValue<number>;
  };
  substrate?: BathroomWizardData['assumptions']['substrate'];
  areas?: BathroomWizardData['assumptions']['areas'];
  professionalPrices?: BathroomWizardData['assumptions']['professionalPrices'];
}

@Injectable({ providedIn: 'root' })
export class ProfessionalOfferService {
  buildProfessionalOffer(
    wizardData: BathroomWizardData,
    _materialListViewModel: MaterialListViewModel
  ): ProfessionalOfferResult {
    const preparation = wizardData.preparation ?? defaultPreparationData();
    const scope = {
      ...defaultScopeData(),
      ...(wizardData.scope ?? {})
    };
    const assumptions = (wizardData.assumptions ?? {}) as ExtendedAssumptions;
    // Nur die tatsächlich zu fliesende Bodenfläche wird angeboten
    // (0 bei "nur bestimmte Bereiche").
    const floorAreaM2 = this.nonNegative(resolveFloorTileAreaM2(wizardData));
    const wallAreaM2 = this.nonNegative(wizardData.areaSummary?.totalWallTileAreaM2);
    const totalTileAreaM2 = this.positiveOrFallback(
      wizardData.areaSummary?.totalTileAreaM2,
      floorAreaM2 + wallAreaM2
    );
    const floorLargeFormat = isFloorLargeFormat(wizardData);
    const wallLargeFormat = isWallLargeFormat(wizardData);
    const isBathroom = isBathroomRoom(wizardData);
    const waterproofingRelevant = isBathroom || wizardData.room?.isOutdoor === true;
    const hasWetArea =
      isBathroom &&
      wizardData.showerBathOption !== null && wizardData.showerBathOption !== 'none';
    const hasWaterproofing =
      waterproofingRelevant &&
      preparation.waterproofing.required === 'yes' &&
      scope.includeWaterproofing;
    const lineItems: ProfessionalLineItem[] = [];
    const warnings: string[] = [];
    let estimatedLinearMeters = false;

    lineItems.push(
      this.item({
        id: 'site_setup',
        category: 'site_setup',
        label: 'Baustelle einrichten',
        description:
          'Flächen abdecken, Werkzeug und Material einbringen, Baustelle vorbereiten.',
        quantity: 1,
        unit: 'pauschal',
        unitPrice: this.professionalPrice(wizardData, 'siteSetupFlatRate', D.siteSetupFlatRate),
        source: 'default',
        calculationNote: 'Pauschalwert nach Angebotslogik.'
      })
    );

    if (floorAreaM2 > 0) {
      lineItems.push(
        this.item({
          id: 'floor_tiling',
          category: 'tiling',
          label: floorLargeFormat
            ? 'Bodenfliesen verlegen, Großformat'
            : 'Bodenfliesen verlegen',
          description:
            'Bodenfliesen auf verlegefertigem Untergrund im Dünnbett verlegen und ausfugen, ohne Fliesenmaterial.',
          quantity: floorAreaM2,
          unit: 'm2',
          unitPrice: floorLargeFormat
            ? this.professionalPrice(wizardData, 'floorTilingLargeFormatPricePerM2', D.floorTilingLargeFormatPricePerM2)
            : this.professionalPrice(wizardData, 'floorTilingStandardPricePerM2', D.floorTilingStandardPricePerM2),
          source: 'wizard',
          calculationNote: 'Zu fliesende Bodenfläche aus der Flächenberechnung.'
        })
      );
    }

    if (wallAreaM2 > 0) {
      lineItems.push(
        this.item({
          id: 'wall_tiling',
          category: 'tiling',
          label: 'Wandfliesen verlegen',
          description:
            'Wandfliesen auf verlegefertigem Untergrund verlegen und ausfugen, ohne Fliesenmaterial.',
          quantity: wallAreaM2,
          unit: 'm2',
          unitPrice: this.professionalPrice(wizardData, 'wallTilingPricePerM2', D.wallTilingPricePerM2),
          source: 'wizard',
          calculationNote: 'Netto-Wandfliesenfläche aus der Flächenberechnung.'
        })
      );
    }

    if (floorLargeFormat) {
      warnings.push('Für großformatige Bodenfliesen wurde der höhere Verlegepreis verwendet.');
    }
    if (wallLargeFormat && !floorLargeFormat) {
      warnings.push(
        'Großformatige Wandfliesen erhöhen den Verlegeaufwand; der Wandpreis enthält dafür keinen gesonderten Zuschlag.'
      );
    }

    if (
      scope.includeLevelingWork &&
      floorAreaM2 > 0 &&
      (preparation.substrate.condition === 'minor_repairs_needed' ||
        preparation.substrate.condition === 'leveling_compound_needed')
    ) {
      const usesLevelingCompound =
        preparation.substrate.condition === 'leveling_compound_needed';
      lineItems.push(
        this.item({
          id: usesLevelingCompound
            ? 'substrate_leveling_compound'
            : 'substrate_minor_repairs',
          category: 'substrate_preparation',
          label: usesLevelingCompound
            ? 'Boden ausgleichen / Ausgleichsmasse einbringen'
            : 'Kleine Spachtel- und Ausbesserungsarbeiten',
          description: usesLevelingCompound
            ? 'Bodenfläche mit geeigneter Ausgleichsmasse für die Fliesenverlegung vorbereiten.'
            : 'Kleinere Unebenheiten und Schadstellen im Untergrund fliesenfertig vorbereiten.',
          quantity: usesLevelingCompound
            ? assumptions.substrate?.levelingAreaM2.value ?? floorAreaM2
            : assumptions.substrate?.minorRepairAreaM2.value ?? floorAreaM2,
          unit: 'm2',
          unitPrice: usesLevelingCompound
            ? this.professionalPrice(wizardData, 'levelingCompoundPricePerM2', D.levelingCompoundPricePerM2)
            : this.professionalPrice(wizardData, 'substrateMinorRepairPricePerM2', D.substrateMinorRepairPricePerM2),
          source: 'wizard',
          calculationNote:
            'Fliesenrelevante Untergrundvorbereitung laut gewähltem Untergrundzustand; kein neuer Estrich oder kompletter Bodenaufbau.'
        })
      );
    }

    if (hasWaterproofing) {
      // Gemeinsame Quelle mit der DIY-Materialliste: editierbare Annahme,
      // sonst Wizard-Angabe, sonst gedeckelte Schätzung.
      const waterproofingAreaM2 = this.positiveOrFallback(
        assumptions.areas?.waterproofingAreaM2?.value ?? preparation.waterproofing.areaM2,
        Math.min(totalTileAreaM2, D.maxEstimatedWaterproofingAreaM2)
      );
      const sealTapeLfm = this.optionalNonNegative(this.assumptionNumber(assumptions.linearMeters?.sealTapeLfm));
      const sealingCornerCount = this.optionalNonNegative(this.assumptionNumber(assumptions.counts?.sealingCornerCount));
      const sealingSleeveCount = this.optionalNonNegative(this.assumptionNumber(assumptions.counts?.sealingSleeveCount));
      estimatedLinearMeters ||= sealTapeLfm === null;

      lineItems.push(
        this.item({
          id: 'waterproofing_area',
          category: 'waterproofing',
          label: 'Flächenabdichtung',
          description:
            'Flächenabdichtung Wand und Boden gegen Feuchtigkeit im Nassbereich herstellen.',
          quantity: waterproofingAreaM2,
          unit: 'm2',
          unitPrice: this.professionalPrice(wizardData, 'waterproofingPricePerM2', D.waterproofingPricePerM2),
          source:
            assumptions.areas?.waterproofingAreaM2?.source === 'user_override'
              ? 'assumption'
              : preparation.waterproofing.areaM2
                ? 'wizard'
                : 'assumption',
          calculationNote: preparation.waterproofing.areaM2
            ? 'Abdichtungsfläche aus den Wizard-Daten.'
            : `Abdichtungsfläche auf maximal ${D.maxEstimatedWaterproofingAreaM2} m² geschätzt; in den Annahmen anpassbar.`
        }),
        this.item({
          id: 'seal_tape',
          category: 'waterproofing',
          label: 'Dichtband setzen',
          description:
            'Dichtband passend zur Flächenabdichtung in Anschluss- und Eckbereichen setzen.',
          quantity: sealTapeLfm ?? D.defaultSealTapeLfm,
          unit: 'lfm',
          unitPrice: this.professionalPrice(wizardData, 'sealTapePricePerLfm', D.sealTapePricePerLfm),
          source: sealTapeLfm === null ? 'default' : 'assumption',
          calculationNote: sealTapeLfm === null
            ? 'Laufmeter als Startwert geschätzt.'
            : 'Laufmeter aus den Annahmen.'
        }),
        this.item({
          id: 'sealing_corners',
          category: 'waterproofing',
          label: 'Dichtecken setzen',
          description: 'Dichtecken passend zur Flächenabdichtung setzen.',
          quantity: sealingCornerCount ?? D.defaultSealingCornerCount,
          unit: 'piece',
          unitPrice: this.professionalPrice(wizardData, 'sealingCornerPricePerPiece', D.sealingCornerPricePerPiece),
          source: sealingCornerCount === null ? 'default' : 'assumption',
          calculationNote: 'Anzahl der abzudichtenden Ecken.'
        }),
        ...(isBathroom
          ? [
              this.item({
                id: 'sealing_sleeves',
                category: 'waterproofing',
                label: 'Dichtmanschetten setzen',
                description:
                  'Dichtmanschetten an Rohrdurchführungen passend zur Flächenabdichtung setzen.',
                quantity: sealingSleeveCount ?? D.defaultSealingSleeveCount,
                unit: 'piece',
                unitPrice: this.professionalPrice(wizardData, 'sealingSleevePricePerPiece', D.sealingSleevePricePerPiece),
                source: sealingSleeveCount === null ? 'default' : 'assumption',
                calculationNote: 'Anzahl der abzudichtenden Rohrdurchführungen.'
              })
            ]
          : [])
      );
    } else if (hasWetArea && !scope.includeWaterproofing) {
      warnings.push(
        'Abdichtung wurde ausgeschlossen, obwohl ein Nassbereich vorhanden sein kann.'
      );
    }

    const drillHoleCount = assumptions.counts?.drillHoleCount?.value
      ?? deriveDrillHoleCount(wizardData, D.defaultDrillHoleCount);
    if (drillHoleCount > 0) {
      lineItems.push(
        this.item({
          id: 'drill_holes',
          category: 'drilling',
          label: 'Installationslöcher herstellen',
          description:
            'Installationslöcher maschinell herstellen, z. B. für Rohrdurchführungen oder Anschlüsse.',
          quantity: drillHoleCount,
          unit: 'piece',
          unitPrice: this.professionalPrice(wizardData, 'drillHolePricePerPiece', D.drillHolePricePerPiece),
          source: 'wizard',
          calculationNote: 'Anzahl aus der gewählten Sanitärausstattung abgeleitet.'
        })
      );
    }

    const profileCount =
      this.optionalNonNegative(this.assumptionNumber(assumptions.counts?.profileCount)) ?? D.defaultProfileCount;
    if (profileCount > 0) {
      lineItems.push(
        this.item({
          id: 'profiles',
          category: 'profiles',
          label: 'Winkelprofile setzen',
          description:
            'Winkelprofil Edelstahl oder vergleichbares Abschlussprofil setzen.',
          quantity: profileCount,
          unit: 'piece',
          unitPrice: this.professionalPrice(wizardData, 'profilePricePerPiece', D.profilePricePerPiece),
          source: 'assumption',
          calculationNote: `Je Profil wird eine Standardlänge von ${D.profileLengthM} m angenommen.`
        })
      );
    }

    if (totalTileAreaM2 > 0) {
      const explicitSilicone = this.optionalNonNegative(
        this.assumptionNumber(assumptions.linearMeters?.siliconeJointsLfm)
      );
      const roomPerimeter = this.optionalPositive(
        assumptions.linearMeters?.roomPerimeterLfm
      );
      const wetAreaExtra = hasWetArea ? D.wetAreaSiliconeExtraLfm : 0;
      const siliconeJointLfm =
        explicitSilicone ?? (roomPerimeter ?? D.defaultSiliconeJointLfm) + wetAreaExtra;
      estimatedLinearMeters ||= explicitSilicone === null && roomPerimeter === null;

      lineItems.push(
        this.item({
          id: 'silicone_joints',
          category: 'joints',
          label: 'Silikonfugen herstellen',
          description: 'Dauerelastische Innenfugen aus Silikon herstellen.',
          quantity: siliconeJointLfm,
          unit: 'lfm',
          unitPrice: this.professionalPrice(wizardData, 'siliconeJointPricePerLfm', D.siliconeJointPricePerLfm),
          source: explicitSilicone !== null || roomPerimeter !== null ? 'assumption' : 'default',
          calculationNote: hasWetArea
            ? `Laufmeter inklusive ${D.wetAreaSiliconeExtraLfm} lfm Zuschlag für Dusche oder Badewanne.`
            : 'Laufmeter aus Annahme oder Startwert.'
        })
      );
    }

    if (scope.includeBaseboards) {
      const baseboardLfm =
        this.optionalNonNegative(this.assumptionNumber(assumptions.linearMeters?.baseboardLfm)) ??
        D.defaultBaseboardLfm;
      if (baseboardLfm > 0) {
        lineItems.push(
          this.item({
            id: 'baseboards',
            category: 'baseboards',
            label: 'Sockel setzen',
            description: 'Sockelfliesen im Dünnbett setzen und verfugen.',
            quantity: baseboardLfm,
            unit: 'lfm',
            unitPrice: this.professionalPrice(wizardData, 'baseboardPricePerLfm', D.baseboardPricePerLfm),
            source: 'assumption',
            calculationNote: 'Sockellänge aus den Annahmen.'
          })
        );
      }
    }

    if (!scope.includeTileMaterial) {
      warnings.push('Fliesenmaterial ist im Leistungsumfang ausgeschlossen.');
    }
    if (estimatedLinearMeters) {
      warnings.push(
        'Laufmeter für Dichtband, Profile oder Silikonfugen wurden geschätzt und können später angepasst werden.'
      );
    }
    if (wizardData.room?.isOutdoor) {
      warnings.push(
        'Außenbereich: Gefälle, Entwässerung, Frostbeanspruchung und der genaue Aufbau müssen fachlich geprüft werden.'
      );
    }

    const netTotal = this.round(
      lineItems
        .filter((item) => item.isActive)
        .reduce((sum, item) => sum + item.totalPrice, 0)
    );
    const vatPercent = this.professionalPrice(wizardData, 'vatPercent', D.vatPercent);
    const vatAmount = this.round(netTotal * vatPercent / 100);

    return {
      calculationMode: 'estimate',
      lineItems,
      netTotal,
      vatPercent,
      vatAmount,
      grossTotal: this.round(netTotal + vatAmount),
      activeLineItemCount: lineItems.filter((item) => item.isActive).length,
      inactiveLineItemCount: lineItems.filter((item) => !item.isActive).length,
      assumptions: [
        `Alle Einheitspreise stammen aus zentralen Startwerten und verstehen sich netto.`,
        `Mehrwertsteuer: ${vatPercent} %`,
        `Großformat Boden: ab 120 cm Kantenlänge`
      ],
      warnings: [...new Set(warnings)]
    };
  }

  private item(
    values: Omit<
      ProfessionalLineItem,
      | 'totalPrice'
      | 'isActive'
      | 'isOptional'
      | 'editableByContractor'
      | 'contractorModified'
      | 'contractorNote'
      | 'originalQuantity'
      | 'originalUnitPrice'
      | 'originalTotalPrice'
    > &
      Partial<Pick<ProfessionalLineItem, 'isActive' | 'isOptional'>>
  ): ProfessionalLineItem {
    const quantity = this.round(this.nonNegative(values.quantity), 2);
    const unitPrice = this.round(this.nonNegative(values.unitPrice));
    const totalPrice = this.round(quantity * unitPrice);
    return {
      ...values,
      quantity,
      unitPrice,
      totalPrice,
      isActive: values.isActive ?? true,
      isOptional: values.isOptional ?? false,
      editableByContractor: true,
      contractorModified: false,
      contractorNote: null,
      originalQuantity: quantity,
      originalUnitPrice: unitPrice,
      originalTotalPrice: totalPrice
    };
  }

  private optionalPositive(value: number | null | undefined): number | null {
    return Number.isFinite(value) && Number(value) > 0 ? Number(value) : null;
  }

  private optionalNonNegative(value: number | null | undefined): number | null {
    return Number.isFinite(value) && Number(value) >= 0 ? Number(value) : null;
  }

  private assumptionNumber(value: number | AssumptionValue<number> | undefined): number | undefined {
    return typeof value === 'number' ? value : value?.value;
  }

  private professionalPrice(
    data: BathroomWizardData,
    key: keyof BathroomWizardData['assumptions']['professionalPrices'],
    fallback: number
  ): number {
    return data.assumptions?.professionalPrices?.[key]?.value ?? fallback;
  }

  private positiveOrFallback(
    value: number | null | undefined,
    fallback: number | null | undefined
  ): number {
    const positive = this.optionalPositive(value);
    return positive ?? this.nonNegative(fallback);
  }

  private nonNegative(value: number | null | undefined): number {
    return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
  }

  private round(value: number, digits = 2): number {
    return Number(value.toFixed(digits));
  }
}
