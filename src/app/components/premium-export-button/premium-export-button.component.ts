import { Component, inject, input } from '@angular/core';
import { FeatureAccessService } from '../../services/feature-access.service';
import { PdfExportService } from '../../services/pdf-export.service';

@Component({
  selector: 'app-premium-export-button',
  standalone: true,
  template: `
    <span class="pdf-export-action">
      <button
        type="button"
        [disabled]="!canExport"
        (click)="exportPdf()"
      >
        {{ label() }}
      </button>
    </span>
  `,
  styles: [`
    .pdf-export-action { display: inline-grid; gap: .35rem; max-width: 24rem; }
    button { border: 1px solid #cbd5e1; border-radius: .65rem; padding: .7rem 1rem; font-weight: 700; }
    button:disabled { cursor: not-allowed; opacity: .55; }
  `]
})
export class PremiumExportButtonComponent {
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly pdfExport = inject(PdfExportService);

  readonly label = input.required<string>();
  readonly hintId = input('pdf-premium-hint');
  readonly canExport = this.featureAccess.canUsePdfExport();

  exportPdf(): void {
    this.pdfExport.exportCurrentView();
  }
}
