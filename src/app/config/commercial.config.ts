import {
  ALL_FEATURE_KEYS,
  WhiteLabelConfig
} from '../models/commercial.model';

export const COMMERCIAL_CONFIG = {
  monetizationEnabled: false,
  affiliateEnabled: false,
  pdfExportEnabled: false,
  excelExportEnabled: false,
  ownProductCatalogEnabled: false,
  whiteLabelEnabled: false,
  contractorSaasEnabled: false
} as const;

export const DEFAULT_WHITE_LABEL_CONFIG: WhiteLabelConfig = {
  tenantId: null,
  enabled: false,
  brandName: 'Fliesen-Kostenschätzer',
  logoUrl: null,
  primaryColor: null,
  accentColor: null,
  supportEmail: null,
  websiteUrl: null,
  hideDefaultBranding: false,
  productCatalogScope: 'default',
  allowedFeatures: [...ALL_FEATURE_KEYS]
};
