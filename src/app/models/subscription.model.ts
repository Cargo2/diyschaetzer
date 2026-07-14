/**
 * Contractor-Abo (Abo-Welle). Der Abo-Status ist SERVER-Wahrheit: geschrieben wird
 * ausschließlich über die Edge Functions (subscription-activate / paypal-webhook),
 * das Frontend liest nur die eigene Zeile (RLS: `user_id = auth.uid()`).
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export interface Subscription {
  readonly provider: string;
  readonly planKey: string;
  readonly status: SubscriptionStatus;
  /** ISO-Zeitstempel des Periodenendes oder `null`. */
  readonly currentPeriodEnd: string | null;
}

/**
 * Abgeleiteter Anzeige-Zustand für das Status-Badge im Profil:
 *   - `active`   → aktives Abo (aktiv/Probephase), zeigt „aktiv bis <Datum>".
 *   - `overdue`  → Zahlung überfällig (`past_due`) – noch in der Grace-Period.
 *   - `inactive` → kein Abo / gekündigt / abgelaufen → PayPal-Button anbieten.
 */
export type SubscriptionBadge = 'active' | 'overdue' | 'inactive';

export function subscriptionBadge(sub: Subscription | null): SubscriptionBadge {
  if (!sub) {
    return 'inactive';
  }
  if (sub.status === 'active' || sub.status === 'trialing') {
    return 'active';
  }
  if (sub.status === 'past_due') {
    return 'overdue';
  }
  return 'inactive';
}

export const SUBSCRIPTION_BADGE_LABELS: Record<SubscriptionBadge, string> = {
  active: 'Aktiv',
  overdue: 'Überfällig',
  inactive: 'Inaktiv'
};
