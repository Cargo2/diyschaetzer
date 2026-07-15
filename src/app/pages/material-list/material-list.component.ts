import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResolvedOffer } from '../../models/affiliate.model';
import { ExportDocumentData } from '../../models/export-document.model';
import { AffiliateService } from '../../services/affiliate.service';
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { MaterialListService } from '../../services/material-list.service';
import { MaterialListStateService } from '../../services/material-list-state.service';
import { WizardStateService } from '../../services/wizard-state.service';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Deutsche Anzeigetexte je Artikeltyp. Bleibt bewusst deutsch (Deutsch-als-
 * Schlüssel) – die Übersetzung passiert erst beim Rendern über `articleTypeLabel()`.
 * Exportiert, damit `dynamic-keys/material.ts` die Werte per `Object.values()`
 * für die Coverage-Spec registrieren kann (dynamische, nicht literal greifbare Nutzung).
 */
export const ARTICLE_TYPE_LABELS: Record<string, string> = {
  main_material: 'Hauptmaterial',
  consumable: 'Verbrauchsmaterial',
  tool: 'Werkzeug',
  psa: 'Schutzausrüstung',
  accessory: 'Zubehör',
  waste_disposal: 'Entsorgung'
};

/** Deutsche Anzeigetexte je Bedarfsstufe, analog zu {@link ARTICLE_TYPE_LABELS}. */
export const REQUIREMENT_LABELS: Record<string, string> = {
  required: 'Erforderlich',
  conditional: 'Bedingt erforderlich',
  recommended: 'Empfohlen',
  optional: 'Optional'
};

@Component({
  selector: 'app-material-list',
  standalone: true,
  imports: [CommonModule, RouterLink, PremiumExportButtonComponent, TranslatePipe],
  templateUrl: './material-list.component.html',
  styleUrl: './material-list.component.css'
})
export class MaterialListComponent {
  private readonly wizardState = inject(WizardStateService);
  private readonly materialListService = inject(MaterialListService);
  private readonly materialListState = inject(MaterialListStateService);
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly affiliate = inject(AffiliateService);
  private readonly i18n = inject(I18nService);
  private readonly openSectionIds = signal<Set<string>>(new Set(['tile-calculation']));

  readonly wizardCompleted = this.wizardState.resultsAvailable;
  readonly payload = this.wizardState.payload;
  readonly userState = this.materialListState.state;
  readonly materialList = computed(() =>
    this.materialListService.buildMaterialList(this.payload(), this.userState())
  );

  // Als gebundene Methode an den Export-Button übergeben; wird erst beim Klick
  // ausgewertet und nutzt damit immer den aktuellen Materiallisten-Stand.
  readonly buildExportDocument = (): ExportDocumentData =>
    this.exportMapper.buildMaterialListExportData(this.payload(), this.materialList());

  toggleOptionalMaterials(): void {
    this.materialListState.setIncludeOptionalMaterials(!this.userState().includeOptionalMaterials);
  }

  excludeMaterial(materialId: string): void {
    this.materialListState.excludeMaterial(materialId);
  }

  includeMaterial(materialId: string, isOptional: boolean): void {
    if (isOptional && !this.userState().includeOptionalMaterials) {
      this.materialListState.setIncludeOptionalMaterials(true);
    }
    this.materialListState.includeMaterial(materialId);
  }

  resetMaterialOverrides(): void {
    this.materialListState.resetMaterialOverrides();
  }

  /**
   * Anzeigefertige Shop-Angebote für ein Material. Leer, wenn Affiliate global
   * oder für alle hinterlegten Shops deaktiviert ist (gelesen über Signals →
   * reaktiv). Nur Shops, die für das Produkt hinterlegt sind, erscheinen.
   */
  offersFor(materialId: string): ResolvedOffer[] {
    return this.affiliate.getOffersForMaterial(materialId);
  }

  toggleSection(sectionId: string): void {
    this.openSectionIds.update((current) => {
      const next = new Set(current);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  }

  isSectionOpen(sectionId: string): boolean {
    return this.openSectionIds().has(sectionId);
  }

  formatNumber(value: number | null, digits = 2): string {
    if (value === null || !Number.isFinite(value)) {
      return '–';
    }

    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }

  formatCurrency(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return this.i18n.t('Noch kein Preis');
    }

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  articleTypeLabel(value: string): string {
    return this.i18n.t(ARTICLE_TYPE_LABELS[value] ?? value);
  }

  requirementLabel(value: string): string {
    return this.i18n.t(REQUIREMENT_LABELS[value] ?? value);
  }

  /** Aria-Label für den „Entfernen"-Button je Materialposition (Name + Aktion). */
  removeAriaLabel(name: string): string {
    return `${name} ${this.i18n.t('aus Materialliste entfernen')}`;
  }

  /** Aria-Label für den „Hinzufügen"-Button je Materialposition (Name + Aktion). */
  addAriaLabel(name: string): string {
    return `${name} ${this.i18n.t('zur Materialliste hinzufügen')}`;
  }

  /** Aria-Label für einen Shop-Chip-Link (Anzeige, öffnet neuen Tab). */
  shopAriaLabel(displayName: string): string {
    return `${this.i18n.t('Bei')} ${displayName} ${this.i18n.t('ansehen (Anzeige, öffnet neuen Tab)')}`;
  }

  /** Title-Attribut für einen Shop-Chip-Link. */
  shopTitle(displayName: string): string {
    return `${this.i18n.t('Bei')} ${displayName} ${this.i18n.t('ansehen')}`;
  }
}
