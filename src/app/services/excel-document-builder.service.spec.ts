import ExcelJS from 'exceljs';
import { ExportDocumentData } from '../models/export-document.model';
import { ExcelDocumentBuilderService } from './excel-document-builder.service';

function materialDocument(): ExportDocumentData {
  return {
    documentType: 'material_list',
    title: 'Materialliste',
    subtitle: 'Materialbedarf',
    projectName: null,
    roomName: 'Bad EG',
    createdAt: '2026-06-14T10:00:00.000Z',
    sections: [
      {
        id: 'adhesive',
        title: 'Fliesenkleber',
        type: 'table',
        content: [
          {
            name: 'Flexkleber',
            quantity: 64,
            unit: 'kg',
            packageCount: 3,
            packageUnit: '25-kg-Sack',
            unitPrice: 21.85,
            total: 65.55,
            active: true,
            note: '4 kg/m²'
          },
          {
            name: 'Ausgeschlossen',
            quantity: 1,
            unit: 'Stück',
            packageCount: 1,
            packageUnit: 'Stück',
            unitPrice: 5,
            total: 5,
            active: false
          }
        ]
      }
    ],
    totals: { materialTotal: 65.55 },
    legalNotice: 'Unverbindliche Schätzung.'
  };
}

function cellTexts(sheet: ExcelJS.Worksheet): string[] {
  const texts: string[] = [];
  sheet.eachRow((row) =>
    row.eachCell((cell) => {
      if (cell.value !== null && cell.value !== undefined) {
        texts.push(String(cell.value));
      }
    })
  );
  return texts;
}

describe('ExcelDocumentBuilderService', () => {
  const builder = new ExcelDocumentBuilderService();

  it('writes a material worksheet with header, rows and total', () => {
    const workbook = new ExcelJS.Workbook();
    builder.build(workbook, materialDocument());

    const sheet = workbook.worksheets[0];
    const texts = cellTexts(sheet);

    expect(sheet.name).toBe('Bad EG');
    expect(texts).toContain('Materialliste');
    expect(texts).toContain('Empf. Einkauf');
    expect(texts.some((value) => value.includes('Flexkleber'))).toBe(true);
    expect(texts).toContain('Materialkosten gesamt');
  });

  it('keeps numeric values as numbers with currency / unit formats', () => {
    const workbook = new ExcelJS.Workbook();
    builder.build(workbook, materialDocument());
    const sheet = workbook.worksheets[0];

    // Mengenzelle bleibt eine Zahl, die Einheit steckt im Zahlenformat.
    let foundUnitFormat = false;
    let foundCurrency = false;
    sheet.eachRow((row) =>
      row.eachCell((cell) => {
        if (typeof cell.value === 'number' && cell.numFmt?.includes('kg')) {
          foundUnitFormat = true;
        }
        if (cell.value === 65.55 && cell.numFmt?.includes('€')) {
          foundCurrency = true;
        }
      })
    );

    expect(foundUnitFormat).toBe(true);
    expect(foundCurrency).toBe(true);
  });

  it('omits inactive material rows from the shopping list', () => {
    const workbook = new ExcelJS.Workbook();
    builder.build(workbook, materialDocument());
    const sheet = workbook.worksheets[0];

    expect(cellTexts(sheet).join(' ')).not.toContain('Ausgeschlossen');
  });
});
