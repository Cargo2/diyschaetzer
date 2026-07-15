import { inject, Injectable } from '@angular/core';
import {
  ContractorInvoice,
  ContractorInvoiceKind,
  CONTRACTOR_INVOICE_KIND_LABELS,
  CONTRACTOR_INVOICE_STATUS_LABELS,
  invoiceGrossTotal,
  invoiceNetAfterDiscount,
  invoiceVatAmount,
  isGermanInvoiceSeller,
  sanitizeContractorInvoice
} from '../models/contractor-invoice.model';
import { ExportDataMapperService } from './export-data-mapper.service';
import { PdfExportService } from './pdf-export.service';
import { XRechnungExportService } from './xrechnung-export.service';

/**
 * Filterkriterien für den Rechnungs-ZIP-Export. Alle Felder optional; leere
 * Grenzen sind offen. Datum- und Nummernfilter sind UND-verknüpft.
 */
export interface InvoiceExportFilter {
  /** Frühestes Rechnungsdatum (ISO `yyyy-mm-dd`, inklusiv). Leer = offen. */
  dateFrom?: string;
  /** Spätestes Rechnungsdatum (ISO `yyyy-mm-dd`, inklusiv). Leer = offen. */
  dateTo?: string;
  /** Kleinste Rechnungsnummer (String-Vergleich, inklusiv). Leer = offen. */
  numberFrom?: string;
  /** Größte Rechnungsnummer (String-Vergleich, inklusiv). Leer = offen. */
  numberTo?: string;
}

/**
 * Sammel-Export der Rechnungen als ZIP (PDFs + XRechnung-XMLs + CSV-Übersicht) –
 * für das Archiv-/Buchhaltungssystem des Profis (Aufbewahrungspflicht § 147 AO /
 * GoBD). Die App archiviert nicht dauerhaft; der Export deckt den gesetzlichen
 * Bedarf ab und funktioniert bewusst auch im Abo-Nur-Lese-Modus.
 *
 * Bewusst schlank + wiederverwendend: PDFs über {@link PdfExportService.renderBlob}
 * (kein Download-Seiteneffekt), XML über {@link XRechnungExportService.buildXml},
 * das ZIP über `fflate` (ESM, **dynamisch** importiert → eigener Lazy-Chunk wie
 * pdfmake/exceljs, hält das Rechnungs-Bundle initial klein).
 */
@Injectable({ providedIn: 'root' })
export class InvoiceExportService {
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly pdfExport = inject(PdfExportService);
  private readonly xrechnung = inject(XRechnungExportService);

  /**
   * Filtert die Rechnungen, erzeugt je Rechnung ein PDF (+ XRechnung-XML bei
   * deutschem Verkäufer) sowie eine gemeinsame `rechnungen.csv`, packt alles in
   * eine ZIP und lädt sie herunter. Liefert die Zahl der exportierten Rechnungen
   * (`0` ⇒ kein Treffer, es wird KEINE ZIP heruntergeladen).
   */
  async exportZip(
    invoices: ContractorInvoice[],
    filter: InvoiceExportFilter
  ): Promise<{ count: number }> {
    const matched = invoices
      .filter((invoice) => this.matchesFilter(invoice, filter))
      .map((invoice) => sanitizeContractorInvoice(invoice));
    if (matched.length === 0) {
      return { count: 0 };
    }

    // fflate erst hier laden → eigener async Chunk, nicht im Initial-Bundle.
    const { zipSync } = await import('fflate');
    const encoder = new TextEncoder();
    const files: Record<string, Uint8Array> = {};
    const usedNames = new Set<string>();

    for (const invoice of matched) {
      const base = this.uniqueName(this.safeFileName(invoice.invoiceNumber), usedNames);
      const data = this.exportMapper.buildContractorInvoiceExportData(invoice);
      const pdfBlob = await this.pdfExport.renderBlob(data);
      files[`${base}.pdf`] = new Uint8Array(await pdfBlob.arrayBuffer());
      // XRechnung ist deutsches Recht – nur für Betriebe mit Sitz in Deutschland.
      if (isGermanInvoiceSeller(invoice.seller)) {
        files[`${base}.xml`] = encoder.encode(this.xrechnung.buildXml(invoice));
      }
    }

    files['rechnungen.csv'] = encoder.encode(this.buildCsv(matched));

    const zipped = zipSync(files);
    this.downloadZip(zipped, this.zipName(filter));
    return { count: matched.length };
  }

  // ---- Filter --------------------------------------------------------------

  /**
   * Datum- UND Nummernfilter, jeweils inklusiv mit offenen Grenzen.
   *
   * Datum: `invoiceDate` liegt als ISO `yyyy-mm-dd` vor, dessen lexikografische
   * Ordnung der chronologischen entspricht → direkter String-Vergleich.
   *
   * Nummer: String-Vergleich auf getrimmten, großgeschriebenen Nummern. Weil die
   * fortlaufenden Nummern nullgepolstert sind (`padStart`, z. B. `RE-2026-001`),
   * ist die lexikografische Ordnung innerhalb desselben Präfix/Jahres identisch
   * mit der numerischen – `RE-2026-001 ≤ x ≤ RE-2026-042` funktioniert korrekt.
   */
  private matchesFilter(invoice: ContractorInvoice, filter: InvoiceExportFilter): boolean {
    const date = invoice.invoiceDate ?? '';
    if (filter.dateFrom && date < filter.dateFrom) {
      return false;
    }
    if (filter.dateTo && date > filter.dateTo) {
      return false;
    }
    const number = this.normalizeNumber(invoice.invoiceNumber);
    const from = this.normalizeNumber(filter.numberFrom);
    const to = this.normalizeNumber(filter.numberTo);
    if (from && number < from) {
      return false;
    }
    if (to && number > to) {
      return false;
    }
    return true;
  }

  private normalizeNumber(value: string | undefined): string {
    return (value ?? '').trim().toUpperCase();
  }

  // ---- CSV -----------------------------------------------------------------

  /**
   * Übersichts-CSV (deutsches Excel: Semikolon-getrennt, Komma-Dezimaltrenner,
   * UTF-8-BOM). Als Archiv-/Buchhaltungsdokument bewusst **auf Deutsch** – die
   * Rechnungsart/-status kommen aus den festen deutschen Labels, nicht aus i18n.
   * Netto + USt = Brutto (Netto = Bemessungsgrundlage nach Nachlass).
   */
  private buildCsv(invoices: ContractorInvoice[]): string {
    const header = [
      'Nummer',
      'Art',
      'Rechnungsdatum',
      'Faellig',
      'Kunde',
      'Netto',
      'USt',
      'Brutto',
      'Status'
    ];
    const rows = invoices.map((invoice) => [
      invoice.invoiceNumber ?? '',
      CONTRACTOR_INVOICE_KIND_LABELS[this.kindOf(invoice)],
      this.dateDe(invoice.invoiceDate),
      this.dateDe(invoice.dueDate),
      invoice.customer?.name ?? '',
      this.money(invoiceNetAfterDiscount(invoice)),
      this.money(invoiceVatAmount(invoice)),
      this.money(invoiceGrossTotal(invoice)),
      CONTRACTOR_INVOICE_STATUS_LABELS[invoice.status ?? 'draft']
    ]);
    // UTF-8-BOM (﻿) voranstellen, damit Excel die Umlaute korrekt liest.
    return '﻿' + [header, ...rows].map((row) => this.csvRow(row)).join('\r\n') + '\r\n';
  }

  private kindOf(invoice: ContractorInvoice): ContractorInvoiceKind {
    return invoice.kind ?? 'standard';
  }

  private csvRow(cells: string[]): string {
    return cells.map((cell) => this.csvCell(cell)).join(';');
  }

  /** RFC-4180-Quoting für den deutschen Semikolon-Dialekt: quoten bei `;` `"` `\n` `\r`. */
  private csvCell(value: string): string {
    const text = value ?? '';
    if (/[;"\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  /** Betrag mit Komma als Dezimaltrenner, zwei Nachkommastellen, ohne Tausendertrenner. */
  private money(value: number): string {
    return (Number.isFinite(value) ? value : 0).toFixed(2).replace('.', ',');
  }

  /** ISO `yyyy-mm-dd` → deutsches `dd.mm.yyyy`; leere/abweichende Werte unverändert. */
  private dateDe(iso: string | undefined): string {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim());
    return match ? `${match[3]}.${match[2]}.${match[1]}` : (iso ?? '');
  }

  // ---- Dateinamen / Download -----------------------------------------------

  /** Rechnungsnummer → dateisicherer Basisname (analog XRechnung-Export). */
  private safeFileName(name: string): string {
    const cleaned = String(name ?? '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || 'rechnung';
  }

  /** Eindeutigt einen Basisnamen gegen bereits vergebene (Kollision ⇒ `-2`, `-3`, …). */
  private uniqueName(base: string, used: Set<string>): string {
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${base}-${suffix++}`;
    }
    used.add(candidate);
    return candidate;
  }

  /** Dateiname der ZIP: `rechnungsexport-<von>-<bis>.zip` (Datumsgrenzen oder `alle`). */
  private zipName(filter: InvoiceExportFilter): string {
    const from = filter.dateFrom?.trim() || 'alle';
    const to = filter.dateTo?.trim() || 'alle';
    return `rechnungsexport-${from}-${to}.zip`;
  }

  /** Blob-Download über einen Objekt-Link (gleiches Muster wie PdfExportService.downloadBlob). */
  private downloadZip(bytes: Uint8Array, filename: string): void {
    // ArrayBuffer-gestützte Kopie: fflate liefert eine `ArrayBufferLike`-View, die der
    // Blob-Konstruktor unter strict TS nicht direkt als BlobPart akzeptiert.
    const buffer = new Uint8Array(bytes.byteLength);
    buffer.set(bytes);
    const blob = new Blob([buffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
