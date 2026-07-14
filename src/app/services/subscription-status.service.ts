import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SUBSCRIPTION_REPOSITORY } from '../data-access/subscription-repository';
import { subscriptionBadge, SubscriptionBadge } from '../models/subscription.model';
import { FeatureAccessService } from './feature-access.service';

/**
 * Kleiner Signal-Cache für den Abo-Status des angemeldeten Profis.
 *
 * Wird von der Navigation (Premium-„Aktiv"-Punkt, Freischaltung des Menüpunkts
 * „Anfragen empfangen") und vom {@link leadSubscriptionGuard} genutzt, damit der
 * Abo-Status nur einmal geladen und dann gecacht wird. Nach Login lädt der
 * App-Effect ihn; nach erfolgreicher Aktivierung frischt die Premium-Seite ihn auf.
 *
 * Prerender-/Offline-sicher: Ohne Browser, ohne konfiguriertes Supabase oder für
 * Nicht-Profis (FeatureAccessService.canManageSubscription() = false) wird kein
 * Call abgesetzt – der Status bleibt „nicht aktiv".
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionStatusService {
  private readonly repository = inject(SUBSCRIPTION_REPOSITORY);
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly badgeSig = signal<SubscriptionBadge | null>(null);
  /** Abgeleiteter Abo-Badge (`null`, solange noch nicht geladen). */
  readonly badge = this.badgeSig.asReadonly();
  /** `true`, wenn ein aktives (oder Probe-)Abo besteht. */
  readonly isActive = computed(() => this.badgeSig() === 'active');

  private inFlight: Promise<void> | null = null;

  /** Lädt den Status genau einmal; ein bereits geladener Wert wird gecacht. */
  ensureLoaded(): Promise<void> {
    if (this.badgeSig() !== null) {
      return Promise.resolve();
    }
    return this.refresh();
  }

  /** Lädt den Abo-Status neu (No-op ohne Browser/Supabase/Profi). */
  refresh(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.featureAccess.canManageSubscription()) {
      return Promise.resolve();
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.load().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /** Setzt den Cache zurück (z. B. beim Abmelden). */
  reset(): void {
    this.badgeSig.set(null);
    this.inFlight = null;
  }

  private async load(): Promise<void> {
    try {
      this.badgeSig.set(subscriptionBadge(await this.repository.getMySubscription()));
    } catch {
      this.badgeSig.set('inactive');
    }
  }
}
