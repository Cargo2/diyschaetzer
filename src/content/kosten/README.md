# Kostenseiten (SEO – Phase 17)

Kommerziell ausgerichtete Landingpages je Suchabsicht („… fliesen Kosten"). Eine
Datei = eine Seite unter `/kosten/<dateiname-ohne-md>`. Aus dem Markdown erzeugt
`tools/generate-ratgeber.mts` das Modul `src/app/content/cost-pages.ts` und nimmt
die Seite in `public/sitemap.xml` auf (läuft als `prebuild` automatisch; manuell:
`npm run generate:ratgeber`).

## Abgrenzung zum Ratgeber

- **Ratgeber** = erklärt (Wissen, Top-of-Funnel), `Article`-JSON-LD.
- **Kostenseite** = beantwortet die Preisfrage antwort-zuerst und schleust in den
  Rechner. CTA ist ein Deep-Link mit vorbelegtem Raumtyp; `FAQPage`-JSON-LD.

## Frontmatter

```
---
title: Badezimmer fliesen Kosten: echtes Angebot im Vergleich   # H1 + <title>
description: 140–155 Zeichen, Kostenthema + Praxisbezug + Rechner-Nutzen
roomType: bathroom        # speist den CTA /raum-anlegen?raum=<roomType>; 'none' = ohne
ctaLabel: Badezimmer-Kosten jetzt berechnen                      # optional
---
```

Gültige `roomType`-Werte (siehe `models/bathroom-wizard.model.ts`): `bathroom`,
`guest_wc`, `kitchen`, `hallway`, `living_area`, `basement`, `utility_room`,
`terrace_balcony`, `other` – oder `none` für raumneutrale Seiten („… pro qm").

## Konventionen

- **Kein Schreib-/Veröffentlichungsdatum** (bewusste Entscheidung – keine
  „aktualisiert am"-Signale, die gepflegt werden müssten).
- Den **CTA-Link nicht selbst schreiben** – die Komponente baut ihn aus `roomType`.
- **FAQ** stehen als `## Häufige Fragen` mit `### Frage`-Unterüberschriften im Body;
  der Codegen extrahiert sie zusätzlich fürs FAQPage-JSON-LD (einmal pflegen).
- **Entwürfe**: Dateien mit `_`-Präfix (z. B. `_entwurf.md`) und `README.md` werden
  übersprungen – so kann man schreiben, ohne dass die Seite schon live/prerendert ist.
- **Keine erfundenen Zahlen/Erfahrungen.** Echte Angebote anonymisieren; offene
  Stellen klar als `[VON DIR: …]` markieren und vor Livegang füllen.
