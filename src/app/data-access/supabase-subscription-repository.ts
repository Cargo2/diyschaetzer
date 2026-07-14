import { inject, Injectable } from '@angular/core';
import { FunctionsHttpError, SupabaseClient } from '@supabase/supabase-js';
import { Subscription, SubscriptionStatus } from '../models/subscription.model';
import type {
  SubscriptionActivateResult,
  SubscriptionRepository
} from './subscription-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer `subscriptions`-Zeile (nur die vom Frontend gelesenen Felder). */
interface SubscriptionRow {
  provider: string;
  plan_key: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
}

/**
 * Supabase-Adapter des Contractor-Abos. Lesen: eigene Zeile aus
 * `subscriptions` (RLS `user_id = auth.uid()`). Aktivieren: Edge Function
 * `subscription-activate` – der Client liefert nur die `subscriptionID`, alles
 * Weitere (Plan/Status/Eigentümer) wird serverseitig bei PayPal verifiziert.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async getMySubscription(): Promise<Subscription | null> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('subscriptions')
      .select('provider, plan_key, status, current_period_end')
      .maybeSingle();
    if (error) {
      throw error;
    }
    const row = data as SubscriptionRow | null;
    if (!row) {
      return null;
    }
    return {
      provider: row.provider,
      planKey: row.plan_key,
      status: row.status,
      currentPeriodEnd: row.current_period_end
    };
  }

  async activate(subscriptionId: string): Promise<SubscriptionActivateResult> {
    const client = this.requireClient();
    const { error } = await client.functions.invoke('subscription-activate', {
      body: { subscriptionId }
    });
    if (error) {
      return { ok: false, reason: await this.mapActivateError(error) };
    }
    // Statuswechsel serverseitig erfolgt; die frische Zeile liefert getMySubscription().
    const subscription = await this.getMySubscription();
    if (!subscription) {
      return { ok: false, reason: 'unknown' };
    }
    return { ok: true, subscription };
  }

  /** Übersetzt den HTTP-Status der Edge Function in eine differenzierte UI-Ursache. */
  private async mapActivateError(
    error: unknown
  ): Promise<Exclude<SubscriptionActivateResult, { ok: true }>['reason']> {
    if (error instanceof FunctionsHttpError) {
      const status = error.context?.status;
      if (status === 400) {
        return 'invalid';
      }
      if (status === 403) {
        return 'owner_mismatch';
      }
      if (status === 409) {
        return 'not_active';
      }
    }
    return 'unknown';
  }
}
