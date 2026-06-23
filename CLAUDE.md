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
ng build                              # Prod-Build (dist/)
ng build --configuration development  # Dev-Build (ohne Budgets) – zum Fehler-Check
ng test                               # Vitest, einmalig: ng test --watch=false
```

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
- `angular.json`-Budgets: `anyComponentStyle` auf 12 kB/16 kB angehoben (Tailwind-Projekt).
  Initial-Bundle ~660 kB → nur Warnung (unter dem 1-MB-Error-Limit).
- Styling über **Tailwind v4** (PostCSS) plus Komponenten-CSS.

## Schlüsseldateien

| Bereich | Datei |
|---|---|
| Wizard-State (Signals, Payload) | `services/wizard-state.service.ts` |
| Domänen-Typen | `models/bathroom-wizard.model.ts` |
| Materialkatalog (~100 Artikel) | `data/material-catalog-with-prices.ts` (TS-Seed/Fallback) |
| Katalog aus DB (Phase 12) | `services/catalog.service.ts`, `data-access/catalog-repository.ts` (+ `local-`/`supabase-catalog-repository.ts`), Seed-Generator `tools/generate-catalog-seed.mts` |
| Firmenprofil (Phase 13) | `pages/profile/`, `services/company-profile.service.ts`, `data-access/company-profile-repository.ts` (+ `supabase-…`), `guards/contractor.guard.ts`, Migration `0006` |
| Profil-Standardannahmen (Phase 13) | `config/profile-price-fields.ts`, `services/profile-assumption-defaults.service.ts`, `data-access/profile-assumption-defaults-repository.ts` (+ `supabase-…`), Overlay in `services/assumption.service.ts`, Migration `0007` |
| Profi-Angebotsmodul (Phase 13) | `pages/contractor-offers/`, `services/contractor-offer.service.ts`, `models/contractor-offer.model.ts`, `data-access/contractor-offer-repository.ts` (+ `supabase-…`), Migration `0008`; PDF in `services/export-data-mapper.service.ts` + `pdf-document-builder.service.ts` (`offer`-Sektion) |
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
- Affiliate global **standardmäßig aus** (`COMMERCIAL_CONFIG.affiliateEnabled = false`).

### Kommende Phasen
- **Phase 13 – Profi-Modus** (in Arbeit).
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
  - **Noch offen in Phase 13**: gebrandetes Schätzungs-PDF **versenden** (Edge Function + Mailversand).
    Gate via Feature-Access.
- **Phase 14 – Teilen-Link**: „Teilen"-Button im **Profi-vs-DIY-Vergleich** erzeugt einen teilbaren
  Link auf eine read-only Ansicht der Kalkulation. Setzt das Backend voraus (gespeicherte Kalkulation
  + öffentlicher Lese-Token via RLS); reine localStorage-Stände sind nicht teilbar.
- **Phase 15 – Admin-UI & Produktkatalogpflege**: eigene, **abgekapselte Admin-UI** (lazy-geladenes
  Feature-Modul unter `/admin`, Route-Guard auf Rolle `admin`, eigene Service-/State-Grenze, keine
  Kopplung an Endkunden-/Profi-Flows → später eigenständig, ggf. separat deploybar, weiterentwickelbar).
  Inhalt minimal halten: Merchants/Offers/Produkte pflegen, eigene/Partner-Produkte, ggf. Nutzer-/
  Rollenübersicht. Bewusst klein (Ziel: wenig pflegen).
- **Phase 16 – White-Label**: Mandanten-Branding, Partner-Katalog-Scope, Feature-Auswahl je Tenant
  (`WhiteLabelConfig` ist vorbereitet).

### Offen vor öffentlichem Livegang
- **Rechtstext-Platzhalter füllen**: alle `[Platzhalter: …]` in `pages/legal/` (Impressum,
  Datenschutz, Kontakt) mit den tatsächlichen Anbieterdaten ersetzen und rechtlich prüfen lassen.
  Der `mailto:[platzhalter@example.com]`-Link in Kontakt/Impressum/Datenschutz ist ebenfalls Platzhalter.

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
- Prod-Build endet mit einer Warnung zum Initial-Bundle (~660 kB) – kein Fehler.
- Der TS-Materialkatalog (`material-catalog-with-prices.ts`, `product-offers.ts`) ist seit Phase 12
  nur noch **Seed + Offline-Fallback**; Laufzeitquelle ist die DB (über `CatalogService`). Bei
  Katalog-Änderungen `tools/generate-catalog-seed.mts` neu laufen lassen und Migration anwenden.
- Gespeicherte Alträume im localStorage werden beim Laden normalisiert (fehlende Felder ergänzt).
