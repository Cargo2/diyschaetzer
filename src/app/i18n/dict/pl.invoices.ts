// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Förmliches Polnisch. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Hinweis: Positions-/Summenlabels ('Pos'/'Bezeichnung'/'Menge'/'Einheit'/'Einheitspreis'/
// 'Gesamt'/'Aktiv'/'Nachlass'/'Nettobetrag'/'Zwischensumme netto'/'zzgl.'/'Status'/'Ja'/'Nein'/
// 'Sicher?'/'Löschen'/'Gespeicherter Stand'/'Nicht gespeichert'/'Speichern'/'Speichern …'/
// 'PDF herunterladen'/'Einleitungstext (optional)'/'Schlusstext (optional)'/'Firmenprofil'/
// unitOptions-Labels) sind identisch mit dem Angebots-Editor und bereits über pl.offers.ts
// übersetzt – hier NICHT erneut definieren. 'PLZ'/'Ort'/'E-Mail'/'IBAN'/'USt-IdNr.'/
// 'Ansprechpartner'/'Telefon'/'Firmenname'/'Pflicht für XRechnung' kommen aus pl.konto.ts.
export const PL_INVOICES: Record<string, string> = {
  // --- Nachrichten (TS) ---
  'Rechnung gespeichert.': 'Faktura zapisana.',
  'Diese Rechnungsnummer ist bereits vergeben. Bitte wähle eine andere Nummer.':
    'Ten numer faktury jest już zajęty. Wybierz inny numer.',
  'Firmendaten aus dem Profil übernommen. Zum Sichern bitte „Speichern".':
    'Dane firmy przeniesione z profilu. Aby zapisać, kliknij „Zapisz".',
  'Firmendaten konnten nicht geladen werden. Bitte erneut versuchen.':
    'Nie udało się załadować danych firmy. Spróbuj ponownie.',

  // --- Status-Label (dynamisch, DYNAMIC_KEYS) ---
  Bezahlt: 'Zapłacona',

  // --- Seite / Liste ---
  'Rechnungen entstehen aus einem gespeicherten Angebot über': 'Faktury powstają z zapisanej oferty przez',
  '. Hier verwaltest du sie, lädst PDF und XRechnung (XML) herunter und passt Pflichtangaben (§ 14 UStG) an.':
    '. Tutaj nimi zarządzasz, pobierasz PDF i e-fakturę XRechnung (XML) oraz uzupełniasz dane obowiązkowe (§ 14 UStG).',
  'Rechnungen werden geladen …': 'Ładowanie faktur…',
  'Deine Rechnungen': 'Twoje faktury',
  'Noch keine Rechnungen. Öffne ein gespeichertes Angebot unter „Angebote" und wähle „Als Rechnung übernehmen".':
    'Brak jeszcze faktur. Otwórz zapisaną ofertę w zakładce „Oferty" i wybierz „Przenieś jako fakturę".',
  'Zu den Angeboten': 'Przejdź do ofert',
  Nummer: 'Numer',
  Datum: 'Data',
  Kunde: 'Klient',
  Brutto: 'Brutto',
  Geöffnet: 'Otwarta',
  Öffnen: 'Otwórz',

  // --- Editor-Kopf ---
  Rechnung: 'Faktura',
  'XRechnung (XML)': 'E-faktura XRechnung (XML)',
  'Für die XRechnung fehlen:': 'Do e-faktury XRechnung brakuje:',
  'XRechnung (XML) herunterladen': 'Pobierz e-fakturę XRechnung (XML)',
  'XRechnung ist nur für Betriebe mit Sitz in Deutschland verfügbar.':
    'E-faktura XRechnung jest dostępna tylko dla firm z siedzibą w Niemczech.',
  'Die E-Mail des Kunden braucht XRechnung für die elektronische Zustellung (BT-49).':
    'E-faktura XRechnung potrzebuje adresu e-mail klienta do elektronicznego doręczenia (BT-49).',
  'Fehlende Absender-/Bank-/Steuerdaten (z. B. IBAN) im': 'Brakujące dane nadawcy/bankowe/podatkowe (np. IBAN) w',
  'ergänzen und dann hier „Firmendaten aus Profil aktualisieren" klicken.':
    'uzupełnij, a następnie kliknij tutaj „Aktualizuj dane firmy z profilu".',

  // --- Rechnungskopf-Felder ---
  Rechnungsempfänger: 'Odbiorca faktury',
  'Name / Firma': 'Nazwa / firma',
  Kundenname: 'Nazwa klienta',
  'Straße & Nr.': 'Ulica i nr',
  Land: 'Kraj',
  'kunde@beispiel.de': 'klient@przyklad.pl',
  'Elektronische Adresse des Empfängers – Pflichtangabe der XRechnung (BT-49).':
    'Elektroniczny adres odbiorcy – dane obowiązkowe e-faktury XRechnung (BT-49).',
  Rechnungsdaten: 'Dane faktury',
  Rechnungsnummer: 'Numer faktury',
  Rechnungsdatum: 'Data faktury',
  'Zahlbar bis': 'Termin płatności',
  Leistungsdatum: 'Data wykonania usługi',
  'Leistungszeitraum von': 'Okres świadczenia usługi od',
  bis: 'do',
  'Käuferreferenz / Leitweg-ID (BT-10)': 'Referencja nabywcy / Leitweg-ID (BT-10)',
  'n/a (bei Behörden: Leitweg-ID)': 'n/d (dla urzędów: Leitweg-ID)',
  'Pflichtfeld der XRechnung. Bei öffentlichen Auftraggebern die Leitweg-ID eintragen, sonst „n/a".':
    'Pole obowiązkowe e-faktury XRechnung. W przypadku zamawiających publicznych wpisz Leitweg-ID, w przeciwnym razie „n/d".',
  'Sieht nach einer Leitweg-ID aus, entspricht aber nicht dem üblichen Format (z. B. 04011000-1234512345-06).':
    'Wygląda na Leitweg-ID, ale nie odpowiada zwykłemu formatowi (np. 04011000-1234512345-06).',
  'Pflicht für die XRechnung (XML).': 'Wymagane dla e-faktury XRechnung (XML).',

  // --- Absender-Snapshot ---
  'Absender-/Steuer-/Bankdaten stammen aus deinem': 'Dane nadawcy/podatkowe/bankowe pochodzą z Twojego',
  'und sind als Snapshot in dieser Rechnung gespeichert:': 'i są zapisane jako migawka w tej fakturze:',
  'Steuernr.': 'Nr podat.',
  'Absender-/Steuer-/Bankdaten aus dem aktuellen Firmenprofil in diese Rechnung übernehmen':
    'Przenieś dane nadawcy/podatkowe/bankowe z aktualnego profilu firmy do tej faktury',
  'Wird übernommen …': 'Przenoszenie…',
  'Firmendaten aus Profil aktualisieren': 'Aktualizuj dane firmy z profilu',

  // --- Texte / Positionen / Summen ---
  'Sehr geehrte …, für die ausgeführten Arbeiten berechne ich Ihnen:':
    'Szanowni Państwo, za wykonane prace naliczam Państwu:',
  Rechnungsbetrag: 'Kwota faktury',
  '0 % MwSt.: Auf PDF und XRechnung wird automatisch der § 19-Hinweis (Kleinunternehmerregelung) ausgewiesen.':
    '0% VAT: na PDF i e-fakturze XRechnung automatycznie widnieje adnotacja § 19 (zwolnienie dla małych przedsiębiorców).',
  'Zahlungsbedingungen, Dank … z. B.: Zahlbar innerhalb von 14 Tagen ohne Abzug auf das unten genannte Konto.':
    'Warunki płatności, podziękowanie … np.: Płatne w ciągu 14 dni bez potrąceń na podane poniżej konto.',

  // --- XRechnung-Pflichtfeldnamen (Modell, dynamisch gerendert – DYNAMIC_KEYS) ---
  'Straße (Absender)': 'Ulica (nadawca)',
  'PLZ (Absender)': 'Kod pocztowy (nadawca)',
  'Ort (Absender)': 'Miejscowość (nadawca)',
  'Steuernummer oder USt-IdNr.': 'Numer podatkowy lub numer VAT-UE',
  'Leistungsdatum oder Leistungszeitraum': 'Data wykonania usługi lub okres świadczenia usługi',
  'Zahlungsziel (Fälligkeit)': 'Termin płatności (wymagalność)',
  'Käuferreferenz (BT-10)': 'Referencja nabywcy (BT-10)',
  'Straße (Kunde)': 'Ulica (klient)',
  'PLZ (Kunde)': 'Kod pocztowy (klient)',
  'Ort (Kunde)': 'Miejscowość (klient)',
  'E-Mail des Kunden (Pflicht für XRechnung-Versand)': 'E-mail klienta (wymagany do wysyłki e-faktury XRechnung)',
  'Mindestens eine aktive Position': 'Co najmniej jedna aktywna pozycja'
};
