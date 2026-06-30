import { inject, InjectionToken } from '@angular/core';
import { SupabaseAdminFeedbackRepository } from './supabase-admin-feedback-repository';

/** Eine Zeile der Admin-Feedback-Liste. */
export interface AdminFeedbackEntry {
  id: string;
  email: string | null;
  category: string;
  message: string;
  status: 'new' | 'read';
  createdAt: string;
}

/**
 * Lese-/Status-Grenze für die Admin-Feedback-Ansicht (Phase 13). Liest über die
 * SECURITY DEFINER-Funktion admin_list_feedback() (nur Admins) und setzt den
 * Status über admin_set_feedback_status() (ebenfalls is_admin()-gated).
 */
export interface AdminFeedbackRepository {
  listFeedback(): Promise<AdminFeedbackEntry[]>;
  setStatus(id: string, status: 'new' | 'read'): Promise<void>;
}

export const ADMIN_FEEDBACK_REPOSITORY = new InjectionToken<AdminFeedbackRepository>(
  'ADMIN_FEEDBACK_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseAdminFeedbackRepository)
  }
);
