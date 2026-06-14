import { TestBed } from '@angular/core/testing';
import { ExportDocumentData } from '../models/export-document.model';
import { PdfExportService } from './pdf-export.service';

describe('PdfExportService', () => {
  it('opens PDF printing for the anonymous free context', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(PdfExportService);
    globalThis.print = () => undefined;
    const document: ExportDocumentData = {
      documentType: 'project_summary',
      title: 'Projekt',
      subtitle: null,
      projectName: null,
      roomName: null,
      createdAt: new Date().toISOString(),
      sections: [],
      totals: {},
      legalNotice: null
    };

    expect(service.exportDocument(document)).toEqual({
      exported: true,
      reason: 'print_dialog_opened'
    });
  });
});
