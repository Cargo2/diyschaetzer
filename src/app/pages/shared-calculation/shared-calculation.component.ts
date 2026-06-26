import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SharedCalculation } from '../../models/shared-calculation.model';
import { ShareService } from '../../services/share.service';

/**
 * Öffentliche, schreibgeschützte Ansicht einer geteilten Kalkulation (Phase 14).
 * Lädt die eingefrorene Momentaufnahme per Token (ohne Login) und zeigt sie an.
 */
@Component({
  selector: 'app-shared-calculation',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './shared-calculation.component.html',
  styleUrl: './shared-calculation.component.css'
})
export class SharedCalculationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly shareService = inject(ShareService);

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly calculation = signal<SharedCalculation | null>(null);

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
        this.calculation.set(data);
      } else {
        this.notFound.set(true);
      }
    } catch {
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number.isFinite(value) ? value : 0);
  }

  formatNumber(value: number, digits = 2): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(Number.isFinite(value) ? value : 0);
  }

  formatDate(iso: string): string {
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
