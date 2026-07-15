// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Förmliches Polnisch. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Hinweis: die Konto-Seitentitel ('Firmenprofil', 'Eigene Preise', 'Anfragen empfangen')
// sind bereits über pl.shell.ts (Navigation) übersetzt – hier NICHT erneut definieren.
export const PL_KONTO: Record<string, string> = {
  // --- Firmenprofil ---
  Dein: 'Twoja',
  Firmenname: 'Nazwa firmy',
  'erscheint als Kopf- und Fußzeile auf deinen Export-Dateien (PDF/Excel). Die übrigen Angaben dienen als Grundlage für deine Profi-Angebote.':
    'pojawia się jako nagłówek i stopka w Twoich plikach eksportu (PDF/Excel). Pozostałe dane stanowią podstawę Twoich ofert dla klientów.',
  'Profil wird geladen …': 'Ładowanie profilu…',
  'Pflicht für XRechnung': 'Wymagane dla e-faktury (XRechnung)',
  Ansprechpartner: 'Osoba kontaktowa',
  'Pflicht für XRechnung, sofern kein Firmenname angegeben ist':
    'Wymagane dla e-faktury (XRechnung), jeśli nie podano nazwy firmy',
  'Straße & Hausnummer': 'Ulica i numer domu',
  PLZ: 'Kod pocztowy',
  Ort: 'Miejscowość',
  'Land des Firmensitzes': 'Kraj siedziby firmy',
  Telefon: 'Telefon',
  'E-Mail': 'E-mail',
  Website: 'Strona internetowa',
  'USt-IdNr.': 'Numer VAT-UE',
  'Pflicht für XRechnung, sofern keine Steuernummer angegeben ist':
    'Wymagane dla e-faktury (XRechnung), jeśli nie podano numeru podatkowego',
  'Zahlungsdaten für Rechnungen': 'Dane płatności do faktur',
  'Diese Angaben erscheinen auf deinen Rechnungen (PDF + XRechnung). Ohne USt-IdNr. genügt die Steuernummer; IBAN/BIC sind die Zahlungsdaten für deine Kunden.':
    'Te dane pojawiają się na Twoich fakturach (PDF + XRechnung). Bez numeru VAT-UE wystarczy numer podatkowy; IBAN/BIC to dane płatności dla Twoich klientów.',
  Steuernummer: 'Numer podatkowy',
  'z. B. 151/815/08151': 'np. 151/815/08151',
  'Pflicht für XRechnung, sofern keine USt-IdNr. angegeben ist':
    'Wymagane dla e-faktury (XRechnung), jeśli nie podano numeru VAT-UE',
  IBAN: 'IBAN',
  BIC: 'BIC',
  Bank: 'Bank',
  'Pflicht für die XRechnung (elektronischer Rechnungsversand) – das Profil bleibt auch ohne diese Angaben speicherbar, sie werden erst beim XRechnung-Export benötigt.':
    'Wymagane dla e-faktury XRechnung (elektroniczne przesyłanie faktur) – profil można zapisać również bez tych danych, są one potrzebne dopiero przy eksporcie XRechnung.',
  'Speichern …': 'Zapisywanie…',
  Speichern: 'Zapisz',
  'Das Firmenprofil konnte nicht geladen werden.': 'Nie udało się załadować profilu firmy.',
  'Speichern fehlgeschlagen. Bitte versuche es erneut.': 'Zapis nie powiódł się. Spróbuj ponownie.',
  'Firmenprofil gespeichert.': 'Profil firmy zapisany.',

  // --- Länderauswahl (COUNTRY_OPTIONS) ---
  Deutschland: 'Niemcy',
  Österreich: 'Austria',
  Schweiz: 'Szwajcaria',
  Polen: 'Polska',
  Tschechien: 'Czechy',
  Niederlande: 'Holandia',
  Belgien: 'Belgia',
  Frankreich: 'Francja',
  Luxemburg: 'Luksemburg',
  Dänemark: 'Dania',

  // --- Eigene Preise ---
  'Hinterlege deine eigenen Einheitspreise und den Fliesen-Richtwert. Sie gelten als Standard in jeder Raumkalkulation. Leer lassen = System-Standard (als Platzhalter angezeigt). In der einzelnen Kalkulation geänderte Werte haben weiterhin Vorrang.':
    'Wprowadź własne ceny jednostkowe oraz wartość orientacyjną płytek. Obowiązują one jako domyślne w każdej kalkulacji pomieszczenia. Pozostawienie pustego pola = wartość domyślna systemu (wyświetlana jako podpowiedź). Wartości zmienione w pojedynczej kalkulacji mają nadal pierwszeństwo.',
  'Preise werden geladen …': 'Ładowanie cen…',
  'Standard-Preise speichern': 'Zapisz ceny domyślne',

  // --- PROFILE_PRICE_FIELDS: label ---
  'Fliesen-Richtwert': 'Wartość orientacyjna płytek',
  'Baustelle einrichten': 'Zagospodarowanie placu budowy',
  'Bodenfliesen Standard': 'Płytki podłogowe standard',
  'Bodenfliesen Großformat': 'Płytki podłogowe wielkoformatowe',
  'Wandfliesen verlegen': 'Układanie płytek ściennych',
  Flächenabdichtung: 'Izolacja powierzchniowa',
  'Dichtband setzen': 'Montaż taśmy uszczelniającej',
  'Dichtecken setzen': 'Montaż narożników uszczelniających',
  'Dichtmanschetten setzen': 'Montaż mankietów uszczelniających',
  'Installationslöcher herstellen': 'Wykonanie otworów instalacyjnych',
  'Kleine Spachtelarbeiten': 'Drobne prace szpachlowe',
  'Ausgleichsmasse einbringen': 'Nakładanie masy wyrównującej',
  'Profile setzen': 'Montaż profili',
  'Silikonfugen herstellen': 'Wykonanie fug silikonowych',
  'Sockel setzen': 'Montaż cokołów',
  'MwSt.': 'VAT',

  // --- PROFILE_PRICE_FIELDS: unit ---
  '€/m²': '€/m²',
  EUR: 'EUR',
  'EUR/m²': 'EUR/m²',
  'EUR/lfm': 'EUR/mb',
  'EUR/Stück': 'EUR/szt.',
  '%': '%',

  'Standard-Preise gespeichert.': 'Ceny domyślne zapisane.',
  'Speichern der Standard-Preise fehlgeschlagen.': 'Nie udało się zapisać cen domyślnych.',
  'Die Standard-Preise konnten nicht geladen werden.': 'Nie udało się załadować cen domyślnych.',

  // --- Anfragen empfangen ---
  'Lege deine': 'Ustal swoje',
  'Angebots-Textvorlagen': 'Szablony tekstowe ofert',
  'fest und steuere, ob und für welche Gebiete/Raumarten du bestätigte Interessenten-Anfragen erhalten möchtest.':
    'oraz określ, czy i dla jakich obszarów/rodzajów pomieszczeń chcesz otrzymywać potwierdzone zapytania od zainteresowanych klientów.',
  'Einstellungen werden geladen …': 'Ładowanie ustawień…',
  'Angebots-Vorlagen': 'Szablony ofert',
  'füllen jedes': 'wypełniają każdą',
  'neu erzeugte': 'nowo utworzoną',
  'Angebot vor (pro Angebot weiterhin überschreibbar).': 'ofertę (w każdej ofercie nadal można je nadpisać).',
  'Standard-Einleitungstext': 'Domyślny tekst wprowadzający',
  'Sehr geehrte …, vielen Dank für Ihre Anfrage. Für die genannten Arbeiten biete ich Ihnen an:':
    'Szanowni Państwo, dziękuję za zapytanie. Za wymienione prace oferuję Państwu:',
  'Standard-Schlusstext': 'Domyślny tekst końcowy',
  'Zahlbar innerhalb von 14 Tagen ohne Abzug. Ausführung nach Absprache. Wir freuen uns auf Ihren Auftrag.':
    'Płatne w ciągu 14 dni bez potrąceń. Realizacja po uzgodnieniu terminu. Cieszymy się na Państwa zlecenie.',
  'Standard-Materialaufschlag (%)': 'Domyślna marża na materiał (%)',
  'Lead-Anfragen empfangen': 'Odbieranie zapytań',
  'lege fest, ob und für welche Gebiete/Raumarten du bestätigte Interessenten-Anfragen erhalten möchtest. Wird mit „Speichern" übernommen.':
    'określ, czy i dla jakich obszarów/rodzajów pomieszczeń chcesz otrzymywać potwierdzone zapytania od zainteresowanych klientów. Zostanie zapisane przyciskiem „Zapisz".',
  'Anfragen aktiv empfangen': 'Aktywnie odbieraj zapytania',
  'PLZ-Gebiete (mit Komma trennen, z. B. 96117, 960, 91)': 'Obszary kodów pocztowych (oddziel przecinkami, np. 96117, 960, 91)',
  Raumarten: 'Rodzaje pomieszczeń',
  'Max. Anfragen / Monat': 'Maks. zapytań / miesiąc',
  Kontaktkanal: 'Kanał kontaktu',
  'Die Einstellungen konnten nicht geladen werden.': 'Nie udało się załadować ustawień.',
  'Einstellungen gespeichert.': 'Ustawienia zapisane.',

  // --- Vorlagen (Phase R2-B) ---
  Vorlagen: 'Szablony',
  'Lege wiederverwendbare Positionen und Textbausteine an. Im Angebots-Editor übernimmst du sie mit einem Klick in ein Angebot.':
    'Twórz wielokrotnego użytku pozycje i szablony tekstowe. W edytorze ofert wstawisz je jednym kliknięciem do oferty.',
  'Vorlagen werden geladen …': 'Ładowanie szablonów…',
  Positionen: 'Pozycje',
  'Noch keine Positionsvorlagen. Du kannst Positionen auch direkt im Angebots-Editor als Vorlage speichern.':
    'Brak jeszcze szablonów pozycji. Pozycje możesz też zapisać jako szablon bezpośrednio w edytorze ofert.',
  Beschreibung: 'Opis',
  'Optionale Position (Bedarfsposition)': 'Pozycja opcjonalna (do uzgodnienia)',
  '+ Neu': '+ Nowy',
  Einleitungstexte: 'Teksty wprowadzające',
  'Noch keine Einleitungstextvorlagen. Du kannst Texte auch direkt im Angebots-Editor als Vorlage speichern.':
    'Brak jeszcze szablonów tekstu wprowadzającego. Teksty możesz też zapisać jako szablon bezpośrednio w edytorze ofert.',
  Text: 'Tekst',
  Schlusstexte: 'Teksty końcowe',
  'Noch keine Schlusstextvorlagen. Du kannst Texte auch direkt im Angebots-Editor als Vorlage speichern.':
    'Brak jeszcze szablonów tekstu końcowego. Teksty możesz też zapisać jako szablon bezpośrednio w edytorze ofert.',
  'Die Vorlagen konnten nicht geladen werden.': 'Nie udało się załadować szablonów.',
  'Vorlage gespeichert.': 'Szablon zapisany.',
  'Speichern der Vorlage fehlgeschlagen.': 'Nie udało się zapisać szablonu.',
  'Löschen der Vorlage fehlgeschlagen.': 'Nie udało się usunąć szablonu.',

  // --- Premium: Kündigungs-/Löschungs-Hinweis ---
  'Nach einer Kündigung bleiben deine Angebote und Rechnungen erhalten und lesend zugänglich.':
    'Po rezygnacji Twoje oferty i faktury pozostają zachowane i dostępne do odczytu.',
  'Eine endgültige Löschung erfolgt erst nach Ablauf der in der Datenschutzerklärung genannten Fristen.':
    'Ostateczne usunięcie następuje dopiero po upływie terminów podanych w polityce prywatności.',
  'Exportiere deine Rechnungen vorher über den Datenexport.':
    'Wcześniej wyeksportuj swoje faktury za pomocą eksportu danych.',
  'Mehr zu Rechnungen & Kündigung erfahren': 'Więcej o fakturach i rezygnacji'
};
