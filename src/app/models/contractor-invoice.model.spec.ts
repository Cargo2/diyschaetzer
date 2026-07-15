import { ContractorOfferLine, ContractorOfferSection } from './contractor-offer.model';
import {
  ContractorInvoice,
  ContractorInvoiceCustomer,
  ContractorInvoiceSeller,
  SettledPayment,
  hasXRechnungServiceDate,
  invoiceGrossTotal,
  invoicePayableGross,
  invoiceSettledGross,
  isGermanInvoiceSeller,
  isLikelyMalformedLeitwegId,
  listMissingXRechnungFields,
  listMissingXRechnungSellerFields,
  normalizeContractorInvoice
} from './contractor-invoice.model';

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

function sections(overrides: Partial<ContractorOfferSection>[] = []): ContractorOfferSection[] {
  if (overrides.length > 0) {
    return overrides.map((section, index) => ({
      id: `s${index}`,
      kind: 'custom',
      title: 'Leistungen',
      lines: [line()],
      ...section
    }));
  }
  return [{ id: 's0', kind: 'custom', title: 'Leistungen', lines: [line()] }];
}

function completeSeller(): ContractorInvoiceSeller {
  return {
    companyName: 'Fliesen Meister GmbH',
    contactName: 'Max Mustermann',
    street: 'Handwerkerstr. 5',
    postalCode: '10115',
    city: 'Berlin',
    countryCode: 'DE',
    phone: '030 1234567',
    email: 'info@fliesenmeister.de',
    website: '',
    vatId: 'DE123456789',
    taxNumber: '',
    iban: 'DE02120300000000202051',
    bic: 'BYLADEM1001',
    bankName: 'Test Bank'
  };
}

function completeCustomer(): ContractorInvoiceCustomer {
  return {
    name: 'Firma Kunde & Co. KG',
    street: 'Musterweg 3',
    postalCode: '50667',
    city: 'Köln',
    countryCode: 'DE',
    email: 'kunde@beispiel.de'
  };
}

function completeInvoice(overrides: Partial<ContractorInvoice> = {}): ContractorInvoice {
  return {
    id: 'inv-1',
    projectId: 'p1',
    offerId: 'o1',
    projectName: 'Sanierung',
    invoiceNumber: 'RE-2026-007',
    invoiceDate: '2026-07-11',
    serviceDate: '2026-07-10',
    servicePeriodStart: '',
    servicePeriodEnd: '',
    dueDate: '2026-07-25',
    buyerReference: 'LWID-04011000-1234512345-06',
    status: 'draft',
    vatPercent: 19,
    discountPercent: 0,
    sections: sections(),
    customer: completeCustomer(),
    seller: completeSeller(),
    introText: '',
    outroText: '',
    ...overrides
  };
}

describe('listMissingXRechnungFields', () => {
  it('returns an empty list for a fully filled invoice', () => {
    expect(listMissingXRechnungFields(completeInvoice())).toEqual([]);
  });

  it('reports a missing seller field', () => {
    const invoice = completeInvoice({ seller: { ...completeSeller(), companyName: '' } });
    expect(listMissingXRechnungFields(invoice)).toContain('Firmenname');
  });

  it.each([
    ['companyName', 'Firmenname'],
    ['street', 'Straße (Absender)'],
    ['postalCode', 'PLZ (Absender)'],
    ['city', 'Ort (Absender)'],
    ['iban', 'IBAN'],
    ['phone', 'Telefon'],
    ['email', 'E-Mail']
  ] as const)('reports "%s" missing as "%s" for the seller', (field, expected) => {
    const invoice = completeInvoice({ seller: { ...completeSeller(), [field]: '' } });
    expect(listMissingXRechnungFields(invoice)).toContain(expected);
  });

  it.each([
    ['invoiceNumber', 'Rechnungsnummer'],
    ['invoiceDate', 'Rechnungsdatum'],
    ['dueDate', 'Zahlungsziel (Fälligkeit)'],
    ['buyerReference', 'Käuferreferenz (BT-10)']
  ] as const)('reports "%s" missing as "%s" on the header', (field, expected) => {
    const invoice = completeInvoice({ [field]: '' } as Partial<ContractorInvoice>);
    expect(listMissingXRechnungFields(invoice)).toContain(expected);
  });

  it.each([
    ['name', 'Kundenname'],
    ['street', 'Straße (Kunde)'],
    ['postalCode', 'PLZ (Kunde)'],
    ['city', 'Ort (Kunde)'],
    ['email', 'E-Mail des Kunden (Pflicht für XRechnung-Versand)']
  ] as const)('reports "%s" missing as "%s" for the customer', (field, expected) => {
    const invoice = completeInvoice({ customer: { ...completeCustomer(), [field]: '' } });
    expect(listMissingXRechnungFields(invoice)).toContain(expected);
  });

  it('treats whitespace-only values as empty', () => {
    const invoice = completeInvoice({ invoiceNumber: '   ' });
    expect(listMissingXRechnungFields(invoice)).toContain('Rechnungsnummer');
  });

  it('treats the default buyer reference "n/a" as filled', () => {
    const invoice = completeInvoice({ buyerReference: 'n/a' });
    expect(listMissingXRechnungFields(invoice)).not.toContain('Käuferreferenz (BT-10)');
  });

  it('accepts an empty service date when a full service period is given', () => {
    const invoice = completeInvoice({
      serviceDate: '',
      servicePeriodStart: '2026-07-01',
      servicePeriodEnd: '2026-07-10'
    });
    expect(listMissingXRechnungFields(invoice)).not.toContain('Leistungsdatum oder Leistungszeitraum');
    expect(hasXRechnungServiceDate(invoice)).toBe(true);
  });

  it('reports the service date as missing for a half-filled period', () => {
    const invoice = completeInvoice({
      serviceDate: '',
      servicePeriodStart: '2026-07-01',
      servicePeriodEnd: ''
    });
    expect(listMissingXRechnungFields(invoice)).toContain('Leistungsdatum oder Leistungszeitraum');
    expect(hasXRechnungServiceDate(invoice)).toBe(false);
  });

  it('accepts a tax number without a VAT ID', () => {
    const invoice = completeInvoice({ seller: { ...completeSeller(), vatId: '', taxNumber: '12/345/67890' } });
    expect(listMissingXRechnungFields(invoice)).not.toContain('Steuernummer oder USt-IdNr.');
  });

  it('accepts a VAT ID without a tax number', () => {
    const invoice = completeInvoice({ seller: { ...completeSeller(), vatId: 'DE123456789', taxNumber: '' } });
    expect(listMissingXRechnungFields(invoice)).not.toContain('Steuernummer oder USt-IdNr.');
  });

  it('reports the tax identifier as missing when both vatId and taxNumber are empty', () => {
    const invoice = completeInvoice({ seller: { ...completeSeller(), vatId: '', taxNumber: '' } });
    expect(listMissingXRechnungFields(invoice)).toContain('Steuernummer oder USt-IdNr.');
  });

  it('accepts an empty contact name when the company name is set', () => {
    const invoice = completeInvoice({ seller: { ...completeSeller(), contactName: '' } });
    expect(listMissingXRechnungFields(invoice)).not.toContain('Ansprechpartner');
  });

  it('reports the contact name as missing when both contactName and companyName are empty', () => {
    const invoice = completeInvoice({ seller: { ...completeSeller(), contactName: '', companyName: '' } });
    const missing = listMissingXRechnungFields(invoice);
    expect(missing).toContain('Ansprechpartner');
    expect(missing).toContain('Firmenname');
  });

  it('requires at least one active, non-optional line', () => {
    const inactive = completeInvoice({
      sections: sections([{ lines: [line({ isActive: false })] }])
    });
    expect(listMissingXRechnungFields(inactive)).toContain('Mindestens eine aktive Position');

    const optional = completeInvoice({
      sections: sections([{ lines: [line({ isOptional: true })] }])
    });
    expect(listMissingXRechnungFields(optional)).toContain('Mindestens eine aktive Position');

    const empty = completeInvoice({ sections: [] });
    expect(listMissingXRechnungFields(empty)).toContain('Mindestens eine aktive Position');
  });
});

describe('listMissingXRechnungSellerFields', () => {
  it('returns an empty list for a complete seller', () => {
    expect(listMissingXRechnungSellerFields(completeSeller())).toEqual([]);
  });
});

describe('isGermanInvoiceSeller', () => {
  it('returns true for countryCode DE', () => {
    expect(isGermanInvoiceSeller({ ...completeSeller(), countryCode: 'DE' })).toBe(true);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(isGermanInvoiceSeller({ ...completeSeller(), countryCode: ' de ' })).toBe(true);
  });

  it('returns false for a non-German countryCode', () => {
    expect(isGermanInvoiceSeller({ ...completeSeller(), countryCode: 'AT' })).toBe(false);
  });

  it('treats an empty countryCode as Germany (legacy data before migration 0023)', () => {
    expect(isGermanInvoiceSeller({ ...completeSeller(), countryCode: '' })).toBe(true);
  });

  it('treats an undefined countryCode as Germany (legacy data)', () => {
    const seller = { ...completeSeller() } as ContractorInvoiceSeller;
    delete (seller as Partial<ContractorInvoiceSeller>).countryCode;
    expect(isGermanInvoiceSeller(seller)).toBe(true);
  });
});

describe('isLikelyMalformedLeitwegId', () => {
  it('does not warn for an empty value', () => {
    expect(isLikelyMalformedLeitwegId('')).toBe(false);
    expect(isLikelyMalformedLeitwegId('   ')).toBe(false);
  });

  it('does not warn for the default "n/a" (any casing)', () => {
    expect(isLikelyMalformedLeitwegId('n/a')).toBe(false);
    expect(isLikelyMalformedLeitwegId('N/A')).toBe(false);
  });

  it('does not warn for free text without a hyphen structure', () => {
    expect(isLikelyMalformedLeitwegId('Bestellung 12345')).toBe(false);
  });

  it('does not warn for text with a hyphen but no digits', () => {
    expect(isLikelyMalformedLeitwegId('Projekt-Nord')).toBe(false);
  });

  it('does not warn for a correctly formatted Leitweg-ID', () => {
    expect(isLikelyMalformedLeitwegId('04011000-1234512345-06')).toBe(false);
  });

  it('warns for a value that looks like an intended Leitweg-ID but has the wrong shape', () => {
    expect(isLikelyMalformedLeitwegId('04011000-1234512345')).toBe(true);
    expect(isLikelyMalformedLeitwegId('LWID-04011000-1234512345-06')).toBe(true);
    expect(isLikelyMalformedLeitwegId('04011000-1234512345-006')).toBe(true);
  });
});

function settledPayment(partial: Partial<SettledPayment> = {}): SettledPayment {
  return {
    invoiceId: 'inv-a',
    invoiceNumber: 'RE-2026-001',
    kind: 'deposit',
    invoiceDate: '2026-07-01',
    grossAmount: 5950,
    netAmount: 5000,
    vatAmount: 950,
    ...partial
  };
}

describe('normalizeContractorInvoice (kind + settledPayments)', () => {
  it('defaults kind to "standard" and settledPayments to [] when absent', () => {
    const invoice = normalizeContractorInvoice(completeInvoice());
    expect(invoice.kind).toBe('standard');
    expect(invoice.settledPayments).toEqual([]);
  });

  it('keeps a valid kind and a well-formed settledPayments snapshot (roundtrip)', () => {
    const invoice = normalizeContractorInvoice(
      completeInvoice({ kind: 'final', settledPayments: [settledPayment()] })
    );
    expect(invoice.kind).toBe('final');
    expect(invoice.settledPayments).toEqual([settledPayment()]);
  });

  it('coerces an unknown kind to "standard"', () => {
    const invoice = normalizeContractorInvoice(
      completeInvoice({ kind: 'bogus' as unknown as ContractorInvoice['kind'] })
    );
    expect(invoice.kind).toBe('standard');
  });

  it('sanitizes settledPayments defensively (coerces numbers/strings, drops garbage)', () => {
    const raw = [
      // gültig, aber verunreinigt: String-Zahlen, ungetrimmte Strings, unbekanntes kind
      {
        invoiceId: '  inv-b  ',
        invoiceNumber: '  RE-2026-002  ',
        kind: 'weird',
        invoiceDate: ' 2026-07-05 ',
        grossAmount: '1190',
        netAmount: '1000',
        vatAmount: '190'
      },
      null, // kein Objekt → verwerfen
      'nonsense', // kein Objekt → verwerfen
      { invoiceNumber: '', grossAmount: 10 }, // ohne Nummer → verwerfen
      { invoiceNumber: 'RE-2026-003', grossAmount: Number.NaN } // NaN → 0
    ];
    const invoice = normalizeContractorInvoice(
      completeInvoice({ settledPayments: raw as unknown as SettledPayment[] })
    );
    expect(invoice.settledPayments).toEqual([
      {
        invoiceId: 'inv-b',
        invoiceNumber: 'RE-2026-002',
        kind: 'standard',
        invoiceDate: '2026-07-05',
        grossAmount: 1190,
        netAmount: 1000,
        vatAmount: 190
      },
      {
        invoiceId: '',
        invoiceNumber: 'RE-2026-003',
        kind: 'standard',
        invoiceDate: '',
        grossAmount: 0,
        netAmount: 0,
        vatAmount: 0
      }
    ]);
  });
});

describe('invoiceSettledGross / invoicePayableGross', () => {
  it('sums the frozen gross amounts (0 without a snapshot)', () => {
    expect(invoiceSettledGross(completeInvoice())).toBe(0);
    const invoice = completeInvoice({
      settledPayments: [
        settledPayment({ grossAmount: 5950 }),
        settledPayment({ invoiceNumber: 'RE-2026-002', grossAmount: 5950 })
      ]
    });
    expect(invoiceSettledGross(invoice)).toBe(11900);
  });

  it('computes payable gross = gross total minus settled', () => {
    // eine aktive Pauschalposition 17 850 € netto bei 0 % USt = 17 850 € brutto
    const invoice = completeInvoice({
      vatPercent: 0,
      sections: sections([{ lines: [line({ quantity: 1, unitPrice: 17850 })] }]),
      settledPayments: [
        settledPayment({ grossAmount: 5950 }),
        settledPayment({ invoiceNumber: 'RE-2026-002', grossAmount: 5950 })
      ]
    });
    expect(invoiceGrossTotal(invoice)).toBe(17850);
    expect(invoicePayableGross(invoice)).toBe(5950);
  });

  it('allows a negative remaining amount (overpayment, no clamping)', () => {
    const invoice = completeInvoice({
      vatPercent: 0,
      sections: sections([{ lines: [line({ quantity: 1, unitPrice: 1000 })] }]),
      settledPayments: [settledPayment({ grossAmount: 1500 })]
    });
    expect(invoicePayableGross(invoice)).toBe(-500);
  });
});
