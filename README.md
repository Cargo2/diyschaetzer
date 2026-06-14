# diyschaetzer

Ein Fliesen-Kostenschätzer für private Nutzer (und perspektivisch Handwerker).
Über einen Wizard wird **ein Raum oder Bereich pro Durchlauf** erfasst (Bad,
Gäste-WC, Küche, Flur, Wohnraum, Keller, HWR, Terrasse/Balkon oder ein freier
Raum). Aus den Angaben werden Flächen, Fliesenmengen inkl. Verschnitt, eine
Materialliste, DIY-Kosten und eine grobe Profi-Kalkulation abgeleitet. Mehrere
gespeicherte Räume bilden zusammen ein lokales Projekt mit Gesamtschätzung.

Die Anwendung läuft rein clientseitig (Angular, Stand der Daten im
`localStorage`) — kein Login, keine Datenbank.

## Funktionen

- **Raumbezogener Wizard** mit raumtyp-abhängigen Fragen und zentraler
  Relevanzlogik ([wizard-field-relevance.service.ts](src/app/services/wizard-field-relevance.service.ts)).
- **Materialliste je Raum** mit optionalen Materialien und Plus/Minus je Position.
- **DIY-/Profi-Vergleich** über ein Angebotspositionsmodell (keine Stundenlohnposition).
- **Projekt-Dashboard** mit projektweiter Materialliste; Werkzeuge werden
  projektweit nur einmal gerechnet, Verbrauchsmaterial wird aus der Gesamtmenge
  neu gerundet.
- **PDF-Export** (siehe unten) als echtes, generiertes Dokument.

## PDF-Export

Der Export erzeugt ein **echtes, generiertes PDF** (kein Ausdruck der Webseite).
Die strukturierten Exportdaten ([ExportDataMapperService](src/app/services/export-data-mapper.service.ts))
werden über [PdfDocumentBuilderService](src/app/services/pdf-document-builder.service.ts)
in eine [pdfmake](https://pdfmake.github.io/docs/)-Definition übersetzt und von
[PdfExportService](src/app/services/pdf-export.service.ts) als Datei
heruntergeladen.

- **Materialliste** (je Raum): Tabelle mit Position, Menge, **empfohlenem
  Einkauf** (Gebinde, z. B. „3 × 25-kg-Sack"), Einzelpreis und Summe. Nur aktive
  Positionen erscheinen in der Einkaufsliste.
- **Projekt-Materialliste**: gleiche Tabellenform über alle Räume.
- **Raum-Zusammenfassung** und **Profi-Kalkulation** als weitere Dokumenttypen.

`pdfmake` wird **dynamisch** geladen (Lazy-Chunk) und bleibt damit außerhalb des
Initial-Bundles. Der Zugriff läuft über [FeatureAccessService](src/app/services/feature-access.service.ts)
(`canUsePdfExport`) — aktuell für alle Nutzer freigeschaltet, später als
Premium-Feature vorbereitet.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Product Roadmap

The following commercial capabilities are prepared in the data model only. They do
not currently add payments, accounts, access restrictions, tracking, or visible
sales features.

### Affiliate

- Add product links to individual material positions.
- Add a "Produkt ansehen" merchant action.
- Support product alternatives.
- Mark sponsored products visibly.
- Use `rel="nofollow sponsored noopener"` for external affiliate links.

### PDF Export

Implemented (see [PDF-Export](#pdf-export) above):

- ✅ Export material lists (per room).
- ✅ Export the project-wide material list.
- ✅ Export the room summary and the professional comparison.

Planned:

- Export reviewed contractor offers once the contractor mode exists.
- Gate PDF export behind the premium plan for professional users.

### Own Product Catalog

- Manage products, prices, units, and package sizes.
- Assign catalog products to material positions.
- Maintain outdoor suitability and product links.
- Support merchant, affiliate, own-brand, and partner products.

### SaaS For Professional Users

- Maintain company-specific unit prices and service texts.
- Maintain professional document templates and standard wording.
- Edit professional line items.
- Generate branded estimate and offer documents later.

### White Label

- Configure partner branding, colors, logos, and support details.
- Select a partner-specific or mixed product catalog.
- Allow a configurable feature selection per partner.

Request brokerage, contractor matching, customer inquiry workflows, lead scoring,
and lead sales are explicitly outside this roadmap.
