import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { PlanType, UserRole } from '../../../models/commercial.model';
import { SUPABASE_CLIENT } from '../../../data-access/supabase-client';
import type { AdminUserSummary, AdminUsersRepository } from './admin-users-repository';

/** Rohform einer admin_list_users()-Zeile. */
interface UserRow {
  id: string;
  email: string | null;
  role: UserRole;
  plan: PlanType;
  display_name: string | null;
  created_at: string;
}

/**
 * Supabase-Adapter für die Admin-Nutzerübersicht (Phase 15, Block 5). Ruft die
 * SECURITY DEFINER-Funktion admin_list_users() auf; für Nicht-Admins kommt eine
 * leere Liste zurück (Absicherung in der Funktion selbst).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAdminUsersRepository implements AdminUsersRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async listUsers(): Promise<AdminUserSummary[]> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('admin_list_users');
    if (error) {
      throw error;
    }
    return ((data ?? []) as UserRow[]).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      plan: row.plan,
      displayName: row.display_name,
      createdAt: row.created_at
    }));
  }
}
