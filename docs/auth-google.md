# Google-Login (OAuth) einrichten

Der „Mit Google anmelden"/„Mit Google registrieren"-Button startet einen Supabase-
OAuth-Login (Provider `google`, PKCE). Der Frontend-Code ist fertig; damit der Button
funktioniert, muss der Betreiber Google **und** Supabase konfigurieren. Solange der
Provider im Supabase-Dashboard nicht aktiviert ist, zeigt die App die Meldung
„Google-Anmeldung ist derzeit nicht verfügbar."

## 1. Google Cloud Console

1. Projekt anlegen/wählen → **APIs & Services → OAuth consent screen**: Zustimmungs-
   bildschirm konfigurieren (App-Name, Support-Mail, Domain). Für Produktion
   veröffentlichen (sonst nur Test-Nutzer).
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   Anwendungstyp **Web application**.
3. **Authorized JavaScript origins** (Start-Origins der App – müssen mit dem
   Rückkehr-Origin übereinstimmen, weil der PKCE-Verifier per-Origin im localStorage
   liegt):
   - `https://fliesen-kosten.de`
   - `https://app.fliesen-kosten.de`
   - `https://bouletten-contest.de`
   - `http://localhost:4200`
   - `http://localhost:4300`
4. **Authorized redirect URI** (Supabase-Callback, **nicht** die App-URL):
   - `https://<project-ref>.supabase.co/auth/v1/callback`
   (`<project-ref>` = die Referenz des Supabase-Projekts.)
5. Client-ID und Client-Secret notieren.

## 2. Supabase Dashboard

1. **Authentication → Providers → Google**: aktivieren, **Client ID** und
   **Client Secret** aus Schritt 1 eintragen, speichern.
2. **Authentication → URL Configuration**:
   - **Site URL**: die Haupt-App-URL (z. B. `https://app.fliesen-kosten.de`).
   - **Additional Redirect URLs**: die `/login`-Varianten **aller** Start-Origins,
     weil der Code `redirectTo = <origin>/login` setzt:
     - `https://fliesen-kosten.de/login`
     - `https://app.fliesen-kosten.de/login`
     - `https://bouletten-contest.de/login`
     - `http://localhost:4200/login`
     - `http://localhost:4300/login`
   Ohne diese Allowlist weist Supabase die Rückleitung ab.

## 3. Migration 0022 anwenden

Google-Signups liefern **kein** `role`-Metadatum → der Trigger `handle_new_user()`
legt das Profil als `customer` an, und `protect_profile_role_plan()` (0003) friert die
Rolle danach ein. Damit ein bewusst als **Betrieb** registrierter Profi einmalig auf
`contractor` hochstufen kann, gibt es den RPC `claim_contractor_role`
(`supabase/migrations/0022_claim_contractor_role.sql`).

```bash
npx supabase db push
```

Schutzmechanismen des RPC (serverseitig erzwungen):
- nur der angemeldete Nutzer selbst,
- nur wenn das Profil noch unverändert `customer`/`free` ist,
- **nur innerhalb von 15 Minuten** nach `auth.users.created_at` (frische Konten),
- **nur** wenn `raw_user_meta_data` keinen `role`-Key hat (echter OAuth-Signup – die
  bewusste Rollenwahl einer E-Mail-Registrierung lässt sich so nicht umgehen),
- der `plan` bleibt beim Upgrade **erzwungen** unverändert (kein Plan-Eskalations-Loch).

Der Frontend-Flow legt die im Register-Tab gewählte Rolle in `sessionStorage`
(`auth_signup_role`) ab (überlebt den Redirect zu Google), ruft nach der Rückkehr
`claim_contractor_role` auf und lädt das Profil neu. Schlägt der Claim fehl (z. B.
Fenster abgelaufen), bleibt der Nutzer Heimwerker und bekommt einen Hinweis, sich über
Feedback/Kontakt zu melden.

## 4. Manueller End-to-End-Test

1. **Google-Login als Heimwerker**: Login-Tab → „Mit Google anmelden" → Google-Konto
   wählen → landet eingeloggt auf der Startseite (bzw. Dashboard im App-Host). Profil
   hat Rolle `customer`.
2. **Registrierung als Betrieb**: Register-Tab → Rolle **Profi/Handwerker** wählen →
   „Mit Google registrieren" → nach der Rückkehr ist die Rolle `contractor`
   (in Supabase Studio unter `public.profiles` prüfen). Der Profi-Menüpunkt erscheint.
3. **15-Minuten-Grenze**: Ein Betriebs-Upgrade nach Ablauf des Fensters wird
   abgewiesen (Nutzer bleibt `customer`); das ist gewollt.
4. **Abbruch**: Auf dem Google-Consent-Screen abbrechen → App zeigt keinen Fehler,
   nur die normale Login-Seite.
