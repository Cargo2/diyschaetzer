import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { strFromU8, unzipSync } from 'fflate';
import {
  ContractorInvoice,
  emptyInvoiceCustomer,
  emptyInvoiceSeller
} from '../models/contractor-invoice.model';
import { ContractorOfferLine } from '../models/contractor-offer.model';
import { ExportDataMapperService } from './export-data-mapper.service';
import { InvoiceExportService } from './invoice-export.service';
import { PdfExportService } from './pdf-export.service';
import { XRechnungExportService } from './xrechnung-export.service';

function line(partial: Partial<ContractorOfferLine> = {}): ContractorOfferLine {
  return {
    id: 'l',
    label: 'Position',
    description: '',
    quantity: 1,
    unit: 'pauschal',
    unitPrice: 100,
    isActive: true,
    isOptional: false,
    origin: 'generated',
    ...partial
  };
}

function invoice(overrides: Partial<ContractorInvoice> = {}): ContractorInvoice {
  return {
    id: 'inv',
    projectId: 'p1',
    offerId: 'o1',
    projectName: 'Sanierung',
    invoiceNumber: 'RE-2026-001',
    invoiceDate: '2026-06-15',
    serviceDate: '2026-06-14',
    dueDate: '2026-06-29',
    buyerReference: 'n/a',
    status: 'draft',
    vatPercent: 19,
    discountPercent: 0,
    sections: [{ id: 's', kind: 'custom', title: 'Leistungen', lines: [line()] }],
    customer: { ...emptyInvoiceCustomer(), name: 'Kunde GmbH', countryCode: 'DE' },
    seller: { ...emptyInvoiceSeller(), companyName: 'Fliesen GmbH', countryCode: 'DE' },
    introText: '',
    outroText: '',
    ...overrides
  };
}

let pdfCalls: number;
let xmlCalls: string[];
let capturedZip: Blob | null;
let origCreate: typeof URL.createObjectURL;

function setup(): InvoiceExportService {
  pdfCalls = 0;
  xmlCalls = [];
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ExportDataMapperService,
        useValue: { buildContractorInvoiceExportData: () => ({}) }
      },
      {
        provide: PdfExportService,
        useValue: {
          renderBlob: async () => {
            pdfCalls++;
            return new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])]); // %PDF
          }
        }
      },
      {
        provide: XRechnungExportService,
        useValue: {
          buildXml: (inv: ContractorInvoice) => {
            xmlCalls.push(inv.invoiceNumber);
            return `<Invoice>${inv.invoiceNumber}</Invoice>`;
          }
        }
      }
    ]
  });
  return TestBed.inject(InvoiceExportService);
}

async function readZip(): Promise<Record<string, Uint8Array>> {
  const bytes = new Uint8Array(await capturedZip!.arrayBuffer());
  return unzipSync(bytes);
}

beforeEach(() => {
  capturedZip = null;
  origCreate = URL.createObjectURL;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    capturedZip = blob;
    return 'blob:mock';
  }) as typeof URL.createObjectURL;
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  // Anchor-Klick in jsdom neutralisieren (sonst „Not implemented: navigation").
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  URL.createObjectURL = origCreate;
  vi.restoreAllMocks();
});

describe('InvoiceExportService – Filterlogik', () => {
  const invoices = [
    invoice({ id: 'a', invoiceNumber: 'RE-2026-001', invoiceDate: '2026-01-01' }),
    invoice({ id: 'b', invoiceNumber: 'RE-2026-020', invoiceDate: '2026-06-15' }),
    invoice({ id: 'c', invoiceNumber: 'RE-2026-042', invoiceDate: '2026-12-31' })
  ];

  it('filtert nach Datum inklusiv beider Grenzen', async () => {
    const service = setup();
    const result = await service.exportZip(invoices, {
      dateFrom: '2026-06-15',
      dateTo: '2026-12-31'
    });
    expect(result.count).toBe(2); // 06-15 und 12-31 eingeschlossen
  });

  it('lässt leere Grenzen offen (nur dateFrom)', async () => {
    const service = setup();
    const result = await service.exportZip(invoices, { dateFrom: '2026-06-15' });
    expect(result.count).toBe(2);
  });

  it('filtert nach Nummernbereich (lexikografisch dank padStart)', async () => {
    const service = setup();
    const result = await service.exportZip(invoices, {
      numberFrom: 'RE-2026-002',
      numberTo: 'RE-2026-030'
    });
    expect(result.count).toBe(1); // nur RE-2026-020
  });

  it('verknüpft Datum- und Nummernfilter mit UND', async () => {
    const service = setup();
    const result = await service.exportZip(invoices, {
      dateFrom: '2026-01-01',
      dateTo: '2026-06-30',
      numberFrom: 'RE-2026-010'
    });
    expect(result.count).toBe(1); // RE-2026-020 (Datum passt) – RE-2026-001 fällt am Nummernfilter raus
  });

  it('exportiert ohne Filter alle Rechnungen', async () => {
    const service = setup();
    const result = await service.exportZip(invoices, {});
    expect(result.count).toBe(3);
  });

  it('lädt bei leerem Trefferbereich keine ZIP herunter', async () => {
    const service = setup();
    const result = await service.exportZip(invoices, { dateFrom: '2030-01-01' });
    expect(result.count).toBe(0);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});

describe('InvoiceExportService – ZIP-Inhalt & Dateierzeugung', () => {
  it('erzeugt PDF + XML je deutscher Rechnung und eine gemeinsame CSV', async () => {
    const service = setup();
    const result = await service.exportZip([invoice({ invoiceNumber: 'RE-2026-007' })], {});
    expect(result.count).toBe(1);

    const files = await readZip();
    expect(Object.keys(files).sort()).toEqual([
      'RE-2026-007.pdf',
      'RE-2026-007.xml',
      'rechnungen.csv'
    ]);
    expect(pdfCalls).toBe(1);
    expect(xmlCalls).toEqual(['RE-2026-007']);
  });

  it('lässt die XRechnung-XML für nicht-deutsche Verkäufer weg', async () => {
    const service = setup();
    await service.exportZip(
      [
        invoice({
          invoiceNumber: 'RE-2026-008',
          seller: { ...emptyInvoiceSeller(), companyName: 'Kafelki', countryCode: 'PL' }
        })
      ],
      {}
    );
    const files = await readZip();
    expect(Object.keys(files).sort()).toEqual(['RE-2026-008.pdf', 'rechnungen.csv']);
    expect(xmlCalls).toEqual([]);
  });

  it('vergibt bei gleicher Rechnungsnummer kollisionsfreie Dateinamen (-2)', async () => {
    const service = setup();
    await service.exportZip(
      [
        invoice({ id: 'a', invoiceNumber: 'RE-2026-001' }),
        invoice({ id: 'b', invoiceNumber: 'RE-2026-001' })
      ],
      {}
    );
    const files = await readZip();
    const names = Object.keys(files).sort();
    expect(names).toContain('RE-2026-001.pdf');
    expect(names).toContain('RE-2026-001-2.pdf');
  });
});

describe('InvoiceExportService – CSV-Format', () => {
  it('schreibt BOM, Semikolon-Header, Komma-Dezimalen und quotet Werte mit Semikolon', async () => {
    const service = setup();
    await service.exportZip(
      [
        invoice({
          invoiceNumber: 'RE-2026-009',
          invoiceDate: '2026-06-15',
          dueDate: '2026-06-29',
          status: 'paid',
          vatPercent: 19,
          customer: { ...emptyInvoiceCustomer(), name: 'Müller; Sohn GmbH', countryCode: 'DE' },
          sections: [
            { id: 's', kind: 'custom', title: 'L', lines: [line({ quantity: 1, unitPrice: 100 })] }
          ]
        })
      ],
      {}
    );
    const files = await readZip();
    const csvBytes = files['rechnungen.csv'];

    // UTF-8-BOM (EF BB BF) am Anfang – für deutsches Excel.
    expect(Array.from(csvBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    // strFromU8 (TextDecoder) bzw. String.trim entfernen den führenden BOM.
    const csv = strFromU8(csvBytes);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('Nummer;Art;Rechnungsdatum;Faellig;Kunde;Netto;USt;Brutto;Status');
    // Datum deutsch, Betrag mit Komma, quotiertes Kundenfeld (enthält Semikolon), Status deutsch.
    expect(lines[1]).toBe(
      'RE-2026-009;Rechnung;15.06.2026;29.06.2026;"Müller; Sohn GmbH";100,00;19,00;119,00;Bezahlt'
    );
  });

  it('benennt die ZIP nach den Datumsgrenzen', async () => {
    const service = setup();
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadName = this.download;
    });
    await service.exportZip([invoice()], { dateFrom: '2026-01-01', dateTo: '2026-12-31' });
    expect(downloadName).toBe('rechnungsexport-2026-01-01-2026-12-31.zip');
  });

  it('benennt die ZIP „alle", wenn keine Datumsgrenzen gesetzt sind', async () => {
    const service = setup();
    let downloadName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadName = this.download;
    });
    await service.exportZip([invoice()], {});
    expect(downloadName).toBe('rechnungsexport-alle-alle.zip');
  });
});
