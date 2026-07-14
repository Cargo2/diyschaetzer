# Go-Live-Checkliste

Konsolidierte Betreiber-Schritte für den Umzug auf `fliesen-kosten.de` +
`app.fliesen-kosten.de`. Details stehen in den verlinkten Einzeldokus – hier nur
die Reihenfolge und der Haken-Status.

## A. Sofort möglich (unabhängig von der Domain)

- [ ] Migration `0022_claim_contractor_role.sql` anwenden: `npx supabase db push`
      (Migrationen laufen **nie** automatisch über CI). Siehe
      [`docs/auth-google.md`](./auth-google.md), Abschnitt 3.
- [ ] Google-OAuth einrichten (Google Cloud Console + Supabase Dashboard,
      Redirect-/Origin-Listen, siehe [`docs/auth-google.md`](./auth-google.md)
      Abschnitte 1–2). Funktioniert bereits auf `bouletten-contest.de`, ist
      nicht an den Domain-Umzug gebunden.
- [ ] Nach Migration + OAuth-Setup: manuellen Test aus
      [`docs/auth-google.md`](./auth-google.md) Abschnitt 4 einmal durchspielen
      (Google-Login Heimwerker, Registrierung Betrieb, 15-Minuten-Grenze,
      Abbruch) – siehe auch Abschnitt D unten.

## B. Domain-Umzug `fliesen-kosten.de` + `app.`-Subdomain

Details: [`docs/deploy-app-subdomain.md`](./deploy-app-subdomain.md).

- [ ] Subdomain `app.fliesen-kosten.de` in Plesk anlegen (eigenes Docroot,
      eigener FTP-Zugang) – Abschnitt a.
- [ ] Let's-Encrypt-Zertifikat für `app.fliesen-kosten.de` ausstellen.
- [ ] **Node.js/Passenger für die Subdomain deaktivieren** (sonst HTTP 500 auf
      allen Unterpfaden – bekannte netcup/Plesk-Falle, siehe `CLAUDE.md`).
- [ ] GitHub-Secrets `NETCUP_APP_FTP_HOST`/`_PORT`/`_USER`/`_PASSWORD`/
      `NETCUP_APP_REMOTE_PATH` setzen – Abschnitt b. Ohne `NETCUP_APP_FTP_HOST`
      überspringt `.github/workflows/app.yml` den Deploy automatisch (kein Fehler).
- [ ] `app.yml` einmal laufen lassen (Push auf `main` oder `workflow_dispatch`)
      und verifizieren:
  - [ ] `https://app.fliesen-kosten.de/robots.txt` liefert `Disallow: /`.
  - [ ] Ein beliebiger Pfad (auch `/`) liefert die CSR-Shell (App), nicht die
        prerenderte Marketing-Startseite.
- [ ] Supabase Auth → URL Configuration aktualisieren (Site URL +
      alle vier Redirect-URLs) – Abschnitt c.
- [ ] Erst danach `APP_DOMAIN_LIVE = true` in
      [`src/app/config/site.config.ts`](../src/app/config/site.config.ts)
      setzen (ein Zeilen-Flip) und committen/pushen – das löst automatisch
      alle drei Deploy-Workflows (`main.yml`, `flies.yml`, `app.yml`) aus.
- [ ] Danach: Sitemap in der Google Search Console **nur für die
      Hauptdomain** (`fliesen-kosten.de`) einreichen – nicht für `app.*`
      (nicht indexierbar, siehe robots.txt/`X-Robots-Tag`).

## C. Später/optional

- [ ] PayPal-Abo (Contractor Premium) live schalten – vollständige Anleitung
      in [`docs/paypal-aktivierung.md`](./paypal-aktivierung.md) (Sandbox
      zuerst, dann Live-App/Plan/Webhook/Secrets/Frontend-Config).
- [ ] Resend-Secrets für Lead-Mail setzen: `RESEND_API_KEY`, `LEAD_FROM_EMAIL`,
      `PUBLIC_SITE_URL` (Supabase Secrets) + Edge Function `lead-submit`
      deployen. Ohne diese Secrets bleibt der Lead-Mailversand bewusst
      fail-closed (siehe Memory „Lead-Modul-Deploy-Status").
- [ ] PWA (Phase 18, Stufe 3): `ng add @angular/pwa`, Manifest/Icons/Service
      Worker, `.htaccess`-Ausnahme für `ngsw.json`/`ngsw-worker.js` – siehe
      Roadmap in `CLAUDE.md`, Phase 18.

## D. Manuelle End-to-End-Tests nach Go-Live

- [ ] Google-Login **Heimwerker**: Login → „Mit Google anmelden" → landet
      eingeloggt, Rolle `customer` (siehe `docs/auth-google.md` Abschnitt 4.1).
- [ ] Google-Registrierung **Betrieb**: Rolle Profi wählen → „Mit Google
      registrieren" → nach Rückkehr Rolle `contractor` (in Supabase Studio
      unter `public.profiles` prüfen); Profi-Menüpunkt erscheint (Abschnitt 4.2).
- [ ] 15-Minuten-Fenster für den Rollen-Claim: Upgrade nach Ablauf wird
      abgewiesen, Nutzer bleibt `customer` (Abschnitt 4.3) – gewolltes Verhalten.
- [ ] Login-Redirect von der Hauptdomain (`fliesen-kosten.de/login` etc.) zu
      `app.fliesen-kosten.de` prüfen (Cross-Domain-Verhalten des
      `appRedirectGuard`/`AppHostService`).
- [ ] XRechnung-XML einer Testrechnung extern validieren (z. B. über einen
      öffentlichen eRechnung-Validator).
- [ ] Angebot → Rechnung-Flow einmal komplett durchspielen (Angebot erzeugen →
      Rechnung daraus ableiten).
- [ ] Geteilte Links auf der Hauptdomain testen: `/angebot/:token` und
      `/geteilt/:token` (read-only, ohne Login erreichbar).
