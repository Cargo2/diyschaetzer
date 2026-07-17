import { inject, InjectionToken } from '@angular/core';
import { SupabaseAdminStatsRepository } from './supabase-admin-stats-repository';

/**
 * Aggregierte Kennzahlen fürs Admin-Statistik-Dashboard. Alle Werte kommen aus
 * der SECURITY DEFINER-Funktion `admin_get_stats()` (nur für Admins). Zahlen sind
 * bereits serverseitig gezählt; das Frontend leitet nur noch Quoten/Umsatz ab.
 */
export interface AdminStats {
  // Nutzer
  usersTotal: number;
  usersCustomer: number;
  usersContractor: number;
  usersAdmin: number;
  usersNew30d: number;
  usersNew7d: number;

  // Abos
  subsTotal: number;
  subsActive: number;
  subsPastDue: number;
  subsCancelled: number;

  // Projekte
  projectsTotal: number;
  projectsNew30d: number;
  projectsActive30d: number;

  // Angebote
  offersTotal: number;
  offersDraft: number;
  offersSent: number;
  offersAccepted: number;

  // Rechnungen
  invoicesTotal: number;
  invoicesNew30d: number;

  // Geteilte Angebote
  sharedOffersTotal: number;
  sharedOffersViewed: number;
  sharedOffersViewSum: number;
  sharedOffersAccepted: number;

  // Geteilte Kalkulationen
  sharedCalculationsTotal: number;

  // Leads
  leadsTotal: number;
  leadsPending: number;
  leadsConfirmed: number;
  leadsDistributed: number;
  leadsExpired: number;

  // Feedback
  feedbackTotal: number;
  feedbackOpen: number;
}

/**
 * Lese-Grenze für das Admin-Statistik-Dashboard. Liest über die SECURITY DEFINER-
 * Funktion `admin_get_stats()`; nur Admins erhalten Daten (sonst Exception). Kein
 * Schreibpfad – reine Übersicht.
 */
export interface AdminStatsRepository {
  getStats(): Promise<AdminStats>;
}

export const ADMIN_STATS_REPOSITORY = new InjectionToken<AdminStatsRepository>(
  'ADMIN_STATS_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseAdminStatsRepository)
  }
);
