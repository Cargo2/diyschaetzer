# Konzept: Sidebar-Menü ohne Login sichtbar + anonymes Angebot mit „VORSCHAU"-Wasserzeichen

Stand: 26.07.2026 · Status: **Entwurf zur Freigabe** (noch nichts umgesetzt)

## Ziel

Auf app.fliesen-kosten.de sollen Fliesenleger sofort sehen, was die App kann:

1. **Alle Profi-Menüpunkte sind immer sichtbar.** Ohne Login sind sie ausgegraut; ein Klick
   zeigt einen Hinweis „Bitte einloggen" (mit Link zu Login/Registrierung).
2. **Ausnahme „Angebote":** Der Menüpunkt ist auch ohne Login aktiv. Anonyme Nutzer können
   ein Angebot erstellen und als PDF herunterladen — mit großem diagonalem
   **„VORSCHAU"-Wasserzeichen** auf jeder Seite. Nach Registrierung/Login als Profi wird das
   normale PDF ohne Wasserzeichen erzeugt.
3. **Polnisch/Englisch:** Alle neuen UI-Texte werden dreisprachig angelegt (DE als Schlüssel,
   PL + EN in den Dictionaries) — damit ist auch die polnische Version (Zielgruppe der
   Ads-Landingpage `/dla-glazurnikow`) abgedeckt.

---

## Ist-Zustand (Kurzfassung der Analyse)

- **Sidebar** (`src/app/layout/app-shell/app-shell.component.html`): Die Gruppen „Angebote"
  (Angebote, Rechnungen, Anfragen) und „Konto" (Firmenprofil, Eigene Preise, Vorlagen,
  Premium, Anfragen empfangen, Feedback) sind komplett in `@if (nav.isAuthenticated() &&
  nav.isContractor())` gehüllt — anonym sieht man davon **nichts**. Es gibt bereits ein
  etabliertes „ausgegrauter Menüpunkt mit Tooltip"-Muster (`.nav-link.disabled` +
  `[attr.title]`, z. B. „Erfordert aktives Premium-Abo") und ein Overlay-/Dialog-Muster
  (Consent-Banner: Service-Signal + `role="dialog"`), die wir wiederverwenden.
- **Route-Guard**: `contractorGuard` (`src/app/guards/contractor.guard.ts`) blockt `/angebote`
  hart: anonym → `/login`, eingeloggter Hobby-Nutzer → `/`.
- **Angebots-Editor** (`pages/contractor-offers/`): Der Kern ist **bereits anonym-tauglich** —
  Projekte kommen anonym aus dem localStorage (`SessionAwareProjectRepository`), der
  `ContractorOfferService` (Angebot bauen/berechnen) ist komplett auth-frei, und alle
  Profil-/Branding-/Snippet-Services haben saubere Anonym-Fallbacks. Nur die
  **DB-Schreibpfade** (Speichern, Version löschen) werfen ohne Session einen Fehler;
  Teilen-Link und Rechnungs-Buttons sind ohnehin an ein gespeichertes DB-Angebot gekoppelt.
- **PDF-Export**: Der Download ist technisch schon für jeden offen (`canUsePdfExport()`
  liefert hartkodiert `true`). Ein Wasserzeichen existiert noch nirgends — pdfmake 0.2.23
  unterstützt aber die `watermark`-Option nativ (Text diagonal auf jeder Seite).
- **i18n**: Sidebar-Labels sind bereits vollständig DE/PL/EN übersetzt (Namespace `shell`,
  Deutsch-als-Schlüssel). Die Coverage-Spec `i18n-coverage.spec.ts` bricht den Build, wenn
  ein neuer Key keinen PL- **und** EN-Eintrag hat. PDFs bleiben laut Projektregel immer
  deutsch (der PDF-Builder nutzt kein i18n).

---

## Änderungsblock A — Sidebar: Menüpunkte immer zeigen, ausgegraut ohne Login

### A1. Gruppen-Hüllen entfernen, Zustände pro Menüpunkt

Datei: `src/app/layout/app-shell/app-shell.component.html` (+ `shell-nav-state.ts`)

Die `@if (nav.isAuthenticated() && nav.isContractor())`-Hüllen um die Gruppen „Angebote" und
„Konto" fallen weg. Stattdessen bekommt jeder Menüpunkt drei mögliche Zustände:

| Zustand | Wer | Darstellung |
|---|---|---|
| **aktiv** | eingeloggter Profi | wie heute (`routerLink`) |
| **ausgegraut** | nicht eingeloggt | `.nav-link.disabled` + Schloss-Optik, Klick öffnet Login-Hinweis |
| **Sonderfall „Angebote"** | nicht eingeloggt | **aktiv** (führt in den Vorschau-Modus, s. Block B) |

Konkret betroffene Menüpunkte (neu immer sichtbar, ausgegraut ohne Login):

- **Rechnungen** (`/rechnungen`)
- **Anfragen** (`/anfragen`) — heute zusätzlich nur bei `hasAssignedLeads()` sichtbar;
  Vorschlag: anonym immer als ausgegrauter Punkt zeigen (zeigt das Feature), eingeloggt
  weiterhin nur bei zugewiesenen Leads
- **Firmenprofil** (`/konto/firmenprofil`)
- **Eigene Preise** (`/konto/preise`)
- **Vorlagen** (`/konto/vorlagen`)
- **Premium / Premium freischalten** (`/konto/premium`)
- **Anfragen empfangen** (`/konto/anfragen-empfang`) — behält zusätzlich das bestehende
  „Erfordert aktives Premium-Abo"-Gating für eingeloggte Profis ohne Abo
- **Feedback** (`/feedback`)
- **Angebote** (`/angebote`) — **nicht ausgegraut**, für alle klickbar

Nicht angefasst: Gruppe „Projekt" (heute schon für alle sichtbar), Gruppe „Admin"
(bleibt nur für Admins sichtbar — kein Schaufenster-Nutzen, reine interne Funktion).

### A2. Login-Hinweis beim Klick

Neues kleines Overlay nach dem vorhandenen Consent-Banner-Muster (Service-Signal steuert
ein `role="dialog"`-Overlay, Klick auf den Hintergrund schließt):

- Neue leichte Komponente `components/login-required-dialog/` + Signal im Shell-Umfeld
  (z. B. in `shell-nav-state.ts`).
- Inhalt: kurzer Satz („Dieser Bereich ist für registrierte Fliesenleger. Bitte melde dich
  an oder registriere dich kostenlos.") + zwei Buttons: **Anmelden** (→ `/login`) und
  **Abbrechen**. Der Login-Link merkt sich die Zielroute (`redirect`-Query wie im Guard),
  damit man nach dem Login direkt dort landet.
- Zusätzlich behält jeder ausgegraute Punkt einen `[attr.title]`-Tooltip (Desktop-Hover),
  analog zum bestehenden Premium-Tooltip.

### A3. Guards bleiben unverändert (außer /angebote)

Die ausgegrauten Punkte sind keine Links mehr, sondern Buttons, die nur den Dialog öffnen —
die Route-Guards (`contractorGuard` etc.) bleiben als zweite Verteidigungslinie unverändert
bestehen. Nur `/angebote` bekommt einen neuen Guard (Block B1).

---

## Änderungsblock B — Angebote ohne Login: Vorschau-Modus + Wasserzeichen

### B1. Guard öffnen

Datei: `src/app/app.routes.ts` (Route `angebote`) + neuer Guard.

Der `contractorGuard` an `/angebote` wird durch eine tolerante Variante ersetzt
(z. B. `offerPreviewGuard`): **anonyme Nutzer dürfen durch** (Vorschau-Modus), eingeloggte
Profis dürfen durch (Vollmodus). Alle anderen Routen behalten den strengen `contractorGuard`.
*(Verhalten für eingeloggte Hobby-Nutzer: siehe offene Frage 1.)*

### B2. Vorschau-Modus im Angebots-Editor

Datei: `pages/contractor-offers/contractor-offers.component.ts` / `.html`

Neues `previewMode`-Signal (abgeleitet aus `auth.isAuthenticated()`/`isContractor()`).
Im Vorschau-Modus:

- **Sichtbarer Hinweis-Banner** oben im Editor: „Vorschau-Modus — Angebot erstellen und als
  Vorschau-PDF herunterladen. Kostenlos registrieren, um ohne Wasserzeichen zu exportieren,
  zu speichern und zu teilen." (mit Registrieren-Link).
- **Ausgeblendet/deaktiviert** (würden sonst DB-Fehler werfen bzw. sind DB-gebunden):
  Speichern (Kopfleiste + mobile Savebar), Teilen-Link, alle Rechnungs-Buttons,
  Versions-Chips / „+ Neue Version" / Version löschen, Snippet-Katalog („aus Vorlagen").
- **Voll nutzbar bleibt**: Angebot aus dem (localStorage-)Projekt erzeugen, Positionen/Preise/
  Texte bearbeiten, Material-Aufschlag/Nachlass, PDF-Download (mit Wasserzeichen).
- Kein Umbau an `ContractorOfferService`, `LocalProjectService` oder der Repository-Schicht
  nötig — die Analyse hat bestätigt, dass diese anonym bereits sauber funktionieren.

Wichtig zu wissen (bewusste Minimal-Lösung): Das anonyme Angebot lebt **nur im Speicher**.
Das zugrunde liegende Projekt (Räume) bleibt im localStorage erhalten, aber manuelle
Angebots-Edits (Preise, Texte) gehen bei einem Seiten-Reload verloren und werden nach dem
Login aus dem Projekt neu erzeugt. *(Alternative: siehe offene Frage 2.)*

### B3. „VORSCHAU"-Wasserzeichen im PDF

Dateien: `models/export-document.model.ts`, `services/pdf-document-builder.service.ts`,
`services/pdf-export.service.ts`

- `ExportDocumentData` bekommt ein optionales Flag `isPreview?: boolean`.
- Der `PdfExportService` (bzw. der Editor beim Bauen der Exportdaten) setzt das Flag, wenn
  der Nutzer kein eingeloggter Profi ist.
- Der `PdfDocumentBuilderService.build()` setzt bei `isPreview` im docDefinition-Root:
  `watermark: { text: 'VORSCHAU', opacity: 0.25, angle: -55, bold: true }` — pdfmake rendert
  das automatisch groß diagonal auf **jeder** Seite. (Werte für Deckkraft/Winkel werden beim
  Umsetzen am echten PDF feinjustiert.)
- Das Wort „VORSCHAU" bleibt deutsch — Projektregel: Dokumente (PDF/Rechnung) sind immer
  deutsch, auch bei polnischer UI. *(Falls gewünscht anders: offene Frage 3.)*
- Nach Login/Registrierung als Profi ist `isPreview` false → normales PDF, keine weitere
  Aktion nötig. Excel ist für Angebote nicht angebunden (nur PDF) — kein Handlungsbedarf.

---

## Änderungsblock C — Übersetzungen (PL + EN)

Dateien: `src/app/i18n/dict/pl.shell.ts`, `en.shell.ts` (ggf. `pl.offers.ts`/`en.offers.ts`
für die Editor-Banner-Texte)

- Alle **bestehenden** Menü-Labels sind bereits übersetzt (z. B. `Angebote → Oferty`,
  `Rechnungen → Faktury`) — dafür ist nichts zu tun.
- **Neu anzulegen** (jeweils DE-Text als Schlüssel + PL- und EN-Eintrag), ca. 8–12 Keys:
  - Tooltip/Dialog: „Bitte einloggen, um diesen Bereich zu nutzen." /
    Dialog-Titel + Text + Button-Beschriftungen
  - Vorschau-Banner im Editor (Text + Registrieren-Link-Beschriftung)
  - ggf. Hinweis am PDF-Button („PDF mit Vorschau-Wasserzeichen")
- Die Coverage-Spec (`i18n-coverage.spec.ts`) erzwingt die Vollständigkeit automatisch:
  fehlt ein PL- oder EN-Eintrag, schlägt `ng test` fehl. Da alle neuen Keys als Literale in
  bereits gescannten Dateien stehen, ist kein `DYNAMIC_KEYS`-Eintrag nötig.
- Die Seite `/dla-glazurnikow` selbst bleibt unverändert (hart polnisch codierte
  Marketing-Seite); sie profitiert automatisch, weil die App-Sidebar nach dem Klick auf
  „Wypróbuj za darmo" die PL-Dictionaries nutzt. Die neuen PL-Texte kommen mit auf die
  Liste für das ohnehin offene Muttersprachler-Review (`i18n-review-pl.xlsx`).

---

## Entschiedene Fragen (Nutzerentscheidung 26.07.2026)

1. **Eingeloggte Hobby-Nutzer (Rolle `customer`):** sehen die Profi-Menüpunkte **nicht**
   (wie heute versteckt). Ausgegraute Punkte + Login-Dialog gibt es **nur für anonyme
   Nutzer**. `/angebote` leitet eingeloggte Hobby-Nutzer weiterhin auf `/` um.

2. **Anonyme Angebots-Edits über Reload retten?** **Nein** — Minimal-Lösung: Edits leben nur
   im Speicher; Raumdaten (localStorage) bleiben erhalten.

3. **Wasserzeichen-Sprache:** folgt der UI-Sprache (DE „VORSCHAU", PL „PODGLĄD",
   EN „PREVIEW"). Der **Angebotstext selbst bleibt deutsch** (Projektregel unverändert).

4. **Free-Limit (3 Angebote):** Vorschau-Angebote zählen nicht — anonym wird nichts
   gespeichert; das Limit greift erst beim Speichern nach Login.

---

## Umsetzungsreihenfolge & Aufwand (Schätzung)

| Schritt | Inhalt | Aufwand |
|---|---|---|
| 1 | B3: `isPreview`-Flag + Wasserzeichen im PDF-Builder | klein |
| 2 | B1/B2: Guard öffnen + Vorschau-Modus im Editor (Buttons gaten, Banner) | mittel |
| 3 | A1–A3: Sidebar-Umbau + Login-Dialog | mittel |
| 4 | C: PL/EN-Keys + Coverage grün, `ng test` + Dev-Build | klein |
| 5 | Manuelle Verifikation: anonym (Vorschau-PDF), als Profi (normales PDF), PL-UI | klein |

Kein DB-/Migrationsbedarf. Keine Änderung an Berechnungs-Pipeline, Repository-Interfaces
oder Marketing-Seiten. SEO/Prerender unberührt (App-Baum ist `RenderMode.Client`).
