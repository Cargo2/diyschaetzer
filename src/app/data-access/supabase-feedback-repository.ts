import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { FeedbackSubmission } from '../models/feedback.model';
import type { FeedbackRepository } from './feedback-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/**
 * Supabase-Adapter für Profi-Feedback (Phase 13). Owner-scoped über RLS; die
 * owner_id wird aus der angemeldeten Session abgeleitet (nicht aus Eingaben).
 * Bewusst ohne `.select()`-Rückgabe – es gibt keine Lese-Policy für normale
 * Nutzer (gespeicherte Nachrichten sieht nur der Admin).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseFeedbackRepository implements FeedbackRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  async submit(feedback: FeedbackSubmission): Promise<void> {
    const client = this.requireClient();
    const { data } = await client.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) {
      throw new Error('Senden nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('contractor_feedback').insert({
      owner_id: userId,
      category: feedback.category,
      message: feedback.message
    });
    if (error) {
      throw error;
    }
  }
}
