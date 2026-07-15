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

interface PdfDoc {
  download(filename?: string): void;
  getBlob(callback: (blob: Blob) => void): void;
}

interface PdfMakeStatic {
  vfs: Record<string, string>;
  createPdf(documentDefinitions: TDocumentDefinitions): PdfDoc;
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
      await this.deliver(pdfMake.createPdf(definition), this.fileName(data));
      return { exported: true, reason: 'downloaded' };
    } catch (error) {
      console.error('PDF generation failed.', error);
      return { exported: false, reason: 'generation_failed' };
    }
  }

  /**
   * Erzeugt aus dem neutralen Exportmodell ein PDF als **Blob** – verhaltensgleich
   * zu {@link exportDocument} (gleicher Builder + Branding-Overlay), aber OHNE
   * Auslieferung (kein Download/Share) und ohne Access-Result. Für den Sammel-/
   * ZIP-Export (mehrere Rechnungen in einer ZIP) gebraucht; das Feature-Gating
   * bleibt beim Aufrufer/der Editor-Auslieferung.
   */
  async renderBlob(data: ExportDocumentData): Promise<Blob> {
    const pdfMake = await this.loadPdfMake();
    const definition = this.builder.build(this.branding.applyTo(data));
    return this.toBlob(pdfMake.createPdf(definition));
  }

  /** Promise-Wrapper um den `getBlob`-Callback (ohne Download/Share-Seiteneffekt). */
  private toBlob(pdf: PdfDoc): Promise<Blob> {
    return new Promise<Blob>((resolve) => pdf.getBlob((blob: Blob) => resolve(blob)));
  }

  /**
   * Liefert das PDF aus. Auf Geräten mit Datei-Sharing (mobil, v. a. iOS/Android)
   * über die **Web Share API** (Teilen-/Speichern-Dialog) – dort ist der klassische
   * `download()` unzuverlässig (iOS-Safari). Sonst klassischer Download über einen
   * Blob-Objekt-Link (funktioniert auch, wenn `download` inline geöffnet wird).
   */
  private deliver(pdf: PdfDoc, filename: string): Promise<void> {
    return new Promise<void>((resolve) => {
      pdf.getBlob(async (blob: Blob) => {
        try {
          const file = new File([blob], filename, { type: 'application/pdf' });
          const nav = globalThis.navigator as Navigator & {
            canShare?: (data: { files: File[] }) => boolean;
          };
          if (nav?.canShare?.({ files: [file] })) {
            try {
              await nav.share({ files: [file], title: filename });
              return; // erfolgreich geteilt/gespeichert
            } catch (error) {
              // Abbruch durch den Nutzer → nicht zusätzlich herunterladen.
              if ((error as { name?: string })?.name === 'AbortError') {
                return;
              }
              // sonstiger Fehler → auf den Download-Pfad zurückfallen
            }
          }
          this.downloadBlob(blob, filename);
        } finally {
          resolve();
        }
      });
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
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
