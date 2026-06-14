# CLAUDE.md

Leitfaden für die Arbeit an diesem Repository (diyschaetzer).

## Projekt

Fliesen-Kostenschätzer für private Heimwerker (und perspektivisch Handwerker).
Ein Angular-Wizard erfasst **einen Raum/Bereich pro Durchlauf** und leitet daraus
Flächen, Fliesenmengen inkl. Verschnitt, eine Materialliste, DIY-Kosten und eine
grobe Profi-Kalkulation ab. Mehrere gespeicherte Räume bilden ein lokales
Projekt mit Gesamtschätzung.

- **Rein clientseitig**: Angular 21, Stand im `localStorage`. Kein Login, keine DB (Stand jetzt).
- **Sprache**: UI und Domäne sind deutsch. Codebezeichner englisch.
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
| Materialkatalog (~100 Artikel) | `data/material-catalog-with-prices.ts` |
| Berechnungs-Defaults | `data/material-calculation-defaults.ts`, `config/professional-offer-defaults.ts`, `config/diy-cost-defaults.ts` |
| Geteilte Ableitungen | `services/wizard-data-derivations.ts` |
| Lokales Projekt (localStorage) | `services/local-project.service.ts`, `models/local-project.model.ts` |
| PDF-Export | `services/pdf-export.service.ts`, `services/pdf-document-builder.service.ts`, `services/export-data-mapper.service.ts` |
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

### Getroffene Entscheidungen
- **DB (ab Phase 10): Supabase / PostgreSQL** (Auth, Row Level Security, Storage, Edge Functions).
- **Affiliate-Anzeige: nur Shop-Icons, die rausverlinken – kein Shop-Preis** (pflegearm,
  Amazon-Preisregel-konform). Interner Schätzpreis bleibt der einzige angezeigte Preis.
- **Rollen-Mapping**: Hobby = `customer`, Profi = `contractor`, dazu `admin`. Profi schaltet
  später Plan `pro` frei → PDF/Branding über das vorhandene Feature-Gate.
- Affiliate global **standardmäßig aus** (`COMMERCIAL_CONFIG.affiliateEnabled = false`).

### Kommende Phasen
- **Phase 9 – Affiliate-UI**: Shop-Icons (Obi/Toom/Amazon) neben jedem Material über
  `AffiliateService`; `rel="nofollow sponsored noopener"`, neues Tab; Werbe-/Sponsored-Kennzeichnung;
  globaler Toggle sichtbar. Braucht kleine SVG-Icons in `/public`. Kein Backend.
- **Phase 10 – Backend + Auth + Rollen**: Supabase aufsetzen; Registrierung **Hobby/Profi**;
  Katalog/Offers & Projekte in die DB (Seed aus dem TS-Katalog als Single Source of Truth);
  RLS; lokalen Stand beim ersten Login importieren.
- **Phase 11 – Profi-Modus**: Profi editiert Positionsdaten (Felder existieren bereits) in
  Wizard/Profil; **Firmenprofil** (Logo, Adresse, Kontakt, USt-IdNr.); `contractor_offer`;
  gebrandetes Schätzungs-PDF **versenden** (Edge Function + Mailversand). Gate via Feature-Access.
- **Phase 12 – Produktkatalog & Adminpflege**: minimal – Merchants/Offers/Produkte pflegen,
  eigene/Partner-Produkte. Bewusst klein (Ziel: wenig pflegen).
- **Phase 13 – White-Label**: Mandanten-Branding, Partner-Katalog-Scope, Feature-Auswahl je Tenant
  (`WhiteLabelConfig` ist vorbereitet).

### Offen vor Affiliate-Livegang
- Echte Affiliate-URLs statt der `PLACEHOLDER`-Links in `data/product-offers.ts`.
- Amazon-Partner-Tag (`tag=REPLACE-21` in `config/affiliate.config.ts`) ersetzen.
- Klären, welche Shops überhaupt **SKU-Deeplinks** erlauben (sonst `type: 'search'` nutzen);
  ggf. `gtin`/`ean` ans Produkt nehmen, um Links generierbar zu machen.

## Bekannte Altlasten / Hinweise
- Prod-Build endet mit einer Warnung zum Initial-Bundle (~660 kB) – kein Fehler.
- Der statische Materialkatalog ist die aktuelle Quelle; mit Phase 10 wird er DB-Seed.
- Gespeicherte Alträume im localStorage werden beim Laden normalisiert (fehlende Felder ergänzt).
