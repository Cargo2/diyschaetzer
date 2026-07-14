import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SubscriptionStatus } from '../../../models/subscription.model';
import { SUPABASE_CLIENT } from '../../../data-access/supabase-client';
import type {
  AdminSubscriptionEntry,
  AdminSubscriptionsRepository
} from './admin-subscriptions-repository';

/** Rohform einer admin_list_subscriptions()-Zeile. */
interface SubscriptionRow {
  user_id: string;
  provider: string;
  plan_key: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  active: boolean;
}

/**
 * Supabase-Adapter für die Abo-Status-Anzeige im Admin-Zuteilen-Dialog (Abo-Welle). Ruft
 * die SECURITY DEFINER-Funktion admin_list_subscriptions() auf; für Nicht-Admins
 * kommt eine leere Liste zurück (Absicherung in der Funktion selbst).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAdminSubscriptionsRepository implements AdminSubscriptionsRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async listSubscriptions(): Promise<AdminSubscriptionEntry[]> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('admin_list_subscriptions');
    if (error) {
      throw error;
    }
    return ((data ?? []) as SubscriptionRow[]).map((row) => ({
      userId: row.user_id,
      provider: row.provider,
      planKey: row.plan_key,
      status: row.status,
      currentPeriodEnd: row.current_period_end,
      active: row.active
    }));
  }
}
