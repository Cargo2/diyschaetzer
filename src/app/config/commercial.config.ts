import {
  ALL_FEATURE_KEYS,
  WhiteLabelConfig
} from '../models/commercial.model';

export const COMMERCIAL_CONFIG = {
  monetizationEnabled: false,
  affiliateEnabled: true,
  pdfExportEnabled: false,
  excelExportEnabled: false,
  ownProductCatalogEnabled: false,
  whiteLabelEnabled: false,
  contractorSaasEnabled: false,
  // Lead-Funnel (Welle 1). Wirkt nur, wenn zugleich ein Supabase-Backend konfiguriert ist –
  // die effektive Freigabe entscheidet FeatureAccessService.canSubmitLeads(). Ohne
  // Supabase existiert das Lead-Formular im UI nicht (Prerender/Offline-Fallback).
  leadsEnabled: true,
  // Contractor-Abo (Welle 2). Schaltet das Lead-Abo-UI (Konto-Premium-Seite, PayPal-Button,
  // Anfragen-Banner) sowie das Abo-Gate im Admin-Zuteilen-Dialog frei. Wirkt – wie
  // leadsEnabled – nur mit konfiguriertem Supabase und für angemeldete Profis; die
  // effektive Freigabe entscheidet FeatureAccessService.canManageSubscription().
  contractorSubscriptionEnabled: true
} as const;

/**
 * PayPal-Zugangsdaten für das Contractor-Abo. Die Client-ID ist per Design öffentlich
 * (sie steckt sichtbar im Browser-SDK); der geheime Client-Secret liegt ausschließlich
 * in den Supabase-Edge-Functions. Der Plan legt Preis und Abrechnungsintervall fest.
 *
 * LIVE-Werte (17.07.2026, Plan „1 Monat Gratis mit monatliche Kündigung":
 * 1 Monat Trial à 0 €, danach 29,99 €/Monat, EUR; Sandbox-Test war am 16.07.
 * erfolgreich). Die Supabase-Secrets PAYPAL_* (inkl. PAYPAL_ENV=live) müssen zum
 * selben Modus gehören. Sind clientId/planId leer, rendert die Premium-Seite
 * keinen PayPal-Button, sondern einen „wird eingerichtet"-Hinweis (SDK lädt nie).
 */
export const PAYPAL_CONFIG: { clientId: string; planId: string } = {
  clientId: 'AZvgTpKVzCiutD-hNdgRnCFa03_q2wTFADqJWGeT54C6-jrItitlNupnliFTECh5w_Qp_J4Y6sApJ4pU',
  planId: 'P-5C919640Y6506021ENJMO6YI'
};

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
