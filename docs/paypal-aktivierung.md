# PayPal-Abo (Contractor Premium) live schalten

Das Profi-Abo „Premium – Anfragen empfangen" (29,99 €/Monat, 1. Monat gratis, PayPal-
Subscriptions) ist **frontend- und backendseitig fertig**, aber ohne PayPal-Zugangsdaten
inaktiv: `PAYPAL_CONFIG.clientId`/`planId` in
[`src/app/config/commercial.config.ts`](../src/app/config/commercial.config.ts) sind leer,
die Konto-Premium-Seite zeigt dann nur einen neutralen „wird eingerichtet"-Hinweis und
lädt das PayPal-SDK gar nicht erst. Diese Anleitung beschreibt, wie ein Betreiber das Abo
scharf schaltet – **Sandbox zuerst**, danach Live.

Beteiligter Code (zum Nachvollziehen, nicht zum Ändern):
- `supabase/functions/subscription-activate/index.ts` – verifiziert eine vom Client
  gemeldete `subscriptionId` serverseitig bei PayPal (Plan, Status, `custom_id` = User)
  und schreibt die `subscriptions`-Zeile.
- `supabase/functions/paypal-webhook/index.ts` – hält den Abo-Status aktuell
  (Kündigung, Zahlungsausfall, Verlängerung); prüft jedes Event zuerst per
  PayPal-Signatur.
- `supabase/functions/_shared/paypal.ts` – gemeinsame Helfer (Access-Token, Status-Mapping).
- `src/app/pages/profile/lead-subscription/lead-subscription.component.ts` – rendert den
  PayPal-Button (nur wenn Consent für externe Dienste erteilt UND `paymentConfigured`).
- `src/app/services/paypal-sdk-loader.service.ts` – lädt das PayPal-JS-SDK mit
  `vault=true&intent=subscription`.
- `supabase/migrations/0019_contractor_subscriptions.sql` – Tabellen `subscriptions` +
  `subscription_events` (Webhook-Dedup).

## 1. PayPal-Developer-Konto: Live-App anlegen

1. [developer.paypal.com](https://developer.paypal.com) → **Apps & Credentials** →
   Umschalter oben auf **Live** stellen (nicht Sandbox).
2. **Create App** → Name z. B. „fliesen-kosten Live" → Merchant-Konto verknüpfen.
3. **Client ID** und **Secret** notieren (Secret ist geheim, landet nur als Supabase-
   Secret, nie im Frontend-Code).
4. Für den Sandbox-Test zusätzlich (oder zuerst) im **Sandbox**-Modus dieselben Schritte
   wiederholen (eigene Client ID/Secret) und unter **Sandbox Accounts** einen Business-
   und einen Personal-Test-Account sicherstellen (werden beim Anlegen automatisch erzeugt).

## 2. Produkt + Abo-Plan anlegen

PayPal-Abo-Pläne lassen sich über die [PayPal-REST-API](https://developer.paypal.com/docs/api/subscriptions/v1/)
(`/v1/catalogs/products`, `/v1/billing/plans`) oder das Dashboard unter
**Billing plans** anlegen. Erwartet wird laut Code (`subscription-activate` prüft
`sub.plan_id === PAYPAL_PLAN_ID`, das Frontend zeigt 29,99 €/Monat mit 1. Monat gratis):

- **Produkt**: Typ „Service", Name z. B. „Fliesenprojekt Premium – Anfragen empfangen".
- **Plan**, Abrechnung monatlich, **zwei Billing-Cycles**:
  1. Trial-Zyklus: 1 Monat, Preis **0,00 €**, `tenure_type: TRIAL`, 1 Wiederholung.
  2. Regulärer Zyklus: monatlich, Preis **29,99 €**, `tenure_type: REGULAR`,
     unbegrenzte Wiederholungen (`total_cycles: 0`).
- Währung EUR.
- Die entstehende **Plan-ID** (`P-…`) notieren → wird `PAYPAL_PLAN_ID`.

Denselben Plan (mit 0 €-Trial) auch im **Sandbox**-Modus anlegen, um den Testlauf aus
Schritt 6 realistisch (inkl. Trial→Charge-Übergang) durchspielen zu können.

## 3. Webhook registrieren

1. **Apps & Credentials → eure App → Webhooks → Add Webhook**.
2. **Webhook URL**: die Supabase-Functions-URL von `paypal-webhook`:
   ```
   https://<project-ref>.supabase.co/functions/v1/paypal-webhook
   ```
   (`<project-ref>` aus dem Supabase-Projekt-Dashboard bzw. `npx supabase status`.)
3. **Event-Typen** – der Code wertet Events aus, deren Typ mit `BILLING.SUBSCRIPTION.`
   beginnt, sowie `PAYMENT.SALE.COMPLETED` (alles andere wird sauber ignoriert, `200
   ignored`). Mindestens auswählen:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `PAYMENT.SALE.COMPLETED`
   (Alternativ „Alle Events" auswählen – unbekannte Typen sind für die Function ein No-op.)
4. Speichern → die generierte **Webhook-ID** notieren → wird `PAYPAL_WEBHOOK_ID`.
   (`paypal-webhook` verifiziert jedes eingehende Event live gegen diese ID via
   PayPals `verify-webhook-signature`-Endpunkt – ohne korrekte ID schlägt die Prüfung fehl.)

Für den Sandbox-Test denselben Webhook zusätzlich in der **Sandbox-App** anlegen (eigene
Webhook-ID, zeigt aber auf dieselbe Function-URL – die Function erkennt Live/Sandbox über
`PAYPAL_ENV`).

## 4. Supabase Edge-Function-Secrets setzen

```bash
npx supabase secrets set PAYPAL_ENV=sandbox
npx supabase secrets set PAYPAL_CLIENT_ID=<sandbox-client-id>
npx supabase secrets set PAYPAL_CLIENT_SECRET=<sandbox-secret>
npx supabase secrets set PAYPAL_PLAN_ID=<sandbox-plan-id>
npx supabase secrets set PAYPAL_WEBHOOK_ID=<sandbox-webhook-id>
```

`PAYPAL_ENV=live` schaltet `_shared/paypal.ts` von `api-m.sandbox.paypal.com` auf
`api-m.paypal.com` um – für den Live-Gang alle fünf Secrets mit den **Live**-Werten
überschreiben (gleicher Befehl, andere Werte).

Hinweis: `lead-submit` (Lead-Mail) erwartet eigene Secrets (`RESEND_API_KEY`,
`LEAD_FROM_EMAIL`, `PUBLIC_SITE_URL`) – unabhängig vom PayPal-Abo, hier nur der
Vollständigkeit halber erwähnt, nicht Teil dieser Aktivierung.

Secrets prüfen:
```bash
npx supabase secrets list
```

## 5. Edge Functions deployen

```bash
npx supabase functions deploy subscription-activate
npx supabase functions deploy paypal-webhook --no-verify-jwt
```

- `subscription-activate` **erfordert** einen gültigen Supabase-JWT (wird vom
  eingeloggten Nutzer im Frontend automatisch mitgeschickt) – **kein** `--no-verify-jwt`.
- `paypal-webhook` bekommt Requests direkt von PayPal **ohne** Supabase-JWT → **mit**
  `--no-verify-jwt` deployen, sonst lehnt Supabase jeden Webhook-Call mit 401 ab (die
  eigentliche Absicherung übernimmt die PayPal-Signaturprüfung im Function-Code selbst).

## 6. Frontend konfigurieren

In [`src/app/config/commercial.config.ts`](../src/app/config/commercial.config.ts)
`PAYPAL_CONFIG` befüllen:

```ts
export const PAYPAL_CONFIG = {
  clientId: '<sandbox- oder live-client-id>',
  planId: '<gleiche plan-id wie PAYPAL_PLAN_ID-Secret>'
} as const;
```

Wichtig: Die Client-ID hier muss zum selben Modus (Sandbox/Live) gehören wie die
`PAYPAL_ENV`/`PAYPAL_CLIENT_ID`/`PAYPAL_PLAN_ID`-Secrets aus Schritt 4 – sonst meldet
`subscription-activate` `wrong_plan` bzw. der Button lädt gar nicht.

Für den ersten Test **Sandbox-Werte** eintragen, builden/deployen, testen (Schritt 7),
danach für den Live-Gang durch die Live-Werte ersetzen und die Secrets (Schritt 4) auf
`PAYPAL_ENV=live` + Live-IDs umstellen.

## 7. Test-Checkliste (zuerst Sandbox)

1. **Sandbox-Abo abschließen**: als Profi mit aktivem Consent für „Externe Dienste"
   einloggen → Konto → Premium → PayPal-Button erscheint (`paymentConfigured` jetzt
   `true`) → mit einem **Sandbox-Personal-Account** bezahlen/genehmigen.
2. **Client-seitige Aktivierung**: nach `onApprove` ruft die Seite
   `subscription-activate` auf → Erfolgsmeldung „Dein Lead-Abo ist aktiv." erscheint,
   Badge wechselt auf „Aktiv".
3. **`subscriptions`-Zeile prüfen** (Supabase Studio → Table Editor → `subscriptions`):
   `provider = 'paypal'`, `provider_subscription_id` gesetzt, `status = 'active'` oder
   `'trialing'` (Trial-Monat), `current_period_end` gefüllt.
4. **Webhook-Log prüfen**: Supabase Dashboard → Edge Functions → `paypal-webhook` →
   Logs. Nach dem Abschluss sollte mindestens ein `BILLING.SUBSCRIPTION.ACTIVATED`-Event
   mit `200 {"ok":true,...}` auftauchen. Zusätzlich in PayPal selbst unter
   **Webhooks → Event-Log** die Zustellung (Status 200) kontrollieren.
5. **Kündigungsfall**: Abo im PayPal-Sandbox-Account (oder über die
   `billing/subscriptions/{id}/cancel`-API) kündigen → `paypal-webhook` erhält
   `BILLING.SUBSCRIPTION.CANCELLED` → `subscriptions.status` wechselt auf `cancelled`
   → Badge/Anfragen-Freischaltung im Frontend verschwinden entsprechend
   (`FeatureAccessService.canManageSubscription()` bzw. die Aktiv-Prüfung im Abo-Status).
6. **Erneuter Login-Test ohne Consent**: „Externe Dienste"-Consent widerrufen → Premium-
   Seite zeigt nur die Hinweis-Karte, lädt das PayPal-SDK nicht (Netzwerk-Tab prüfen,
   kein Request an `paypal.com/sdk/js`).

Erst wenn alle Punkte in Sandbox grün sind: Schritte 4 (Secrets) und 6 (Frontend-Config)
mit Live-Werten wiederholen und denselben Testlauf einmal mit echtem Geld (kleinstmöglich,
danach sofort kündigen) gegenprüfen.
