import { computed, Injectable, signal } from '@angular/core';
import { COMMERCIAL_CONFIG } from '../config/commercial.config';
import { MERCHANTS } from '../config/affiliate.config';
import { MerchantId } from '../models/affiliate.model';

const STORAGE_KEY = 'tileEstimator.affiliateSettings';

interface AffiliateSettingsState {
  globalEnabled: boolean;
  merchantEnabled: Record<MerchantId, boolean>;
}

/**
 * Laufzeit-Schalter für Affiliate: ein globaler An/Aus-Schalter plus ein Schalter
 * je Shop. Aus COMMERCIAL_CONFIG und der Merchant-Registry geseedet und im
 * localStorage persistiert. Phase 9 (UI) und der AffiliateService lesen hier.
 */
@Injectable({ providedIn: 'root' })
export class AffiliateSettingsService {
  private readonly stateSignal = signal<AffiliateSettingsState>(this.loadState());

  readonly globalEnabled = computed(() => this.stateSignal().globalEnabled);
  readonly merchantEnabled = computed(() => this.stateSignal().merchantEnabled);

  isGlobalEnabled(): boolean {
    return this.stateSignal().globalEnabled;
  }

  isMerchantEnabled(merchantId: MerchantId): boolean {
    return this.stateSignal().globalEnabled === true &&
      this.stateSignal().merchantEnabled[merchantId] === true;
  }

  setGlobalEnabled(enabled: boolean): void {
    this.update((state) => ({ ...state, globalEnabled: enabled }));
  }

  setMerchantEnabled(merchantId: MerchantId, enabled: boolean): void {
    this.update((state) => ({
      ...state,
      merchantEnabled: { ...state.merchantEnabled, [merchantId]: enabled }
    }));
  }

  private update(
    updater: (state: AffiliateSettingsState) => AffiliateSettingsState
  ): void {
    this.stateSignal.update((state) => {
      const next = updater(state);
      this.persist(next);
      return next;
    });
  }

  private defaultMerchantEnabled(): Record<MerchantId, boolean> {
    return MERCHANTS.reduce((acc, merchant) => {
      acc[merchant.id] = merchant.enabled;
      return acc;
    }, {} as Record<MerchantId, boolean>);
  }

  private loadState(): AffiliateSettingsState {
    const fallback: AffiliateSettingsState = {
      globalEnabled: COMMERCIAL_CONFIG.affiliateEnabled,
      merchantEnabled: this.defaultMerchantEnabled()
    };

    try {
      const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!stored) {
        return fallback;
      }
      const parsed = JSON.parse(stored) as Partial<AffiliateSettingsState>;
      return {
        globalEnabled:
          typeof parsed.globalEnabled === 'boolean'
            ? parsed.globalEnabled
            : fallback.globalEnabled,
        // Registry bleibt die Quelle der gültigen Shops; gespeicherte Werte
        // überschreiben nur bekannte Merchants.
        merchantEnabled: MERCHANTS.reduce((acc, merchant) => {
          const storedValue = parsed.merchantEnabled?.[merchant.id];
          acc[merchant.id] =
            typeof storedValue === 'boolean' ? storedValue : merchant.enabled;
          return acc;
        }, {} as Record<MerchantId, boolean>)
      };
    } catch {
      return fallback;
    }
  }

  private persist(state: AffiliateSettingsState): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // In-Memory-Zustand bleibt nutzbar, wenn Storage nicht verfügbar ist.
    }
  }
}
