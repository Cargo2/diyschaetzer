import { Injectable } from '@angular/core';
import type { Workbook, Worksheet, Row } from 'exceljs';
import {
  ExportDocumentData,
  ExportDocumentSection
} from '../models/export-document.model';

/**
 * Zeilenform der Materialtabellen aus dem ExportDataMapperService.
 * Deckt sowohl die Raumliste (`total`/`note`) als auch die projektweite
 * Liste (`displayCost`/`roomNames`) ab. Identisch zum PDF-Builder, damit
 * beide Exporte aus derselben neutralen ExportDocumentData entstehen.
 */
interface MaterialRow {
  name?: string;
  quantity?: number | null;
  unit?: string | null;
  packageCount?: number | null;
  packageUnit?: string | null;
  unitPrice?: number | null;
  total?: number | null;
  displayCost?: number | null;
  active?: boolean;
  note?: string | null;
  roomNames?: string[];
  notes?: string[];
}

/** Zeilenform der Profi-Leistungspositionen (line_items). */
interface OfferLineItem {
  label?: string;
  description?: string;
  quantity?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  isActive?: boolean;
  isOptional?: boolean;
}

const BRAND_ARGB = 'FF047857';
const MUTED_ARGB = 'FF6B7280';
const HEADER_TEXT_ARGB = 'FFFFFFFF';
const CURRENCY_FMT = '#,##0.00" €"';
const NUMBER_FMT = '#,##0.##';

const CARD_LABELS: Record<string, string> = {
  roomName: 'Raum',
  roomType: 'Raumtyp',
  roomCount: 'Anzahl Räume',
  tileAreaM2: 'Fliesenfläche',
  tileAreaWithWasteM2: 'Inkl. Verschnitt',
  totalTileAreaM2: 'Gesamtfläche',
  totalTileAreaWithWasteM2: 'Inkl. Verschnitt',
  totalMaterialCost: 'Materialkosten',
  totalToolCostDeduplicated: 'Werkzeug (einmalig)',
  totalSavings: 'Mögliche Ersparnis',
  diyTotal: 'DIY-Kosten',
  professionalTotal: 'Fliesenleger-Kosten',
  savingsAmount: 'Mögliche Ersparnis',
  savingsPercent: 'Ersparnis %'
};

const AREA_KEYS = new Set([
  'tileAreaM2',
  'tileAreaWithWasteM2',
  'totalTileAreaM2',
  'totalTileAreaWithWasteM2'
]);
const CURRENCY_KEYS = new Set([
  'totalMaterialCost',
  'totalToolCostDeduplicated',
  'totalSavings',
  'diyTotal',
  'professionalTotal',
  'savingsAmount'
]);

const UNIT_LABELS: Record<string, string> = {
  pauschal: 'pauschal',
  m2: 'm²',
  lfm: 'lfm',
  piece: 'Stück',
  hour: 'Std.'
};

const TOTAL_ROWS: Array<{ key: keyof ExportDocumentData['totals']; label: string; primary?: boolean }> = [
  { key: 'netTotal', label: 'Nettobetrag' },
  { key: 'vatAmount', label: 'MwSt.' },
  { key: 'grossTotal', label: 'Bruttosumme' },
  { key: 'materialTotal', label: 'Materialkosten gesamt', primary: true },
  { key: 'diyTotal', label: 'DIY-Kosten', primary: true },
  { key: 'professionalTotal', label: 'Fliesenleger-Kosten', primary: true }
];

const COLUMN_WIDTHS = [46, 16, 18, 16, 16];

/**
 * Übersetzt das neutrale Exportmodell in ein ExcelJS-Arbeitsblatt.
 * Hält keinen statischen exceljs-Import (nur Typen) – die Instanz kommt vom
 * ExcelExportService, damit die Lib ein eigener Lazy-Chunk bleibt.
 */
@Injectable({ providedIn: 'root' })
export class ExcelDocumentBuilderService {
  build(workbook: Workbook, data: ExportDocumentData): void {
    const sheet = workbook.addWorksheet(this.sheetName(data));
    COLUMN_WIDTHS.forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });

    this.addHeader(sheet, data);
    data.sections.forEach((section) => this.addSection(sheet, section));
    this.addTotals(sheet, data);

    if (data.legalNotice) {
      this.addSpacer(sheet);
      const row = sheet.addRow([data.legalNotice]);
      row.getCell(1).font = { italic: true, size: 8, color: { argb: MUTED_ARGB } };
    }
  }

  private addHeader(sheet: Worksheet, data: ExportDocumentData): void {
    const brandName = data.branding?.brandName ?? 'Fliesenprojekt';

    const brandRow = sheet.addRow([brandName.toUpperCase()]);
    brandRow.getCell(1).font = { size: 9, color: { argb: MUTED_ARGB } };

    const titleRow = sheet.addRow([data.title]);
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF111827' } };

    if (data.subtitle) {
      const subtitleRow = sheet.addRow([data.subtitle]);
      subtitleRow.getCell(1).font = { size: 10, color: { argb: MUTED_ARGB } };
    }

    const metaParts = [
      data.roomName ? `Raum: ${data.roomName}` : null,
      data.projectName ? `Projekt: ${data.projectName}` : null,
      `Erstellt am ${this.formatDate(data.createdAt)}`
    ].filter((part): part is string => part !== null);
    const metaRow = sheet.addRow([metaParts.join('   ·   ')]);
    metaRow.getCell(1).font = { size: 9, color: { argb: MUTED_ARGB } };

    this.addSpacer(sheet);
  }

  private addSection(sheet: Worksheet, section: ExportDocumentSection): void {
    switch (section.type) {
      case 'table':
        this.addMaterialTable(sheet, section);
        break;
      case 'line_items':
        this.addLineItems(sheet, section);
        break;
      case 'summary_cards':
        this.addSummaryCards(sheet, section);
        break;
      case 'warnings':
        this.addList(sheet, section, 'FF92400E');
        break;
      case 'text':
        this.addList(sheet, section, null);
        break;
      default:
        break;
    }
  }

  private addMaterialTable(sheet: Worksheet, section: ExportDocumentSection): void {
    const rows = Array.isArray(section.content)
      ? (section.content as MaterialRow[]).filter((row) => row.active !== false)
      : [];
    if (rows.length === 0) {
      return;
    }

    this.addSectionTitle(sheet, section.title);
    this.addHeaderRow(sheet, ['Position', 'Menge', 'Empf. Einkauf', 'Einzelpreis', 'Summe']);

    for (const row of rows) {
      const dataRow = sheet.addRow([
        this.nameWithNotes(row),
        row.quantity ?? null,
        row.packageCount ?? null,
        row.unitPrice ?? null,
        row.total ?? row.displayCost ?? null
      ]);
      dataRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      this.formatNumberCell(dataRow, 2, this.numberFormatFor(row.unit));
      this.formatNumberCell(dataRow, 3, this.numberFormatFor(row.packageUnit), true);
      this.formatNumberCell(dataRow, 4, CURRENCY_FMT);
      this.formatNumberCell(dataRow, 5, CURRENCY_FMT);
    }

    this.addSpacer(sheet);
  }

  private addLineItems(sheet: Worksheet, section: ExportDocumentSection): void {
    const items = Array.isArray(section.content)
      ? (section.content as OfferLineItem[]).filter((item) => item.isActive !== false)
      : [];
    if (items.length === 0) {
      return;
    }

    this.addSectionTitle(sheet, section.title);
    this.addHeaderRow(sheet, ['Position', 'Menge', 'Einheit', 'Einheitspreis', 'Gesamt']);

    for (const item of items) {
      const label = (item.label ?? '–') + (item.isOptional ? '  (optional)' : '');
      const value = item.description ? `${label}\n${item.description}` : label;
      const dataRow = sheet.addRow([
        value,
        item.quantity ?? null,
        this.unitLabel(item.unit),
        item.unitPrice ?? null,
        item.totalPrice ?? null
      ]);
      dataRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
      this.formatNumberCell(dataRow, 2, NUMBER_FMT);
      this.formatNumberCell(dataRow, 4, CURRENCY_FMT);
      this.formatNumberCell(dataRow, 5, CURRENCY_FMT);
    }

    this.addSpacer(sheet);
  }

  private addSummaryCards(sheet: Worksheet, section: ExportDocumentSection): void {
    const content = section.content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return;
    }
    const entries = Object.entries(content as Record<string, unknown>).filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    );
    if (entries.length === 0) {
      return;
    }

    this.addSectionTitle(sheet, section.title);
    for (const [key, value] of entries) {
      const row = sheet.addRow([CARD_LABELS[key] ?? key, this.cardValue(value)]);
      row.getCell(1).font = { color: { argb: MUTED_ARGB } };
      row.getCell(2).font = { bold: true };
      const numFmt = this.cardNumberFormat(key, value);
      if (numFmt) {
        row.getCell(2).numFmt = numFmt;
      }
    }
    this.addSpacer(sheet);
  }

  private addList(
    sheet: Worksheet,
    section: ExportDocumentSection,
    argb: string | null
  ): void {
    const content = section.content;
    const lines = Array.isArray(content)
      ? content.map((entry) => String(entry))
      : content && typeof content === 'object'
        ? Object.values(content as Record<string, unknown>).map((value) => String(value))
        : content
          ? [String(content)]
          : [];
    if (lines.length === 0) {
      return;
    }

    this.addSectionTitle(sheet, section.title);
    for (const line of lines) {
      const row = sheet.addRow([`•  ${line}`]);
      row.getCell(1).alignment = { wrapText: true };
      if (argb) {
        row.getCell(1).font = { color: { argb } };
      }
    }
    this.addSpacer(sheet);
  }

  private addTotals(sheet: Worksheet, data: ExportDocumentData): void {
    const rows = TOTAL_ROWS.filter((row) => typeof data.totals[row.key] === 'number');
    if (rows.length === 0) {
      return;
    }

    this.addSpacer(sheet);
    for (const definition of rows) {
      const row = sheet.addRow([definition.label, data.totals[definition.key] ?? null]);
      const labelCell = row.getCell(1);
      const valueCell = row.getCell(2);
      valueCell.numFmt = CURRENCY_FMT;
      valueCell.alignment = { horizontal: 'right' };
      if (definition.primary) {
        labelCell.font = { bold: true };
        valueCell.font = { bold: true, color: { argb: BRAND_ARGB } };
      } else {
        labelCell.font = { color: { argb: MUTED_ARGB } };
        valueCell.font = { color: { argb: MUTED_ARGB } };
      }
    }
  }

  private addSectionTitle(sheet: Worksheet, title: string): void {
    const row = sheet.addRow([title]);
    row.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF111827' } };
  }

  private addHeaderRow(sheet: Worksheet, headers: string[]): void {
    const row = sheet.addRow(headers);
    headers.forEach((_, index) => {
      const cell = row.getCell(index + 1);
      cell.font = { bold: true, color: { argb: HEADER_TEXT_ARGB } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_ARGB } };
      cell.alignment = { vertical: 'middle', horizontal: index === 0 ? 'left' : 'right' };
    });
  }

  private addSpacer(sheet: Worksheet): void {
    sheet.addRow([]);
  }

  private formatNumberCell(row: Row, column: number, numFmt: string, bold = false): void {
    const cell = row.getCell(column);
    cell.numFmt = numFmt;
    cell.alignment = { horizontal: 'right', vertical: 'top' };
    if (bold) {
      cell.font = { bold: true };
    }
  }

  private nameWithNotes(row: MaterialRow): string {
    const parts = [row.name ?? '–'];
    const subline = row.note ?? row.notes?.[0];
    if (subline) {
      parts.push(subline);
    }
    if (row.roomNames?.length) {
      parts.push(`Räume: ${row.roomNames.join(', ')}`);
    }
    return parts.join('\n');
  }

  private numberFormatFor(unit: string | null | undefined): string {
    if (!unit) {
      return NUMBER_FMT;
    }
    const safeUnit = unit.replace(/"/g, '');
    return `${NUMBER_FMT}" ${safeUnit}"`;
  }

  private cardValue(value: unknown): string | number {
    return typeof value === 'number' ? value : String(value);
  }

  private cardNumberFormat(key: string, value: unknown): string | null {
    if (typeof value !== 'number') {
      return null;
    }
    if (CURRENCY_KEYS.has(key)) {
      return CURRENCY_FMT;
    }
    if (AREA_KEYS.has(key)) {
      return `${NUMBER_FMT}" m²"`;
    }
    if (key === 'savingsPercent') {
      return `${NUMBER_FMT}" %"`;
    }
    return NUMBER_FMT;
  }

  private unitLabel(unit: string | null | undefined): string {
    if (!unit) {
      return '';
    }
    return UNIT_LABELS[unit] ?? unit;
  }

  private formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  /** Excel begrenzt Blattnamen auf 31 Zeichen ohne []*?/\ : */
  private sheetName(data: ExportDocumentData): string {
    const base = (data.roomName || data.projectName || data.title || 'Export')
      .replace(/[[\]*?/\\:]/g, ' ')
      .trim()
      .slice(0, 31);
    return base || 'Export';
  }
}
