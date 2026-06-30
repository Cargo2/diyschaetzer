import { inject, InjectionToken } from '@angular/core';
import { FeedbackSubmission } from '../models/feedback.model';
import { SupabaseFeedbackRepository } from './supabase-feedback-repository';

/**
 * Persistenz-Grenze für Profi-Feedback (Phase 13). Reines Backend-Feature (nur
 * angemeldete Profis), daher kein localStorage-Fallback. Das Frontend spricht
 * ausschließlich gegen dieses Interface.
 */
export interface FeedbackRepository {
  /** Speichert eine Feedback-Nachricht des angemeldeten Profis. */
  submit(feedback: FeedbackSubmission): Promise<void>;
}

export const FEEDBACK_REPOSITORY = new InjectionToken<FeedbackRepository>(
  'FEEDBACK_REPOSITORY',
  {
    providedIn: 'root',
    factory: () => inject(SupabaseFeedbackRepository)
  }
);
