import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialListService } from '../../services/material-list.service';
import { MaterialListStateService } from '../../services/material-list-state.service';
import { WizardStateService } from '../../services/wizard-state.service';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';

@Component({
  selector: 'app-material-list',
  standalone: true,
  imports: [CommonModule, RouterLink, PremiumExportButtonComponent],
  templateUrl: './material-list.component.html',
  styleUrl: './material-list.component.css'
})
export class MaterialListComponent {
  private readonly wizardState = inject(WizardStateService);
  private readonly materialListService = inject(MaterialListService);
  private readonly materialListState = inject(MaterialListStateService);
  private readonly openSectionIds = signal<Set<string>>(new Set(['tile-calculation']));

  readonly wizardCompleted = this.wizardState.resultsAvailable;
  readonly payload = this.wizardState.payload;
  readonly userState = this.materialListState.state;
  readonly materialList = computed(() =>
    this.materialListService.buildMaterialList(this.payload(), this.userState())
  );

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
      return 'Noch kein Preis';
    }

    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  articleTypeLabel(value: string): string {
    return {
      main_material: 'Hauptmaterial',
      consumable: 'Verbrauchsmaterial',
      tool: 'Werkzeug',
      psa: 'Schutzausrüstung',
      accessory: 'Zubehör',
      waste_disposal: 'Entsorgung'
    }[value] ?? value;
  }

  requirementLabel(value: string): string {
    return {
      required: 'Erforderlich',
      conditional: 'Bedingt erforderlich',
      recommended: 'Empfohlen',
      optional: 'Optional'
    }[value] ?? value;
  }
}
