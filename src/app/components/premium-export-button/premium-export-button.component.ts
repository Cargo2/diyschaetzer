import { Component, computed, inject, input, signal } from '@angular/core';
import { ExportDocumentData } from '../../models/export-document.model';
import { ExcelExportService } from '../../services/excel-export.service';
import { FeatureAccessService } from '../../services/feature-access.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { I18nService } from '../../i18n/i18n.service';

type ExportFormat = 'pdf' | 'excel';

@Component({
  selector: 'app-premium-export-button',
  standalone: true,
  template: `
    <span class="pdf-export-action">
      <button
        type="button"
        [disabled]="!canExport() || busy()"
        (click)="exportDocument()"
      >
        {{ busy() ? busyLabel() : label() }}
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
  private readonly excelExport = inject(ExcelExportService);
  private readonly i18n = inject(I18nService);

  readonly label = input.required<string>();
  readonly hintId = input('pdf-premium-hint');
  /** Exportformat – steuert Service, Zugriffsprüfung und Statusmeldungen. */
  readonly format = input<ExportFormat>('pdf');
  /** Liefert die Exportdaten erst beim Klick, damit immer der aktuelle Stand exportiert wird. */
  readonly document = input.required<() => ExportDocumentData | null>();

  readonly canExport = computed(() =>
    this.format() === 'excel'
      ? this.featureAccess.canUseExcelExport()
      : this.featureAccess.canUsePdfExport()
  );
  readonly busy = signal(false);
  readonly feedback = signal('');

  busyLabel(): string {
    return this.format() === 'excel'
      ? this.i18n.t('Excel wird erstellt …')
      : this.i18n.t('PDF wird erstellt …');
  }

  async exportDocument(): Promise<void> {
    if (!this.canExport() || this.busy()) {
      return;
    }

    const data = this.document()();
    if (!data) {
      this.feedback.set(this.i18n.t('Es liegen noch keine Daten zum Export vor.'));
      return;
    }

    this.busy.set(true);
    this.feedback.set('');
    try {
      const result =
        this.format() === 'excel'
          ? await this.excelExport.exportDocument(data)
          : await this.pdfExport.exportDocument(data);
      if (!result.exported) {
        this.feedback.set(this.errorMessage(result.reason));
      }
    } finally {
      this.busy.set(false);
    }
  }

  private errorMessage(reason: 'downloaded' | 'access_denied' | 'generation_failed'): string {
    const formatLabel = this.format() === 'excel' ? 'Excel' : 'PDF';
    const template =
      reason === 'access_denied'
        ? this.i18n.t('{format}-Export ist für deinen Zugang nicht verfügbar.')
        : this.i18n.t('{format} konnte nicht erstellt werden. Bitte erneut versuchen.');
    return template.replace('{format}', formatLabel);
  }
}
