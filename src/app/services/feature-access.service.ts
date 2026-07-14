import { inject, Injectable } from '@angular/core';
import { COMMERCIAL_CONFIG } from '../config/commercial.config';
import {
  CURRENT_USER_CONTEXT,
  DEFAULT_FEATURE_ACCESS,
  FeatureKey,
  PlanType,
  UserContext
} from '../models/commercial.model';
import { AuthService } from './auth.service';

const PLAN_ORDER: PlanType[] = ['free', 'plus', 'pro', 'business', 'enterprise'];

@Injectable({ providedIn: 'root' })
export class FeatureAccessService {
  private readonly auth = inject(AuthService);
  /** Test-Override; im Normalbetrieb leitet sich der Kontext aus dem Auth-Profil ab. */
  private testContextOverride: UserContext | null = null;

  /** Aktueller Nutzerkontext: angemeldetes Profil oder anonym/free als Fallback. */
  private get userContext(): UserContext {
    if (this.testContextOverride) {
      return this.testContextOverride;
    }
    const profile = this.auth.profile();
    return profile
      ? { role: profile.role, plan: profile.plan }
      : CURRENT_USER_CONTEXT;
  }

  canUseFeature(feature: FeatureKey): boolean {
    const access = DEFAULT_FEATURE_ACCESS.find((item) => item.feature === feature);
    if (!access?.enabled) return false;
    if (access.allowedRoles && !access.allowedRoles.includes(this.userContext.role)) {
      return false;
    }
    return PLAN_ORDER.indexOf(this.userContext.plan) >= PLAN_ORDER.indexOf(access.requiredPlan);
  }

  canUsePdfExport(): boolean {
    // Temporarily available for all users. The configured premium rule remains
    // available through canUseFeature('pdf_export') for the later rollout.
    return true;
  }

  canUseExcelExport(): boolean {
    // Spiegelt bewusst canUsePdfExport(): aktuell für alle verfügbar. Der globale
    // Schalter COMMERCIAL_CONFIG.excelExportEnabled bzw. die Feature-Regel
    // ('pdf_export') greifen erst beim späteren Rollout.
    return true;
  }

  getPdfAccessHint(): string {
    return '';
  }

  /**
   * Lead-Funnel (Welle 1): Das Lead-Formular am Wizard-Ende darf nur erscheinen, wenn
   * das Feature aktiv UND ein Supabase-Backend konfiguriert ist. Ohne Supabase
   * (Prerender/Offline: SUPABASE_CLIENT = null → auth.isConfigured = false) bleibt
   * das Formular komplett aus dem DOM und die App läuft unverändert weiter.
   */
  canSubmitLeads(): boolean {
    return COMMERCIAL_CONFIG.leadsEnabled && this.auth.isConfigured;
  }

  /**
   * Contractor-Abo (Welle 2): Das Lead-Abo-UI (Konto-Premium-Seite „Lead-Abo", PayPal-Button,
   * Anfragen-Banner) darf nur für angemeldete Profis erscheinen, wenn das Feature aktiv
   * UND ein Supabase-Backend konfiguriert ist. Ohne Supabase (Prerender/Offline) oder
   * für Nicht-Profis bleibt das gesamte Abo-UI aus dem DOM.
   */
  canManageSubscription(): boolean {
    return (
      COMMERCIAL_CONFIG.contractorSubscriptionEnabled &&
      this.auth.isConfigured &&
      this.userContext.role === 'contractor'
    );
  }

  setUserContextForTesting(context: UserContext): void {
    this.testContextOverride = context;
  }
}
