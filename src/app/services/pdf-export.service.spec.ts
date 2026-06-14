import { TestBed } from '@angular/core/testing';
import { ExportDocumentData } from '../models/export-document.model';
import { FeatureAccessService } from './feature-access.service';
import { PdfExportService } from './pdf-export.service';

function createDocument(): ExportDocumentData {
  return {
    documentType: 'material_list',
    title: 'Materialliste',
    subtitle: null,
    projectName: null,
    roomName: 'Bad',
    createdAt: new Date().toISOString(),
    sections: [],
    totals: {},
    legalNotice: null
  };
}

describe('PdfExportService', () => {
  it('denies export when the feature access check fails', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FeatureAccessService,
          useValue: { canUsePdfExport: () => false }
        }
      ]
    });
    const service = TestBed.inject(PdfExportService);

    const result = await service.exportDocument(createDocument());

    expect(result).toEqual({ exported: false, reason: 'access_denied' });
  });
});
