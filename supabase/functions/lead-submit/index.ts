// M8 Lead-Submit (docs/m8-spec.md). Einziger Schreibpfad für Leads:
// Validierung + Honeypot + Rate-Limit + Insert (service_role) + Double-Opt-in-Mail.
// Der Bestätigungs-Token verlässt den Server NUR per E-Mail – nie in der Response.
// Secrets: RESEND_API_KEY, LEAD_FROM_EMAIL, PUBLIC_SITE_URL (supabase secrets set …).
import { createClient } from 'npm:@supabase/supabase-js@2';

// Serverseitig fixierter Einwilligungstext – der Client zeigt denselben Text an,
// gespeichert wird IMMER diese Fassung (Nachweisbarkeit, Version v1-2026-07).
const CONSENT_VERSION = 'v1-2026-07';
const CONSENT_TEXT =
  'Ich willige ein, dass fliesen-kosten meine Angaben (Name, PLZ, E-Mail, Telefonnummer) ' +
  'und die Projektdaten aus dem Rechner an bis zu 3 passende Fliesenleger-Betriebe ' +
  'weitergibt, damit diese mich zwecks Angebotserstellung kontaktieren. Ich kann diese ' +
  'Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Details und ' +
  'Widerrufskontakt: Datenschutzerklärung.';

const TIMEFRAMES = new Set(['asap', '1_3_months', '3_6_months', 'open']);
const RATE_LIMIT_PER_24H = 3;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  // Honeypot: echte Nutzer füllen das unsichtbare Feld nie.
  if (typeof payload.website === 'string' && payload.website.trim() !== '') {
    // Bewusst 201: Bots erfahren nicht, dass sie erkannt wurden. Kein Insert.
    return json(201, { ok: true });
  }

  const name = String(payload.name ?? '').trim();
  const postalCode = String(payload.postalCode ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const phone = String(payload.phone ?? '').trim() || null;
  const timeframe = String(payload.timeframe ?? '');
  const message = String(payload.message ?? '').trim().slice(0, 500) || null;
  const consent = payload.consent === true;
  const snapshot = typeof payload.projectSnapshot === 'object' && payload.projectSnapshot !== null
    ? payload.projectSnapshot
    : {};

  if (!consent) {
    // Serverseitige Durchsetzung: ohne Einwilligung wird NICHTS gespeichert.
    return json(400, { error: 'consent_required' });
  }
  if (name.length < 2 || name.length > 120) {
    return json(400, { error: 'invalid_name' });
  }
  if (!/^[0-9]{5}$/.test(postalCode)) {
    return json(400, { error: 'invalid_postal_code' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) {
    return json(400, { error: 'invalid_email' });
  }
  if (!TIMEFRAMES.has(timeframe)) {
    return json(400, { error: 'invalid_timeframe' });
  }

  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('LEAD_FROM_EMAIL');
  const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') ?? '').replace(/\/$/, '');
  if (!resendKey || !fromEmail || !siteUrl) {
    // Ohne funktionierenden Double-Opt-in-Versand darf kein Lead entstehen.
    return json(503, { error: 'mail_not_configured' });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const submitKey = await sha256Hex(email);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('submit_count_key', submitKey)
    .gte('created_at', since);
  if (countError) {
    return json(500, { error: 'rate_check_failed' });
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_24H) {
    return json(409, { error: 'rate_limited' });
  }

  const token = randomToken();
  const { data: inserted, error: insertError } = await supabase
    .from('leads')
    .insert({
      name,
      postal_code: postalCode,
      email,
      phone,
      timeframe,
      message,
      project_snapshot: snapshot,
      consent_text: CONSENT_TEXT,
      consent_version: CONSENT_VERSION,
      consent_at: new Date().toISOString(),
      confirmation_token: token,
      submit_count_key: submitKey
    })
    .select('id')
    .single();
  if (insertError || !inserted) {
    return json(500, { error: 'insert_failed' });
  }

  const confirmUrl = `${siteUrl}/lead-bestaetigen/${token}`;
  const mailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: 'Bitte bestätige deine Anfrage – fliesen-kosten',
      html:
        `<p>Hallo ${name.replace(/[<>&]/g, '')},</p>` +
        `<p>bitte bestätige deine Fliesenleger-Anfrage, damit wir sie an bis zu 3 passende ` +
        `Fachbetriebe weitergeben dürfen:</p>` +
        `<p><a href="${confirmUrl}">Anfrage jetzt bestätigen</a></p>` +
        `<p>Wenn du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail einfach – ` +
        `die Daten werden nach 7 Tagen automatisch gelöscht.</p>`
    })
  });
  if (!mailResponse.ok) {
    // Ohne Opt-in-Mail kein gültiger Lead: Datensatz sofort wieder entfernen.
    await supabase.from('leads').delete().eq('id', inserted.id);
    return json(503, { error: 'mail_send_failed' });
  }

  return json(201, { ok: true });
});
