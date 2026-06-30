import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../../data-access/supabase-client';
import type { AdminFeedbackEntry, AdminFeedbackRepository } from './admin-feedback-repository';

/** Rohform einer admin_list_feedback()-Zeile. */
interface FeedbackRow {
  id: string;
  email: string | null;
  category: string;
  message: string;
  status: 'new' | 'read';
  created_at: string;
}

/**
 * Supabase-Adapter für die Admin-Feedback-Ansicht (Phase 13). Ruft die SECURITY
 * DEFINER-Funktionen admin_list_feedback() / admin_set_feedback_status(); für
 * Nicht-Admins kommt nichts zurück bzw. die Statusänderung wird abgewiesen.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAdminFeedbackRepository implements AdminFeedbackRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async listFeedback(): Promise<AdminFeedbackEntry[]> {
    const client = this.requireClient();
    const { data, error } = await client.rpc('admin_list_feedback');
    if (error) {
      throw error;
    }
    return ((data ?? []) as FeedbackRow[]).map((row) => ({
      id: row.id,
      email: row.email,
      category: row.category,
      message: row.message,
      status: row.status,
      createdAt: row.created_at
    }));
  }

  async setStatus(id: string, status: 'new' | 'read'): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.rpc('admin_set_feedback_status', {
      p_id: id,
      p_status: status
    });
    if (error) {
      throw error;
    }
  }
}
