# SECURITY.md

Sicherheits-Checkliste, bezogen auf **diesen** Stand (diyschaetzer / Phase 12).
Lebendes Dokument – bei jeder Backend-/Auth-Änderung mitpflegen.

**Stand:** 2026-06-23 (Phase 13 abgeschlossen ohne Mailversand; Phase 14: Teilen-Link)

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
| 5 | Ungeschützte Admin-Routen | ➖/🔲 | Es gibt **noch keine** `/admin`-Route (Phase 15). Beim Hinzufügen: lazy-Modul + Route-Guard auf Rolle `admin` (Roadmap-Entscheidung) – und serverseitig per RLS absichern, nicht nur im Guard. |
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
| 17 | SSRF | ➖ | Kein serverseitiges Fetch von nutzer­gelieferten URLs. Affiliate-Links sind statisch/Config. Ab Edge Functions erneut prüfen. |
| 18 | Kaputter Passwort-Reset | 🔲 | **Noch nicht implementiert** (Login/Registrieren only). Beim Hinzufügen Supabase `resetPasswordForEmail` nutzen + Redirect-URL-Allowlist im Dashboard setzen. |
| 19 | Zu permissives CORS | 🔲 | Von Supabase verwaltet (kein eigener Server). Erlaubte Origins / Auth-Redirect-URLs im Supabase-Dashboard vor Livegang einschränken (keine Wildcards). |
| 20 | Webhooks ohne Signaturprüfung | ➖ | Keine Webhooks. Ab Phase 13 (Mail/Edge): eingehende Hooks signatur­verifizieren. |
| 21 | Payment/Abo nur im Frontend | ⚠️/🔲 | `plan` liegt in `profiles` (DB), Durchsetzung aber im Frontend. Noch keine Zahlungsanbindung. Mit bezahlten Features serverseitig erzwingen (siehe Pkt. 10/23). |
| 22 | IDOR | ✅ | `owner_id` wird aus der **Session** (`auth.getUser`) abgeleitet, nicht aus Nutzereingaben ([supabase-project-repository.ts](src/app/data-access/supabase-project-repository.ts)); RLS-`with check` weist gefälschte `owner_id` ab. IDs sind UUIDv4. |
| 23 | Endpoints vertrauen Nutzer-IDs/Rollen | ✅ | **Behoben & verifiziert** ([0003](supabase/migrations/0003_protect_profile_role_plan.sql)): Trigger friert `role`/`plan` für Endnutzer ein, in Live-DB angewandt und per Verhaltenstest bestätigt (s. o.). Sonst: keine eigenen Endpoints, RLS nutzt `auth.uid()`. |
| 24 | Logs mit Tokens/PII/Passwörtern | ✅ | App loggt keine Secrets; Repos schlucken Fehler still. Keine Passwort-Logs. Supabase-Log-Retention/PII im Dashboard im Blick behalten. |
| 25 | Source-Maps in Produktion | ✅ | `sourceMap: true` nur in der **development**-Config ([angular.json](angular.json)); Prod (`defaultConfiguration: production`) emittiert keine. |
| 26 | Übermäßige DB-Rechte des App-Users | ✅/🔲 | Client nutzt anon-Key, durch RLS beschränkt. service_role nur serverseitig (aktuell nirgends). Im Dashboard bestätigen, dass `anon`/`authenticated` keine Extra-Grants haben. |
| 27 | Öffentlich erreichbare interne Dashboards | ➖/🔲 | Kein internes Dashboard in der App; Supabase Studio hinter Supabase-Auth. Admin-UI erst Phase 15. |
| 28 | Fehlende Security-Header | 🔲 | SPA-Hosting: CSP, `X-Content-Type-Options`, `frame-ancestors`/`X-Frame-Options`, `Referrer-Policy`, HSTS am Static-Host setzen. Im Repo (noch) nicht konfiguriert. |
| 29 | Cookies ohne HttpOnly/Secure/SameSite | ➖/⚠️ | App setzt keine Cookies; supabase-js hält die Session im **`localStorage`** (`persistSession`). Tradeoff: XSS könnte das Token lesen – akzeptabel für SPA (XSS ist via Pkt. 14 mitigiert), bei SSR später auf Cookie-Strategie umstellbar. |
| 30 | Unverschlüsselte sensible Daten | ✅/⚠️ | Transport via HTTPS (Supabase); At-Rest-Verschlüsselung durch Supabase/Postgres. App-Projektdaten liegen bewusst im Klartext-`localStorage` (Offline) – keine hochsensiblen Daten, keine Passwörter. |
| 31 | Schwache Mandantentrennung | ✅ | Heute „ein Nutzer = ein Scope" über `owner_id` + RLS. White-Label/Multi-Tenant (Phase 16) noch offen – Tenant-Scoping dann neu bewerten. |

---

## Vor öffentlichem Livegang (Kurzliste)

1. ~~**Pkt. 23**: Migration 0003 anwenden + verifizieren~~ – ✅ erledigt (2026-06-22).
2. Migrationen in der Live-DB anwenden und **RLS aktiv** bestätigen (Pkt. 3/4) – inkl. `0006`–`0009`
   (Firmenprofil, Profil-Defaults, `contractor_offers`, `shared_calculations`). `0006`–`0009` sind
   gepusht; **`0014` (Profi-Feedback) wurde am 2026-06-30 via `npx supabase db push` angewendet.**
   Verbleibender Schritt: RLS-Verhalten in der Live-DB aktiv gegenprüfen.
3. Supabase-Dashboard: Auth-Redirect-URLs/CORS einschränken, Passwort-Reset-Flow, E-Mail-Bestätigung (Pkt. 18/19).
4. Hosting: Security-Header setzen (Pkt. 28); Prod-Supabase-Werte sicher injizieren (Pkt. 2).
5. Repo-Sichtbarkeit prüfen (Pkt. 8).
