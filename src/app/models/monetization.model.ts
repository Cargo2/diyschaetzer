export type MonetizationType = 'none' | 'affiliate' | 'sponsored' | 'own_catalog';

export interface ProductMonetizationData {
  monetizationType: MonetizationType;
  merchantName: string | null;
  merchantProductId: string | null;
  productUrl: string | null;
  affiliateUrl: string | null;
  sponsored: boolean;
  sponsoredLabelRequired: boolean;
  commissionNote: string | null;
}

export const createNeutralProductMonetization = (): ProductMonetizationData => ({
  monetizationType: 'none',
  merchantName: null,
  merchantProductId: null,
  productUrl: null,
  affiliateUrl: null,
  sponsored: false,
  sponsoredLabelRequired: false,
  commissionNote: null
});
