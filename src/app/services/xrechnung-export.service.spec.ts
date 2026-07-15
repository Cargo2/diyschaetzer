import { ContractorOfferLine } from '../models/contractor-offer.model';
import {
  ContractorInvoice,
  emptyInvoiceCustomer,
  emptyInvoiceSeller,
  invoiceGrossTotal
} from '../models/contractor-invoice.model';
import { XRechnungExportService } from './xrechnung-export.service';

function line(partial: Partial<ContractorOfferLine>): ContractorOfferLine {
  return {
    id: 'l',
    label: 'Position',
    description: '',
    quantity: 1,
    unit: 'pauschal',
    unitPrice: 0,
    isActive: true,
    isOptional: false,
    origin: 'generated',
    ...partial
  };
}

function baseInvoice(overrides: Partial<ContractorInvoice> = {}): ContractorInvoice {
  return {
    id: 'inv-1',
    projectId: 'p1',
    offerId: 'o1',
    projectName: 'Sanierung',
    invoiceNumber: 'RE-2026-007',
    invoiceDate: '2026-07-11',
    serviceDate: '2026-07-10',
    dueDate: '2026-07-25',
    buyerReference: 'LWID-04011000-1234512345-06',
    status: 'draft',
    vatPercent: 19,
    discountPercent: 0,
    sections: [
      {
        id: 'site',
        kind: 'site_setup',
        title: 'Baustelle',
        lines: [line({ id: 'a', label: 'Baustelle einrichten', unit: 'pauschal', quantity: 1, unitPrice: 200 })]
      },
      {
        id: 'room',
        kind: 'room',
        title: 'Badezimmer',
        lines: [
          line({ id: 'b', label: 'Fliesen verlegen & <Details>', unit: 'm2', quantity: 20, unitPrice: 30 }),
          line({ id: 'c', label: 'Sockelleisten', unit: 'lfm', quantity: 18, unitPrice: 5 }),
          line({ id: 'd', label: 'Bohrungen', unit: 'piece', quantity: 2, unitPrice: 25 }),
          line({ id: 'opt', label: 'Bedarf', unit: 'm2', quantity: 20, unitPrice: 44, isOptional: true })
        ]
      }
    ],
    customer: {
      ...emptyInvoiceCustomer(),
      name: 'Firma Kunde & Co. KG',
      street: 'Musterweg 3',
      postalCode: '50667',
      city: 'Köln',
      email: 'kunde@beispiel.de'
    },
    seller: {
      ...emptyInvoiceSeller(),
      companyName: 'Fliesen Meister GmbH',
      street: 'Handwerkerstr. 5',
      postalCode: '10115',
      city: 'Berlin',
      email: 'info@fliesenmeister.de',
      vatId: 'DE123456789',
      iban: 'DE02120300000000202051',
      bic: 'BYLADEM1001',
      bankName: 'Test Bank'
    },
    ...overrides
  };
}

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

function text(doc: Document, selector: string): string | null {
  return doc.querySelector(selector)?.textContent ?? null;
}

describe('XRechnungExportService', () => {
  const service = new XRechnungExportService();

  it('produces well-formed XML (no parser error)', () => {
    const doc = parse(service.buildXml(baseInvoice()));
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.localName).toBe('Invoice');
  });

  it('carries the XRechnung CustomizationID/ProfileID, type 380, currency and BuyerReference', () => {
    const doc = parse(service.buildXml(baseInvoice()));
    expect(text(doc, 'CustomizationID')).toContain('xrechnung_3.0');
    expect(text(doc, 'ProfileID')).toContain('peppol');
    expect(text(doc, 'ID')).toBe('RE-2026-007');
    expect(text(doc, 'InvoiceTypeCode')).toBe('380');
    expect(text(doc, 'DocumentCurrencyCode')).toBe('EUR');
    expect(text(doc, 'BuyerReference')).toBe('LWID-04011000-1234512345-06');
  });

  it('includes both party names and postal codes', () => {
    const doc = parse(service.buildXml(baseInvoice()));
    const supplierZone = text(doc, 'AccountingSupplierParty PostalAddress PostalZone');
    const customerZone = text(doc, 'AccountingCustomerParty PostalAddress PostalZone');
    expect(supplierZone).toBe('10115');
    expect(customerZone).toBe('50667');
    const names = Array.from(doc.querySelectorAll('PartyLegalEntity RegistrationName')).map(
      (node) => node.textContent
    );
    expect(names).toContain('Fliesen Meister GmbH');
    expect(names).toContain('Firma Kunde & Co. KG');
  });

  it('puts cbc:Description before cbc:Name inside cac:Item (UBL 2.1 element order)', () => {
    // KoSIT-Validator meldet sonst cvc-complex-type.2.4.a (Schema-Verstoß).
    const doc = parse(service.buildXml(baseInvoice()));
    const items = Array.from(doc.querySelectorAll('InvoiceLine Item'));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const children = Array.from(item.children).map((child) => child.localName);
      const descIndex = children.indexOf('Description');
      const nameIndex = children.indexOf('Name');
      expect(nameIndex).toBeGreaterThanOrEqual(0);
      if (descIndex >= 0) {
        expect(descIndex).toBeLessThan(nameIndex);
      }
    }
  });

  it('maps each unit to its UN/ECE code', () => {
    const doc = parse(service.buildXml(baseInvoice()));
    const codes = Array.from(doc.querySelectorAll('InvoiceLine InvoicedQuantity')).map((node) =>
      node.getAttribute('unitCode')
    );
    // pauschal, m2, lfm, piece (die optionale Bedarfsposition fehlt).
    expect(codes).toEqual(['C62', 'MTK', 'MTR', 'H87']);
  });

  it('keeps TaxTotal consistent and PayableAmount equal to the gross total', () => {
    const invoice = baseInvoice();
    const doc = parse(service.buildXml(invoice));
    const taxAmount = Number(text(doc, 'TaxTotal > TaxAmount'));
    const subtotalTax = Number(text(doc, 'TaxSubtotal > TaxAmount'));
    expect(taxAmount).toBeCloseTo(subtotalTax, 2);

    // Netto: 200 + 600 + 90 + 50 = 940; 19 % → 178.60; Brutto 1118.60.
    expect(Number(text(doc, 'LegalMonetaryTotal LineExtensionAmount'))).toBeCloseTo(940, 2);
    expect(Number(text(doc, 'TaxTotal > TaxAmount'))).toBeCloseTo(178.6, 2);
    expect(Number(text(doc, 'PayableAmount'))).toBeCloseTo(invoiceGrossTotal(invoice), 2);
    expect(Number(text(doc, 'PayableAmount'))).toBeCloseTo(1118.6, 2);
  });

  it('escapes special characters in text values', () => {
    const xml = service.buildXml(baseInvoice());
    expect(xml).toContain('Fliesen verlegen &amp; &lt;Details&gt;');
    expect(xml).toContain('Firma Kunde &amp; Co. KG');
  });

  it('renders a document-level AllowanceCharge and AllowanceTotalAmount for a discount', () => {
    const doc = parse(service.buildXml(baseInvoice({ discountPercent: 10 })));
    expect(text(doc, 'AllowanceCharge ChargeIndicator')).toBe('false');
    // Nachlass 10 % von 940 = 94.00.
    expect(Number(text(doc, 'AllowanceCharge > Amount'))).toBeCloseTo(94, 2);
    expect(Number(text(doc, 'AllowanceTotalAmount'))).toBeCloseTo(94, 2);
    expect(Number(text(doc, 'TaxExclusiveAmount'))).toBeCloseTo(846, 2);
  });

  it('uses tax category E with an exemption reason for the § 19 (0 %) case', () => {
    const doc = parse(service.buildXml(baseInvoice({ vatPercent: 0 })));
    expect(text(doc, 'TaxSubtotal TaxCategory ID')).toBe('E');
    expect(text(doc, 'TaxExemptionReason')).toContain('§ 19');
    expect(Number(text(doc, 'TaxTotal > TaxAmount'))).toBeCloseTo(0, 2);
    // Brutto = Netto (keine USt.).
    expect(Number(text(doc, 'PayableAmount'))).toBeCloseTo(940, 2);
    const lineCategory = doc.querySelector('InvoiceLine ClassifiedTaxCategory ID');
    expect(lineCategory?.textContent).toBe('E');
  });

  it('includes SEPA PaymentMeans (code 58) with IBAN/BIC', () => {
    const doc = parse(service.buildXml(baseInvoice()));
    expect(text(doc, 'PaymentMeans PaymentMeansCode')).toBe('58');
    expect(text(doc, 'PayeeFinancialAccount > ID')).toBe('DE02120300000000202051');
    expect(text(doc, 'FinancialInstitutionBranch > ID')).toBe('BYLADEM1001');
  });

  it('emits the buyer EndpointID (BT-49) before PostalAddress in the customer party', () => {
    const doc = parse(service.buildXml(baseInvoice()));
    const party = doc.querySelector('AccountingCustomerParty > Party');
    expect(party).not.toBeNull();
    const endpoint = party!.querySelector('EndpointID');
    expect(endpoint?.textContent).toBe('kunde@beispiel.de');
    expect(endpoint?.getAttribute('schemeID')).toBe('EM');
    const children = Array.from(party!.children).map((child) => child.localName);
    expect(children.indexOf('EndpointID')).toBeLessThan(children.indexOf('PostalAddress'));
  });

  it('adds a PartyIdentification with the tax number (BT-29) when no VAT ID is set', () => {
    const doc = parse(
      service.buildXml(baseInvoice({ seller: { ...baseInvoice().seller, vatId: '', taxNumber: '12/345/67890' } }))
    );
    const party = doc.querySelector('AccountingSupplierParty > Party');
    expect(party).not.toBeNull();
    const identification = party!.querySelector('PartyIdentification > ID');
    expect(identification?.textContent).toBe('12/345/67890');
    const children = Array.from(party!.children).map((child) => child.localName);
    expect(children.indexOf('PartyIdentification')).toBeLessThan(children.indexOf('PostalAddress'));
    // FC-PartyTaxScheme bleibt weiterhin vorhanden.
    const schemeIds = Array.from(party!.querySelectorAll('PartyTaxScheme > TaxScheme > ID')).map(
      (node) => node.textContent
    );
    expect(schemeIds).toContain('FC');
  });

  it('omits PartyIdentification in the supplier party when a VAT ID is set', () => {
    const doc = parse(service.buildXml(baseInvoice()));
    const party = doc.querySelector('AccountingSupplierParty > Party');
    expect(party!.querySelector('PartyIdentification')).toBeNull();
  });

  it('falls back to the company name as the seller Contact name (BR-DE-5)', () => {
    const doc = parse(
      service.buildXml(baseInvoice({ seller: { ...baseInvoice().seller, contactName: '' } }))
    );
    const contactName = text(doc, 'AccountingSupplierParty Contact > Name');
    expect(contactName).toBe('Fliesen Meister GmbH');
  });

  describe('final invoice with prepaid amounts (BT-113, R3-B)', () => {
    const settled = [
      {
        invoiceId: 'dep-1',
        invoiceNumber: 'RE-2026-005',
        kind: 'deposit' as const,
        invoiceDate: '2026-05-01',
        grossAmount: 500,
        netAmount: 420.17,
        vatAmount: 79.83
      }
    ];

    it('emits PrepaidAmount (BT-113) and reduces PayableAmount (BT-115) accordingly', () => {
      const invoice = baseInvoice({ kind: 'final', settledPayments: settled });
      const doc = parse(service.buildXml(invoice));
      // Brutto 1118.60 − Anzahlung 500 = 618.60.
      expect(Number(text(doc, 'PrepaidAmount'))).toBeCloseTo(500, 2);
      expect(Number(text(doc, 'PayableAmount'))).toBeCloseTo(618.6, 2);
    });

    it('satisfies BR-CO-16: PayableAmount = TaxInclusiveAmount − PrepaidAmount', () => {
      const doc = parse(
        service.buildXml(baseInvoice({ kind: 'final', settledPayments: settled }))
      );
      const taxInclusive = Number(text(doc, 'TaxInclusiveAmount'));
      const prepaid = Number(text(doc, 'PrepaidAmount'));
      const payable = Number(text(doc, 'PayableAmount'));
      expect(payable).toBeCloseTo(taxInclusive - prepaid, 2);
    });

    it('orders PrepaidAmount before PayableAmount in LegalMonetaryTotal (UBL 2.1)', () => {
      const doc = parse(
        service.buildXml(baseInvoice({ kind: 'final', settledPayments: settled }))
      );
      const total = doc.querySelector('LegalMonetaryTotal')!;
      const children = Array.from(total.children).map((child) => child.localName);
      expect(children.indexOf('PrepaidAmount')).toBeGreaterThanOrEqual(0);
      expect(children.indexOf('PrepaidAmount')).toBeLessThan(children.indexOf('PayableAmount'));
    });

    it('omits PrepaidAmount for a standard invoice (PayableAmount stays the gross)', () => {
      const doc = parse(service.buildXml(baseInvoice({ settledPayments: settled })));
      expect(doc.querySelector('PrepaidAmount')).toBeNull();
      expect(Number(text(doc, 'PayableAmount'))).toBeCloseTo(1118.6, 2);
    });

    it('omits PrepaidAmount for a final invoice without a snapshot', () => {
      const doc = parse(service.buildXml(baseInvoice({ kind: 'final' })));
      expect(doc.querySelector('PrepaidAmount')).toBeNull();
      expect(Number(text(doc, 'PayableAmount'))).toBeCloseTo(1118.6, 2);
    });
  });
});
