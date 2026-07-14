// Gemeinsame PayPal-Helfer für subscription-activate und paypal-webhook (M11).
export const PAYPAL_BASE = Deno.env.get('PAYPAL_ENV') === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export async function paypalAccessToken(): Promise<string> {
  const cid = Deno.env.get('PAYPAL_CLIENT_ID');
  const sec = Deno.env.get('PAYPAL_CLIENT_SECRET');
  if (!cid || !sec) throw new Error('paypal_not_configured');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${cid}:${sec}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('paypal_auth_failed');
  const data = await res.json();
  return data.access_token as string;
}

/** Mappt PayPal-Subscription-Status auf unser Statusmodell. */
export function mapStatus(paypalStatus: string): string {
  switch (paypalStatus) {
    case 'ACTIVE': return 'active';
    case 'APPROVAL_PENDING':
    case 'APPROVED': return 'trialing';
    case 'SUSPENDED': return 'past_due';
    case 'CANCELLED': return 'cancelled';
    case 'EXPIRED': return 'expired';
    default: return 'expired';
  }
}
