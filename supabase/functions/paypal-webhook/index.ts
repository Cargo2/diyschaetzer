// M11: PayPal-Webhook. Pflegt den Abo-Status serverseitig (Kündigung, Zahlungs-
// ausfall, Verlängerung). JEDES Event wird zuerst per PayPal-API signaturgeprüft
// (verify-webhook-signature) – ungeprüfte Requests bewirken nichts. Idempotent
// über subscription_events (event_id-Dedup). Deploy mit --no-verify-jwt
// (PayPal sendet keinen Supabase-JWT).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PAYPAL_BASE, paypalAccessToken, mapStatus } from '../_shared/paypal.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const rawBody = await req.text();
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  // 1. Signaturprüfung gegen die PayPal-API (Webhook-ID als Secret).
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  if (!webhookId) return json(503, { error: 'webhook_not_configured' });
  const token = await paypalAccessToken();
  const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: req.headers.get('paypal-auth-algo'),
      cert_url: req.headers.get('paypal-cert-url'),
      transmission_id: req.headers.get('paypal-transmission-id'),
      transmission_sig: req.headers.get('paypal-transmission-sig'),
      transmission_time: req.headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event
    })
  });
  const verify = verifyRes.ok ? await verifyRes.json() : null;
  if (verify?.verification_status !== 'SUCCESS') {
    return json(400, { error: 'signature_verification_failed' });
  }

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 2. Idempotenz: Event nur einmal verarbeiten.
  const eventId = String(event.id ?? '');
  if (!eventId) return json(400, { error: 'missing_event_id' });
  const { error: dedupError } = await service
    .from('subscription_events')
    .insert({ event_id: eventId });
  if (dedupError) {
    // unique violation → schon verarbeitet: 200, damit PayPal nicht erneut sendet.
    return json(200, { ok: true, duplicate: true });
  }

  // 3. Subscription-ID aus dem Event ziehen.
  const type = String(event.event_type ?? '');
  const resource = (event.resource ?? {}) as Record<string, unknown>;
  const subscriptionId = String(
    type.startsWith('BILLING.SUBSCRIPTION.')
      ? resource.id ?? ''
      : (resource.billing_agreement_id ?? '') // PAYMENT.SALE.COMPLETED
  );
  if (!subscriptionId) return json(200, { ok: true, ignored: true });

  // 4. Frischen Zustand IMMER direkt bei PayPal nachschlagen (nicht dem Event
  //    vertrauen – Events können sich überholen).
  const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!subRes.ok) return json(200, { ok: true, ignored: true });
  const sub = await subRes.json();
  const status = mapStatus(String(sub.status ?? ''));
  const periodEnd = sub.billing_info?.next_billing_time ?? null;

  const { error: updateError } = await service
    .from('subscriptions')
    .update({ status, current_period_end: periodEnd, updated_at: new Date().toISOString() })
    .eq('provider_subscription_id', subscriptionId);
  if (updateError) return json(500, { error: 'persist_failed' });

  return json(200, { ok: true, status });
});
