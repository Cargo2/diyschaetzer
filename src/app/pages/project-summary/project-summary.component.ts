import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ROOM_TYPE_DEFAULT_NAMES,
  RoomType
} from '../../models/bathroom-wizard.model';
import { ResolvedOffer } from '../../models/affiliate.model';
import { ExportDocumentData } from '../../models/export-document.model';
import { AffiliateService } from '../../services/affiliate.service';
import { AuthService } from '../../services/auth.service';
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { LocalProjectService } from '../../services/local-project.service';
import { MaterialListStateService } from '../../services/material-list-state.service';
import { ProjectAggregationService } from '../../services/project-aggregation.service';
import { RoomLimitService } from '../../services/room-limit.service';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-project-summary',
  standalone: true,
  imports: [CommonModule, PremiumExportButtonComponent, TranslatePipe],
  templateUrl: './project-summary.component.html',
  styleUrl: './project-summary.component.css'
})
export class ProjectSummaryComponent implements OnInit {
  private readonly localProject = inject(LocalProjectService);
  private readonly aggregationService = inject(ProjectAggregationService);
  private readonly materialListState = inject(MaterialListStateService);
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly affiliate = inject(AffiliateService);
  private readonly router = inject(Router);
  private readonly roomLimit = inject(RoomLimitService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  /** Bei eingeloggtem Profi DIY-Kosten und Ersparnis ausblenden (Anzeige, keine Berechnung). */
  readonly isContractor = this.auth.isContractor;

  readonly roomLimitReached = this.roomLimit.limitReached;
  readonly roomLimitHint = this.roomLimit.hint;
  readonly rooms = this.localProject.rooms;
  readonly result = computed(() => this.aggregationService.aggregateProject(this.rooms()));

  /** Aktives Projekt (Quelle der Bestell-Häkchen) – reaktiv über den Service. */
  private readonly activeProject = this.localProject.project;
  /** Als „bestellt" markierte Positionen (aggregationKey) des aktiven Projekts. */
  readonly orderedKeys = computed(
    () => new Set(this.activeProject().orderedMaterialKeys ?? [])
  );
  /** „X von Y bestellt" – nur die aktuell in der Liste vorhandenen Positionen zählen. */
  readonly orderedSummary = computed(() => {
    const ordered = this.orderedKeys();
    const items = this.result().projectMaterialList.sections.flatMap(
      (section) => section.items
    );
    return {
      done: items.filter((item) => ordered.has(item.aggregationKey)).length,
      total: items.length
    };
  });

  // „Wo"-Spalte nur zeigen, wenn überhaupt ein Material ein anzeigbares Angebot
  // hat. hasOffers() liefert bei global deaktiviertem Affiliate leer → Spalte
  // verschwindet dann komplett (reaktiv über die Settings-Signals).
  readonly showAffiliateColumn = computed(() =>
    this.result().projectMaterialList.sections.some((section) =>
      section.items.some((item) => this.affiliate.hasOffers(item.materialId))
    )
  );

  // Exportiert die projektweite Materialliste (Mengen inkl. empfohlener Gebinde
  // über alle Räume). Wird erst beim Klick ausgewertet.
  readonly buildProjectExportDocument = (): ExportDocumentData =>
    this.exportMapper.buildProjectMaterialListExportData(
      this.result().projectMaterialList,
      this.isContractor() ? this.orderedKeys() : undefined
    );
  readonly projectMaterialListOpen = signal(false);
  readonly openWarningRoomId = signal<string | null>(null);

  ngOnInit(): void {
    this.localProject.markProjectReadyForReview();
  }

  editRoom(roomId: string): void {
    this.localProject.loadRoomIntoWizard(roomId);
    this.materialListState.loadStateForRoom(roomId);
    void this.router.navigate(['/raum-anlegen'], {
      queryParams: { step: 'last', editingRoomId: roomId }
    });
  }

  openMaterialList(roomId: string): void {
    this.localProject.loadRoomIntoWizard(roomId);
    this.materialListState.loadStateForRoom(roomId);
    void this.router.navigate(['/materialliste'], {
      queryParams: { roomId }
    });
  }

  duplicateRoom(roomId: string): void {
    if (this.roomLimit.limitReached()) {
      return;
    }
    this.localProject.duplicateRoom(roomId);
  }

  deleteRoom(roomId: string): void {
    if (globalThis.confirm?.(this.i18n.t('Möchtest du diesen Raum wirklich löschen?')) !== false) {
      this.localProject.deleteRoom(roomId);
    }
  }

  startNewRoom(): void {
    if (this.roomLimit.limitReached()) {
      return;
    }
    this.localProject.startNewRoom();
    this.materialListState.resetMaterialOverrides();
    void this.router.navigate(['/raum-anlegen']);
  }

  roomTypeLabel(roomType: RoomType): string {
    return ROOM_TYPE_DEFAULT_NAMES[roomType];
  }

  toggleProjectMaterialList(): void {
    this.projectMaterialListOpen.update((open) => !open);
  }

  /** Hakt eine Materialposition als „bestellt" ab (Profi-Einkaufsliste). */
  setMaterialOrdered(aggregationKey: string, ordered: boolean): void {
    this.localProject.setMaterialOrdered(aggregationKey, ordered);
  }

  /**
   * Anzeigefertige Shop-Angebote für ein Material (Spalte „Wo"). Leer, wenn
   * Affiliate global bzw. für alle hinterlegten Shops deaktiviert ist. Nur Shops,
   * die für das Produkt hinterlegt sind, erscheinen.
   */
  offersFor(materialId: string): ResolvedOffer[] {
    return this.affiliate.getOffersForMaterial(materialId);
  }

  toggleRoomWarnings(roomId: string): void {
    this.openWarningRoomId.update((current) =>
      current === roomId ? null : roomId
    );
  }

  openCurrentRoomSummary(roomId: string): void {
    this.localProject.loadRoomIntoWizard(roomId);
    this.materialListState.loadStateForRoom(roomId);
    void this.router.navigate(['/zusammenfassung']);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatOptionalNumber(value: number | null): string {
    return value === null ? '–' : this.formatNumber(value);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  /** Aria-Label für den Hinweise-Badge-Button eines Raums. */
  warningAriaLabel(roomName: string): string {
    return `${this.i18n.t('Hinweise für')} ${roomName} ${this.i18n.t('anzeigen')}`;
  }

  /** Aria-Label für die „bestellt"-Checkbox einer Materialposition. */
  orderedAriaLabel(name: string): string {
    return `'${name}' ${this.i18n.t('als bestellt markieren')}`;
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
