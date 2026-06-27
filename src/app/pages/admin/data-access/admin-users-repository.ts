import { inject, InjectionToken } from '@angular/core';
import { PlanType, UserRole } from '../../../models/commercial.model';
import { SupabaseAdminUsersRepository } from './supabase-admin-users-repository';

/** Eine Zeile der Admin-Nutzerübersicht. */
export interface AdminUserSummary {
  id: string;
  email: string | null;
  role: UserRole;
  plan: PlanType;
  displayName: string | null;
  createdAt: string;
}

/**
 * Lese-Grenze für die Admin-Nutzerübersicht (Phase 15, Block 5). Liest über die
 * SECURITY DEFINER-Funktion admin_list_users() – nur Admins erhalten Daten.
 */
export interface AdminUsersRepository {
  listUsers(): Promise<AdminUserSummary[]>;
}

export const ADMIN_USERS_REPOSITORY = new InjectionToken<AdminUsersRepository>(
  'ADMIN_USERS_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseAdminUsersRepository)
  }
);
