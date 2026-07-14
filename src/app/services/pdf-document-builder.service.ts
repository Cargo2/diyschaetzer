import { Injectable } from '@angular/core';
import type {
  Content,
  TableCell,
  TDocumentDefinitions
} from 'pdfmake/interfaces';
import {
  ExportDocumentData,
  ExportDocumentSection,
  ExportInvoiceMeta,
  ExportOfferGroup
} from '../models/export-document.model';

/**
 * Zeilenform der Materialtabellen aus dem ExportDataMapperService.
 * Deckt sowohl die Raumliste (`total`/`note`) als auch die projektweite
 * Liste (`displayCost`/`roomNames`) ab.
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

const BRAND_COLOR = '#047857';
const MUTED_COLOR = '#6b7280';
const BORDER_COLOR = '#e5e7eb';

/** Lesbare Beschriftungen und Formatierung für summary_cards-Schlüssel. */
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
  { key: 'discountAmount', label: 'Nachlass' },
  { key: 'netAfterDiscount', label: 'Zwischensumme netto' },
  { key: 'vatAmount', label: 'MwSt.' },
  { key: 'grossTotal', label: 'Bruttosumme' },
  { key: 'materialTotal', label: 'Materialkosten gesamt', primary: true },
  { key: 'diyTotal', label: 'DIY-Kosten', primary: true },
  { key: 'professionalTotal', label: 'Fliesenleger-Kosten', primary: true }
];

@Injectable({ providedIn: 'root' })
export class PdfDocumentBuilderService {
  /** Übersetzt das neutrale Exportmodell in eine pdfmake-Dokumentdefinition. */
  build(data: ExportDocumentData): TDocumentDefinitions {
    const brandName = data.branding?.brandName ?? 'Fliesenprojekt';
    const content: Content[] = [this.header(data, brandName)];

    if (data.introText) {
      content.push({ text: data.introText, margin: [0, 4, 0, 8], lineHeight: 1.25 });
    }

    content.push(...data.sections.flatMap((section) => this.section(section)));
    content.push(...this.totals(data));

    if (data.invoiceMeta) {
      content.push(...this.paymentBlock(data.invoiceMeta));
    }

    if (data.taxNote) {
      content.push({ text: data.taxNote, style: 'muted', margin: [0, 8, 0, 0] });
    }
    if (data.outroText) {
      content.push({ text: data.outroText, margin: [0, 14, 0, 0], lineHeight: 1.25 });
    }
    if (data.legalNotice) {
      content.push({
        text: data.legalNotice,
        style: 'legal',
        margin: [0, 18, 0, 0]
      });
    }

    return {
      info: {
        title: data.title,
        subject: data.subtitle ?? undefined
      },
      pageSize: 'A4',
      pageMargins: [40, 56, 40, 48],
      defaultStyle: { font: 'Roboto', fontSize: 9, color: '#1f2937' },
      styles: {
        title: { fontSize: 18, bold: true, color: '#111827' },
        subtitle: { fontSize: 10, color: MUTED_COLOR },
        sectionTitle: { fontSize: 12, bold: true, color: '#111827', margin: [0, 16, 0, 6] },
        tableHeader: { bold: true, fontSize: 9, color: '#ffffff', fillColor: BRAND_COLOR },
        muted: { color: MUTED_COLOR, fontSize: 8 },
        warning: { fontSize: 9, color: '#92400e' },
        legal: { fontSize: 8, italics: true, color: MUTED_COLOR },
        totalLabel: { fontSize: 11, bold: true },
        totalValue: { fontSize: 11, bold: true, color: BRAND_COLOR }
      },
      footer: (currentPage, pageCount) => ({
        margin: [40, 16, 40, 0],
        columns: [
          { text: brandName, style: 'muted' },
          {
            text: `Seite ${currentPage} von ${pageCount}`,
            style: 'muted',
            alignment: 'right'
          }
        ]
      }),
      content
    };
  }

  private header(data: ExportDocumentData, brandName: string): Content {
    if (data.invoiceMeta) {
      return this.invoiceHeader(data, brandName);
    }
    if (data.offerMeta) {
      return this.offerHeader(data, brandName);
    }

    const metaParts = [
      data.roomName ? `Raum: ${data.roomName}` : null,
      data.projectName ? `Projekt: ${data.projectName}` : null,
      `Erstellt am ${this.formatDate(data.createdAt)}`
    ].filter((part): part is string => part !== null);

    return {
      margin: [0, 0, 0, 8],
      stack: [
        { text: brandName.toUpperCase(), style: 'muted', characterSpacing: 1 },
        { text: data.title, style: 'title', margin: [0, 2, 0, 0] },
        ...(data.subtitle ? [{ text: data.subtitle, style: 'subtitle' }] : []),
        { text: metaParts.join('   ·   '), style: 'muted', margin: [0, 6, 0, 0] },
        {
          canvas: [
            { type: 'line', x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 1, lineColor: BORDER_COLOR }
          ]
        }
      ]
    };
  }

  /** Brief-Kopf für das Profi-Angebot: Absender, Empfänger und Angebotsmeta. */
  private offerHeader(data: ExportDocumentData, brandName: string): Content {
    const meta = data.offerMeta!;
    const contactLine = data.branding?.contactLine;

    const metaLines: Content[] = [];
    if (meta.offerNumber) {
      metaLines.push({ text: `Angebot Nr. ${meta.offerNumber}` });
    }
    metaLines.push({
      text: `Datum: ${this.formatDate(meta.offerDate || data.createdAt)}`
    });
    if (meta.validUntil) {
      metaLines.push({ text: `Gültig bis: ${this.formatDate(meta.validUntil)}` });
    }

    const customerStack: Content[] = [{ text: 'Angebot für', style: 'muted' }];
    if (meta.customerName) {
      customerStack.push({ text: meta.customerName, bold: true });
    }
    if (meta.customerAddress) {
      customerStack.push({ text: meta.customerAddress });
    }
    if (!meta.customerName && !meta.customerAddress) {
      customerStack.push({ text: '—' });
    }

    return {
      margin: [0, 0, 0, 8],
      stack: [
        { text: brandName.toUpperCase(), style: 'muted', characterSpacing: 1 },
        ...(contactLine ? [{ text: contactLine, style: 'muted' }] : []),
        {
          margin: [0, 12, 0, 0],
          columns: [
            { width: '*', stack: customerStack },
            { width: 'auto', stack: metaLines, alignment: 'right', style: 'muted' }
          ]
        },
        { text: data.title, style: 'title', margin: [0, 14, 0, 0] },
        ...(data.subtitle ? [{ text: `Projekt: ${data.subtitle}`, style: 'subtitle' }] : []),
        {
          margin: [0, 6, 0, 0],
          canvas: [
            { type: 'line', x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 1, lineColor: BORDER_COLOR }
          ]
        }
      ]
    };
  }

  /** Brief-Kopf für die Rechnung mit den § 14-Pflichtangaben (beidseitige Anschrift). */
  private invoiceHeader(data: ExportDocumentData, brandName: string): Content {
    const meta = data.invoiceMeta!;
    const senderName = meta.sellerName || brandName;

    // Absender (Verkäufer) – Name, Anschrift, Kontakt, Steuernummer/USt-IdNr.
    const sellerStack: Content[] = [
      { text: senderName.toUpperCase(), style: 'muted', characterSpacing: 1 }
    ];
    for (const line of meta.sellerAddressLines) {
      sellerStack.push({ text: line, style: 'muted' });
    }
    for (const line of meta.sellerContactLines) {
      sellerStack.push({ text: line, style: 'muted' });
    }
    if (meta.sellerVatId) {
      sellerStack.push({ text: `USt-IdNr. ${meta.sellerVatId}`, style: 'muted' });
    }
    if (meta.sellerTaxNumber) {
      sellerStack.push({ text: `Steuernummer ${meta.sellerTaxNumber}`, style: 'muted' });
    }

    // Empfänger (Käufer).
    const customerStack: Content[] = [{ text: 'Rechnung an', style: 'muted' }];
    customerStack.push({ text: meta.customerName || '—', bold: true });
    for (const line of meta.customerAddressLines) {
      customerStack.push({ text: line });
    }

    // Rechnungsmeta rechts.
    const metaLines: Content[] = [
      { text: `Rechnung Nr. ${meta.invoiceNumber}`, bold: true },
      { text: `Rechnungsdatum: ${this.formatDate(meta.invoiceDate || data.createdAt)}` }
    ];
    const servicePeriod = this.servicePeriodText(meta);
    if (servicePeriod) {
      metaLines.push({ text: servicePeriod });
    }
    if (meta.dueDate) {
      metaLines.push({ text: `Zahlbar bis: ${this.formatDate(meta.dueDate)}` });
    }
    if (meta.buyerReference && meta.buyerReference.toLowerCase() !== 'n/a') {
      metaLines.push({ text: `Leitweg-ID: ${meta.buyerReference}` });
    }

    return {
      margin: [0, 0, 0, 8],
      stack: [
        { stack: sellerStack },
        {
          margin: [0, 12, 0, 0],
          columns: [
            { width: '*', stack: customerStack },
            { width: 'auto', stack: metaLines, alignment: 'right', style: 'muted' }
          ]
        },
        { text: data.title, style: 'title', margin: [0, 14, 0, 0] },
        ...(data.subtitle ? [{ text: `Projekt: ${data.subtitle}`, style: 'subtitle' }] : []),
        {
          margin: [0, 6, 0, 0],
          canvas: [
            { type: 'line', x1: 0, y1: 4, x2: 515, y2: 4, lineWidth: 1, lineColor: BORDER_COLOR }
          ]
        }
      ]
    };
  }

  /** Zahlungsziel + Bankverbindung unter den Summen (Rechnung). */
  private paymentBlock(meta: ExportInvoiceMeta): Content[] {
    const lines: string[] = [];
    if (meta.dueDate) {
      lines.push(`Zahlbar ohne Abzug bis ${this.formatDate(meta.dueDate)}.`);
    }
    const bankParts = [
      meta.bankName ? `Bank: ${meta.bankName}` : '',
      meta.iban ? `IBAN: ${meta.iban}` : '',
      meta.bic ? `BIC: ${meta.bic}` : ''
    ].filter((part) => part.length > 0);
    if (bankParts.length > 0) {
      lines.push(bankParts.join('   ·   '));
    }
    if (lines.length === 0) {
      return [];
    }
    return [
      {
        margin: [0, 12, 0, 0],
        stack: lines.map((line) => ({ text: line, style: 'muted' }))
      }
    ];
  }

  private servicePeriodText(meta: ExportInvoiceMeta): string | null {
    if (meta.servicePeriodStart && meta.servicePeriodEnd) {
      return `Leistungszeitraum: ${this.formatDate(meta.servicePeriodStart)} – ${this.formatDate(meta.servicePeriodEnd)}`;
    }
    if (meta.serviceDate) {
      return `Leistungsdatum: ${this.formatDate(meta.serviceDate)}`;
    }
    return null;
  }

  private section(section: ExportDocumentSection): Content[] {
    switch (section.type) {
      case 'table':
        return this.tableSection(section);
      case 'warnings':
        return this.warningsSection(section);
      case 'text':
        return this.textSection(section);
      case 'summary_cards':
        return this.summaryCardsSection(section);
      case 'line_items':
        return this.lineItemsSection(section);
      case 'offer':
        return this.offerSection(section);
      default:
        return [];
    }
  }

  /** Leistungsverzeichnis: je Gruppe ein Header, eine Positionstabelle und eine Zwischensumme. */
  private offerSection(section: ExportDocumentSection): Content[] {
    const groups = Array.isArray(section.content)
      ? (section.content as ExportOfferGroup[])
      : [];
    const content: Content[] = [];

    for (const group of groups) {
      const heading = group.positionLabel
        ? `${group.positionLabel}   ${group.title}`
        : group.title;
      content.push({ text: heading, style: 'sectionTitle' });

      const body: TableCell[][] = [
        [
          { text: 'Pos', style: 'tableHeader' },
          { text: 'Bezeichnung', style: 'tableHeader' },
          { text: 'Menge', style: 'tableHeader', alignment: 'right' },
          { text: 'Einheit', style: 'tableHeader' },
          { text: 'Einheitspreis', style: 'tableHeader', alignment: 'right' },
          { text: 'Gesamt', style: 'tableHeader', alignment: 'right' }
        ],
        ...group.rows.map((row): TableCell[] => {
          const labelStack: Content[] = [{ text: row.label, bold: true }];
          if (row.description) {
            labelStack.push({ text: row.description, style: 'muted' });
          }
          if (row.isOptional) {
            labelStack.push({
              text: 'Bedarfsposition – nicht in der Angebotssumme',
              style: 'muted'
            });
          }
          return [
            { text: row.number },
            { stack: labelStack },
            { text: this.amount(row.quantity, null), alignment: 'right' },
            { text: this.unitLabel(row.unit), alignment: 'left' },
            { text: this.currency(row.unitPrice), alignment: 'right' },
            { text: this.currency(row.total), alignment: 'right' }
          ];
        })
      ];

      content.push({
        table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'], body },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => BORDER_COLOR,
          paddingTop: () => 4,
          paddingBottom: () => 4
        }
      });

      if (group.subtotal !== null) {
        content.push({
          margin: [0, 2, 0, 0],
          columns: [
            { text: '', width: '*' },
            {
              text: `Summe ${group.title}: ${this.currency(group.subtotal)}`,
              width: 'auto',
              bold: true
            }
          ]
        });
      }
    }

    return content;
  }

  private summaryCardsSection(section: ExportDocumentSection): Content[] {
    const content = section.content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return [];
    }
    const entries = Object.entries(content as Record<string, unknown>).filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    );
    if (entries.length === 0) {
      return [];
    }

    return [
      { text: section.title, style: 'sectionTitle' },
      {
        columns: entries.map(([key, value]) => ({
          width: '*',
          stack: [
            { text: CARD_LABELS[key] ?? key, style: 'muted' },
            { text: this.formatCardValue(key, value), bold: true, fontSize: 11 }
          ]
        })),
        columnGap: 12
      }
    ];
  }

  private lineItemsSection(section: ExportDocumentSection): Content[] {
    const items = Array.isArray(section.content)
      ? (section.content as OfferLineItem[]).filter((item) => item.isActive !== false)
      : [];
    if (items.length === 0) {
      return [];
    }

    const body: TableCell[][] = [
      [
        { text: 'Position', style: 'tableHeader' },
        { text: 'Menge', style: 'tableHeader', alignment: 'right' },
        { text: 'Einheit', style: 'tableHeader' },
        { text: 'Einheitspreis', style: 'tableHeader', alignment: 'right' },
        { text: 'Gesamt', style: 'tableHeader', alignment: 'right' }
      ],
      ...items.map((item): TableCell[] => {
        const labelStack: Content[] = [
          {
            text: item.label ?? '–' + (item.isOptional ? '  (optional)' : ''),
            bold: true
          }
        ];
        if (item.description) {
          labelStack.push({ text: item.description, style: 'muted' });
        }
        return [
          { stack: labelStack },
          { text: this.amount(item.quantity, null), alignment: 'right' },
          { text: this.unitLabel(item.unit), alignment: 'left' },
          { text: this.currency(item.unitPrice), alignment: 'right' },
          { text: this.currency(item.totalPrice), alignment: 'right' }
        ];
      })
    ];

    return [
      { text: section.title, style: 'sectionTitle' },
      {
        table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto'], body },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => BORDER_COLOR,
          paddingTop: () => 4,
          paddingBottom: () => 4
        }
      }
    ];
  }

  private tableSection(section: ExportDocumentSection): Content[] {
    const rows = Array.isArray(section.content)
      ? (section.content as MaterialRow[]).filter((row) => row.active !== false)
      : [];
    if (rows.length === 0) {
      return [];
    }

    const body: TableCell[][] = [
      [
        { text: 'Position', style: 'tableHeader' },
        { text: 'Menge', style: 'tableHeader', alignment: 'right' },
        { text: 'Empf. Einkauf', style: 'tableHeader', alignment: 'right' },
        { text: 'Einzelpreis', style: 'tableHeader', alignment: 'right' },
        { text: 'Summe', style: 'tableHeader', alignment: 'right' }
      ],
      ...rows.map((row) => this.materialRow(row))
    ];

    return [
      { text: section.title, style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body
        },
        layout: {
          hLineWidth: (i: number) => (i === 0 || i === 1 ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => BORDER_COLOR,
          paddingTop: () => 4,
          paddingBottom: () => 4
        }
      }
    ];
  }

  private materialRow(row: MaterialRow): TableCell[] {
    const nameStack: Content[] = [{ text: row.name ?? '–', bold: true }];
    const subline = row.note ?? row.notes?.[0];
    if (subline) {
      nameStack.push({ text: subline, style: 'muted' });
    }
    if (row.roomNames?.length) {
      nameStack.push({ text: `Räume: ${row.roomNames.join(', ')}`, style: 'muted' });
    }

    return [
      { stack: nameStack },
      { text: this.amount(row.quantity, row.unit), alignment: 'right' },
      {
        text: this.amount(row.packageCount, row.packageUnit),
        alignment: 'right',
        bold: true
      },
      { text: this.currency(row.unitPrice), alignment: 'right' },
      { text: this.currency(row.total ?? row.displayCost), alignment: 'right' }
    ];
  }

  private warningsSection(section: ExportDocumentSection): Content[] {
    const warnings = Array.isArray(section.content)
      ? (section.content as string[])
      : [];
    if (warnings.length === 0) {
      return [];
    }

    return [
      { text: section.title, style: 'sectionTitle' },
      {
        ul: warnings.map((warning) => ({ text: warning, style: 'warning' })),
        margin: [0, 0, 0, 4]
      }
    ];
  }

  private textSection(section: ExportDocumentSection): Content[] {
    const content = section.content;
    const lines = Array.isArray(content)
      ? content.map((entry) => String(entry))
      : content && typeof content === 'object'
        ? Object.values(content as Record<string, unknown>).map((value) => String(value))
        : [String(content)];

    return [
      { text: section.title, style: 'sectionTitle' },
      { ul: lines, margin: [0, 0, 0, 4] }
    ];
  }

  private totals(data: ExportDocumentData): Content[] {
    const rows = TOTAL_ROWS.filter(
      (row) => typeof data.totals[row.key] === 'number'
    );
    if (rows.length === 0) {
      return [];
    }

    const body: TableCell[][] = rows.map((row, index) => {
      // Bruttosumme ist der Abschluss eines Angebots → immer hervorheben.
      const primary = row.primary === true || row.key === 'grossTotal';
      const showTopBorder = index === 0 || primary;
      let label = row.label;
      if (row.key === 'vatAmount' && typeof data.totals.vatPercent === 'number') {
        label = `MwSt. (${data.totals.vatPercent} %)`;
      } else if (row.key === 'discountAmount' && typeof data.totals.discountPercent === 'number') {
        label = `Nachlass (${data.totals.discountPercent} %)`;
      }
      return [
        {
          text: label,
          style: primary ? 'totalLabel' : 'muted',
          border: [false, showTopBorder, false, false]
        },
        {
          text: this.currency(data.totals[row.key]),
          style: primary ? 'totalValue' : 'muted',
          alignment: 'right',
          border: [false, showTopBorder, false, false]
        }
      ];
    });

    return [
      {
        margin: [0, 14, 0, 0],
        columns: [
          { text: '', width: '*' },
          {
            width: 'auto',
            table: { widths: ['*', 'auto'], body },
            layout: {
              hLineWidth: () => 0.8,
              hLineColor: () => BRAND_COLOR,
              vLineWidth: () => 0,
              paddingTop: () => 5,
              paddingBottom: () => 2,
              paddingLeft: () => 12,
              paddingRight: () => 0
            }
          }
        ]
      }
    ];
  }

  private formatCardValue(key: string, value: unknown): string {
    if (typeof value === 'number') {
      if (AREA_KEYS.has(key)) {
        return `${this.amount(value, 'm²')}`;
      }
      if (CURRENCY_KEYS.has(key)) {
        return this.currency(value);
      }
      if (key === 'savingsPercent') {
        return `${this.amount(value, '%')}`;
      }
      return this.amount(value, null);
    }
    return String(value);
  }

  private unitLabel(unit: string | null | undefined): string {
    if (!unit) {
      return '';
    }
    return UNIT_LABELS[unit] ?? unit;
  }

  private amount(value: number | null | undefined, unit: string | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '–';
    }
    const formatted = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
    return unit ? `${formatted} ${unit}` : formatted;
  }

  private currency(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '–';
    }
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
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
}
