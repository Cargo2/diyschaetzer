import { Injectable } from '@angular/core';
import {
  CURRENT_USER_CONTEXT,
  DEFAULT_FEATURE_ACCESS,
  FeatureKey,
  PlanType,
  UserContext
} from '../models/commercial.model';

const PLAN_ORDER: PlanType[] = ['free', 'plus', 'pro', 'business', 'enterprise'];

@Injectable({ providedIn: 'root' })
export class FeatureAccessService {
  private userContext: UserContext = CURRENT_USER_CONTEXT;

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
    this.userContext = context;
  }
}
