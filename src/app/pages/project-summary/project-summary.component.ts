import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ROOM_TYPE_DEFAULT_NAMES,
  RoomType
} from '../../models/bathroom-wizard.model';
import { LocalProjectService } from '../../services/local-project.service';
import { MaterialListStateService } from '../../services/material-list-state.service';
import { ProjectAggregationService } from '../../services/project-aggregation.service';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';

@Component({
  selector: 'app-project-summary',
  standalone: true,
  imports: [CommonModule, PremiumExportButtonComponent],
  templateUrl: './project-summary.component.html',
  styleUrl: './project-summary.component.css'
})
export class ProjectSummaryComponent implements OnInit {
  private readonly localProject = inject(LocalProjectService);
  private readonly aggregationService = inject(ProjectAggregationService);
  private readonly materialListState = inject(MaterialListStateService);
  private readonly router = inject(Router);

  readonly rooms = this.localProject.rooms;
  readonly result = computed(() => this.aggregationService.aggregateProject(this.rooms()));
  readonly projectMaterialListOpen = signal(false);
  readonly openWarningRoomId = signal<string | null>(null);

  ngOnInit(): void {
    this.localProject.markProjectReadyForReview();
  }

  editRoom(roomId: string): void {
    this.localProject.loadRoomIntoWizard(roomId);
    this.materialListState.loadStateForRoom(roomId);
    void this.router.navigate(['/wizard'], {
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
    this.localProject.duplicateRoom(roomId);
  }

  deleteRoom(roomId: string): void {
    if (globalThis.confirm?.('Möchtest du diesen Raum wirklich löschen?') !== false) {
      this.localProject.deleteRoom(roomId);
    }
  }

  startNewRoom(): void {
    this.localProject.startNewRoom();
    this.materialListState.resetMaterialOverrides();
    void this.router.navigate(['/wizard']);
  }

  roomTypeLabel(roomType: RoomType): string {
    return ROOM_TYPE_DEFAULT_NAMES[roomType];
  }

  toggleProjectMaterialList(): void {
    this.projectMaterialListOpen.update((open) => !open);
  }

  toggleRoomWarnings(roomId: string): void {
    this.openWarningRoomId.update((current) =>
      current === roomId ? null : roomId
    );
  }

  openCurrentRoomSummary(roomId: string): void {
    this.localProject.loadRoomIntoWizard(roomId);
    this.materialListState.loadStateForRoom(roomId);
    void this.router.navigate(['/summary']);
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
}
