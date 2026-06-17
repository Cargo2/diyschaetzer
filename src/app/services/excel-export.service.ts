import { inject, Injectable } from '@angular/core';
import type { Workbook } from 'exceljs';
import { ExportDocumentData } from '../models/export-document.model';
import { ExcelDocumentBuilderService } from './excel-document-builder.service';
import { FeatureAccessService } from './feature-access.service';

export interface ExcelExportResult {
  exported: boolean;
  reason: 'downloaded' | 'access_denied' | 'generation_failed';
}

interface ExcelJsModule {
  Workbook: new () => Workbook;
}

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable({ providedIn: 'root' })
export class ExcelExportService {
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly builder = inject(ExcelDocumentBuilderService);
  private excelJsPromise: Promise<ExcelJsModule> | null = null;

  /** Erzeugt aus dem neutralen Exportmodell eine echte, herunterladbare XLSX-Datei. */
  async exportDocument(data: ExportDocumentData): Promise<ExcelExportResult> {
    if (!this.featureAccess.canUseExcelExport()) {
      console.warn('Excel export access denied.', data.documentType);
      return { exported: false, reason: 'access_denied' };
    }

    try {
      const exceljs = await this.loadExcelJs();
      const workbook = new exceljs.Workbook();
      this.builder.build(workbook, data);
      const buffer = await workbook.xlsx.writeBuffer();
      this.triggerDownload(buffer, this.fileName(data));
      return { exported: true, reason: 'downloaded' };
    } catch (error) {
      console.error('Excel generation failed.', error);
      return { exported: false, reason: 'generation_failed' };
    }
  }

  /**
   * exceljs wird erst beim ersten Export geladen, damit es als eigener
   * Lazy-Chunk außerhalb des Initial-Bundles bleibt (wie pdfmake).
   */
  private loadExcelJs(): Promise<ExcelJsModule> {
    if (!this.excelJsPromise) {
      this.excelJsPromise = import('exceljs').then((module) =>
        this.unwrap<ExcelJsModule>(module)
      );
    }
    return this.excelJsPromise;
  }

  private unwrap<T>(module: unknown): T {
    const candidate = module as { default?: T };
    return (candidate.default ?? module) as T;
  }

  private triggerDownload(buffer: ArrayBuffer, fileName: string): void {
    const blob = new Blob([buffer], { type: XLSX_MIME });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  private fileName(data: ExportDocumentData): string {
    const base = [data.documentType, data.roomName ?? data.projectName]
      .filter(Boolean)
      .join('-')
      .toLocaleLowerCase('de')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base || 'export'}.xlsx`;
  }
}
