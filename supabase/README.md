# Supabase-Setup (Phase 12)

Dieses Verzeichnis enthält das Datenbankschema und die RLS-Policies des
diyschaetzer-Backends als **versionierte Migrationen** (Supabase CLI).

> Stand Block 2: Das Schema steht, der `SupabaseProjectRepository` ist
> implementiert und getestet – aber **noch nicht** in `app.config.ts`
> verdrahtet. Die App nutzt weiterhin den localStorage-Adapter. Das Umschalten
> passiert in Block 3 (Auth), sobald eine Session existiert.

## 1. Voraussetzungen

- [Supabase CLI](https://supabase.com/docs/guides/cli) installiert
  (`npm i -g supabase` oder via Scoop/Choco).
- Für **lokale** Entwicklung zusätzlich Docker Desktop.
- Alternativ direkt ein **gehostetes** Projekt auf https://supabase.com.

## 2. Projekt anlegen

### Variante A – Gehostetes Projekt (empfohlen für den ersten Start)

1. Auf https://supabase.com ein neues Projekt erstellen (Region: EU).
2. Den **Project Ref** (aus der Projekt-URL bzw. Settings) notieren.
3. Lokal verlinken und Migrationen einspielen:

   ```bash
   supabase login
   supabase link --project-ref <DEIN_PROJECT_REF>
   supabase db push          # spielt supabase/migrations/* ein
   ```

### Variante B – Lokal (Docker)

```bash
supabase start              # startet Postgres, Auth, Studio lokal
supabase db reset           # wendet alle Migrationen frisch an
```

Studio läuft dann auf http://localhost:54323.

## 3. Zugangsdaten ins Frontend

Project Settings → **API**:

- **Project URL** → `environment.supabase.url`
- **anon/public key** → `environment.supabase.anonKey`

Eintragen in [`src/environments/environment.development.ts`](../src/environments/environment.development.ts)
(lokal) bzw. über die Deploy-Umgebung für Produktion. **Keine echten Werte ins
Repo committen.** Solange beide Felder leer sind, bleibt der localStorage-Adapter
aktiv und die App läuft offline weiter.

## 4. Auth-Konfiguration

- E-Mail-Signup ist in [`config.toml`](./config.toml) aktiviert.
- Lokal ist die E-Mail-Bestätigung aus; **für Produktion einschalten**.
- Beim Registrieren setzt das Frontend `role` in den User-Metadaten
  (`customer` für Hobby, `contractor` für Profi). Der Trigger
  `handle_new_user` legt daraus automatisch ein `profiles`-Zeile an
  (siehe `0002_rls_and_signup.sql`). `admin` wird manuell gesetzt.

## 5. Schema im Überblick

| Tabelle | Inhalt | Zugriff (RLS) |
|---|---|---|
| `profiles` | Rolle (`customer`/`contractor`/`admin`) + Plan je Nutzer | nur eigenes Profil |
| `projects` | ein Fliesenprojekt je Zeile, dem Eigentümer zugeordnet | nur Eigentümer |
| `rooms` | Räume eines Projekts (`wizard_data`/`material_list_user_state` als jsonb) | über Projekt-Eigentum |

## 6. Adapter aktivieren (Block 3)

Sobald Auth steht, wird in [`app.config.ts`](../src/app/app.config.ts) der
`PROJECT_REPOSITORY`-Provider von `LocalStorageProjectRepository` auf
`SupabaseProjectRepository` umgestellt – idealerweise abhängig davon, ob ein
konfigurierter Client **und** eine Session vorhanden sind. Konsumenten
(`LocalProjectService` etc.) bleiben dabei unverändert.

## Neue Migration erstellen

```bash
supabase migration new <name>
# Datei in supabase/migrations/ bearbeiten, dann:
supabase db push        # gehostet
# oder lokal:
supabase db reset
```
