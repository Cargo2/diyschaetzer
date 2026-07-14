import { inject, InjectionToken } from '@angular/core';
import { Subscription } from '../models/subscription.model';
import { SupabaseSubscriptionRepository } from './supabase-subscription-repository';

/** Ergebnis der Aktivierung nach PayPal-Approval. */
export type SubscriptionActivateResult =
  | { ok: true; subscription: Subscription }
  | { ok: false; reason: 'invalid' | 'not_active' | 'owner_mismatch' | 'unknown' };

/**
 * Persistenz-Grenze des Contractor-Abos. Lesen läuft direkt gegen die
 * Tabelle `subscriptions` (RLS erlaubt nur die eigene Zeile); Aktivieren
 * ausschließlich über die Edge Function `subscription-activate`, die die PayPal-
 * Subscription serverseitig verifiziert (Plan, Status, custom_id = User). Ohne
 * konfiguriertes Supabase erscheint das Abo-UI gar nicht
 * (FeatureAccessService.canManageSubscription() = false), sodass dieses Repository
 * dann nie aufgerufen wird.
 */
export interface SubscriptionRepository {
  /** Liest die eigene Abo-Zeile (`null`, wenn noch nie abgeschlossen). */
  getMySubscription(): Promise<Subscription | null>;
  /** Aktiviert nach onApprove: übergibt die PayPal-`subscriptionID` an die Edge Function. */
  activate(subscriptionId: string): Promise<SubscriptionActivateResult>;
}

export const SUBSCRIPTION_REPOSITORY = new InjectionToken<SubscriptionRepository>(
  'SUBSCRIPTION_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseSubscriptionRepository)
  }
);
