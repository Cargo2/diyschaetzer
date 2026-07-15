// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Förmliches Polnisch. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Materialliste (pages/material-list) + projektweite Liste (pages/project-summary).
// Hinweis: Einige Keys sind bereits über andere Dictionaries abgedeckt und werden hier
// bewusst NICHT erneut definiert (keine Duplikate über Dateien hinweg):
// 'Materialliste'/'Projekt-Dashboard'/'Zusammenfassung'/'Raum anlegen' (pl.shell.ts),
// 'Außenbereich'/'Optional'/'Entsorgung' (pl.wizard.ts), 'von'/'Menge'/'Löschen' (pl.offers.ts),
// 'm²'/'%'/'Stück' (pl.konto.ts/pl.offers.ts), 'Innenbereich'/'Hinweise' (pl.assumptions.ts),
// 'Berechnungsgrundlage'/'Fliesenmenge & Verschnitt'/'Zu fliesende Fläche'/'Verschnitt'/
// 'Inkl. Verschnitt'/'Fliesenformat'/'Benötigte Fliesen'/'Materialkosten gesamt'/
// 'Fliesenleger'/'Position'/'Bestehende Räume kannst du weiter bearbeiten.'/
// 'Weiteren Raum hinzufügen' (pl.summary.ts – identische Tabellen-/Berechnungstexte).
export const PL_MATERIAL: Record<string, string> = {
  // --- material-list: Kopf ---
  'Material und Werkzeug nach Arbeitsschritten': 'Materiał i narzędzia według etapów prac',
  'Die Mengen sind nachvollziehbare Richtwerte aus deinen Wizard-Angaben. Prüfe Gebinde und Herstellerverbrauch vor dem Einkauf.':
    'Podane ilości są orientacyjnymi wartościami wynikającymi z danych podanych w kreatorze. Przed zakupem sprawdź wielkości opakowań i zużycie podane przez producenta.',
  'Aktuelle Materialkosten': 'Aktualne koszty materiałów',
  'Preise aus dem hinterlegten Materialkatalog': 'Ceny z zapisanego katalogu materiałów',
  'Materialliste als PDF exportieren': 'Eksportuj listę materiałów jako PDF',
  'Materialliste als Excel exportieren': 'Eksportuj listę materiałów jako Excel',

  // --- material-list: Steuerung (Toggle/Reset) ---
  'Materialliste anpassen': 'Dostosuj listę materiałów',
  'Optionale Materialien berücksichtigen': 'Uwzględnij materiały opcjonalne',
  'Wenn deaktiviert, werden optionale Materialien aus der Kostenschätzung entfernt.':
    'Jeśli wyłączone, materiały opcjonalne zostaną usunięte z szacunku kosztów.',
  'Materialliste zurücksetzen': 'Zresetuj listę materiałów',

  // --- material-list: Projektübersicht (Kennzahlen) ---
  Projektübersicht: 'Przegląd projektu',
  Fliesenfläche: 'Powierzchnia płytek',
  'Mit Verschnitt': 'Z uwzględnieniem zapasu na docinanie',
  'Aktive Positionen': 'Aktywne pozycje',
  'Entfernte Positionen': 'Usunięte pozycje',
  'Hinweise zur Materialberechnung': 'Uwagi dotyczące obliczenia materiałów',

  // --- material-list: Fliesenmenge & Verschnitt (Berechnungsgrundlage-Panel) ---
  Verschnittfläche: 'Powierzchnia zapasu na docinanie',
  'Fliesenmenge inkl. Verschnitt': 'Ilość płytek wraz z zapasem na docinanie',
  'Fläche pro Fliese': 'Powierzchnia jednej płytki',
  'Tatsächliche Fläche nach Stückzahl': 'Rzeczywista powierzchnia wg liczby sztuk',
  'Fliesenmaterial ist im Leistungsumfang ausgeschlossen. Die Menge wird nur zur Orientierung angezeigt.':
    'Materiał na płytki jest wyłączony z zakresu usług. Ilość jest podana wyłącznie orientacyjnie.',

  // --- material-list: Material-Sektionen / Positionen ---
  Artikel: 'artykułów',
  'Aus Materialliste entfernen': 'Usuń z listy materiałów',
  'aus Materialliste entfernen': 'usuń z listy materiałów',
  'Zur Materialliste hinzufügen': 'Dodaj do listy materiałów',
  'zur Materialliste hinzufügen': 'dodaj do listy materiałów',
  'Durch Toggle ausgeschlossen': 'Wykluczone przełącznikiem',
  'Aus Berechnung entfernt': 'Usunięte z obliczenia',
  'Nach Bedarf': 'Według potrzeb',
  Einzelpreis: 'Cena jednostkowa',
  Berechnung: 'Obliczenie',
  'Verwendet in': 'Używane w',
  'Produkt ansehen': 'Zobacz produkt',
  'Noch kein Preis': 'Brak jeszcze ceny',

  // --- material-list / project-summary: Shop-Angebote (Affiliate-Chips) ---
  'Anzeige – Affiliate-Werbung, Links führen zu Partner-Shops':
    'Reklama – linki partnerskie prowadzą do sklepów partnerskich',
  Anzeige: 'Reklama',
  Bei: 'U',
  'ansehen (Anzeige, öffnet neuen Tab)': 'zobacz (reklama, otwiera nową kartę)',
  ansehen: 'zobacz',

  // --- material-list: ARTICLE_TYPE_LABELS ---
  Hauptmaterial: 'Materiał główny',
  Verbrauchsmaterial: 'Materiał eksploatacyjny',
  Werkzeug: 'Narzędzie',
  Schutzausrüstung: 'Wyposażenie ochronne',
  Zubehör: 'Akcesoria',

  // --- material-list: REQUIREMENT_LABELS ---
  Erforderlich: 'Wymagane',
  'Bedingt erforderlich': 'Wymagane warunkowo',
  Empfohlen: 'Zalecane',

  // --- material-list: gesperrter Zustand (kein Raum vorhanden) ---
  'Materialliste noch nicht verfügbar': 'Lista materiałów jeszcze niedostępna',
  'Bitte lege zuerst einen Raum an.': 'Najpierw dodaj pomieszczenie.',
  'Danach berechnen wir Materialmengen und Kosten aus deinen Angaben.':
    'Następnie obliczymy ilości materiałów i koszty na podstawie podanych danych.',

  // --- project-summary: Kopf ---
  'gespeicherte Räume': 'zapisanych pomieszczeń',
  'Neuen Raum anlegen': 'Dodaj nowe pomieszczenie',
  'Noch keine Räume gespeichert.': 'Nie zapisano jeszcze żadnych pomieszczeń.',
  'Lege deinen ersten Raum an, damit Projektkosten und Materialien berechnet werden können.':
    'Dodaj swoje pierwsze pomieszczenie, aby można było obliczyć koszty projektu i materiały.',

  // --- project-summary: Projektkosten-Kennzahlen ---
  Projektkosten: 'Koszty projektu',
  Gesamtfläche: 'Powierzchnia całkowita',
  'DIY-Kosten': 'Koszty samodzielnego wykonania',
  'Fliesenleger-Kosten': 'Koszty glazurnika',
  'Mögliche Ersparnis': 'Możliwa oszczędność',
  Materialkosten: 'Koszty materiałów',
  'Werkzeugkosten einmalig': 'Koszty narzędzi (jednorazowo)',
  'Summe Einzelräume': 'Suma pojedynczych pomieszczeń',
  'davon −': 'z czego −',
  'gespart, weil Werkzeuge projektweit nur einmal gerechnet werden.':
    'zaoszczędzone, ponieważ narzędzia są liczone tylko raz dla całego projektu.',
  'Fliesen inkl. Verschnitt': 'Płytki wraz z zapasem na docinanie',
  'Anzahl Räume': 'Liczba pomieszczeń',

  // --- project-summary: Einzelne Kalkulationen (Raumkarten) ---
  'Gespeicherte Räume': 'Zapisane pomieszczenia',
  'Einzelne Kalkulationen': 'Pojedyncze kalkulacje',
  'Hinweise für': 'Uwagi dla',
  anzeigen: 'pokaż',
  Fläche: 'Powierzchnia',
  Bearbeiten: 'Edytuj',
  Duplizieren: 'Duplikuj',

  // --- project-summary: Projektweite Materialübersicht ---
  'Projektweite Materialübersicht': 'Przegląd materiałów w całym projekcie',
  'Materialbedarf aller Räume': 'Zapotrzebowanie na materiały wszystkich pomieszczeń',
  bestellt: 'zamówiono',
  'Materialliste schließen': 'Zamknij listę materiałów',
  'Projekt-Materialliste anzeigen': 'Pokaż listę materiałów projektu',
  'Werkzeug einmalig': 'Narzędzia jednorazowo',
  Verbrauchsmaterialien: 'Materiały eksploatacyjne',
  Hauptmaterialien: 'Materiały główne',

  // --- project-summary: Projekt-Materialliste (Tabelle) ---
  Bestellt: 'Zamówiono',
  Wo: 'Gdzie',
  Pakete: 'Opakowania',
  Räume: 'Pomieszczenia',
  Kosten: 'Koszty',
  'als bestellt markieren': 'oznacz jako zamówione',

  // --- project-summary: Nächste Schritte ---
  'Nächste Schritte': 'Kolejne kroki',
  'Projekt weiterführen': 'Kontynuuj projekt',
  'Ergänze Räume oder prüfe die projektweiten Materialien und eine Einzelraum-Zusammenfassung.':
    'Dodaj pomieszczenia lub sprawdź materiały dla całego projektu oraz podsumowanie pojedynczego pomieszczenia.',
  'Projekt-Materialliste prüfen': 'Sprawdź listę materiałów projektu',
  'Zusammenfassung prüfen': 'Sprawdź podsumowanie',
  'Projekt-Materialliste als PDF': 'Lista materiałów projektu jako PDF',
  'Projekt-Materialliste als Excel': 'Lista materiałów projektu jako Excel',

  // --- project-summary: Raum löschen (confirm-Dialog) ---
  'Möchtest du diesen Raum wirklich löschen?': 'Czy na pewno chcesz usunąć to pomieszczenie?'
};
