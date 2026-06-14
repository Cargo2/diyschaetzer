import { Injectable } from '@angular/core';
import { PROFESSIONAL_OFFER_DEFAULTS as P } from '../config/professional-offer-defaults';
import { MATERIAL_CALCULATION_DEFAULTS as D } from '../data/material-calculation-defaults';
import { MaterialCatalogItem } from '../data/material-catalog-with-prices';
import { BathroomWizardData } from '../models/bathroom-wizard.model';
import {
  MaterialQuantityResult,
  TileCalculationResult
} from '../models/material-list.model';
import { resolveFloorTileAreaM2 } from './wizard-data-derivations';

/** Richtwert: ein Gebinde generischer Flächen-Verbrauchsmaterialien je angefangene 20 m². */
const GENERIC_PACKAGE_COVERAGE_M2 = 20;

@Injectable({ providedIn: 'root' })
export class MaterialQuantityService {
  calculateQuantity(
    material: MaterialCatalogItem,
    wizardData: BathroomWizardData,
    tileResult: TileCalculationResult
  ): MaterialQuantityResult {
    const price = material.price.amount;
    const source = material.price.sourceUrl ?? material.price.retailer;

    switch (material.id) {
      case 'tiles_main':
        return this.result(
          material,
          tileResult.tileAreaWithWasteM2,
          'm²',
          null,
          null,
          null,
          price === null ? null : tileResult.tileAreaWithWasteM2 * this.tilePrice(wizardData, price),
          `${tileResult.baseTileAreaM2.toFixed(2)} m² plus ${tileResult.wasteFactorPercent.toFixed(0)} % Verschnitt.`,
          source
        );
      case 'flexible_tile_adhesive': {
        // Verklebt wird nur die Nettofläche; Verschnitt landet im Container.
        const kg =
          tileResult.floor.areaM2 * (tileResult.floor.isLargeFormat ? D.adhesiveKgPerM2LargeFormat : D.adhesiveKgPerM2) +
          tileResult.wall.areaM2 * (tileResult.wall.isLargeFormat ? D.adhesiveKgPerM2LargeFormat : D.adhesiveKgPerM2);
        return this.packaged(material, kg, 'kg', D.adhesivePackageKg, '25-kg-Sack', price, `${D.adhesiveKgPerM2}-${D.adhesiveKgPerM2LargeFormat} kg/m² Nettofläche je nach Format.`, source);
      }
      case 'cement_grout': {
        const kg =
          tileResult.floor.areaM2 * (tileResult.floor.isLargeFormat ? D.groutKgPerM2LargeFormat : D.groutKgPerM2) +
          tileResult.wall.areaM2 * (tileResult.wall.isLargeFormat ? D.groutKgPerM2LargeFormat : D.groutKgPerM2);
        return this.packaged(material, kg, 'kg', D.groutPackageKg, '5-kg-Sack', price, 'Richtwert je Format auf die Nettofläche.', source);
      }
      case 'primer': {
        const liters = tileResult.baseTileAreaM2 * D.primerLiterPerM2;
        return this.packaged(material, liters, 'l', D.primerPackageLiter, '5-l-Gebinde', price, `${D.primerLiterPerM2} l/m² zu fliesende Fläche.`, source);
      }
      case 'leveling_compound': {
        const floorArea = wizardData.assumptions?.substrate?.levelingAreaM2?.value
          ?? resolveFloorTileAreaM2(wizardData);
        const thickness = wizardData.assumptions?.substrate?.levelingThicknessMm?.value
          ?? D.defaultLevelingThicknessMm;
        const kg = floorArea * D.levelingKgPerM2PerMm * thickness;
        return this.packaged(material, kg, 'kg', D.levelingPackageKg, '25-kg-Sack', price, `${D.levelingKgPerM2PerMm} kg/m² je mm bei ${thickness} mm Schichtdicke.`, source);
      }
      case 'repair_mortar':
        return this.result(material, 1, 'Gebinde', 1, 'Gebinde', 1, price, 'Pauschal ein Gebinde für kleinere Ausbesserungen.', source);
      case 'waterproofing_membrane': {
        const area = this.waterproofingArea(wizardData, tileResult);
        const kg = area * D.waterproofingKgPerM2;
        return this.packaged(material, kg, 'kg', D.waterproofingPackageKg, '5-kg-Gebinde', price, `${D.waterproofingKgPerM2} kg/m² auf ${area.toFixed(2)} m² Abdichtungsfläche.`, source);
      }
      case 'sealing_tape':
        return this.result(material, wizardData.assumptions?.linearMeters?.sealTapeLfm?.value ?? D.defaultSealingTapeMeters, 'm', 1, '10-m-Rolle', null, price, 'Laufmeter aus den Berechnungsannahmen.', source);
      case 'pipe_sealing_manschettes': {
        const count = wizardData.assumptions?.counts?.sealingSleeveCount?.value ?? D.defaultSealingManschettes;
        return this.result(material, count, 'Stück', count, 'Stück', 1, price === null ? null : price * count, 'Stückzahl aus den Berechnungsannahmen.', source);
      }
      case 'sealing_corners': {
        const count = wizardData.assumptions?.counts?.sealingCornerCount?.value ?? 4;
        return this.result(material, count, 'Stück', count, 'Stück', 1, price === null ? null : price * count, 'Stückzahl aus den Berechnungsannahmen.', source);
      }
      case 'sanitary_silicone': {
        const lfm = wizardData.assumptions?.linearMeters?.siliconeJointsLfm?.value;
        const cartridges = lfm === undefined
          ? D.defaultSiliconeCartridges
          : Math.max(1, Math.ceil(lfm / D.siliconeMetersPerCartridge));
        return this.result(material, cartridges, 'Kartuschen', cartridges, 'Kartusche', 1, price === null ? null : price * cartridges, `Eine Kartusche je angefangene ${D.siliconeMetersPerCartridge} lfm.`, source);
      }
      case 'leveling_system': {
        const clips = Math.ceil(tileResult.baseTileAreaM2 * D.levelingClipsPerM2);
        const packages = Math.max(1, Math.ceil(clips / D.levelingClipsPerPackage));
        return this.result(material, clips, 'Clips', packages, 'Starterset', D.levelingClipsPerPackage, price === null ? null : packages * price, `${D.levelingClipsPerM2} Clips/m²; empfohlen bei Großformat.`, source);
      }
      default:
        return this.calculateGeneric(material, tileResult, price, source);
    }
  }

  private calculateGeneric(
    material: MaterialCatalogItem,
    tileResult: TileCalculationResult,
    price: number | null,
    source: string | null
  ): MaterialQuantityResult {
    if (material.articleType === 'tool' || material.articleType === 'psa') {
      const rentalNote = material.notes.toLocaleLowerCase('de').includes('miete')
        ? ' Kaufpreis; Miete kann wirtschaftlicher sein.'
        : '';
      return this.result(material, 1, material.unit || 'Stück', 1, material.unit || 'Stück', null, price, `Einmalige Ausstattung.${rentalNote}`, source);
    }

    if (
      material.calculation.type === 'per_m2' ||
      material.calculation.type === 'per_tile_area_m2' ||
      material.calculation.type === 'per_work_area'
    ) {
      // Ohne Produkt-Reichweite wird grob ein Gebinde je angefangene 20 m² angesetzt,
      // statt unabhängig von der Fläche nur einen Gebindepreis auszuweisen.
      const packages = Math.max(1, Math.ceil(tileResult.baseTileAreaM2 / GENERIC_PACKAGE_COVERAGE_M2));
      return this.result(
        material,
        tileResult.baseTileAreaM2,
        material.unit,
        packages,
        'Gebinde',
        null,
        price === null ? null : packages * price,
        material.calculation.defaultConsumption ??
          `Richtwert: ein Gebinde je angefangene ${GENERIC_PACKAGE_COVERAGE_M2} m²; Reichweite des Produkts prüfen.`,
        source
      );
    }

    return this.result(material, 1, material.unit || 'Stück', 1, material.unit || 'Stück', null, price, material.calculation.defaultConsumption ?? 'Pauschale Grundausstattung; Bedarf vor dem Einkauf prüfen.', source);
  }

  private waterproofingArea(
    wizardData: BathroomWizardData,
    tileResult: TileCalculationResult
  ): number {
    // Gemeinsame Quelle mit dem Profi-Angebot: editierbare Annahme,
    // sonst Wizard-Angabe, sonst gedeckelte Schätzung.
    return (
      wizardData.assumptions?.areas?.waterproofingAreaM2?.value ??
      wizardData.preparation?.waterproofing?.areaM2 ??
      Math.min(tileResult.baseTileAreaM2, P.maxEstimatedWaterproofingAreaM2)
    );
  }

  private packaged(
    material: MaterialCatalogItem,
    quantity: number,
    unit: string,
    packageSize: number,
    packageUnit: string,
    price: number | null,
    note: string,
    source: string | null
  ): MaterialQuantityResult {
    const packageCount = Math.ceil(quantity / packageSize);
    return this.result(material, quantity, unit, packageCount, packageUnit, packageSize, price === null ? null : packageCount * price, note, source);
  }

  private result(
    material: MaterialCatalogItem,
    quantity: number | null,
    unit: string | null,
    packageCount: number | null,
    packageUnit: string | null,
    packageSize: number | null,
    estimatedCost: number | null,
    calculationNote: string,
    priceSource: string | null
  ): MaterialQuantityResult {
    return {
      materialId: material.id,
      quantity: quantity === null ? null : this.round(quantity),
      unit,
      packageCount,
      packageUnit,
      packageSize,
      estimatedCost: estimatedCost === null ? null : this.round(estimatedCost),
      calculationNote,
      priceSource
    };
  }

  private tilePrice(data: BathroomWizardData, fallback: number): number {
    const value = data.assumptions?.materialPrices?.tilePricePerM2?.value
      ?? data.assumptions?.tile?.pricePerM2;
    return Number.isFinite(value) ? Math.max(0, Number(value)) : fallback;
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }
}
