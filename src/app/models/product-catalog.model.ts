import { ProductMonetizationData } from './monetization.model';

export type ProductCatalogSource =
  | 'static'
  | 'own_catalog'
  | 'merchant_feed'
  | 'manual';

export interface ProductCatalogItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  articleType: string;
  unit: string;
  packageSize: number | null;
  packageUnit: string | null;
  price: {
    amount: number | null;
    currency: 'EUR';
    priceUnit: string | null;
    vatIncluded: boolean;
  };
  brand: string | null;
  manufacturerSku: string | null;
  merchantSku: string | null;
  source: ProductCatalogSource;
  productUrl: string | null;
  imageUrl: string | null;
  monetization?: ProductMonetizationData;
  isActive: boolean;
  isOutdoorSuitable?: boolean;
  isFrostResistant?: boolean;
  slipResistanceClass?: string | null;
  createdAt: string;
  updatedAt: string;
}
