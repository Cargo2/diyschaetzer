# CLAUDE.md

Leitfaden für die Arbeit an diesem Repository (diyschaetzer).

## Arbeitsweise

- **Ask, don't assume.** If something is unclear, ask before writing a single line.
  Never make silent assumptions about intent, architecture, or requirements.
- **Simplest solution first.** Always implement the simplest thing that could work.
  Do not add abstractions or flexibility that weren't explicitly requested.
- **Don't touch unrelated code.** If a file or function is not directly part of the
  current task, do not modify it, even if you think it could be improved.
- **Flag uncertainty explicitly.** If you are not confident about an approach or technical
  detail, say so before proceeding. Confidence without certainty causes more damage than
  admitting a gap.
- **Suggest better ways.** I'm always open to ideas on better ways to do things. Don't
  hesitate to suggest a better approach, or one that has long-lasting impact over a tactical
  change.

## Projekt

Fliesen-Kostenschätzer für private Heimwerker (und perspektivisch Handwerker).
Ein Angular-Wizard erfasst **einen Raum/Bereich pro Durchlauf** und leitet daraus
Flächen, Fliesenmengen inkl. Verschnitt, eine Materialliste, DIY-Kosten und eine
grobe Profi-Kalkulation ab. Mehrere gespeicherte Räume bilden ein lokales
Projekt mit Gesamtschätzung.

- **Clientseitig mit optionalem Backend**: Angular 21. Ohne Login Stand im `localStorage`; mit Login
  (Supabase) Projekt-Persistenz in der DB (seit Phase 12). Ohne konfiguriertes Supabase läuft alles
  weiter anonym/offline.
- **Sprache**: UI und Domäne sind deutsch. Codebezeichner englisch.
- **Sicherheit**: projektbezogene Security-Checkliste (RLS, Secrets, offene Punkte vor Livegang) in
  [`SECURITY.md`](SECURITY.md) – bei jeder Backend-/Auth-Änderung mitpflegen.
- Repo: https://github.com/Cargo2/diyschaetzer

## Befehle

```bash
ng serve                              # Dev-Server http://localhost:4200
ng build                              # Prod-Build (dist/) – prerendert Inhaltsseiten (SSG)
ng build --configuration development  # Dev-Build (ohne Budgets) – zum Fehler-Check
ng test                               # Vitest, einmalig: ng test --watch=false
npm run generate:ratgeber             # Ratgeber-Beiträge (.md) + sitemap.xml neu generieren
```

- **`prebuild`** läuft automatisch vor jedem `npm run build` (auch in CI) und erzeugt aus
  `src/content/ratgeber/*.md` das Modul `src/app/content/ratgeber-articles.ts` **und**
  `public/sitemap.xml`. Beim Hinzufügen/Ändern eines Beitrags muss man nichts extra tun;
  nur `ng serve`/`ng test` triggern den Generator nicht (das committete Modul reicht dort).

- Tests laufen mit **Vitest** (nicht Karma). Headless ohne Browser-Flags: `ng test --watch=false`.
- Im Preview/Verifikations-Workflow die `preview_*`-Tools nutzen, nicht Bash für den Dev-Server.
- Shell ist **PowerShell** (Windows). Mehrzeilige Commit-Messages über eine Temp-Datei +
  `git commit -F` setzen (PowerShell-Here-Strings brechen an Klammern/Quotes).
- Git: LF→CRLF-Warnungen sind harmlos. `.claude/settings.local.json` ist maschinenspezifisch und
  wird **nicht** mitcommittet.

## Architektur: Berechnungs-Pipeline

Wichtigste Regel: **bestehende Berechnungsservices wiederverwenden, keine Doppelberechnung.**

```
WizardData (+ Assumptions + MaterialListUserState)
  → TileCalculationService        (Flächen/Stückzahl, Boden+Wand getrennt)
  → MaterialRequirementService    (welche Materialien, regelbasiert)
  → MaterialQuantityService       (Mengen, Gebinde, Kosten je Position)
  → MaterialListService           (Raum-Materialliste = ViewModel)
  → CostComparisonService         (DIY vs. Profi)
      └─ ProfessionalOfferService (Profi-Leistungspositionen)
  → ProjectAggregationService     (mehrere Räume → Projekt)
      └─ ProjectMaterialListService (projektweite Liste, Werkzeug-Dedup)
  → ExportDataMapperService       (neutrales ExportDocumentData)
      └─ PdfDocumentBuilderService → PdfExportService (echtes PDF via pdfmake)
```

Jede Änderung an Wizard-Daten, Annahmen oder Materiallisten-State muss die abhängigen
Ergebnisse neu berechnen (Signals/`computed`).

### Zentrale Ableitungen
`services/wizard-data-derivations.ts` enthält die **reinen, geteilten** Helfer
(`isFloorLargeFormat`/`isWallLargeFormat`, `resolveFloorTileAreaM2`,
`deriveDrillHoleCount`, `deriveSealingSleeveCount`, …). DIY- und Profi-Seite müssen
dieselben Helfer nutzen, damit sie nicht auseinanderlaufen.

## Domänen-Konzepte & Konventionen

- **Ein Wizard-Durchlauf = ein Raum.** `RoomType` steuert raumabhängige Fragen.
- **Kein `projectType` mehr** (Renovierung/Neubau wurde entfernt). Relevanz wird aus den
  echten Wizard-Antworten abgeleitet → `WizardFieldRelevanceService`. Nicht relevante Felder
  erscheinen als „Nicht relevant", nie in „Noch zu klären".
- **Annahmen** (`RoomCalculationAssumptions`): jeder Wert ist ein `AssumptionValue<T>` mit
  `source` (`default`/`wizard`/`calculated`/`user_override`/`not_relevant`). `AssumptionService.mergeGroup`
  konserviert **nur `user_override`**; berechnete Werte folgen immer den aktuellen Eingaben.
  Editierbare Annahmen stehen über „Profi Einheitspreise".
- **Fliesen-Richtwert** (`materialPrices.tilePricePerM2`) gehört zu den bearbeitbaren Annahmen,
  nicht zu den Profi-Einheitspreisen. Defaults nach Qualität in `tilePriceDefaults`.
- **Profi-Kosten** = Angebotspositionsmodell (`ProfessionalLineItem`), **keine** Stundenlohnposition.
  Felder `editableByContractor`/`contractorModified`/`contractorNote`/`original*` sind für den
  späteren Handwerker-Modus vorbereitet. `CalculationMode = 'estimate' | 'contractor_draft' | 'contractor_offer'`.
- **Scope-Defaults** sind aktiv (`defaultScopeData()`); ob eine Position anfällt, entscheiden die
  konkreten Antworten (Untergrundzustand, Rückbau, Nassbereich).
- **Verbrauchsmaterial** rechnet auf **Nettofläche** (`baseTileAreaM2`), nicht inkl. Verschnitt;
  der DIY-Puffer (`config/diy-cost-defaults.ts`) ist separat ausgewiesen.
- **Projektweite Liste**: Werkzeuge/PSA/Doku projektweit nur einmal (Dedup über `materialId`),
  Verbrauchsmaterial wird aus der Gesamtmenge **neu gerundet**, Fliesen bleiben raumweise getrennt.

## TypeScript / Build-Eigenheiten

- `tsconfig.json`: `strict`, `noPropertyAccessFromIndexSignature` (Index-Zugriff per Bracket),
  `noImplicitOverride`, `module: preserve` (Default-Imports erlaubt).
- **pdfmake** wird in `PdfExportService` **dynamisch** importiert (Lazy-Chunk, bleibt aus dem
  Initial-Bundle). vfs_fonts 0.2.x exportiert das VFS als Default-Export (`module.exports = vfs`).
  In `angular.json` als `allowedCommonJsDependencies` eingetragen.
- `angular.json`-Budgets: `anyComponentStyle` auf 12 kB/16 kB; `initial` auf 1 MB/1.5 MB
  angehoben (die Hydration-Runtime schob das ~968-kB-Bundle knapp über 1 MB).
- Styling über **Tailwind v4** (PostCSS) plus Komponenten-CSS.

### Prerendering / SSG (Phase 16)
- **`@angular/ssr` als STATISCHER Output** (`outputMode: "static"`, **kein** Node-Server) –
  passt zum statischen netcup-Hosting. `src/server.ts` (Express) wurde entfernt; es bleiben
  `main.server.ts` + `app.config.server.ts` (für die Build-Zeit-Prerender).
- `app/app.routes.server.ts` setzt die Render-Modi: **Prerender** für die Inhaltsseiten
  (`/`, `/ratgeber`, `/ratgeber/:slug` via `getPrerenderParams`, `/impressum`,
  `/datenschutz`, `/kontakt`), **`RenderMode.Client`** für alles Übrige (Rechner, Admin,
  Login, `/geteilt/:token`, Redirects) – die brauchen kein SEO und laufen client-seitig.
- **Prerender-Sicherheit:** `SUPABASE_CLIENT` liefert auf dem Server (`!isPlatformBrowser`)
  `null` → die App nutzt beim Prerender den anonymen Offline-Fallback (gebündelter Katalog),
  keine Auth-/WebSocket-/Netzwerk-Calls im Build. (Sonst bricht der Prerender u. a. unter
  Node 20 mit „ohne native WebSocket support".) **Neue eager Bootstrap-Side-Effects, die
  Browser/`window`/Supabase anfassen, müssen ebenso guarded werden.**
- **SPA-Fallback:** `public/.htaccess` leitet jetzt auf **`index.csr.html`** (Client-Shell),
  da `index.html` die prerenderte Startseite ist. Prerenderte Seiten/Assets werden direkt
  ausgeliefert. Greift nur auf Apache (siehe Passenger-Hinweis unten).
- **SEO je Route:** `SeoService` setzt Title/Description/Canonical/OpenGraph/Twitter +
  JSON-LD; `config/site.config.ts` hält `SITE_URL` (= Ziel-Domain) und den Marken-/Default-Text.

## Schlüsseldateien

| Bereich | Datei |
|---|---|
| Wizard-State (Signals, Payload) | `services/wizard-state.service.ts` |
| Domänen-Typen | `models/bathroom-wizard.model.ts` |
| Materialkatalog (~100 Artikel) | `data/material-catalog-with-prices.ts` (TS-Seed/Fallback) |
| Katalog aus DB (Phase 12) | `services/catalog.service.ts`, `data-access/catalog-repository.ts` (+ `local-`/`supabase-catalog-repository.ts`), Seed-Generator `tools/generate-catalog-seed.mts` |
| Firmenprofil (Phase 13) | `pages/profile/`, `services/company-profile.service.ts`, `data-access/company-profile-repository.ts` (+ `supabase-…`), `guards/contractor.guard.ts`, Migration `0006` |
| Profil-Standardannahmen (Phase 13) | `config/profile-price-fields.ts`, `services/profile-assumption-defaults.service.ts`, `data-access/profile-assumption-defaults-repository.ts` (+ `supabase-…`), Overlay in `services/assumption.service.ts`, Migration `0007` |
| Profi-Angebotsmodul (Phase 13) | `pages/contractor-offers/`, `services/contractor-offer.service.ts`, `models/contractor-offer.model.ts`, `data-access/contractor-offer-repository.ts` (+ `supabase-…`), Migrationen `0008`/`0016` (Versionen: PK `id`, `version`/`status`/`label`); PDF in `services/export-data-mapper.service.ts` + `pdf-document-builder.service.ts` (`offer`-Sektion) |
| Angebot teilen (Phase 13) | `pages/shared-offer/`, `services/contractor-offer-share.service.ts`, `data-access/shared-offer-repository.ts` (+ `supabase-…`), Route `/angebot/:token`, Migration `0017` (`shared_offers` + `get_shared_offer`) |
| Profi-Feedback (Phase 13) | `pages/feedback/feedback-page.component.ts`, `models/feedback.model.ts`, `data-access/feedback-repository.ts` (+ `supabase-…`); Admin: `pages/admin/admin-feedback.component.ts`, `pages/admin/data-access/admin-feedback-repository.ts` (+ `supabase-…`), Migration `0014` (`contractor_feedback`, `admin_list_feedback()`, `admin_set_feedback_status()`) |
| Export-Branding (Firmenname) | `services/contractor-branding.service.ts` (Cache), Anwendung in `pdf-export.service.ts`/`excel-export.service.ts` |
| Mehrere Projekte (aktives Projekt) | `services/local-project.service.ts`, `data-access/project-repository.ts` (+ `supabase-`/`local-storage-`/`session-aware-`) |
| Berechnungs-Defaults | `data/material-calculation-defaults.ts`, `config/professional-offer-defaults.ts`, `config/diy-cost-defaults.ts` |
| Geteilte Ableitungen | `services/wizard-data-derivations.ts` |
| Lokales Projekt (localStorage) | `services/local-project.service.ts`, `models/local-project.model.ts` |
| PDF-Export | `services/pdf-export.service.ts`, `services/pdf-document-builder.service.ts`, `services/export-data-mapper.service.ts` |
| Excel-Export (Phase 10) | `services/excel-export.service.ts`, `services/excel-document-builder.service.ts` (gemeinsame `ExportDocumentData`) |
| Rechtstexte/Cookie (Phase 11) | `pages/legal/` (Impressum/Datenschutz/Kontakt + `legal.css`), `components/cookie-notice/`, Routen in `app.routes.ts` |
| Commercial/Feature-Gates | `models/commercial.model.ts`, `services/feature-access.service.ts`, `config/commercial.config.ts` |
| Affiliate (Phase 8) | `models/affiliate.model.ts`, `config/affiliate.config.ts`, `data/product-offers.ts`, `services/affiliate.service.ts`, `services/affiliate-settings.service.ts` |
| Admin-UI (Phase 15) | `pages/admin/` (lazy `admin.routes.ts`, Shell + Material-Liste/-Editor + Nutzerübersicht), `guards/admin.guard.ts`, `pages/admin/data-access/admin-*-repository.ts` (+ `supabase-…`), Migrationen `0010`–`0013` (`is_admin()`, Write-RLS, `admin_list_users()`) |
| Admin-Statistik & Abos | `pages/admin/admin-dashboard.component.ts` (Default-Route `/admin/dashboard`, Kennzahlen-Kacheln), `admin-subscriptions.component.ts` (`/admin/abos`), Repo `admin-stats-repository.ts` (+ `supabase-…`), Migration `0026` (`admin_get_stats()`, erweiterte `admin_list_subscriptions()`) |
| Missbrauchs-Quotas | Migration `0027` (`enforce_owner_quota()`-Trigger: projects 30/100, offers+invoices 100/500, snippets 100/300, shared_offers 50/300, shared_calculations 50, feedback 10/Tag; Premium höher, Admins ausgenommen) – Details in `SECURITY.md` |
| Ratgeber + SEO (Phase 16) | Beiträge `src/content/ratgeber/*.md` → Codegen `tools/generate-ratgeber.mts` → `src/app/content/ratgeber-articles.ts` (+ `public/sitemap.xml`); `models/ratgeber.model.ts`, `services/ratgeber.service.ts`, `pages/guide/` (Übersicht + `ratgeber-article.component.ts`); `services/seo.service.ts`, `config/site.config.ts`, `public/robots.txt` |
| Prerendering/SSG (Phase 16) | `app/app.routes.server.ts`, `app/app.config.server.ts`, `src/main.server.ts`, `outputMode: static` in `angular.json`; Prerender-Guard in `data-access/supabase-client.ts` |
| SEO-Kostenseiten (Phase 17) | Markdown `src/content/kosten/*.md` → Codegen `tools/generate-ratgeber.mts` → `src/app/content/cost-pages.ts` (+ Sitemap); `models/cost-page.model.ts`, `services/cost-page.service.ts`, `pages/cost/cost-page.component.ts`; Route `/kosten/:slug` (prerendert); CTA-Deep-Link `/raum-anlegen?raum=<roomType>` (gelesen in `wizard-page.component.ts`) |
| PWA (Phase 18 Stufe 3) | `ngsw-config.json` (Index = `index.csr.html`!), `public/manifest.webmanifest`, `public/pwa-icons/`, `services/install-prompt.service.ts`, `services/online-status.service.ts`, `components/offline-banner/`, SW-Provider in `app.config.ts`, Cache-Header in `public/.htaccess` + `deploy/app-subdomain/.htaccess` |

## Roadmap

### Erledigt
- **Logik-Härtung** (15 Fixes): Annahmen-Staleness, `projectType` entfernt, `specific_areas`,
  Großformat Boden/Wand getrennt, Nettoflächen-Verbrauch, Werkzeug-Dedup, Bedingungs-Parser u. a.
- **PDF-Export**: echtes generiertes PDF (pdfmake), Materialliste/Projektliste/Raum-Zusammenfassung/
  Profi-Vergleich. Spalte „Empf. Einkauf" = `packageCount packageUnit`.
- **Phase 8 – Affiliate-Datenmodell**: mehrere ein-/ausschaltbare Shop-Angebote pro Produkt
  (`Merchant`, `ProductOffer`, `ResolvedOffer`), `AffiliateService.getOffersForMaterial()`,
  globaler + je-Shop-Schalter. Noch ohne UI, ohne DB, Katalog unangetastet.
- **Phase 9 – Affiliate-UI**: Shop-Icons in Material- und Projektliste über `AffiliateService`.
- **Responsive-Optimierung**: Tablet/Handy – Hamburger-Menü ab Handy, gestufte Textskalierung,
  ausgesetzter Randabstand ab Tablet, überarbeiteter Kostenvergleich/Profi-Tabelle in der Zusammenfassung.
- **Phase 10 – Excel-Export**: Materialliste/Projektliste zusätzlich als **XLSX** (exceljs, lazy
  geladener Chunk wie pdfmake) aus derselben neutralen `ExportDocumentData`. Feature-Gate
  `canUseExcelExport()` + `COMMERCIAL_CONFIG.excelExportEnabled`. `PremiumExportButton` mit
  `format`-Variante (`pdf`/`excel`). `exceljs` in `angular.json` als `allowedCommonJsDependencies`.
- **Phase 11 – Rechtstexte & Cookie-Hinweis**: Seiten + Routen `/impressum`, `/datenschutz`,
  `/kontakt` (`pages/legal/`, geteiltes `legal.css`); Footer-Links auf `routerLink` umgestellt;
  informativer Cookie-/Speicher-Hinweis (`components/cookie-notice/`, Ack in `localStorage`-Key
  `badprojekt:cookie-notice-ack`, kein Consent-Gate). Inhalte mit klar markierten
  `[Platzhalter: …]` (`.legal-placeholder`) – vor Livegang füllen und rechtlich prüfen.
- **Phase 12 – Backend, Auth & Rollen (Projekt-Persistenz)**: Supabase angebunden; Registrierung
  **Hobby (`customer`)/Profi (`contractor`)** + Login (`AuthService`, Seite `/login`). Projekt-
  Persistenz über die abgekapselte Repository-Schicht (`ProjectRepository`-Interface): `LocalStorage-
  ProjectRepository` (anonym) und `SupabaseProjectRepository` (DB, RLS über `owner_id`), zur Laufzeit
  umgeschaltet vom `SessionAwareProjectRepository` (anonym → localStorage, angemeldet → DB). Beim
  ersten Login mit **leerer** DB wird der lokale Stand **einmalig importiert**; hat die DB bereits
  Daten, wird der In-Memory-Stand aus der DB übernommen (`ProjectSessionSyncService`). localStorage
  bleibt als Offline-Fallback unangetastet.
- **Phase 12 (Rest) – Katalog/Offers in der DB**: Materialkatalog, Arbeitsschritte und Produkt-Offers
  liegen jetzt in der DB (Tabellen `materials`/`work_steps`/`product_offers`, Migration `0004`; Seed
  aus dem TS-Katalog via `tools/generate-catalog-seed.mts` → Migration `0005`). **RLS: öffentlich
  lesbar** (auch anonym), Schreiben nur über `service_role`. Zugriff über die abgekapselte
  `CatalogRepository`-Schicht (`SupabaseCatalogRepository`/`LocalCatalogRepository`); der
  `CatalogService` lädt **einmal** und cached – die **synchrone** Berechnungs-Pipeline bleibt
  unangetastet. Der TS-Katalog ist jetzt nur noch **Seed + Offline-Fallback**; die **DB ist
  Laufzeitquelle**, wenn Supabase konfiguriert ist. Katalog-Pflege/Admin-UI folgt in Phase 15.
- **Phase 15 – Admin-UI & Katalogpflege**: abgekapseltes lazy `/admin` (Guard Rolle `admin`).
  Materialkatalog ansehen/suchen, **bearbeiten** (inkl. Reichweite je Gebinde + Affiliate-Links je
  Händler), **duplizieren** (= anlegen mit gültiger Konfig) und **löschen**; **Nutzer-/Rollen­
  übersicht** (read-only). DB-Schreibpfade gated über `is_admin()` (Migrationen `0010`–`0013`);
  Rollen­vergabe bleibt serverseitig. Eigene Write-Repo-Schicht unter `pages/admin/data-access/`.
- **Reichweite je Gebinde**: optionales `coverageM2PerPackage` am Material; `MaterialQuantityService`
  rechnet `ceil(Fläche / Reichweite)` statt der festen 20-m²-Pauschale, sofern gepflegt.
- **Affiliate aktiviert** (`COMMERCIAL_CONFIG.affiliateEnabled = true`); Anzeige nur für Händler mit
  hinterlegtem Affiliate-Link (Filter auf `affiliateUrl`), keine generierten Such-Links mehr.
- **Phase 16 – Ratgeber + SEO + Prerendering**: Ratgeber wieder im Menü, Markdown-Beiträge (Codegen),
  per-Route-SEO (`SeoService`: Title/Description/Canonical/OG/JSON-LD), `sitemap.xml` + `robots.txt`,
  und **statisches Prerendering (SSG)** der Inhaltsseiten. Details unter „TypeScript / Build-Eigenheiten".
- **App-Subdomain & Auth-Ausbau**: app.fliesen-kosten.de live (Zwei-Baum-Routing: MarketingShell mit
  Topmenü [prerendert] vs. Sidebar-AppShell im lazy `app-area`-Baum; `AppHostService` mit Modi
  app/marketing/standalone, Go-Live-Schalter `APP_DOMAIN_LIVE` in `config/site.config.ts`, Dev-Override
  `?app-host=1`; dritter Deploy-Workflow `.github/workflows/app.yml` mit Noindex-Overrides aus
  `deploy/app-subdomain/`; Wizard-Routen existieren in BEIDEN Bäumen – synchron halten). Google-OAuth-
  Login + Passwort-Bestätigung bei Registrierung; einmaliger Rollen-Claim customer→contractor für
  OAuth-Signups (RPC `claim_contractor_role`, Migration `0022`, 15-Minuten-Fenster). Login lebt auf
  app.* (Sessions sind per Origin). Doku: `docs/auth-google.md`, `docs/deploy-app-subdomain.md`,
  `docs/go-live-checklist.md`.
- **i18n-Sprachmodus (App-Bereich)**: Laufzeit-Übersetzung DE/PL/EN nur im App-Baum; eigener
  `I18nService` + impure `| t`-Pipe (`src/app/i18n/`), Deutsch-als-Schlüssel, Fallback gewählte
  Sprache→EN→DE, Dictionaries als Lazy-Chunks (`dict/{pl,en}.{shell,wizard,offers,invoices,konto}.ts`),
  Coverage-Spec `i18n-coverage.spec.ts` bricht den Build bei fehlenden/verwaisten Keys; Umschalter in
  der Sidebar, Persistenz `badprojekt:ui-lang`. WICHTIG als Regel: neue UI-Strings im App-Bereich
  brauchen PL+EN-Einträge; Dokumente (PDF/XRechnung/geteilte Seite) und Marketing bleiben IMMER
  deutsch. Muttersprachler-Review der maschinellen Übersetzungen offen. Noch unübersetzt:
  Projekt-Dashboard, Materialliste, Zusammenfassungs-Seiten.
- **XRechnung-Ländergating**: `country_code` am Firmenprofil (Migration `0023`), Verkäuferland fließt
  in die Rechnung; XRechnung-Pflichtfeld-Warnungen/-Export nur für DE-Firmen, §19-Hinweis (Rechnung)
  nur bei DE-Verkäufer.
- **Teilen-Link-Ausbau (Tracking/Annahme/Anzahlung)**: Migration `0024` (offer_id, viewed/accepted-
  Spalten, stabiler Token je Angebot via partiellem Unique-Index, owner-UPDATE-Policy); RPCs
  `get_shared_offer_page`/`ping_shared_offer` (Zähler max. 1×/10 min)/`accept_shared_offer` (set-once,
  Name 2–120, flippt `contractor_offers.status` auf accepted). Öffentliche Seite `/angebot/:token`:
  View-Ping, digitales Annahme-Formular, Angenommen-Banner. Editor: Tracking-Zeile
  (Geteilt/Angesehen/Angenommen), Anzahlungsrechnung per Klick (`ContractorInvoiceService.
  buildDepositInvoice`, Prozent vom Brutto mit herausgerechneter USt, §14 Abs. 5-Hinweis).
  Rechnungs-Editor: „Firmendaten aus Profil aktualisieren"-Button (Verkäufer-Snapshot bewusst
  eingefroren, §14).

### Getroffene Entscheidungen
- **DB (ab Backend-Phase): Supabase / PostgreSQL** (Auth, Row Level Security, Storage, Edge Functions).
- **DB-Source-of-Truth**: Ab der Backend-Phase ist die **DB die alleinige Source of Truth**. Der
  TS-Katalog (`material-catalog-with-prices.ts`, `product-offers.ts`) dient dann **nur noch als
  initialer Seed**, nicht mehr als Laufzeitquelle.
- **Backend abgekapselt**: Das Frontend spricht **nie direkt** mit Supabase, sondern nur über eine
  Repository-/Datenservice-Schicht (Interfaces). Ziel: austauschbares Backend, klare Grenze.
- **Admin-UI abgekapselt**: Eigenes lazy-geladenes Feature-Modul mit eigenem Routen-Prefix
  (`/admin`), hinter Rolle `admin` + Route-Guard. Eigene Service-/State-Grenze, keine
  Abhängigkeit der Endkunden-/Profi-Flows von Admin-Code → später unabhängig (ggf. als separat
  deploybare App) weiterentwickelbar.
- **Export global ausschaltbar**: PDF **und** Excel laufen über das Feature-Gate
  (`COMMERCIAL_CONFIG`/`FeatureAccessService`); beide pro Tenant/Plan ein-/ausschaltbar.
- **Affiliate-Anzeige: nur Shop-Icons, die rausverlinken – kein Shop-Preis** (pflegearm,
  Amazon-Preisregel-konform). Interner Schätzpreis bleibt der einzige angezeigte Preis.
- **Rollen-Mapping**: Hobby = `customer`, Profi = `contractor`, dazu `admin`. Profi schaltet
  später Plan `pro` frei → PDF/Branding über das vorhandene Feature-Gate.
- Affiliate war anfangs **standardmäßig aus**; seit Phase 15/16 **aktiv**
  (`COMMERCIAL_CONFIG.affiliateEnabled = true`).

### Kommende Phasen
- **Phase 13 – Profi-Modus** *(abgeschlossen; nur Mailversand bewusst zurückgestellt)*.
  - **Block 1 erledigt: Firmenprofil** – Tabelle `company_profiles` (owner-scoped RLS, Migration
    `0006`), Repository-Schicht (`CompanyProfileRepository`/`SupabaseCompanyProfileRepository`),
    `CompanyProfileService`, Seite `/profil` hinter `contractorGuard` (eingeloggt + Rolle
    `contractor`), Nav-Link nur für Profis. **Logo bewusst noch nicht** (eigener Folgeblock).
  - **Block erledigt: Profil-Standardannahmen** – Profis hinterlegen eigene Default-Preise
    (Profi-Einheitspreise + Fliesen-Richtwert) im Profil. Speicherung als jsonb-Spalte
    `assumption_defaults` auf `company_profiles` (Migration `0007`, partielle Map
    `assumptions-pfad -> wert`; Felder in `config/profile-price-fields.ts`). Der
    `ProfileAssumptionDefaultsService` cached die Defaults synchron; der `AssumptionService`
    überlagert die System-Defaults damit in `createDefaultAssumptions`. **Vorrang gilt: Raum-
    `user_override` > Profil-Default > System-Default** (`mergeGroup` legt den Raum-Override danach
    auf; `source` bleibt `'default'`). Leere Felder = System-Standard (als Platzhalter angezeigt).
  - **Block erledigt: Export-Branding (Firmenname)** – Beim Export eines angemeldeten Profis
    erscheint der **Firmenname** als Kopf-/Fußzeile auf PDF **und** Excel. Der bereits vorhandene,
    bis dahin ungenutzte `branding`-Pfad im Exportmodell wird nun befüllt: der
    `ContractorBrandingService` cached den Firmennamen **synchron** (analog
    `ProfileAssumptionDefaultsService`, Refresh bei Auth-Wechsel + nach dem Speichern) und legt ihn
    in `PdfExportService`/`ExcelExportService` über `applyTo()` aufs Exportmodell. Für Hobby/anonym
    oder ohne Firmennamen bleibt der bisherige Default („Fliesenprojekt"). **Logo bewusst verworfen**
    (Upload = vermeidbares Security-Risiko); nur Text-Branding.
  - **Block erledigt: Profi-Angebotsmodul (`/angebote`)** – Eigener contractor-only Menüpunkt, in dem
    der Profi aus einem Projekt ein **editierbares Leistungsverzeichnis** erzeugt, anpasst und als
    **gebrandetes PDF** herunterlädt. Bausteine:
    - **Multi-Projekt**: Die App verwaltet jetzt **mehrere Projekte** pro Nutzer (aktives Projekt +
      Liste). War rein Frontend-seitig limitiert – `projects`-Schema kann es längst. Erweitert:
      `ProjectRepository` (`listProjects`/`loadProject(id)`/`deleteProject`), Supabase-/localStorage-
      Adapter (Array + Altstand-Migration), `LocalProjectService` (`createProject`/`switchProject`/
      `renameProject`/`deleteProject`, alle bestehenden Mutationen wirken aufs **aktive** Projekt),
      `ProjectSessionSyncService` (Liste statt Einzelprojekt importieren). Hobby-Flows unverändert.
    - **`ContractorOfferService`**: baut das Angebot aus den Räumen – „Baustelle einrichten"
      projektweit **einmal**, je Raum eine Positionsgruppe (`Pos. N` / `N.001…`), Material als **eine
      kompakte Sammelposition** (`professional.materialCost`, Leistung im Vordergrund). Summen werden
      aus dem Modell **abgeleitet** (`contractor-offer.model.ts`), nicht gespeichert.
    - **Editor** (`pages/contractor-offers/`): Positionen anpassen (Preis/Menge/Text/aktiv) **plus**
      eigene Positionen/Gruppen hinzufügen/entfernen/umsortieren; Live-Summen.
    - **Persistenz** pro Projekt in DB (Tabelle `contractor_offers`, jsonb `offer_data`, owner-scoped
      RLS, Migration `0008`), abgekapselt über `ContractorOfferRepository`/`Supabase…`.
    - **PDF**: `ExportDataMapperService.buildContractorOfferExportData` + neuer `offer`-Sektionstyp im
      `PdfDocumentBuilderService` (Leistungsverzeichnis: Gruppen, Zwischensummen, Netto/MwSt./Brutto).
      Download über `PremiumExportButton`; Firmenname-Branding automatisch via `ContractorBrandingService`.
  - **Block erledigt: Profi-Feedback (`/feedback`)** – contractor-only Seite, auf der Profis
    Verbesserungsvorschläge (Kategorie + Freitext) senden. Persistenz in `contractor_feedback`
    (Migration `0014`): **Insert nur eigene Zeile durch Profis** (RLS `owner_id = auth.uid()` +
    `exists`-Rollencheck), **kein** Lesepfad für Endnutzer. Admin sieht/markiert sie in der Admin-UI
    (neuer Tab **Feedback**, `/admin/feedback`) über SECURITY-DEFINER-Funktionen `admin_list_feedback()` /
    `admin_set_feedback_status()` (beide `is_admin()`-gated, Status `new`/`read`). Abgekapselt über
    `FeedbackRepository`/`Supabase…` (Eingabe) und `AdminFeedbackRepository`/`Supabase…` (Admin).
  - **Block erledigt: Angebots-Feinschliff & Angebotskopf** – das Profi-Angebot ist jetzt ein
    versandfähiges Dokument (nicht mehr nur ein LV-Fragment). Umgesetzt, **ohne Migration** (alle
    neuen Felder liegen im vorhandenen jsonb-Blob `offer_data`; Altstand wird über
    `normalizeContractorOffer` aufgefüllt):
    - **Vollständiger Angebotskopf**: Kundenanschrift, Angebotsnummer, Angebotsdatum, Bindefrist
      („gültig bis") am `ContractorOffer`; **Absenderblock** (Anschrift/Tel/Mail/USt-IdNr.) aus dem
      Firmenprofil über `ContractorBrandingService.contactLine` → Export-Branding →
      `PdfDocumentBuilderService.offerHeader` (Brief-Kopf mit „Angebot für"/Meta-Block).
    - **Vor-/Schlusstext**: editierbarer `introText`/`outroText` am Angebot, im PDF über/unter dem LV.
    - **Steuerhinweis**: bei `vatPercent === 0` automatisch § 19 UStG (Kleinunternehmer) aufs PDF;
      MwSt.-Satz wird jetzt ausgewiesen (`MwSt. (19 %)`), Bruttosumme hervorgehoben.
      **Eigener Rechtshinweis** (`OFFER_EXPORT_LEGAL_NOTICE`) statt des DIY-Schätzungs-Disclaimers.
    - **Bedarfs-/Eventualpositionen**: `ContractorOfferLine.isOptional` (aus `ProfessionalLineItem`
      durchgereicht + im Editor umschaltbar): mit Preis ausgewiesen, aber **nicht** in der Summe;
      im PDF als „Bedarfsposition" gekennzeichnet.
    - **Stale-Erkennung + Merge-Regenerierung**: `sourceUpdatedAt` am Angebot (= `project.updatedAt`
      bei Erzeugung) → Hinweisbanner bei geändertem Projekt. „Aus Projekt aktualisieren" (früher
      „Neu erzeugen") **übernimmt** Preis-/Text-Edits (per Positions-`id`) sowie eigene Positionen/
      Gruppen, statt sie zu verwerfen (`ContractorOfferService.applyPreviousEdits`).
    - **Bugfixes**: geteilte Positionsnummerierung Editor ↔ PDF (`offerPositionNumber`/`offerLineNumber`
      im Modell; keine Pos.-Lücken durch leere Gruppen mehr), Race beim Projektwechsel (Lade-Token),
      Race Profil-Standardpreise (`ngOnInit` wartet `profileDefaults.ready` ab), Umbenennen spiegelt
      sofort in den Angebotsnamen, leere Zahlenfelder werden vor Persistenz/Export bereinigt
      (`sanitizeContractorOffer` → kein `null` im jsonb), Speichern bei Projekten ohne Räume gesperrt,
      `contractorGuard` schickt eingeloggte Nicht-Profis auf `/` statt erneut auf `/login`.
  - **Block erledigt: Kalkulations-Feinschliff (Material & Nachlass)** – migrationsfrei (alles im
    jsonb-Blob `offer_data`, Altstand über `normalizeContractorOffer`):
    - **Material je Raum ausweisen**: Toggle `materialBreakdown` – Material als eine Sammelposition
      **oder** je Raum eine eigene Zeile (`ContractorOfferService.materialSectionsFor`).
    - **Material-Aufschlag in %** (`materialSurchargePercent`): Aufschlag auf die Materialkosten,
      als Hinweis in der Positionsbeschreibung. Toggle/Aufschlag werden im Editor **live** über
      `rebuildMaterialSections` neu berechnet; beim „Aus Projekt aktualisieren" übernommen.
    - **Nachlass/Rabatt in %** (`discountPercent`): auf den Nettobetrag **vor** MwSt.; Summenlogik
      (`offerDiscountAmount`/`offerNetAfterDiscount` → VAT/Brutto) und PDF-Totals (Nachlass +
      Zwischensumme netto) angepasst.
    - **Material-Aufschlag als Profil-Standard** ist jetzt umgesetzt (s. nächster Block).
  - **Block erledigt: Profil-Textvorlagen + Material-Aufschlag-Default** – Profis hinterlegen im
    Firmenprofil (`/profil`) Standard-**Einleitungs-/Schlusstext** und einen Default-**Material-
    aufschlag** (%). Diese Werte befüllen jedes **neu erzeugte** Angebot vor (`ContractorOfferDefaults`
    → `ContractorOfferService.buildOffer`, gezogen in `ContractorOffersComponent.loadOfferDefaults`
    aus `CompanyProfileService`); pro Angebot bleibt alles überschreibbar, „Aus Projekt aktualisieren"
    behält die Angebots-Werte. **Migration `0015`** (additive Spalten `offer_intro_text`/
    `offer_outro_text`/`material_surcharge_percent` auf `company_profiles`, owner-scoped RLS von 0006)
    ist **bereits per `npx supabase db push` auf der Remote-DB angewendet**.
  - **Block erledigt: Mehrere Angebote/Versionen pro Projekt** – **Migration `0016`** stellt
    `contractor_offers` vom PK `project_id` auf einen eigenen PK `id` um (project_id bleibt indizierte
    FK-Spalte, ON DELETE CASCADE) und ergänzt `version`/`status` (`draft`/`sent`/`accepted`,
    Check-Constraint)/`label`. **Bereits per `npx supabase db push` remote angewendet.** Modell:
    `ContractorOffer` um `id`/`version`/`status`/`label` (+ `CONTRACTOR_OFFER_STATUS_LABELS`);
    Repository `listByProject`/`save` (upsert über `id`)/`delete`; `ContractorOfferService.duplicateAsNewVersion`.
    Editor: Versions-Chips je Projekt (wechseln), „+ Neue Version" (Kopie), Status-/Label-Feld,
    Version löschen; höchste Version wird beim Laden aktiv.
  - **Block erledigt: Angebot per Link teilen** – **Migration `0017`** (`shared_offers` + SECURITY-
    DEFINER `get_shared_offer(token)`, analog `shared_calculations` 0009; owner-scoped Insert,
    öffentliche Punktabfrage per Token). **Bereits per `npx supabase db push` remote angewendet.**
    Gespeichert wird das **neutrale Exportdokument** (Snapshot inkl. Branding/Absender) über
    `SharedOfferRepository`/`ContractorOfferShareService`. Öffentliche read-only Route
    `/angebot/:token` (`SharedOfferComponent`, clientseitig via `**`-Fallback). „Teilen-Link"-Button
    im Editor (nur für gespeicherte Angebote) erzeugt Link + Kopierfunktion.
  - **Noch offen in Phase 13 – ZURÜCKGESTELLT** (Nutzerentscheidung): gebrandetes Schätzungs-PDF
    **versenden** (Edge Function + Mailversand). Vorerst nicht weiterverfolgt – **Teilen-Link ist die
    umgesetzte Alternative**. Damit ist Phase 13 (Profi-Modus) inhaltlich abgeschlossen.
- **Phase 14 – Teilen-Link** *(erledigt)*: „Teilen"-Button im **Profi-vs-DIY-Vergleich** erzeugt einen
  teilbaren Link auf eine read-only Ansicht der Kalkulation. Backend-Tabelle `shared_calculations`
  (Migration `0009`), öffentlicher Lese-Token via SECURITY-DEFINER-Funktion. localStorage-Stände
  sind nicht teilbar.
- **Phase 17 – Sichtbarkeit / Marketing & SEO-Ausbau** *(geplant)*. Zwei getrennte Funnel:
  **Heimwerker** organisch (billig, skaliert), **Profis** gezielt bezahlt (echter LTV). Reihenfolge:
  1. **Live auf `fliesen-kosten.de`** deployen, dann **Search Console** + Sitemap einreichen
     (ohne Live-Domain läuft kein SEO an; vgl. Hinweis bei „Deploy-Domain").
  2. **SEO-Themen-Kostenseiten** *(begonnen)*: prerenderte Landingpages je Suchabsicht unter
     `/kosten/:slug` (Markdown + Codegen, Details s. Schlüsseldateien). **Strategie experience-getrieben**
     statt rein programmatisch: jede Seite basiert auf einem **echten, anonymisierten Angebot** +
     persönlicher Erfahrung (E-E-A-T), antwort-zuerst, FAQPage-JSON-LD, CTA mit vorbelegtem `RoomType`.
     Erste Seite live: `badezimmer-fliesen-kosten` (reales Hamburger Angebot), von der Startseite aus
     verlinkt (dezenter Kostenbeispiel-Block im Hero; Zwei-Pfad-Hero Heimwerker/Profi mit Vorschau-
     Bildern). Skaliert nur so weit wie echte Projekte/Angebote vorliegen.
  3. **Strukturierte Daten** ausbauen: `FAQPage`-/`HowTo`-JSON-LD auf Kostenseiten/Ratgeber (über
     `SeoService`), interne Verlinkung Ratgeber ↔ Kostenseiten ↔ Rechner. *(Teilweise erledigt:
     Kostenseiten liefern bereits FAQPage-JSON-LD; Ratgeber-Beiträge liefern seit `Häufige Fragen`-
     Extraktion im Codegen jetzt **Article + FAQPage** als `@graph`. Bild-Support in Ratgeber- und
     Kostenseiten-Markdown vorhanden, `HowTo`-JSON-LD noch offen.)*

  **→ ERLEDIGT (Kostenseiten skaliert):** `kueche-fliesen-kosten` (echtes Angebot) liegt vor;
  Kostenseiten insgesamt: `badezimmer-fliesen-kosten`, `kueche-fliesen-kosten`, `fliesen-pro-m2`,
  `fliesen-verlegen-rechner`. Muster steht (`src/content/kosten/_TEMPLATE.md`).

  **→ ERLEDIGT (Ratgeber ausgebaut):** Neue Beiträge `fliesen-nivelliersystem` (Systemvergleich
  toom/OBI + Amazon Raimondi/RUBI/Lantelme, klickbare Amazon-Affiliate-Bilder als Platzhalter mit
  `tag=REPLACE-21`, eigene Baumarkt-Fotos als Platzhalter-SVG) und `fliesen-beige` (Beige-Optiken
  Uni/Beton/Holz/Marmor/Naturstein, klickbare Produktbilder als Affiliate-Platzhalter). Beide mit
  FAQ, `Meine Erfahrung`-Block und interner Verlinkung zueinander + zu Rechner/Kostenseiten.
  **Offen:** echte Amazon-Produktbilder + Affiliate-Links (ASIN) einsetzen und die Baumarkt-
  Platzhalter-SVGs (`public/img/ratgeber/nivelliersystem-*.svg`, `fliese-beige-*.svg`) durch
  eigene Fotos ersetzen. (Hinweis: externe Markdown-Links tragen inzwischen automatisch
  `rel="sponsored nofollow noopener"` + `target="_blank"` über den marked-Renderer in
  `tools/generate-ratgeber.mts` – gilt aktuell für **alle** externen Links, auch redaktionelle
  Quellenangaben; ggf. später auf echte Affiliate-Domains eingrenzen.)

  **→ ERLEDIGT (Rechner-Intent-Ratgeber):** Vier neue Beiträge mit direktem Bezug zur
  Rechner-Kalkulation (hoher Conversion-Intent, jeweils `Antwort zuerst` + Tabelle +
  `Meine Erfahrung`-Block mit offenen Platzhaltern + `Häufige Fragen` → FAQPage-JSON-LD):
  `fliesen-berechnen-verschnitt` (Fliesenbedarf & Verschnitt), `fugenmasse-verbrauch-pro-qm`
  (Fugenmörtel-Verbrauch), `fliesen-auf-fliesen-verlegen` (Renovieren ohne Abriss) und
  `dusche-abdichten-verbundabdichtung` (Nassbereich, als H2-Schrittfolge angelegt → **HowTo-JSON-LD-
  kandidat**). Untereinander und mit `fliesenkleber…`/`bad-fliesen-eigenleistung…` sowie den
  Kostenseiten verlinkt. **Offen:** eigene Fotos statt der Bild-Platzhalter (als HTML-Kommentar
  markiert, kein aktives `<img>` → nichts bricht) und die `Meine Erfahrung`-Blöcke mit konkreten
  eigenen Projektdetails/Marken schärfen.

  **→ RATGEBER-/CONTENT-ROADMAP (geplant, für später):** Priorität nach Sichtbarkeit × Passung
  zum Rechner/Affiliate. Erst weiterbauen, wenn live auf fliesen-kosten.de (sonst kein SEO-Effekt).
  - **Affiliate (Muster `fliesen-nivelliersystem` wiederholen):**
    - `fliesen-schneiden-werkzeug` – „Fliesenschneider: manuell oder elektrisch?" (Kaufberatung,
      Amazon-Spanne 30–300 €, hoher Kauf-Intent).
    - `fliesen-holzoptik` und `fliesen-betonoptik` – Optik-Serie ausbauen (mehr Suchvolumen als
      „beige", identisches Template, untereinander + zu `fliesen-beige` verlinken).
  - **Kostenseiten (nur mit echtem, anonymisiertem Angebot – E-E-A-T-Strategie, s. Memory):**
    - `fliesen-entfernen-kosten` (Rückbau; Wizard fragt Rückbau bereits ab → CTA passt).
    - `gaeste-wc-fliesen-kosten` (kleines häufiges Projekt, `roomType: guest_wc` existiert).
    - `fliesenleger-stundenlohn` (hohes Volumen; aus vorhandenen Angeboten belegbar,
      z. B. Zusatzposition 66 €/Std im Hamburger Bad-Angebot).
  - **Profi-Funnel (organisch für die spätere Ads-Phase vorbereiten):**
    - Ratgeber „Angebot schreiben als Fliesenleger: Positionen, Einheiten, Muster" → verlinkt auf
      `/vorlage/angebot-fliesen-muster` und `/angebote` (B2B-Keywords konkurrenzarm, hoher LTV).
  - **Technik-Schulden dazu:** `HowTo`-JSON-LD im Codegen ergänzen (erst der
    `dusche-abdichten…`-Beitrag ist dafür strukturiert); `og:image`-Default + `summary_large_image`
    im `SeoService`; verwaiste `/kosten/fliesen-verlegen-rechner`-Seite intern verlinken.

  **→ NÄCHSTER SCHRITT:** Weitere Kostenseite je vorliegendem echtem Angebot (z. B.
  `terrasse-fliesen-kosten`; sonst raumneutral „fliesen verlegen kosten pro qm" mit
  `roomType: none`) **und** `HowTo`-JSON-LD auf passenden Ratgeber-/Kostenseiten (Schritt 3)
  ergänzen; interne Verlinkung Ratgeber ↔ Kostenseiten ↔ Rechner weiter verdichten.

  **→ ERLEDIGT:** Separate Landingpage für den **„fliesen verlegen rechner"** (`/kosten/fliesen-verlegen-rechner`,
  Markdown wie die anderen Kostenseiten) liegt vor: erklärt die Wizard-Kalkulation (Flächen, Verschnitt,
  Nettofläche, Gebinde) und die Handwerker-Einheiten (m²/lfm/Stück/Pauschal), bewusst **ohne**
  Preis-pro-qm-Wiederholung, mit Deep-Link zu `/raum-anlegen`. Ebenfalls als eigene Heimwerker-Vorlage
  live: `/vorlage/fliesen-verlegen-material-werkzeug` (Material-/Werkzeug-Checkliste, eigene prerenderte
  Komponente analog zur Profi-Vorlage).

  **→ OFFEN bei der Profi-Vorlage** (`/vorlage/angebot-fliesen-muster`): Es fehlt noch ein
  **Screencast-Video** (Raum anlegen + Angebot erstellen) und ein **eigenes Bild** (Hero, z. B.
  Screenshot des fertigen Leistungsverzeichnisses). Beide sind als Platzhalter vorbereitet – Datei
  nach `public/vorlage/` legen und in `pages/templates/offer-template.component.ts` `videoSrc`
  bzw. `imageSrc` setzen. Video bewusst selbst gehostet (MP4), kein YouTube.
  4. **Conversion-Tracking** (GA4 + Ads): Events Rechner-Start, Rechner-Abschluss, Affiliate-Klick,
     Profi-Registrierung. **Voraussetzung für jeden Ads-Test** – braucht zusätzlich einen vollwertigen
     Cookie-Consent (siehe „Offen vor Affiliate-Livegang", GA4/Ads sind nicht-essentielle Cookies).
  5. **Google-Ads-Tests** (klein, getaktet, mit Kill-Kriterien): DIY nur als **300-€-Lerntest** auf
     Tool-Intent-Keywords (erwartet negativer ROI → dann SEO statt Paid); **Profi** 300–600 € auf B2B-
     Keywords (`fliesenleger software`, `angebot schreiben`, `aufmaß app`), Erfolg = Profi-Registrierungen.

- **Phase 18 – Mobile-First & Profi-App-Vorbereitung** *(Stufe 1 + 2 erledigt; Stufe 3/4 offen)*.
  Ziel: die Web-App mobil **wirklich** nutzbar machen (Profi-Angebotsflow zuerst) und darauf eine
  installierbare App-Version für Profis aufsetzen (PWA zuerst, Stores optional via Capacitor).

  **Breakpoint-Konvention (Phase 18):** neuer/angefasster Code nutzt **1024 / 768 / 640 px**
  (dokumentiert in `styles.css`). Legacy bleibt: App-Shell zusätzlich 920 px, Profil 560 px.

  **Stufe 1 – Profi-Kern mobil fixen** *(erledigt)*:
  1. **Geteilte Angebotsansicht `/angebot/:token`** (Kunden-Sicht): Positionstabelle unter 640 px
     als **Karten-Layout** (Spaltenlabels via `data-label`/`::before`), `.sheet`-Padding reduziert,
     Summenblock volle Breite (`shared-offer.component.css`).
  2. **Angebots-Editor `/angebote`**: `line-table` unter 768 px als **Karten je Position**
     (Bezeichnung oben, Menge·Einheit·Preis nebeneinander, Gesamt/Bedarf/Aktiv als Zeilen, Werkzeuge
     volle Breite); Versions-Chips/Aktionsleiste flex-wrap.
  3. **Touch & iOS**: Move-/Löschen-Buttons ≥ 44 px, Checkboxen vergrößert; globale Regel
     „Inputs ≥ 16 px auf ≤ 768 px" in `styles.css` (iOS-Auto-Zoom); `inputmode="decimal"` auf allen
     Zahlenfeldern (Menge/Preis/MwSt./Aufschlag/Nachlass); `aria-label` auf Icon-Buttons.
  4. **PDF auf Mobile**: `PdfExportService` liefert jetzt über `getBlob` + **Web Share API**
     (`navigator.canShare({files})`) aus – Teilen-/Speichern-Dialog auf iOS/Android; Fallback
     Blob-Objekt-Link (`download` + `target=_blank`). Der Teilen-Link (Phase 13) bleibt die
     bevorzugte mobile Alternative.

  **Stufe 2 – Globale Mobile-Härtung** *(erledigt)*:
  5. Seiten-Audit bei 375 px (Home, Wizard, Login, Kosten-/Ratgeber-Seiten, Projekt-Dashboard):
     einziger Layout-Überlauf waren **Markdown-Tabellen** in Kosten-/Ratgeber-Content → jetzt
     `display:block; overflow-x:auto` (horizontal scrollbar statt Seitenüberlauf). *(Gated Seiten
     `/angebote` + `/angebot/:token` nur per Build/CSS-Review geprüft – brauchen Profi-Login/Daten.)*
  6. Breakpoint-Konvention dokumentiert (s. o.).
  7. **Sticky Brutto-+-Speichern-Leiste** im Angebots-Editor auf Mobile (`.mobile-savebar`,
     `position: sticky; bottom: 0`, mit Safe-Area-Bottom).
  8. **Safe-Area-Insets** (`viewport-fit=cover` + `env(safe-area-inset-*)`) für die sticky
     Kopfleiste, den Footer und die mobile Speicherleiste; `theme-color` gesetzt.

  **Stufe 3 – PWA (installierbare „App light") — ERLEDIGT:**
  9. Service Worker (`ngsw`) verdrahtet: `@angular/service-worker` (exakt `21.2.17` gepinnt –
     `21.2.18` verlangt Core `21.2.18` als Peer; bei Angular-Update mitziehen),
     `"serviceWorker": "ngsw-config.json"` in der production-Config, `provideServiceWorker` in
     `app.config.ts`. **WICHTIG:** `ngsw-config.json` hat `"index": "/index.csr.html"` (die
     Client-Shell) – NICHT `/index.html` (= prerenderte Marketing-Startseite); prerenderte
     `*.html` werden bewusst nicht precached. `public/manifest.webmanifest` (theme `#11574a`,
     background `#f3efe6`, `start_url: "/"` – auf app.* landet man im Projekt-Dashboard) +
     Icon-Satz `public/pwa-icons/` (192/512/512-maskable/apple-touch – NICHT `/icons/`,
     das ist ein reservierter Apache-Alias auf netcup und liefert 404; aus `favicon.svg` per
     `npx @resvg/resvg-js-cli` gerendert). `.htaccess` (beide: `public/` + `deploy/app-subdomain/`)
     liefern `ngsw.json`/`ngsw-worker.js` mit `Cache-Control: no-cache` + `webmanifest`-MIME;
     Deploy-Workflows prüfen die ngsw-Artefakte. Ein Build/SW/Manifest für alle drei Hosts.
     Nach SW-Aktivierung werden Navigationen auch auf der Marketing-Domain aus der Client-Shell
     bedient (Standard-ngsw; bei Bedarf über `navigationUrls` eingrenzbar).
  10. Offline-Hinweis: `OnlineStatusService` (Signal `isOnline`) + globales dezentes
      `OfflineBannerComponent` (in `app.html` neben dem Consent-Banner, prerender-sicher).
      Später optional: Outbox/Sync für Angebote.
  11. Install-Prompt nur für eingeloggte Profis im App-Host: `InstallPromptService`
      (`beforeinstallprompt`/`appinstalled`, iOS-Erkennung + Safari-Anleitung, Standalone-
      Erkennung), Sidebar-Footer-Eintrag „Als App installieren" (i18n DE/PL/EN). Neue Specs:
      `install-prompt.service.spec.ts`, `online-status.service.spec.ts`.

  **Stufe 4 – Profi-App (Angebote) auf dieser Basis — OFFEN:**
  - **TWA-Vorbereitung vorliegend** (Trusted Web Activity → Play Store via Bubblewrap, ohne
    Capacitor): `public/.well-known/assetlinks.json` mit Platzhalter-Fingerprint
    (`REPLACE-WITH-PLAY-APP-SIGNING-SHA256`), Package-Name `de.fliesenkosten.app`, Manifest um
    `id`/`description`/`dir` ergänzt; Schritt-für-Schritt-Anleitung in `docs/twa-android.md`.
    **Offen (nur vom Nutzer erledigbar):** Google-Play-Console-Account anlegen, `.aab` bauen/
    hochladen, den Play-App-Signing-SHA-256 aus der Console in `assetlinks.json` eintragen + deployen.
  12. **Entscheidung PWA-only vs. Capacitor** (nur wenn Store-Präsenz/Push/Kamera gebraucht):
      Capacitor wrappt die bestehende Angular-App; die abgekapselte Repository-Schicht und der
      statische Build machen das ohne Server-Umbau möglich. Erst nach Stufe 1–3 entscheiden.
  13. Mobiler Angebots-Schnellflow: kompakter Einstieg Projekt → Angebot → Teilen/PDF (weniger
      Marketing-Navigation für eingeloggte Profis, z. B. eigene schlanke Contractor-Shell).
  14. Nur mit Capacitor sinnvoll (bewusst nachgelagert): Push-Benachrichtigungen
      (Angebot angesehen/angenommen), Kamera fürs Aufmaß-Foto.

- **Angebots-Lifecycle** *(erledigt)*: Versionen als eingeklappte Zeilenliste, geteilte Angebote
  gesperrt (Bearbeiten nur nach bestätigtem Löschen des Links → `deleteForOffer`), angenommene
  Angebote hart gesperrt + eingerückte „Neue Version"-Zeile, `/angebot/:token` shell-los (ohne
  Topmenü).

- **Phase 19 – Profi-Ausbau** *(erledigt bis auf Muttersprachler-Review/Ads-Landingpage)*:
  (a) **Bestell-/Einkaufsliste je Auftrag**: Bestellt-Häkchen in der projektweiten Materialübersicht
  (contractor-only; `LocalTileProject.orderedMaterialKeys`, `ProjectMaterialListItem.aggregationKey`,
  ✓/☐ im PDF/Excel-Export; Häkchen bumpen bewusst kein `updatedAt`).
  (b) **Positions- & Textbausteinkatalog**: Tabelle `contractor_snippets` (Migration `0025`, remote),
  Repo-Trio + `ContractorSnippetService`, Verwaltungsseite `/konto/vorlagen`, Editor-Integration
  („+ aus Katalog" je Gruppe, „Aus Vorlagen einfügen" an Intro/Outro, „Als Vorlage speichern").
  (c) **Anzahlungs-/Abschlags-/Schlussrechnungs-Kette** (migrationsfrei im jsonb-Blob):
  `ContractorInvoice.kind` (standard/deposit/partial/final) + eingefrorener `settledPayments`-
  Snapshot (§ 14 Abs. 5 S. 2; nie neu berechnen), `buildPartialInvoice`/`buildFinalInvoice`,
  gruppierte Rechnungsliste je Angebot (Art-Badges, „Als bezahlt markieren", Σ gestellt ohne
  Doppelzählung), Anrechnungs-Karte im Editor, PDF-Anrechnungsblock mit USt-Ausweis + Restbetrag,
  XRechnung BT-113/BT-115 (BR-CO-16 geprüft); Buttons Anzahlung/Abschlag/Schlussrechnung im
  Angebots-Editor.
  (d) i18n-Rest erledigt (Dashboard/Materialliste/Zusammenfassungen/Annahmen/Lead-Formular, ~320
  Key-Paare). **PL-Ads-Landingpage live**: `/dla-glazurnikow` (`pages/dla-glazurnikow/`, prerendert,
  komplett polnisch, hreflang-Tripel de/pl/x-default auf beiden B2B-Seiten via `SeoService`-Option
  `alternates`, Cross-Links, in Sitemap; deutsche Rechtsbegriffe wie § 19 UStG/XRechnung bleiben
  deutsch mit polnischer Erklärung). **Offen**: Muttersprachler-Review aller Dictionaries + der
  PL-Landingpage (Review-Export liegt als untracked `i18n-review-pl.xlsx` im Projekt-Root, 920 Keys).
  (e) Anwenderdoku `/hilfe/rechnungen` + Kündigungs-Hinweis auf `/konto/premium` + PDF-Download-
  Button auf der öffentlichen Angebotsseite ergänzt. **Offen**: automatisierte Löschung nach
  Ablauf der Kündigungsfrist (DSGVO) – aktuell nur kommunikative Zusage, keine technische Umsetzung.

### Zurückgestellt / nicht relevant
- **Phase 16 – White-Label**: Mandanten-Branding, Partner-Katalog-Scope, Feature-Auswahl je Tenant
  (`WhiteLabelConfig` vorbereitet). **Bewusst zurückgestellt** – nur bei konkretem Partner-/B2B-Bedarf.

### Offen vor Affiliate-Livegang
- Echte Affiliate-URLs statt der `PLACEHOLDER`-Links in `data/product-offers.ts`.
- Amazon-Partner-Tag (`tag=REPLACE-21` in `config/affiliate.config.ts`) ersetzen.
- Klären, welche Shops überhaupt **SKU-Deeplinks** erlauben (sonst `type: 'search'` nutzen);
  ggf. `gtin`/`ean` ans Produkt nehmen, um Links generierbar zu machen.
- **Cookie-Consent für nicht-essentielle/Affiliate-Cookies**: Phase 11 liefert nur den Basis-Hinweis
  (technisch notwendiges `localStorage`). Vor Affiliate-Livegang vollwertigen Consent-Manager
  (Opt-in mit Kategorien) ergänzen und die Datenschutzerklärung um die Affiliate-/Drittanbieter-
  Hinweise (z. B. Amazon-Partnerprogramm) erweitern.

## Bekannte Altlasten / Hinweise
- Prod-Build endet mit einer Warnung zum Initial-Bundle (~1 MB, Budget-Warnung 1 MB) – kein Fehler.
- Der TS-Materialkatalog (`material-catalog-with-prices.ts`, `product-offers.ts`) ist seit Phase 12
  nur noch **Seed + Offline-Fallback**; Laufzeitquelle ist die DB (über `CatalogService`). Bei
  Katalog-Änderungen `tools/generate-catalog-seed.mts` neu laufen lassen und Migration anwenden.
- Gespeicherte Alträume im localStorage werden beim Laden normalisiert (fehlende Felder ergänzt).
- **Deploy-Domain:** **fliesen-kosten.de** (Marketing/Inhaltsseiten) und **app.fliesen-kosten.de**
  (App-Bereich, `APP_DOMAIN_LIVE=true`) sind live; **bouletten-contest.de** ist nur noch ein
  Noindex-Stub. Sitemap ist entsprechend in der Search Console für fliesen-kosten.de einzureichen.
- **netcup/Plesk-Passenger-Falle:** Ist für die Domain die **Plesk-Node.js-Erweiterung (Passenger)**
  aktiv, liefert der Server auf alle Unterpfade HTTP 500 „Web application could not be started" (nur
  `/` kommt durch). Der statische, prerenderte Build braucht **kein** Node → in Plesk **Node.js
  deaktivieren**, dann bedient Apache statisch + liest die `.htaccess`.
- **DB-Migrationen werden NICHT vom CI deployt** – nach neuen Migrationen manuell `npx supabase db push`.
