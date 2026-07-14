# Deploy app.fliesen-kosten.de (Profi-App-Subdomain)

Dieses Dokument beschreibt die Einrichtung der dritten Deploy-Zielumgebung
`app.fliesen-kosten.de`. Dorthin wird derselbe Build (`dist/project3/browser/`)
wie auf `bouletten-contest.de` (`.github/workflows/main.yml`) und den zweiten
Host (`flies.yml`) deployt – über den neuen Workflow `.github/workflows/app.yml`.

Auf `app.*` wird **nie** prerendertes Marketing-HTML ausgeliefert (immer die
CSR-Shell `index.csr.html`, siehe `deploy/app-subdomain/.htaccess`) und die
Subdomain wird **nicht** indexiert (siehe `deploy/app-subdomain/robots.txt`
und den `X-Robots-Tag`-Header). Bis zum Go-Live läuft die App weiter im
Standalone-Modus auf den bestehenden Domains – an dieser Subdomain hängt
noch keine Nutzerfunktion.

## a) Subdomain in Plesk/netcup anlegen

1. In Plesk unter der Domain **eine neue Subdomain** `app.fliesen-kosten.de`
   anlegen, mit **eigenem Docroot** (nicht denselben Ordner wie die
   Hauptdomain verwenden – die drei Hosts müssen unabhängige Dateibäume
   haben, da jeweils andere `.htaccess`/`robots.txt`-Overrides gelten).
2. Einen **eigenen FTP-Zugang** anlegen, der auf genau dieses Docroot
   gescoped ist (kein Zugriff auf die anderen beiden Docroots).
3. Ein **Let's-Encrypt-Zertifikat** für `app.fliesen-kosten.de` ausstellen
   (in Plesk üblicherweise über "SSL/TLS-Zertifikate" → "Let's Encrypt").
4. **Node.js/Passenger für diese Subdomain deaktivieren.** Ist die
   Plesk-Node.js-Erweiterung (Passenger) für die Subdomain aktiv, liefert der
   Server auf alle Unterpfade HTTP 500 „Web application could not be started"
   (nur `/` kommt durch) – der statische, prerenderte Build braucht **kein**
   Node.js. Diese Falle ist bereits aus dem Hauptdeploy bekannt (siehe
   `CLAUDE.md`, Abschnitt „Bekannte Altlasten / Hinweise").

## b) GitHub-Secrets anlegen

Im Repository unter **Settings → Secrets and variables → Actions** folgende
fünf Secrets anlegen (analog zu `NETCUP_FLIES_*` für den zweiten Host):

| Secret | Inhalt |
|---|---|
| `NETCUP_APP_FTP_HOST` | FTP(S)-Hostname für die App-Subdomain |
| `NETCUP_APP_FTP_PORT` | FTP-Port (optional, Default `21`) |
| `NETCUP_APP_FTP_USER` | FTP-Benutzername (gescoped auf das App-Docroot) |
| `NETCUP_APP_FTP_PASSWORD` | FTP-Passwort |
| `NETCUP_APP_REMOTE_PATH` | Remote-Zielpfad (Docroot der Subdomain) |

Die bestehenden Secrets `SUPABASE_URL`/`SUPABASE_ANON_KEY` werden vom neuen
Workflow **mitverwendet** (dieselbe Supabase-Instanz für alle drei Hosts).

**Solange `NETCUP_APP_FTP_HOST` nicht gesetzt ist, überspringt der Workflow
`app.yml` den Deploy automatisch** (Gate-Step „App-Host-Secrets prüfen") –
er schlägt nicht fehl, sondern meldet nur, dass der Deploy übersprungen wurde.
Das erlaubt es, den Workflow bereits jetzt zu mergen, ohne dass er etwas tut.

## c) Supabase Auth – URL Configuration

Unter **Supabase-Projekt → Authentication → URL Configuration**:

- **Site URL**: `https://app.fliesen-kosten.de`
- **Additional Redirect URLs** (alle vier eintragen, damit Login von allen
  drei Hosts plus lokaler Entwicklung weiterhin funktioniert):
  - `https://app.fliesen-kosten.de/login`
  - `https://fliesen-kosten.de/login`
  - `https://bouletten-contest.de/login`
  - `http://localhost:4200/login`

## d) Go-Live-Sequenz

1. Die fünf `NETCUP_APP_*`-Secrets setzen (siehe b).
2. `app.yml` einmal laufen lassen (Push auf `main` oder manuell per
   `workflow_dispatch`) und verifizieren:
   - `https://app.fliesen-kosten.de/robots.txt` liefert `Disallow: /`.
   - Ein beliebiger Pfad (auch `/`) liefert die App (CSR-Shell), nicht die
     prerenderte Marketing-Startseite.
3. Erst danach in `src/app/config/site.config.ts` die Konstante
   `APP_DOMAIN_LIVE = true` setzen (schaltet App-seitige Logik frei, die auf
   die neue Subdomain verweist – z. B. Links/Redirects Richtung `app.*`).
4. Committen und pushen – dadurch laufen **alle drei** Deploy-Workflows
   (`main.yml`, `flies.yml`, `app.yml`) automatisch für den aktuellen Stand.

Bis Schritt 3 durchgeführt ist, bleibt die App auf allen drei Domains im
Standalone-Modus (keine funktionale Abhängigkeit von `app.fliesen-kosten.de`).
