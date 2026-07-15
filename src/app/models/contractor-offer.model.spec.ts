import { describe, expect, it } from 'vitest';
import {
  ContractorOffer,
  emptyOfferCustomer,
  liftLegacyOfferAddress,
  normalizeContractorOffer
} from './contractor-offer.model';

function baseOffer(customer: Partial<ContractorOffer['customer']> | undefined): ContractorOffer {
  return {
    projectId: 'p',
    projectName: 'x',
    vatPercent: 19,
    sections: [],
    customer: customer as ContractorOffer['customer']
  };
}

describe('liftLegacyOfferAddress', () => {
  it('splits street lines and a "PLZ Ort" line', () => {
    expect(liftLegacyOfferAddress('Musterweg 3\n50667 Köln')).toEqual({
      street: 'Musterweg 3',
      postalCode: '50667',
      city: 'Köln'
    });
  });

  it('treats the whole text as street when no PLZ line is present', () => {
    expect(liftLegacyOfferAddress('c/o Meier\nHinterhof')).toEqual({
      street: 'c/o Meier Hinterhof',
      postalCode: '',
      city: ''
    });
  });

  it('returns empty fields for empty/undefined input', () => {
    expect(liftLegacyOfferAddress('')).toEqual({ street: '', postalCode: '', city: '' });
    expect(liftLegacyOfferAddress(undefined)).toEqual({ street: '', postalCode: '', city: '' });
  });
});

describe('normalizeContractorOffer customer', () => {
  it('fills structured defaults (countryCode DE) when no customer is set', () => {
    const offer = normalizeContractorOffer(baseOffer(undefined));
    expect(offer.customer).toEqual(emptyOfferCustomer());
    expect(offer.customer?.countryCode).toBe('DE');
  });

  it('lifts a legacy freetext address into the structured fields, keeping the freetext', () => {
    const offer = normalizeContractorOffer(
      baseOffer({ name: 'Max Muster', address: 'Musterweg 3\n50667 Köln' })
    );
    expect(offer.customer).toMatchObject({
      name: 'Max Muster',
      street: 'Musterweg 3',
      postalCode: '50667',
      city: 'Köln',
      countryCode: 'DE',
      address: 'Musterweg 3\n50667 Köln'
    });
  });

  it('does not overwrite already structured fields from the legacy address', () => {
    const offer = normalizeContractorOffer(
      baseOffer({
        name: 'Max',
        street: 'Neue Str. 1',
        postalCode: '',
        city: '',
        countryCode: 'AT',
        email: 'kunde@example.com',
        address: 'Alte Str. 9\n12345 Irgendwo'
      })
    );
    expect(offer.customer).toMatchObject({
      street: 'Neue Str. 1',
      countryCode: 'AT',
      email: 'kunde@example.com'
    });
  });
});
