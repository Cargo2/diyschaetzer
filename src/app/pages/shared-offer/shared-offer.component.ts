import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ExportDocumentData,
  ExportOfferGroup
} from '../../models/export-document.model';
import { ContractorOfferShareService } from '../../services/contractor-offer-share.service';

/**
 * Öffentliche, schreibgeschützte Ansicht eines geteilten Angebots (Phase 13).
 * Lädt das eingefrorene Exportdokument per Token (ohne Login) und rendert das
 * Leistungsverzeichnis inkl. Kopf, Summen und Rechtshinweis.
 */
@Component({
  selector: 'app-shared-offer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './shared-offer.component.html',
  styleUrl: './shared-offer.component.css'
})
export class SharedOfferComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly shareService = inject(ContractorOfferShareService);

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly doc = signal<ExportDocumentData | null>(null);

  /** Positionsgruppen des Leistungsverzeichnisses. */
  readonly groups = computed<ExportOfferGroup[]>(() => {
    const section = this.doc()?.sections.find((entry) => entry.type === 'offer');
    return Array.isArray(section?.content) ? (section!.content as ExportOfferGroup[]) : [];
  });

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    try {
      const data = await this.shareService.loadShare(token);
      if (data) {
        this.doc.set(data);
      } else {
        this.notFound.set(true);
      }
    } catch (error) {
      console.error('Geteiltes Angebot konnte nicht geladen werden:', error);
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  eur(value: number | undefined | null): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }

  num(value: number, digits = 2): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(Number.isFinite(value) ? value : 0);
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  unitLabel(unit: string): string {
    return (
      { pauschal: 'pauschal', m2: 'm²', lfm: 'lfm', piece: 'Stück', hour: 'Std.' }[unit] ?? unit
    );
  }
}
