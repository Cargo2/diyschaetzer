import { Injectable } from '@angular/core';
import { ProfessionalLineItemUnit } from './professional-offer.service';
import {
  ContractorInvoice,
  invoiceDiscountAmount,
  invoiceGrossTotal,
  invoiceNetAfterDiscount,
  invoiceNetTotal,
  invoiceVatAmount
} from '../models/contractor-invoice.model';
import { ContractorOfferLine } from '../models/contractor-offer.model';

/** UN/ECE-Rec-20-Einheitencodes je interner Einheit (Spec § 5). */
const UNIT_CODE: Record<ProfessionalLineItemUnit, string> = {
  m2: 'MTK', // Quadratmeter
  lfm: 'MTR', // Meter (laufender Meter)
  piece: 'H87', // Stück
  pauschal: 'C62', // Eins (pauschal)
  hour: 'HUR' // Stunde
};

const CUSTOMIZATION_ID =
  'urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0';
const PROFILE_ID = 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0';
const EXEMPTION_REASON = 'Kleinunternehmerregelung § 19 UStG';
const CURRENCY = 'EUR';

/** Eine abrechenbare (aktive Pflicht-)Position mit abgeleitetem Zeilennetto. */
interface BillableLine {
  line: ContractorOfferLine;
  net: number;
}

/**
 * Erzeugt aus einer {@link ContractorInvoice} eine **UBL-2.1-Invoice** nach
 * EN 16931 / XRechnung-CIUS 3.0 – ohne Fremd-Dependency, als sauber aufgebauter
 * String-Builder (Beträge via `toFixed(2)`, Texte XML-escaped).
 *
 * **Grenze (dokumentiert):** Wir garantieren strukturkonformes EN-16931-UBL; die
 * formale Schematron-Validierung (KoSIT-Validator) läuft NICHT in der App – vor
 * produktivem B2G-Versand einmal extern validieren (erechnung.gv / KoSIT).
 */
@Injectable({ providedIn: 'root' })
export class XRechnungExportService {
  /** Baut das vollständige XRechnung-XML als String. */
  buildXml(invoice: ContractorInvoice): string {
    const billable = this.billableLines(invoice);
    const netTotal = invoiceNetTotal(invoice);
    const discount = invoiceDiscountAmount(invoice);
    const taxable = invoiceNetAfterDiscount(invoice);
    const vatAmount = invoiceVatAmount(invoice);
    const gross = invoiceGrossTotal(invoice);
    const isSmallBusiness = this.round(invoice.vatPercent) === 0;
    const taxCategory = isSmallBusiness ? 'E' : 'S';
    const vatPercent = this.round(invoice.vatPercent);

    const parts: string[] = [];
    parts.push('<?xml version="1.0" encoding="UTF-8"?>');
    parts.push(
      '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"' +
        ' xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"' +
        ' xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">'
    );

    // ── Kopf (Reihenfolge nach UBL-Schema zwingend) ─────────────────────────
    parts.push(this.el('cbc:CustomizationID', CUSTOMIZATION_ID));
    parts.push(this.el('cbc:ProfileID', PROFILE_ID));
    parts.push(this.el('cbc:ID', invoice.invoiceNumber));
    parts.push(this.el('cbc:IssueDate', invoice.invoiceDate));
    if (invoice.dueDate) {
      parts.push(this.el('cbc:DueDate', invoice.dueDate));
    }
    parts.push(this.el('cbc:InvoiceTypeCode', '380'));
    parts.push(this.el('cbc:DocumentCurrencyCode', CURRENCY));
    parts.push(this.el('cbc:BuyerReference', invoice.buyerReference || 'n/a'));

    // Leistungszeitraum (BT-73/74), falls angegeben.
    if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
      parts.push('<cac:InvoicePeriod>');
      parts.push(this.el('cbc:StartDate', invoice.servicePeriodStart));
      parts.push(this.el('cbc:EndDate', invoice.servicePeriodEnd));
      parts.push('</cac:InvoicePeriod>');
    }

    parts.push(this.supplierParty(invoice));
    parts.push(this.customerParty(invoice));

    // Leistungsdatum (BT-72) als tatsächliches Lieferdatum, falls kein Zeitraum.
    if (invoice.serviceDate && !(invoice.servicePeriodStart && invoice.servicePeriodEnd)) {
      parts.push('<cac:Delivery>');
      parts.push(this.el('cbc:ActualDeliveryDate', invoice.serviceDate));
      parts.push('</cac:Delivery>');
    }

    // Zahlungsmittel (SEPA-Überweisung), falls IBAN vorhanden.
    if (invoice.seller.iban) {
      parts.push('<cac:PaymentMeans>');
      parts.push(this.el('cbc:PaymentMeansCode', '58'));
      parts.push('<cac:PayeeFinancialAccount>');
      parts.push(this.el('cbc:ID', invoice.seller.iban));
      if (invoice.seller.bankName) {
        parts.push(this.el('cbc:Name', invoice.seller.bankName));
      }
      if (invoice.seller.bic) {
        parts.push('<cac:FinancialInstitutionBranch>');
        parts.push(this.el('cbc:ID', invoice.seller.bic));
        parts.push('</cac:FinancialInstitutionBranch>');
      }
      parts.push('</cac:PayeeFinancialAccount>');
      parts.push('</cac:PaymentMeans>');
    }

    // Zahlungsbedingungen (Zahlungsziel).
    if (invoice.dueDate) {
      parts.push('<cac:PaymentTerms>');
      parts.push(this.el('cbc:Note', `Zahlbar ohne Abzug bis ${invoice.dueDate}`));
      parts.push('</cac:PaymentTerms>');
    }

    // Dokument-Nachlass als AllowanceCharge (vor TaxTotal, kategorie-konform).
    if (discount > 0) {
      parts.push('<cac:AllowanceCharge>');
      parts.push(this.el('cbc:ChargeIndicator', 'false'));
      parts.push(this.el('cbc:AllowanceChargeReason', 'Nachlass'));
      parts.push(this.amountEl('cbc:Amount', discount));
      parts.push('<cac:TaxCategory>');
      parts.push(this.el('cbc:ID', taxCategory));
      parts.push(this.el('cbc:Percent', this.num(vatPercent)));
      parts.push(this.taxScheme());
      parts.push('</cac:TaxCategory>');
      parts.push('</cac:AllowanceCharge>');
    }

    // Steuer (eine Kategorie/ein Satz).
    parts.push('<cac:TaxTotal>');
    parts.push(this.amountEl('cbc:TaxAmount', vatAmount));
    parts.push('<cac:TaxSubtotal>');
    parts.push(this.amountEl('cbc:TaxableAmount', taxable));
    parts.push(this.amountEl('cbc:TaxAmount', vatAmount));
    parts.push('<cac:TaxCategory>');
    parts.push(this.el('cbc:ID', taxCategory));
    parts.push(this.el('cbc:Percent', this.num(vatPercent)));
    if (isSmallBusiness) {
      parts.push(this.el('cbc:TaxExemptionReason', EXEMPTION_REASON));
    }
    parts.push(this.taxScheme());
    parts.push('</cac:TaxCategory>');
    parts.push('</cac:TaxSubtotal>');
    parts.push('</cac:TaxTotal>');

    // Summenblock.
    parts.push('<cac:LegalMonetaryTotal>');
    parts.push(this.amountEl('cbc:LineExtensionAmount', netTotal));
    parts.push(this.amountEl('cbc:TaxExclusiveAmount', taxable));
    parts.push(this.amountEl('cbc:TaxInclusiveAmount', gross));
    if (discount > 0) {
      parts.push(this.amountEl('cbc:AllowanceTotalAmount', discount));
    }
    parts.push(this.amountEl('cbc:PayableAmount', gross));
    parts.push('</cac:LegalMonetaryTotal>');

    // Positionen.
    billable.forEach((entry, index) => {
      parts.push(this.invoiceLine(entry, index + 1, taxCategory, vatPercent));
    });

    parts.push('</Invoice>');
    return parts.join('\n');
  }

  /** Baut das XML und lädt es als `<Rechnungsnummer>.xml` herunter. */
  download(invoice: ContractorInvoice): void {
    const xml = this.buildXml(invoice);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.safeFileName(invoice.invoiceNumber)}.xml`;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // ---- Bausteine -----------------------------------------------------------

  private invoiceLine(
    entry: BillableLine,
    number: number,
    taxCategory: string,
    vatPercent: number
  ): string {
    const { line, net } = entry;
    const unitCode = UNIT_CODE[line.unit] ?? 'C62';
    const parts: string[] = [];
    parts.push('<cac:InvoiceLine>');
    parts.push(this.el('cbc:ID', String(number)));
    parts.push(
      `<cbc:InvoicedQuantity unitCode="${this.esc(unitCode)}">${this.num(line.quantity)}</cbc:InvoicedQuantity>`
    );
    parts.push(this.amountEl('cbc:LineExtensionAmount', net));
    parts.push('<cac:Item>');
    // UBL-2.1-Schema: in cac:Item MUSS cbc:Description VOR cbc:Name stehen
    // (KoSIT-Validator: cvc-complex-type.2.4.a bei umgekehrter Reihenfolge).
    if (line.description) {
      parts.push(this.el('cbc:Description', line.description));
    }
    parts.push(this.el('cbc:Name', line.label || 'Position'));
    // Zeilen-Steuerkategorie (BG-30): nur ID + Satz; der Befreiungsgrund (BT-120)
    // steht ausschließlich im Dokument-TaxSubtotal.
    parts.push('<cac:ClassifiedTaxCategory>');
    parts.push(this.el('cbc:ID', taxCategory));
    parts.push(this.el('cbc:Percent', this.num(vatPercent)));
    parts.push(this.taxScheme());
    parts.push('</cac:ClassifiedTaxCategory>');
    parts.push('</cac:Item>');
    parts.push('<cac:Price>');
    parts.push(this.amountEl('cbc:PriceAmount', line.unitPrice));
    parts.push('</cac:Price>');
    parts.push('</cac:InvoiceLine>');
    return parts.join('\n');
  }

  private supplierParty(invoice: ContractorInvoice): string {
    const s = invoice.seller;
    const parts: string[] = [];
    parts.push('<cac:AccountingSupplierParty>');
    parts.push('<cac:Party>');
    if (s.email) {
      parts.push(`<cbc:EndpointID schemeID="EM">${this.esc(s.email)}</cbc:EndpointID>`);
    }
    // BR-CO-26: ohne USt-IdNr. (BT-31) braucht der Verkäufer eine andere Kennung –
    // dann dient die Steuernummer als Seller identifier (BT-29).
    if (!s.vatId && s.taxNumber) {
      parts.push('<cac:PartyIdentification>');
      parts.push(this.el('cbc:ID', s.taxNumber));
      parts.push('</cac:PartyIdentification>');
    }
    parts.push(this.postalAddress(s.street, s.city, s.postalCode, s.countryCode));
    if (s.vatId) {
      parts.push(this.partyTaxScheme(s.vatId, 'VAT'));
    }
    if (s.taxNumber) {
      parts.push(this.partyTaxScheme(s.taxNumber, 'FC'));
    }
    parts.push('<cac:PartyLegalEntity>');
    parts.push(this.el('cbc:RegistrationName', s.companyName || 'Fachbetrieb'));
    parts.push('</cac:PartyLegalEntity>');
    // BR-DE-5: Kontaktname ist Pflicht – ohne Ansprechpartner trägt der Firmenname.
    const contactName = s.contactName || s.companyName;
    if (contactName || s.phone || s.email) {
      parts.push('<cac:Contact>');
      if (contactName) {
        parts.push(this.el('cbc:Name', contactName));
      }
      if (s.phone) {
        parts.push(this.el('cbc:Telephone', s.phone));
      }
      if (s.email) {
        parts.push(this.el('cbc:ElectronicMail', s.email));
      }
      parts.push('</cac:Contact>');
    }
    parts.push('</cac:Party>');
    parts.push('</cac:AccountingSupplierParty>');
    return parts.join('\n');
  }

  private customerParty(invoice: ContractorInvoice): string {
    const c = invoice.customer;
    const parts: string[] = [];
    parts.push('<cac:AccountingCustomerParty>');
    parts.push('<cac:Party>');
    // BT-49 Buyer electronic address (PEPPOL-EN16931-R010: Pflicht).
    if (c.email) {
      parts.push(`<cbc:EndpointID schemeID="EM">${this.esc(c.email)}</cbc:EndpointID>`);
    }
    parts.push(this.postalAddress(c.street, c.city, c.postalCode, c.countryCode));
    parts.push('<cac:PartyLegalEntity>');
    parts.push(this.el('cbc:RegistrationName', c.name || 'Kunde'));
    parts.push('</cac:PartyLegalEntity>');
    parts.push('</cac:Party>');
    parts.push('</cac:AccountingCustomerParty>');
    return parts.join('\n');
  }

  private postalAddress(
    street: string,
    city: string,
    postalCode: string,
    countryCode: string
  ): string {
    const parts: string[] = ['<cac:PostalAddress>'];
    if (street) {
      parts.push(this.el('cbc:StreetName', street));
    }
    parts.push(this.el('cbc:CityName', city));
    parts.push(this.el('cbc:PostalZone', postalCode));
    parts.push('<cac:Country>');
    parts.push(this.el('cbc:IdentificationCode', countryCode || 'DE'));
    parts.push('</cac:Country>');
    parts.push('</cac:PostalAddress>');
    return parts.join('\n');
  }

  private partyTaxScheme(companyId: string, schemeId: string): string {
    return [
      '<cac:PartyTaxScheme>',
      this.el('cbc:CompanyID', companyId),
      '<cac:TaxScheme>',
      this.el('cbc:ID', schemeId),
      '</cac:TaxScheme>',
      '</cac:PartyTaxScheme>'
    ].join('\n');
  }

  private taxScheme(): string {
    return ['<cac:TaxScheme>', this.el('cbc:ID', 'VAT'), '</cac:TaxScheme>'].join('\n');
  }

  // ---- Helfer --------------------------------------------------------------

  /** Nur summenwirksame (aktive Pflicht-)Positionen mit gerundetem Zeilennetto. */
  private billableLines(invoice: ContractorInvoice): BillableLine[] {
    const result: BillableLine[] = [];
    for (const section of invoice.sections) {
      for (const line of section.lines) {
        if (line.isActive && line.isOptional !== true) {
          result.push({
            line,
            net: this.round(this.toNumber(line.quantity) * this.toNumber(line.unitPrice))
          });
        }
      }
    }
    return result;
  }

  private el(tag: string, value: string): string {
    return `<${tag}>${this.esc(value)}</${tag}>`;
  }

  private amountEl(tag: string, value: number): string {
    return `<${tag} currencyID="${CURRENCY}">${this.amount(value)}</${tag}>`;
  }

  private amount(value: number): string {
    return this.round(value).toFixed(2);
  }

  /** Menge/Prozent ohne erzwungene Nachkommastellen, aber deterministisch gerundet. */
  private num(value: number): string {
    const rounded = Math.round(this.toNumber(value) * 10000) / 10000;
    return String(rounded);
  }

  private round(value: number): number {
    return Number((this.toNumber(value)).toFixed(2));
  }

  private toNumber(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private esc(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private safeFileName(name: string): string {
    const cleaned = String(name ?? '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || 'rechnung';
  }
}
