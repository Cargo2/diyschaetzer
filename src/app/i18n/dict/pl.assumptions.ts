// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Förmliches Polnisch. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Annahmen-Editor (components/summary-assumptions).
// Hinweis: Wörter wie 'Ja'/'Nein'/'Noch unklar'/'Stück'/'Raumgröße'/'Untergrund'/
// die Wizard-Options-Labels (Einzelwaschtisch, Standard-Duschkabine, Wand-WC, ...) und
// Raumtyp-Namen (Bad, Küche, ...) sind bereits über pl.wizard.ts/pl.offers.ts übersetzt –
// hier NICHT erneut definieren.
export const PL_ASSUMPTIONS: Record<string, string> = {
  // --- Abschnitts-Überschriften ---
  'Gewählte Optionen': 'Wybrane opcje',
  Leistungsumfang: 'Zakres usług',
  'Noch zu klären': 'Jeszcze do wyjaśnienia',
  Hinweise: 'Wskazówki',
  Flächenübersicht: 'Przegląd powierzchni',
  'Live aus Badgroesse, Waenden und Aussparungen berechnet':
    'Obliczane na bieżąco na podstawie wielkości łazienki, ścian i otworów',
  Bodenflaeche: 'Powierzchnia podłogi',
  'Erfasste Waende': 'Wprowadzone ściany',
  Wandflaechen: 'Powierzchnie ścian',
  'Gesamt zu fliesende Flaeche': 'Łączna powierzchnia do wyłożenia płytkami',
  gefliest: 'wyłożone płytkami',
  'Bearbeitbare Annahmen': 'Edytowalne założenia',
  'Diese Werte beeinflussen Materialmengen und Kosten. Du kannst sie bei Bedarf anpassen.':
    'Te wartości wpływają na ilości materiałów i koszty. W razie potrzeby możesz je dostosować.',
  'Alle Annahmen zurücksetzen': 'Zresetuj wszystkie założenia',
  Raumdetails: 'Szczegóły pomieszczenia',
  'Maße und Ausstattungswerte, die aus deinen Angaben abgeleitet wurden':
    'Wymiary i wartości wyposażenia wyznaczone na podstawie Twoich danych',
  'Bereich 4': 'Sekcja 4',
  'JSON-Ausgabe': 'Wynik JSON',

  // --- Gruppen-/Sektionsnamen (dynamisch: group.label) ---
  Allgemein: 'Ogólne',
  Laufmeter: 'Metry bieżące',
  Stückzahlen: 'Ilości sztuk',
  Abdichtung: 'Uszczelnienie',
  'Profi-Einheitspreise': 'Ceny jednostkowe dla fachowca',
  'Profi Einheitspreise': 'Ceny jednostkowe fachowca',
  'Die Profi-Einheitspreise sind Annahmen für eine unverbindliche Kostenschätzung und ersetzen kein geprüftes Angebot.':
    'Ceny jednostkowe fachowca to założenia do niewiążącej wyceny kosztów i nie zastępują sprawdzonej oferty.',
  Zurücksetzen: 'Zresetuj',
  'Preisannahmen für die unverbindliche Profi-Kostenschätzung':
    'Założenia cenowe do niewiążącej wyceny kosztów fachowca',
  'Diese Einheitspreise sind bearbeitbare Annahmen und ersetzen kein geprüftes Handwerkerangebot.':
    'Te ceny jednostkowe to edytowalne założenia i nie zastępują sprawdzonej oferty rzemieślnika.',

  // --- Status-Labels (assumptionStatus(), dynamisch) ---
  'Nicht relevant': 'Nie dotyczy',
  'Manuell geändert': 'Zmienione ręcznie',
  'Aus deinen Angaben': 'Z Twoich danych',
  Geschätzt: 'Oszacowane',

  // --- Bestätigungsdialog (TS, this.i18n.t()) ---
  'Alle manuell geänderten Berechnungsannahmen zurücksetzen?':
    'Zresetować wszystkie ręcznie zmienione założenia obliczeniowe?',

  // --- Raumdetails-Karten (Fliesen/Badewanne/Dusche/Waschtisch/WC/Heizung) ---
  Fliesen: 'Płytki',
  'Richtwert, kann angepasst werden': 'Wartość orientacyjna, można dostosować',
  'Preis pro m²': 'Cena za m²',
  Badewanne: 'Wanna',
  Lange: 'Długość',
  Breite: 'Szerokość',
  Dusche: 'Prysznic',
  Waschtisch: 'Umywalka',
  'Anzahl Waschplätze': 'Liczba stanowisk do mycia',
  WC: 'WC',
  Installationsart: 'Rodzaj montażu',
  Heizung: 'Ogrzewanie',
  Handtuchheizkorper: 'Grzejnik łazienkowy',
  'Abgeleitet aus Zusatzausstattung und Heizung':
    'Wyznaczone na podstawie wyposażenia dodatkowego i ogrzewania',
  'Spiegel-Stromanschlüsse': 'Przyłącza elektryczne lustra',
  'Wandleuchten-Anschlüsse': 'Przyłącza kinkietów ściennych',
  'Lüftungs-Öffnungen': 'Otwory wentylacyjne',

  // --- installationTypeOptions (dynamisch: option.label) ---
  Vorwandelement: 'Element przyścienny (stelaż)',
  Standmontage: 'Montaż stojący',
  'Vorwandelement mit Strom': 'Element przyścienny z podłączeniem prądu',

  // --- JSON-Feedback (TS, this.i18n.t()) ---
  'JSON wurde in die Zwischenablage kopiert.': 'JSON został skopiowany do schowka.',
  'Kopieren war im Browser nicht moglich.': 'Kopiowanie nie było możliwe w przeglądarce.',
  'JSON kopieren': 'Kopiuj JSON',

  // --- summaryItems/preparationItems/scopeItems: Labels (dynamisch: item.label) ---
  Raum: 'Pomieszczenie',
  Raumtyp: 'Typ pomieszczenia',
  Bereich: 'Strefa',
  Innenbereich: 'Wnętrze',
  Fliesenbereich: 'Zakres płytkowania',
  Fliesenqualität: 'Jakość płytek',
  'Boden-Fliesengröße': 'Rozmiar płytek podłogowych',
  'Wand-Fliesengröße': 'Rozmiar płytek ściennych',
  Waschplatz: 'Stanowisko do mycia',
  Unterschrank: 'Szafka podumywalkowa',
  'Dusche / Badewanne': 'Prysznic / wanna',
  Extras: 'Dodatki',
  'Alter Belag vorhanden': 'Istniejąca stara okładzina',
  'Rückbau alter Beläge': 'Demontaż starych okładzin',
  'Alte Sanitärobjekte entfernen': 'Usunięcie starych obiektów sanitarnych',
  'Vorhandener Untergrund geeignet': 'Istniejące podłoże odpowiednie',
  'Kleine Ausbesserungen': 'Drobne naprawy',
  Ausgleichsmasse: 'Masa wyrównująca',
  'Ausgleich / Nivellierung': 'Wyrównanie / niwelacja',
  'Entsorgung alter Fliesen/Beläge': 'Utylizacja starych płytek/okładzin',
  'Fliesenmaterial enthalten': 'Materiał płytkowy uwzględniony',
  'Verlegematerial enthalten': 'Materiał do układania uwzględniony',
  'Abdichtung enthalten': 'Uszczelnienie uwzględnione',
  'Fliesensockel enthalten': 'Listwy przypodłogowe z płytek uwzględnione',
  'Werkzeug/Zubehör enthalten': 'Narzędzia/akcesoria uwzględnione',
  'Entsorgung enthalten': 'Utylizacja uwzględniona',
  'Untergrundausgleich enthalten': 'Wyrównanie podłoża uwzględnione',

  // --- summaryItems/preparationItems: Values (dynamisch: item.value / Methodenrückgabe) ---
  'Eben und tragfähig': 'Równe i nośne',
  'Noch nicht ausgewählt': 'Jeszcze nie wybrano',
  'Keine Auswahl': 'Brak wyboru'
};
