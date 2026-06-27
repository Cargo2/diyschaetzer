# Ratgeber-Beiträge schreiben

Jeder Beitrag ist **eine Markdown-Datei** in diesem Ordner. Der Build erzeugt daraus
automatisch die Übersicht, die Artikelseite (`/ratgeber/<dateiname>`), die SEO-Tags
und den Sitemap-Eintrag.

## Neuen Beitrag anlegen

1. `_TEMPLATE.md` kopieren und sinnvoll benennen – **der Dateiname ist der URL-Slug**.
   - Nur Kleinbuchstaben, Ziffern, Bindestriche. Beispiel:
     `fliesen-im-bad-richtig-verfugen.md` → `/ratgeber/fliesen-im-bad-richtig-verfugen`
   - Slug nach Veröffentlichung **nicht mehr ändern** (sonst bricht der Link / SEO).
2. **Frontmatter** (der `---`-Block oben) ausfüllen:
   - `title` – Pflicht. Wird H1 und `<title>`.
   - `description` – Pflicht. ~150 Zeichen, Meta-Description + Teaser, mit Hauptkeyword.
   - `date` – `YYYY-MM-DD`. Steuert die Sortierung (neueste zuerst) und `lastmod` in der Sitemap.
   - `tags` – Liste, z. B. `[material, bad]`.
3. Inhalt in **Markdown** schreiben: `##` für Abschnitte, Listen, Tabellen, `**fett**`,
   `[Linktext](/raum-anlegen)` für interne Links.
4. Vorschau/Build: Der Generator läuft automatisch bei `npm run build`
   (oder einmalig `npm run generate:ratgeber`). Beim reinen `ng serve` einmal
   `npm run generate:ratgeber` ausführen, damit der neue Beitrag erscheint.

## Entwürfe

Dateien, deren Name mit **`_`** beginnt (z. B. `_TEMPLATE.md`, `_entwurf-xyz.md`),
werden **nicht** veröffentlicht/prerendert. So kannst du an einem Beitrag schreiben,
ohne ihn schon live zu schalten. Zum Veröffentlichen das `_` aus dem Dateinamen entfernen.

## SEO-Hinweise

- **Ein** `# H1` pro Seite kommt automatisch aus `title` – im Markdown also mit `##` beginnen.
- Aussagekräftiger Slug + Title + Description mit dem Suchbegriff.
- Intern verlinken (zum Rechner, zu verwandten Beiträgen) – stärkt Indexierung und Conversions.
- Bilder bei Bedarf nach `public/` legen und mit absolutem Pfad einbinden
  (`![Alt-Text](/pfad/bild.jpg)`); immer aussagekräftiger Alt-Text.
