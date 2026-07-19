# SECURITY.md

Sicherheits-Checkliste, bezogen auf **diesen** Stand (diyschaetzer / Phase 12).
Lebendes Dokument – bei jeder Backend-/Auth-Änderung mitpflegen.

**Stand:** 2026-07-11 (Lead-/Premium-Modul portiert: Leads + Double-Opt-in, PayPal-Abo, Betriebe-Verzeichnis, Angebots-Limit; Edge Functions `lead-submit`/`subscription-activate`/`paypal-webhook`; Migrationen 0018–0020. M12 Rechnungen: `contractor_invoices` mit owner-RLS + `unique(owner_id, invoice_number)`, Zahlungsdaten-Spalten am Firmenprofil; Migration 0021)

Legende:
**✅ OK** – im Code/Schema verifiziert ·
**⚠️ Hinweis** – funktioniert, aber Tradeoff/kleine Lücke ·
**🔲 Offen** – vor Livegang erledigen (oft im Supabase-Dashboard/Hosting, von hier nicht prüfbar) ·
**➖ N/A** – betrifft diesen Stand (noch) nicht.

> **Kontext der Architektur:** Reine Angular-SPA + Supabase (PostgreSQL, Auth, RLS).
> **Kein eigener Backend-/API-Code** – die Datensicherheit hängt fast vollständig an
> **Row Level Security (RLS)**, nicht an Frontend-Logik. Eigene Server-Logik (Edge
> Functions, Mailversand) kommt erst ab Phase 13 – die betroffenen Punkte sind hier
> als „➖ N/A (noch)" markiert und müssen dann erneut bewertet werden.

---

## ⚠️ Wichtigster offener Punkt: Rollen-/Plan-Eskalation über Self-Update (Pkt. 23)

Die RLS-Policy `profiles_update_own` ([0002_rls_and_signup.sql](supabase/migrations/0002_rls_and_signup.sql))
erlaubt einem Nutzer, **seine eigene Profilzeile** zu ändern – ohne Spalten-Einschränkung:

```sql
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
```

Postgres-RLS ist **nicht spaltenbasiert**. Der Kommentar im Migrationsskript sagt zwar
„Rollenänderung über die App ist NICHT vorgesehen (admin setzt manuell)" – die Policy
**erzwingt das aber nicht**. Ein angemeldeter Nutzer kann per direktem API-Call
`role = 'admin'` oder `plan = 'enterprise'` auf sein eigenes Profil setzen und sich so
selbst Rolle/Plan hochstufen.

**Status: ✅ behoben & verifiziert** (2026-06-22) via [0003_protect_profile_role_plan.sql](supabase/migrations/0003_protect_profile_role_plan.sql) –
ein `BEFORE UPDATE`-Trigger friert `role`/`plan` für angemeldete Endnutzer ein; Admin- und
`service_role`-Pfade (Dashboard/direkter SQL, `auth.uid() IS NULL`) bleiben erlaubt. Migration in
der Live-DB angewandt (`supabase db push`); Verhaltenstest mit simuliertem End-Nutzer-Kontext
(`request.jwt.claims.sub`) bestätigt: ein `update profiles set role='admin', plan='enterprise'`
bleibt **wirkungslos** (`role`/`plan` unverändert, Transaktion zurückgerollt).

---

## Checkliste (1–31)

| # | Punkt | Status | Befund / Maßnahme |
|---|---|---|---|
| 1 | Exposed DB credentials | ⚠️ | `service_role`-Key ist **nirgends** im Baum oder in der History. Der in [environment.development.ts](src/environments/environment.development.ts) committete `anonKey` ist der **publishable/anon-Key – per Design öffentlich** (RLS schützt), kein echtes Geheimnis. Inkonsistenz zur Policy in [environment.ts](src/environments/environment.ts) („nicht einchecken"). Optional rausnehmen; echte Secrets (service_role) **nie** ins Frontend. |
| 2 | `.env` aktuell | ➖/⚠️ | Projekt nutzt Angular-`environment.*.ts`, kein `.env`. `supabase/.env` ist gitignored. **Prod** baut mit `environment.ts` (leer) → Supabase-Werte müssen beim Deploy injiziert werden (Hosting-Env / File-Replacement). Vor Livegang dokumentieren. |
| 3 | Fremde Nutzerdaten lesbar | ✅ | RLS auf `profiles`/`projects`/`rooms` scoped alles auf `auth.uid()`; Räume erben Zugriff über Projekt-Eigentum. Phase 13 ergänzt owner-scoped Tabellen `company_profiles` (0006), `company_profiles.assumption_defaults` (0007) und **`contractor_offers`** (0008, RLS über `owner_id`). Phase 14: **`shared_calculations`** (0009) – owner-scoped Insert/Select/Delete; öffentliches Lesen nur über die SECURITY-DEFINER-Funktion (s. Pkt. 12). Phase 13 (Nachzügler): **`contractor_feedback`** (0014) – nur **Insert der eigenen Zeile durch Profis** (RLS `with check owner_id = auth.uid()` + `exists`-Profil-Rollencheck), **kein** Select/Update/Delete für Endnutzer; Admin liest/markiert ausschließlich über SECURITY-DEFINER-Funktionen (s. Pkt. 12). Prüfen, dass alle Migrationen in der **Live-DB** angewandt sind. |
| 4 | Offene Read/Write-Rechte | ✅ | RLS auf allen Tabellen aktiv (inkl. `contractor_offers`: select/insert/update/delete nur `auth.uid() = owner_id`), keine permissiven Policies → default-deny. In der Live-DB verifizieren. |
| 5 | Ungeschützte Admin-Routen | ✅ | `/admin` (Phase 15) ist lazy + `adminGuard`; alle Admin-Datenpfade laufen serverseitig über `is_admin()`-gated SECURITY-DEFINER-Funktionen bzw. Write-RLS (Migrationen 0010–0013, 0014). Lead-Verwaltung (`/admin/leads`) nutzt ausschließlich `admin_list_leads`/`admin_set_lead_status`/`admin_delete_lead`/`admin_assign_lead` (0018/0019) – kein direkter Tabellenzugriff. |
| 6 | Build-Logs leaken | ✅ | Prod-Build-Log zeigt nur Bundle-Größen/Warnungen, keine Secrets (Prod-Env leer). |
| 7 | Stack-Traces in Fehlermeldungen | ✅/➖ | Kein eigener Backend-Code. Frontend zeigt gemappte deutsche Fehlertexte ([auth-page.component.ts](src/app/pages/auth/auth-page.component.ts)); Repository-Fehler werden bewusst geschluckt. Ab Edge Functions (Phase 13) erneut prüfen. |
| 8 | Geleakte Repos/History | ⚠️ | History gescannt: **keine** service_role/JWT-Secrets, nur der öffentliche anon-Key. Repo-Sichtbarkeit (GitHub) bestätigen; bis zum Livegang ggf. **privat** halten. |
| 9 | Secrets im Frontend-JS | ✅ | Nur der anon-Key (öffentlich by design) erreicht den Client. Kein service_role. |
| 10 | Nur clientseitige Security-Checks | ⚠️ | **Datenzugriff** ist serverseitig per RLS erzwungen (gut). **Feature-Gating** ([FeatureAccessService](src/app/services/feature-access.service.ts)) ist rein Frontend → ok für UX, **nicht** als Schutz bezahlter Serveraktionen. Ab Phase 13 (PDF-Versand etc.) serverseitig erzwingen. |
| 11 | Fehlende Input-Validierung | ⚠️ | DB-`CHECK`-Constraints validieren `role`/`plan`/`status` serverseitig. `wizard_data`/`material_list_user_state` sowie das Profi-Angebot `contractor_offers.offer_data` sind vertrauenswürdige `jsonb`-Blobs des eigenen Nutzers (RLS-scoped), **strukturell nicht** serverseitig validiert. Beim Teilen-Link (Phase 14) Größe/Struktur begrenzen. |
| 12 | SQL-Injection | ✅ | Aller DB-Zugriff über den supabase-js Query-Builder (parametrisiert), keine String-Konkatenation. Phase-14-`SECURITY DEFINER`-Funktion `get_shared_calculation(uuid)`: fixer `search_path = public`, `stable`, reine **Punktabfrage per Token** (`where id = p_token`) – kein Listing/Enumeration; `revoke from public` + gezielter `grant execute` an `anon`/`authenticated`. Gibt nur die `data`-Spalte zurück. Phase 13 (0014): `admin_list_feedback()` / `admin_set_feedback_status(uuid, text)` sind `security definer` mit fixem `search_path`, durch `is_admin()` gegated (sonst leere Menge bzw. `raise exception`), `p_status` auf `new`/`read` validiert; `revoke from public` + `grant execute` nur an `authenticated`. |
| 13 | NoSQL-Injection | ➖ | N/A (PostgreSQL). |
| 14 | XSS / CSS-Injection | ✅ | Angular-Default-Escaping; **kein** `innerHTML`/`bypassSecurityTrust`/`document.write` im Code. |
| 15 | CSRF | ✅ | Supabase-Auth nutzt **Bearer-Token im `Authorization`-Header**, keine Session-Cookies → CSRF nicht anwendbar. |
| 16 | Path-Traversal | ➖ | Keine serverseitige Dateiverarbeitung; PDF/Excel werden clientseitig erzeugt. |
| 17 | SSRF | ✅ | Edge Functions fetchen nur **fest konfigurierte** Hosts (Resend-API, PayPal-API via `PAYPAL_ENV`), keine nutzergelieferten URLs. Affiliate-Links statisch/Config. |
| 18 | Kaputter Passwort-Reset | ✅/🔲 | **Implementiert**: „Passwort vergessen?" auf `/login` (`AuthService.requestPasswordReset` → Supabase `resetPasswordForEmail`, neutrale Erfolgsmeldung ohne User-Enumeration) + `/passwort-neu` (Recovery-Session → `updateUser({ password })`). **Offen (Dashboard)**: Redirect-URLs allowlisten – `https://app.fliesen-kosten.de/passwort-neu`, `https://fliesen-kosten.de/passwort-neu`, `http://localhost:4200/passwort-neu` (Dev). |
| 19 | Zu permissives CORS | ✅/🔲 | **Präzisiert (2026-07-19):** Supabase bietet für die REST-API bewusst KEINE Origin-Einschränkung an – die API antwortet mit permissivem CORS, der Schutz IST die RLS (aktiv verifiziert, s. Pkt. 3/4). Die real konfigurierbare Stellschraube ist die **Auth-Redirect-Allowlist** im Dashboard (keine Wildcards) – **offen**: Liste pflegen, inkl. `/passwort-neu` (s. Pkt. 18). |
| 20 | Webhooks ohne Signaturprüfung | ✅ | `paypal-webhook` verifiziert **vor** jeder Datenänderung die Signatur über PayPals `verify-webhook-signature`, vertraut dem Event-Payload nicht (Status wird frisch per GET bei PayPal geladen) und dedupliziert über `subscription_events` (PK `event_id`). Deploy mit `--no-verify-jwt` (Absicherung = Signatur). |
| 21 | Payment/Abo nur im Frontend | ✅/🔲 | Abo-Status wird **nie vom Client geschrieben**: `subscriptions` erlaubt Nutzern nur `select` der eigenen Zeile (0019); Schreibpfade nur in `subscription-activate` (verifiziert Plan **fail-closed**, Status, `custom_id`==User bei PayPal) und `paypal-webhook` (service_role). Serverseitige Durchsetzung: `has_active_lead_subscription()` gated `admin_assign_lead`, `list_active_contractors` und den Angebots-Limit-Trigger `enforce_offer_limit()`. 🔲 Vor Livegang: PayPal-Live-Produkt/Plan/Webhook + Secrets je Marke. |
| 22 | IDOR | ✅ | `owner_id` wird aus der **Session** (`auth.getUser`) abgeleitet, nicht aus Nutzereingaben ([supabase-project-repository.ts](src/app/data-access/supabase-project-repository.ts)); RLS-`with check` weist gefälschte `owner_id` ab. IDs sind UUIDv4. |
| 23 | Endpoints vertrauen Nutzer-IDs/Rollen | ✅ | **Behoben & verifiziert** ([0003](supabase/migrations/0003_protect_profile_role_plan.sql)): Trigger friert `role`/`plan` für Endnutzer ein, in Live-DB angewandt und per Verhaltenstest bestätigt (s. o.). Sonst: keine eigenen Endpoints, RLS nutzt `auth.uid()`. |
| 24 | Logs mit Tokens/PII/Passwörtern | ✅ | App loggt keine Secrets; Repos schlucken Fehler still. Keine Passwort-Logs. Supabase-Log-Retention/PII im Dashboard im Blick behalten. |
| 25 | Source-Maps in Produktion | ✅ | `sourceMap: true` nur in der **development**-Config ([angular.json](angular.json)); Prod (`defaultConfiguration: production`) emittiert keine. |
| 26 | Übermäßige DB-Rechte des App-Users | ✅ | Client nutzt anon-Key, durch RLS beschränkt. service_role nur in Edge Functions. **Verhaltensbasiert verifiziert (2026-07-19):** anon-Probe gegen alle 17 Tabellen – owner-Tabellen liefern `[]`, leads/subscriptions `permission denied` (Grants revoked), anonymer INSERT auf `projects` abgewiesen; nur Katalogtabellen bewusst öffentlich. |
| 27 | Öffentlich erreichbare interne Dashboards | ➖/🔲 | Kein internes Dashboard in der App; Supabase Studio hinter Supabase-Auth. Admin-UI erst Phase 15. |
| 28 | Fehlende Security-Header | ✅ | **Gesetzt (2026-07-19)** in `public/.htaccess` + `deploy/app-subdomain/.htaccess`: CSP (evidenzbasiert; `'unsafe-inline'` für script/style wegen Angular-SSG-Hydration/Komponenten-Styles unvermeidbar; Whitelist: PayPal, Supabase, Google Fonts), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS 1 Jahr inkl. Subdomains (kein preload). Bei neuen Fremd-Origins (z. B. Amazon-Produktbilder, GA4) CSP in BEIDEN Dateien mitziehen. |
| 29 | Cookies ohne HttpOnly/Secure/SameSite | ➖/⚠️ | App setzt keine Cookies; supabase-js hält die Session im **`localStorage`** (`persistSession`). Tradeoff: XSS könnte das Token lesen – akzeptabel für SPA (XSS ist via Pkt. 14 mitigiert), bei SSR später auf Cookie-Strategie umstellbar. |
| 30 | Unverschlüsselte sensible Daten | ✅/⚠️ | Transport via HTTPS (Supabase); At-Rest-Verschlüsselung durch Supabase/Postgres. App-Projektdaten liegen bewusst im Klartext-`localStorage` (Offline) – keine hochsensiblen Daten, keine Passwörter. |
| 31 | Schwache Mandantentrennung | ✅ | Heute „ein Nutzer = ein Scope" über `owner_id` + RLS. White-Label/Multi-Tenant (Phase 16) noch offen – Tenant-Scoping dann neu bewerten. |

---

## Google-OAuth + Rollen-Anspruch (WP3, Migration 0022)

- **Google-Login** über Supabase-OAuth (Provider `google`, PKCE). Start- und Rückkehr-
  Origin sind identisch (`redirectTo = <origin>/login`), da der PKCE-Verifier per-Origin
  im `localStorage` liegt. **Vor Livegang zwingend im Supabase-Dashboard pflegen**
  (siehe [docs/auth-google.md](docs/auth-google.md)): Provider aktivieren (Client-ID/Secret),
  Site URL + **Additional Redirect URLs** (die `/login`-Varianten **aller** Origins) als
  Allowlist – knüpft an Pkt. 18/19 (Auth-Redirect-URLs einschränken, keine Wildcards).
- **Neuer RPC `claim_contractor_role()`** ([0022](supabase/migrations/0022_claim_contractor_role.sql),
  `security definer`, fixer `search_path = public`): einmaliger Upgrade-Pfad
  `customer → contractor` für Profis, die sich bewusst per Google als Betrieb registrieren
  (OAuth liefert kein `role`-Metadatum → `handle_new_user()` legt `customer` an, 0003 friert
  es ein). **Keine Privileg-Eskalation** – `contractor` ist bei der E-Mail-Registrierung
  ohnehin frei wählbar. Serverseitige Schranken: (1) nur `auth.uid()` selbst; (2) nur wenn
  das Profil unverändert `customer`/`free` ist; (3) nur **≤ 15 Minuten** nach
  `auth.users.created_at`; (4) nur wenn `raw_user_meta_data` **keinen** `role`-Key hat
  (echter OAuth-Signup, keine nachträgliche Umgehung der bewussten E-Mail-Rollenwahl);
  bei Verstoß `raise exception`. `revoke execute from public, anon` + `grant execute to
  authenticated`.
- **Plan bleibt geschützt**: Der Upgrade läuft über ein **transaktionslokales** GUC-Flag
  (`set_config('app.allow_role_upgrade','on', true)`), das `protect_profile_role_plan()`
  (0003, hier per `create or replace` minimal erweitert) genau **einen** Zweig
  `customer → contractor` erlaubt – und dabei `new.plan := old.plan` **erzwingt**. Alle
  übrigen Pfade (admin/service_role/Einfrieren) verhalten sich unverändert wie in 0003
  → Pkt. 23 bleibt gewahrt (kein Loch für `admin`- oder `plan`-Eskalation).

## Lead-/Abo-Modul (2026-07-10, Migrationen 0018–0020)

- **`leads`**: RLS aktiv, **keine** Policies für `anon`/`authenticated` (`revoke all`) – Lesen ausschließlich
  über SECURITY-DEFINER-Funktionen (`admin_list_leads`, `contractor_list_assigned_leads`); Insert nur per
  `service_role` in der Edge Function `lead-submit` (Consent serverseitig erzwungen inkl. Text+Version,
  Honeypot, Rate-Limit 3/24 h je E-Mail-Hash, **Rollback ohne erfolgreiche Opt-in-Mail**). `confirm_lead(token)`
  nullt den Token nach Nutzung; `cleanup_expired_leads()` löscht unbestätigte Leads nach 7 Tagen (pg_cron).
- **Max. 3 Betriebe je Lead** steht im Einwilligungstext und ist DB-seitig in `admin_assign_lead` fixiert.
- **`subscriptions`/`subscription_events`**: Nutzer liest nur die eigene Zeile; Events-Tabelle dient der
  Webhook-Idempotenz. PayPal-SDK lädt im Frontend **nur** nach Consent-Kategorie `external_services`
  (Consent-Manager `services/consent.service.ts`) und nur über `paypal-sdk-loader.service.ts`.
- **Benötigte Function-Secrets** (im Supabase-Dashboard, nie im Repo): `RESEND_API_KEY`, `LEAD_FROM_EMAIL`,
  `PUBLIC_SITE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_PLAN_ID`, `PAYPAL_WEBHOOK_ID`.
- **Rechnungen (M12, Migration 0021):** `contractor_invoices` owner-scoped (RLS wie `contractor_offers`),
  `unique(owner_id, invoice_number)` erzwingt § 14-konforme einmalige Nummern DB-seitig; seit Migration 0027
  zusätzlich Missbrauchs-Cap 100/500 (s. u.). Zahlungsdaten (`tax_number`/`iban`/`bic`/`bank_name`) liegen
  am owner-scoped `company_profiles` und werden als Snapshot in `invoice_data` eingefroren. XRechnung-XML wird
  rein clientseitig erzeugt (kein Server-Fetch, keine neue Dependency).

## Teilen-Link-Tracking + Annahme (Migration 0024, `shared_offers`)

Erweitert die geteilten Angebote (0017) um leichtes Aufruf-Tracking und eine öffentliche,
set-once Angebots-Annahme. **Kein** neuer öffentlicher Schreibpfad über RLS – aller anonyme
Zugriff läuft ausschließlich über SECURITY-DEFINER-Punktfunktionen per Token (Zeilen-UUID).

- **Neue Spalten** auf `shared_offers` (additiv): `offer_id` (FK → `contractor_offers`,
  `on delete set null`), `viewed_at`, `last_viewed_at`, `view_count`, `accepted_at`,
  `accepted_by_name`. Partieller Unique-Index `(owner_id, offer_id) where offer_id is not null`
  ⇒ **ein stabiler Token je Angebot** (Alt-Zeilen ohne `offer_id` unberührt).
- **RLS**: einzige neue Policy ist `shared_offers_update_own` (**owner-scoped UPDATE**, `using`
  **und** `with check` auf `auth.uid() = owner_id`). Select/Insert/Delete unverändert aus 0017;
  **keine** permissive anon/authenticated-Policy.
- **`get_shared_offer_page(uuid)`** (`stable`, `security definer`, fixer `search_path = public`):
  Punktabfrage per Token, liefert `jsonb_build_object('data', …, 'accepted_at', …, 'accepted_by_name', …)`
  oder `null`. Legacy `get_shared_offer(uuid)` (0017) bleibt unverändert (gecachte Bundles).
- **`ping_shared_offer(uuid)`** (`security definer`, fixer `search_path`): ein einzelnes UPDATE,
  Aufruf-Zähler **gedrosselt auf 10 Minuten** und hart gedeckelt (`least(…, 100000)`);
  unbekannter Token = **no-op** (0 Zeilen, kein Fehler → keine Enumeration/Fehlerorakel).
- **`accept_shared_offer(uuid, text)`** (`security definer`, fixer `search_path`): **Namenslänge
  serverseitig validiert** (`btrim` 2..120, sonst `raise 'invalid_name'`); **set-once** über
  `update … where accepted_at is null` – ein zweiter Aufruf überschreibt **nie**, sondern liefert
  die erste Annahme. Bei erfolgreicher Erst-Annahme mit verknüpftem `offer_id` wird
  `contractor_offers.status = 'accepted'` gesetzt (Wert liegt im Check-Constraint aus 0016).
  Rückgabe = aktueller Annahme-Stand, `null` bei unbekanntem Token.
- Alle drei RPCs: `revoke all … from public` + `grant execute … to anon, authenticated` (Muster 0017).
  Schutz beruht auf der **UUID-Token-Entropie** (kein Listing, nur Punktabfrage) und
  serverseitiger Validierung/Set-once-Logik – nicht auf clientseitigen Checks.

## Positions-/Textbausteinkatalog (Migration 0025, `contractor_snippets`)

Wiederverwendbare Angebots-Positionen und Einleitungs-/Schlusstexte je Profi. Neue
owner-scoped Tabelle `contractor_snippets` (`owner_id` → `auth.users`, ON DELETE CASCADE),
RLS aktiv mit **vier** Policies `_select_own`/`_insert_own`/`_update_own`/`_delete_own`
(jeweils `using` bzw. `with check` auf `auth.uid() = owner_id`, Muster aus 0008) →
default-deny, **keine** öffentlichen Lese-/Schreibpfade. `kind`-Check-Constraint
(`position`/`intro`/`outro`); die Nutzdaten liegen als vertrauenswürdiger jsonb-Blob `data`
des eigenen Nutzers (RLS-scoped, strukturell nicht serverseitig validiert – analog Pkt. 11).
`owner_id` wird aus der Session abgeleitet (`SupabaseContractorSnippetRepository`, nicht aus
Eingaben → kein IDOR). `updated_at`-Trigger nutzt die Funktion aus 0001 (nicht neu definiert).

## Missbrauchs-Quotas gegen Massen-Anlage (Migration 0027)

Serverseitige Mengen-Obergrenzen je Konto gegen Bot-/Skript-getriebene Massen-Anlage durch
Free-Konten. **Ausschließlich Missbrauchsschutz, keine Produkt-Limits** – die Caps sind so
großzügig, dass normale Nutzer sie nie erreichen; das Frontend braucht keine Sonderbehandlung
(generischer Fehlerpfad reicht). Eine generische `BEFORE INSERT`-Triggerfunktion
`enforce_owner_quota()` (`security definer`, fixer `search_path = public`, damit der `COUNT`
nicht an RLS scheitert) erhält Free-/Premium-Cap (und optional den Tages-Modus) über `TG_ARGV`;
Premium (aktives Lead-Abo, `has_active_lead_subscription()` 0019) erhält den höheren Cap,
**Admins** (`is_admin()` 0010) sind ausgenommen. Fehler: `raise 'quota_exceeded: <tabelle>'`.

- **Getriggert** (client-schreibbar, owner-scoped): `projects` (30/100), `contractor_offers`
  (100/500 – ergänzt das produktseitige 3er-Limit `enforce_offer_limit` 0020, deckelt v. a. die
  sonst unbegrenzten Premium-Konten), `contractor_snippets` (100/300), `shared_offers` (50/300),
  `shared_calculations` (50/50), `contractor_feedback` (10/10 **pro Tag**, Anti-Spam via
  `created_at::date`).
- **Bewusst NICHT getriggert** (kein direkter Client-Insert-Pfad → `revoke all` für
  anon/authenticated, nur service_role/Edge Function): `leads` (0018, zudem ohne `owner_id`;
  Rate-Limit 3/24 h lebt in `lead-submit`), `lead_assignments` (0018), `subscriptions`/
  `subscription_events` (0019, PayPal-Webhook). Ebenfalls unberührt: `profiles` (1:1 je Nutzer),
  `rooms` (transitiv durch den `projects`-Cap begrenzt, kein `owner_id`).
- `contractor_invoices` (0021) ist ebenfalls gedeckelt (100/500 wie `contractor_offers`) –
  Rechnungen laufen zwar auch für Free-Betriebe, aber `unique(owner_id, invoice_number)` allein
  bremst Massen-Anlage nicht ausreichend.

---

## Vor öffentlichem Livegang (Kurzliste)

1. ~~**Pkt. 23**: Migration 0003 anwenden + verifizieren~~ – ✅ erledigt (2026-06-22).
2. ~~Migrationen in der Live-DB anwenden und **RLS aktiv** bestätigen (Pkt. 3/4)~~ – ✅ erledigt
   (2026-07-19): alle 27 Migrationen remote deckungsgleich (`npx supabase migration list --linked`),
   RLS-Verhalten aktiv mit anon-Key gegengeprüft (Lese- + Schreibprobe, s. Pkt. 26).
3. Supabase-Dashboard (**offen, nur dort erledigbar**): Auth-Redirect-URL-Allowlist pflegen
   (Site URL `https://app.fliesen-kosten.de`; Redirects: `/login` auf beiden Live-Hosts,
   `https://app.fliesen-kosten.de/passwort-neu`, Dev-localhost-Einträge; keine Wildcards, Alt-
   Einträge entfernen) + „Reset Password"-Mail-Template eindeutschen. E-Mail-Bestätigung ist
   verifiziert aktiv (`mailer_autoconfirm: false`, 2026-07-19); Google-OAuth läuft (Migration 0022 remote).
4. ~~Hosting: Security-Header setzen (Pkt. 28)~~ – ✅ erledigt (2026-07-19); offen bleibt:
   Prod-Supabase-Werte sicher injizieren dokumentieren (Pkt. 2).
5. Repo-Sichtbarkeit prüfen (Pkt. 8).
