import { inject, Injectable } from '@angular/core';
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

  setUserContextForTesting(context: UserContext): void {
    this.testContextOverride = context;
  }
}
