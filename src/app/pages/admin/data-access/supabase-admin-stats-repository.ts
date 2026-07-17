import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../data-access/supabase-client';
import type { AdminStats, AdminStatsRepository } from './admin-stats-repository';

/** Rohform (snake_case) des `admin_get_stats()`-jsonb-Rückgabewerts. */
interface StatsRow {
  users_total: number;
  users_customer: number;
  users_contractor: number;
  users_admin: number;
  users_new_30d: number;
  users_new_7d: number;
  subs_total: number;
  subs_active: number;
  subs_past_due: number;
  subs_cancelled: number;
  projects_total: number;
  projects_new_30d: number;
  projects_active_30d: number;
  offers_total: number;
  offers_draft: number;
  offers_sent: number;
  offers_accepted: number;
  invoices_total: number;
  invoices_new_30d: number;
  shared_offers_total: number;
  shared_offers_viewed: number;
  shared_offers_view_sum: number;
  shared_offers_accepted: number;
  shared_calculations_total: number;
  leads_total: number;
  leads_pending: number;
  leads_confirmed: number;
  leads_distributed: number;
  leads_expired: number;
  feedback_total: number;
  feedback_open: number;
}

/**
 * Supabase-Adapter fürs Admin-Statistik-Dashboard. Ruft die SECURITY DEFINER-
 * Funktion `admin_get_stats()` auf (jsonb → ein Objekt); für Nicht-Admins wirft
 * die Funktion serverseitig, der Fehler wird an den Aufrufer durchgereicht.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAdminStatsRepository implements AdminStatsRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async getStats(): Promise<AdminStats> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('admin_get_stats');
    if (error) {
      throw error;
    }
    const row = (data ?? {}) as Partial<StatsRow>;
    const n = (value: number | undefined): number => Number(value ?? 0);
    return {
      usersTotal: n(row.users_total),
      usersCustomer: n(row.users_customer),
      usersContractor: n(row.users_contractor),
      usersAdmin: n(row.users_admin),
      usersNew30d: n(row.users_new_30d),
      usersNew7d: n(row.users_new_7d),
      subsTotal: n(row.subs_total),
      subsActive: n(row.subs_active),
      subsPastDue: n(row.subs_past_due),
      subsCancelled: n(row.subs_cancelled),
      projectsTotal: n(row.projects_total),
      projectsNew30d: n(row.projects_new_30d),
      projectsActive30d: n(row.projects_active_30d),
      offersTotal: n(row.offers_total),
      offersDraft: n(row.offers_draft),
      offersSent: n(row.offers_sent),
      offersAccepted: n(row.offers_accepted),
      invoicesTotal: n(row.invoices_total),
      invoicesNew30d: n(row.invoices_new_30d),
      sharedOffersTotal: n(row.shared_offers_total),
      sharedOffersViewed: n(row.shared_offers_viewed),
      sharedOffersViewSum: n(row.shared_offers_view_sum),
      sharedOffersAccepted: n(row.shared_offers_accepted),
      sharedCalculationsTotal: n(row.shared_calculations_total),
      leadsTotal: n(row.leads_total),
      leadsPending: n(row.leads_pending),
      leadsConfirmed: n(row.leads_confirmed),
      leadsDistributed: n(row.leads_distributed),
      leadsExpired: n(row.leads_expired),
      feedbackTotal: n(row.feedback_total),
      feedbackOpen: n(row.feedback_open)
    };
  }
}
