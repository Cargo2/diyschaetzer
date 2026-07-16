# Android-App aus der PWA (Trusted Web Activity via Bubblewrap)

Dieses Dokument beschreibt, wie aus der bestehenden PWA (`app.fliesen-kosten.de`)
eine installierbare **Android-App für den Google Play Store** wird – als
**Trusted Web Activity (TWA)**. Eine TWA ist ein sehr dünner nativer Wrapper,
der die Web-App im Vollbild (ohne Browser-Adressleiste) anzeigt. Es wird **kein**
eigener App-Code geschrieben: Der Store liefert nur die Hülle, die Inhalte kommen
weiter live von `https://app.fliesen-kosten.de`.

Das Werkzeug dafür ist **Bubblewrap** (Google), das direkt aus dem
`manifest.webmanifest` ein Android-Projekt und ein signiertes App-Bundle erzeugt.

> **Abgrenzung Capacitor:** Solange keine echten nativen Funktionen gebraucht
> werden (Push-Benachrichtigungen, Kamera fürs Aufmaß-Foto), ist die TWA der
> pflegeärmere Weg – Web-Updates landen ohne Store-Freigabe sofort in der App.
> Capacitor (Roadmap Stufe 4) erst dann, wenn Store-Präsenz **plus** native
> Hardware-/Push-Zugriffe zusammen nötig werden.

## Was bereits im Repo vorbereitet ist

- `public/.well-known/assetlinks.json` – die **Digital Asset Links**-Datei, die
  Chrome/Android braucht, um die App als „vertrauenswürdig" für die Domain zu
  erkennen (und so die Browser-Adressleiste auszublenden). Sie enthält bereits
  Relation und Package-Name (`de.fliesenkosten.app`), aber einen **Platzhalter**
  `REPLACE-WITH-PLAY-APP-SIGNING-SHA256` statt des echten Fingerprints. Dieser
  wird erst nach dem Play-Upload eingesetzt (siehe unten).
- `public/manifest.webmanifest` – enthält bereits alle für Bubblewrap nötigen
  Felder (`id`, `name`, `short_name`, `description`, `start_url`, `scope`,
  `display: standalone`, `theme_color`, `background_color`, Icons 192/512/maskable).
- Die Datei unter `public/` landet beim Deploy 1:1 im Webroot aller drei Hosts,
  also auch als `https://app.fliesen-kosten.de/.well-known/assetlinks.json`. Die
  `.htaccess`-Regeln beider Hosts liefern `.json`-Dateien direkt aus (Whitelist
  bzw. `-f`-Check), die TWA-Prüfung findet die Datei also.

## Voraussetzungen

- **Node.js** – vorhanden (dieselbe Umgebung wie für den Frontend-Build).
- **JDK 17** und **Android SDK** – müssen **nicht** manuell installiert werden:
  Bubblewrap lädt bei Bedarf ein passendes JDK und die Android-Command-line-Tools
  selbst herunter und legt sie unter `~/.bubblewrap` ab (beim ersten `init`/`build`
  fragt es nach der Zustimmung zum Download). Wer bereits ein JDK 17/Android SDK
  hat, kann Bubblewrap stattdessen die vorhandenen Pfade nennen.
- **Google-Play-Console-Account** – einmalig **25 US-\$** Registrierungsgebühr,
  dazu eine **Identitätsprüfung** (Ausweis/Adresse; kann einige Tage dauern).
  Diesen Account gibt es noch nicht → er ist Voraussetzung für den Store-Upload.

## 1. Bubblewrap-Projekt anlegen (`init`)

In einem **separaten Ordner außerhalb dieses Repos** (das erzeugte Android-Projekt
und vor allem der Keystore gehören **nicht** ins Web-Repo):

```bash
npx @bubblewrap/cli init --manifest https://app.fliesen-kosten.de/manifest.webmanifest
```

Bubblewrap liest das Live-Manifest und fragt die App-Parameter interaktiv ab.
Empfohlene Antworten:

| Frage | Antwort |
|---|---|
| Domain / Host | `app.fliesen-kosten.de` |
| URL path (start_url) | `/` |
| Application name | `Fliesenprojekt` |
| Short name | `Fliesenprojekt` |
| Application ID / Package | `de.fliesenkosten.app` |
| Display mode | `standalone` |
| Status-bar / Theme color | `#11574a` |
| Splash / Background color | `#f3efe6` |
| Icon-URL | aus dem Manifest übernehmen (512-px-Icon) |
| Maskable-Icon | aus dem Manifest übernehmen |
| Include support for Play Billing? | `No` |
| Signing key | **Neuen Keystore erzeugen lassen** (siehe Kasten) |

> **Upload-Keystore (kritisch):** Bubblewrap bietet an, einen neuen Signing-Key
> zu erzeugen. Diesen anlegen und **sicher** aufbewahren:
> - Speicherort merken (Standard: `./android.keystore` im Bubblewrap-Ordner).
> - Das **Keystore-Passwort und das Key-Passwort** an einem sicheren Ort ablegen
>   (Passwort-Manager). Ohne sie lässt sich **kein Update** mehr signieren.
> - **NIEMALS committen** und **nicht** ins Web-Repo legen. Ein Verlust bedeutet,
>   dass keine App-Updates mehr veröffentlicht werden können.
> - Ein **Backup** des Keystores anlegen (verschlüsselt, getrennt vom Rechner).
>
> Dieser Key ist nur der **Upload-Key**. Die Endnutzer-Signatur übernimmt Google
> über **Play App Signing** (siehe Schritt 3) – daher stammt auch der Fingerprint,
> der in `assetlinks.json` gehört.

Das Ergebnis ist ein Android-Projekt-Ordner samt `twa-manifest.json` (von
Bubblewrap generiert – **nicht** von Hand im Web-Repo anlegen).

## 2. App-Bundle bauen (`build`)

```bash
npx @bubblewrap/cli build
```

Erzeugt ein signiertes **Android App Bundle** (`app-release-bundle.aab`) – das
ist das Upload-Format für den Play Store. (Zusätzlich entsteht meist ein
`app-release-signed.apk` zum lokalen Testen auf einem Gerät.)

Bei Manifest-Änderungen später `npx @bubblewrap/cli update` vor dem erneuten
`build` ausführen, damit das Android-Projekt dem aktuellen Manifest folgt.

## 3. Play Console: App anlegen und hochladen

1. In der **Google Play Console** eine neue App anlegen (Name `Fliesenprojekt`,
   Standardsprache Deutsch, App/kostenlos).
2. **Play App Signing** aktivieren (Standard bei neuen Apps). Google verwaltet
   damit den echten Endnutzer-Signaturschlüssel; der Bubblewrap-Keystore bleibt
   nur der Upload-Key.
3. Das `app-release-bundle.aab` in einem Track hochladen (z. B. zuerst **Internal
   Testing**, später **Production**).
4. **App-Signing-SHA-256-Fingerprint kopieren:** In der Play Console unter
   **Release → Setup → App signing** steht der **„App signing key certificate"**
   mit seinem **SHA-256-Fingerprint** (Format `AB:CD:…`). Diesen kopieren.

## 4. Fingerprint eintragen und deployen (blendet die Adressleiste aus)

1. In `public/.well-known/assetlinks.json` den Platzhalter
   `REPLACE-WITH-PLAY-APP-SIGNING-SHA256` durch den kopierten **App-Signing**-
   SHA-256-Fingerprint ersetzen (mehrere Fingerprints sind als Array-Einträge
   erlaubt – z. B. wenn zusätzlich mit dem Upload-Key getestet wird).
2. Deployen (normaler Frontend-Deploy). Danach liegt die aktualisierte Datei
   unter `https://app.fliesen-kosten.de/.well-known/assetlinks.json`.

> **Wichtig:** Erst **nach** diesem Deploy erkennt Android die App als
> vertrauenswürdig und blendet die **Browser-Adressleiste** aus. Solange der
> Platzhalter drinsteht, läuft die App zwar, zeigt aber oben die URL-Leiste.

**Testen:**

- `https://developers.google.com/digital-asset-links/tools/generator` bzw. den
  **Statement-List-Tester** aufrufen und Domain `app.fliesen-kosten.de`,
  Package `de.fliesenkosten.app`, Relation `delegate_permission/common.handle_all_urls`
  prüfen – er sollte die Verknüpfung als gültig melden.
- `npx @bubblewrap/cli validate --url https://app.fliesen-kosten.de` prüft die
  Asset-Links-Verknüpfung ebenfalls.
- Auf einem **Android-Gerät** die App aus dem (Test-)Track installieren und
  öffnen: keine Adressleiste = korrekt verknüpft. (Chrome auf Android muss
  installiert/aktuell sein; die TWA nutzt die Chrome-Engine.)

## 5. Store-Listing-Checkliste (Play Console)

- **Screenshots (Handy):** mindestens **2** (empfohlen mehr), z. B. Projekt-
  Dashboard, Angebots-Editor, Rechnungsliste.
- **Feature-Grafik:** **1024 × 500 px** (Pflicht fürs Store-Listing).
- **App-Icon:** 512 × 512 px (kann aus dem vorhandenen Icon-Satz abgeleitet werden).
- **Kurzbeschreibung** (max. 80 Zeichen) und **Langbeschreibung** (Deutsch).
- **Datenschutz-URL:** `https://fliesen-kosten.de/datenschutz`.
- **Data-Safety-Formular:** angeben, welche Daten erfasst werden –
  **Konto/E-Mail** über den Supabase-Login (Kontoerstellung), **keine Werbe-IDs**,
  kein Standort. Verschlüsselung bei Übertragung: ja (HTTPS).
- **Kontakt-E-Mail** für den Store-Eintrag hinterlegen.
- **Inhaltsklassifizierung** (Fragebogen) ausfüllen.

## Update-Verhalten

- **Web-Inhalte** (Rechner, Angebote, Rechnungen, Texte) aktualisieren sich
  **automatisch mit jedem Deploy** – die TWA lädt sie live von
  `app.fliesen-kosten.de`. Dafür ist **kein** neues `.aab` und **keine**
  Store-Freigabe nötig.
- Ein **neues `.aab`** (mit hochgezähltem `versionCode`) ist nur nötig bei
  Änderungen am **nativen Wrapper**, also: geändertes Manifest (Name/Icons/
  `theme_color`/`start_url`), geänderter **Package-Name**, oder wenn
  Android-/TWA-Einstellungen angepasst werden. Ablauf dann: Fingerprint bleibt
  gleich → `bubblewrap update` → `bubblewrap build` → neues `.aab` hochladen.
