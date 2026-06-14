export type PlanType = 'free' | 'plus' | 'pro' | 'business' | 'enterprise';
export type UserRole = 'anonymous' | 'customer' | 'contractor' | 'admin';

export interface UserContext {
  role: UserRole;
  plan: PlanType;
}

export type FeatureKey =
  | 'save_multiple_rooms'
  | 'project_summary'
  | 'pdf_export'
  | 'contractor_offer_mode'
  | 'own_price_catalog'
  | 'own_product_catalog'
  | 'white_label'
  | 'custom_branding'
  | 'professional_templates';

export interface FeatureAccess {
  feature: FeatureKey;
  enabled: boolean;
  requiredPlan: PlanType;
  allowedRoles?: UserRole[];
}

export interface WhiteLabelConfig {
  tenantId: string | null;
  enabled: boolean;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  supportEmail: string | null;
  websiteUrl: string | null;
  hideDefaultBranding: boolean;
  productCatalogScope: 'default' | 'tenant' | 'mixed';
  allowedFeatures: FeatureKey[];
}

export const ALL_FEATURE_KEYS: FeatureKey[] = [
  'save_multiple_rooms',
  'project_summary',
  'pdf_export',
  'contractor_offer_mode',
  'own_price_catalog',
  'own_product_catalog',
  'white_label',
  'custom_branding',
  'professional_templates'
];

export const CURRENT_USER_CONTEXT: UserContext = {
  role: 'anonymous',
  plan: 'free'
};

export const DEFAULT_FEATURE_ACCESS: FeatureAccess[] = ALL_FEATURE_KEYS.map((feature) =>
  feature === 'pdf_export'
    ? {
        feature,
        enabled: true,
        requiredPlan: 'pro',
        allowedRoles: ['contractor', 'admin']
      }
    : {
        feature,
        enabled: true,
        requiredPlan: 'free'
      }
);
