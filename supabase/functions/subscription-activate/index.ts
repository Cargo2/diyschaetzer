// M11: Aktiviert das Contractor-Abo NACH Client-seitigem PayPal-Approval.
// Der Client liefert nur die subscriptionID – alles Weitere wird serverseitig
// bei PayPal verifiziert (Plan, Status, custom_id = User). Client-Angaben werden
// nie geglaubt. Erfordert gültigen Supabase-JWT (verify_jwt aktiv).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { PAYPAL_BASE, paypalAccessToken, mapStatus } from '../_shared/paypal.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // Aufrufer aus dem JWT ermitteln (anon-Key-Client mit Nutzer-Token).
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return json(401, { error: 'unauthorized' });
  const userId = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const subscriptionId = String(body.subscriptionId ?? '').trim();
  if (!/^I-[A-Z0-9]+$/i.test(subscriptionId)) return json(400, { error: 'invalid_subscription_id' });

  // Serverseitig bei PayPal verifizieren.
  const token = await paypalAccessToken();
  const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!subRes.ok) return json(400, { error: 'subscription_not_found' });
  const sub = await subRes.json();

  // Fail-closed: ohne konfigurierten Plan darf keine Subscription akzeptiert werden.
  const expectedPlan = Deno.env.get('PAYPAL_PLAN_ID');
  if (!expectedPlan) {
    return json(503, { error: 'plan_not_configured' });
  }
  if (sub.plan_id !== expectedPlan) {
    return json(400, { error: 'wrong_plan' });
  }
  if (sub.custom_id !== userId) {
    // custom_id wird beim Subscribe-Button auf die User-ID gesetzt.
    return json(403, { error: 'subscription_owner_mismatch' });
  }
  const status = mapStatus(String(sub.status ?? ''));
  if (status !== 'active' && status !== 'trialing') {
    return json(409, { error: 'subscription_not_active' });
  }

  const service = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const periodEnd = sub.billing_info?.next_billing_time ?? null;
  const { error: upsertError } = await service.from('subscriptions').upsert({
    user_id: userId,
    provider: 'paypal',
    provider_customer_id: sub.subscriber?.payer_id ?? null,
    provider_subscription_id: subscriptionId,
    plan_key: 'lead_pro',
    status,
    current_period_end: periodEnd,
    updated_at: new Date().toISOString()
  });
  if (upsertError) return json(500, { error: 'persist_failed' });

  return json(200, { ok: true, status, currentPeriodEnd: periodEnd });
});
