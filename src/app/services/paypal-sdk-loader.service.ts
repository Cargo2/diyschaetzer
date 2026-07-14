import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Minimale Typen des PayPal-JS-SDK, soweit vom Abo-Button benötigt. Das SDK legt
 * bei erfolgreichem Laden `window.paypal` an.
 */
export interface PayPalSubscriptionActions {
  subscription: {
    create(options: { plan_id: string; custom_id?: string }): Promise<string>;
  };
}

export interface PayPalButtonsConfig {
  style?: Record<string, string | number>;
  createSubscription(
    data: unknown,
    actions: PayPalSubscriptionActions
  ): Promise<string>;
  onApprove(data: { subscriptionID?: string | null }): void | Promise<void>;
  onError?(error: unknown): void;
  onCancel?(): void;
}

export interface PayPalButtonsInstance {
  render(container: string | HTMLElement): Promise<void>;
}

export interface PayPalNamespace {
  Buttons(config: PayPalButtonsConfig): PayPalButtonsInstance;
}

/**
 * Lazy-Loader für das PayPal-JS-SDK – die EINZIGE Stelle im Frontend, die
 * `paypal.com/sdk` referenziert. Das SDK ist ein externer Dritt-Dienst der
 * Consent-Kategorie `external_services`; der Aufrufer (Profil-Abo-Abschnitt) MUSS
 * daher vor `load()` `consent.isGranted('external_services')` prüfen – dieser
 * Loader selbst kennt den Consent-Zustand bewusst nicht.
 *
 * Prerender-/SSR-sicher: greift `window`/`document` nur im Browser an. Der Ladevorgang
 * ist idempotent (geteiltes Promise), sodass ein mehrfaches Rendern des Buttons das
 * Skript nicht doppelt einbindet.
 */
@Injectable({ providedIn: 'root' })
export class PaypalSdkLoaderService {
  private readonly platformId = inject(PLATFORM_ID);
  private loadPromise: Promise<PayPalNamespace> | null = null;

  load(clientId: string): Promise<PayPalNamespace> {
    if (this.loadPromise) {
      return this.loadPromise;
    }
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(new Error('PayPal-SDK kann nur im Browser geladen werden.'));
    }

    this.loadPromise = new Promise<PayPalNamespace>((resolve, reject) => {
      const win = window as unknown as { paypal?: PayPalNamespace };
      if (win.paypal) {
        resolve(win.paypal);
        return;
      }
      const params = new URLSearchParams({
        'client-id': clientId,
        vault: 'true',
        intent: 'subscription',
        currency: 'EUR'
      });
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
      script.async = true;
      script.onload = () => {
        if (win.paypal) {
          resolve(win.paypal);
        } else {
          this.loadPromise = null;
          reject(new Error('PayPal-SDK geladen, aber global nicht verfügbar.'));
        }
      };
      script.onerror = () => {
        this.loadPromise = null;
        reject(new Error('PayPal-SDK konnte nicht geladen werden.'));
      };
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }
}
