import { inject, Injectable } from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { ExportDocumentData } from '../models/export-document.model';
import { ContractorBrandingService } from './contractor-branding.service';
import { FeatureAccessService } from './feature-access.service';
import { PdfDocumentBuilderService } from './pdf-document-builder.service';

export interface PdfExportResult {
  exported: boolean;
  reason: 'downloaded' | 'access_denied' | 'generation_failed';
}

interface PdfMakeStatic {
  vfs: Record<string, string>;
  createPdf(documentDefinitions: TDocumentDefinitions): { download(filename?: string): void };
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly builder = inject(PdfDocumentBuilderService);
  private readonly branding = inject(ContractorBrandingService);
  private pdfMakePromise: Promise<PdfMakeStatic> | null = null;

  /** Erzeugt aus dem neutralen Exportmodell ein echtes, herunterladbares PDF. */
  async exportDocument(data: ExportDocumentData): Promise<PdfExportResult> {
    if (!this.featureAccess.canUsePdfExport()) {
      console.warn('PDF export access denied.', data.documentType);
      return { exported: false, reason: 'access_denied' };
    }

    try {
      const pdfMake = await this.loadPdfMake();
      const definition = this.builder.build(this.branding.applyTo(data));
      pdfMake.createPdf(definition).download(this.fileName(data));
      return { exported: true, reason: 'downloaded' };
    } catch (error) {
      console.error('PDF generation failed.', error);
      return { exported: false, reason: 'generation_failed' };
    }
  }

  /**
   * pdfmake wird erst beim ersten Export geladen, damit es als eigener
   * Lazy-Chunk außerhalb des Initial-Bundles bleibt.
   */
  private loadPdfMake(): Promise<PdfMakeStatic> {
    if (!this.pdfMakePromise) {
      this.pdfMakePromise = Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts')
      ]).then(([pdfMakeModule, fontsModule]) => {
        const pdfMake = this.unwrap<PdfMakeStatic>(pdfMakeModule);
        pdfMake.vfs = this.resolveVfs(fontsModule);
        return pdfMake;
      });
    }
    return this.pdfMakePromise;
  }

  private unwrap<T>(module: unknown): T {
    const candidate = module as { default?: T };
    return (candidate.default ?? module) as T;
  }

  private resolveVfs(module: unknown): Record<string, string> {
    // pdfmake 0.2.x exportiert das VFS als Default-Export direkt (module.exports = vfs).
    // Ältere/UMD-Varianten verschachteln es unter `.vfs` oder `.pdfMake.vfs`.
    const mod = this.unwrap<Record<string, unknown>>(module);
    const nested =
      (mod['vfs'] as Record<string, string> | undefined) ??
      (mod['pdfMake'] as { vfs?: Record<string, string> } | undefined)?.vfs;
    return nested ?? (mod as Record<string, string>);
  }

  private fileName(data: ExportDocumentData): string {
    const base = [data.documentType, data.roomName ?? data.projectName]
      .filter(Boolean)
      .join('-')
      .toLocaleLowerCase('de')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base || 'export'}.pdf`;
  }
}
