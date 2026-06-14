import { Component, inject, input, signal } from '@angular/core';
import { ExportDocumentData } from '../../models/export-document.model';
import { FeatureAccessService } from '../../services/feature-access.service';
import { PdfExportService } from '../../services/pdf-export.service';

@Component({
  selector: 'app-premium-export-button',
  standalone: true,
  template: `
    <span class="pdf-export-action">
      <button
        type="button"
        [disabled]="!canExport || busy()"
        (click)="exportPdf()"
      >
        {{ busy() ? 'PDF wird erstellt …' : label() }}
      </button>
      @if (feedback()) {
        <small role="status">{{ feedback() }}</small>
      }
    </span>
  `,
  styles: [`
    .pdf-export-action { display: inline-grid; gap: .35rem; max-width: 24rem; }
    button { border: 1px solid #cbd5e1; border-radius: .65rem; padding: .7rem 1rem; font-weight: 700; }
    button:disabled { cursor: not-allowed; opacity: .55; }
    small { color: #6b7280; }
  `]
})
export class PremiumExportButtonComponent {
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly pdfExport = inject(PdfExportService);

  readonly label = input.required<string>();
  readonly hintId = input('pdf-premium-hint');
  /** Liefert die Exportdaten erst beim Klick, damit immer der aktuelle Stand exportiert wird. */
  readonly document = input.required<() => ExportDocumentData | null>();

  readonly canExport = this.featureAccess.canUsePdfExport();
  readonly busy = signal(false);
  readonly feedback = signal('');

  async exportPdf(): Promise<void> {
    if (!this.canExport || this.busy()) {
      return;
    }

    const data = this.document()();
    if (!data) {
      this.feedback.set('Es liegen noch keine Daten zum Export vor.');
      return;
    }

    this.busy.set(true);
    this.feedback.set('');
    try {
      const result = await this.pdfExport.exportDocument(data);
      if (!result.exported) {
        this.feedback.set(
          result.reason === 'access_denied'
            ? 'PDF-Export ist für deinen Zugang nicht verfügbar.'
            : 'PDF konnte nicht erstellt werden. Bitte erneut versuchen.'
        );
      }
    } finally {
      this.busy.set(false);
    }
  }
}
