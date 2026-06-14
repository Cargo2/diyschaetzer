import { inject, Injectable } from '@angular/core';
import { ExportDocumentData } from '../models/export-document.model';
import { FeatureAccessService } from './feature-access.service';

export interface PdfExportResult {
  exported: boolean;
  reason: 'print_dialog_opened' | 'access_denied';
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly featureAccess = inject(FeatureAccessService);

  exportDocument(data: ExportDocumentData): PdfExportResult {
    if (!this.featureAccess.canUsePdfExport()) {
      console.warn('PDF export access denied.', data.documentType);
      return { exported: false, reason: 'access_denied' };
    }

    this.openPrintDialog();
    return { exported: true, reason: 'print_dialog_opened' };
  }

  exportCurrentView(): PdfExportResult {
    if (!this.featureAccess.canUsePdfExport()) {
      return { exported: false, reason: 'access_denied' };
    }
    this.openPrintDialog();
    return { exported: true, reason: 'print_dialog_opened' };
  }

  private openPrintDialog(): void {
    globalThis.print?.();
  }
}
