import { inject, InjectionToken } from '@angular/core';
import { SubscriptionStatus } from '../../../models/subscription.model';
import { SupabaseAdminSubscriptionsRepository } from './supabase-admin-subscriptions-repository';

/** Abo-Status eines Contractors (Admin-Sicht, Abo-Welle). */
export interface AdminSubscriptionEntry {
  userId: string;
  provider: string;
  planKey: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  /** Server-Wahrheit inkl. Grace-Period (has_active_lead_subscription). */
  active: boolean;
}

/**
 * Lese-Grenze für die Abo-Status-Anzeige im Admin-Zuteilen-Dialog (Abo-Welle). Liest
 * über die SECURITY DEFINER-Funktion `admin_list_subscriptions()`; nur Admins erhalten
 * Daten. Kein Schreibpfad – die Zuteilung wird serverseitig zusätzlich gegated.
 */
export interface AdminSubscriptionsRepository {
  listSubscriptions(): Promise<AdminSubscriptionEntry[]>;
}

export const ADMIN_SUBSCRIPTIONS_REPOSITORY =
  new InjectionToken<AdminSubscriptionsRepository>('ADMIN_SUBSCRIPTIONS_REPOSITORY', {
    providedIn: 'root',
    factory: () => inject(SupabaseAdminSubscriptionsRepository)
  });
