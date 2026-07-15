// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Förmliches Polnisch. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Zusammenfassung (summary-page, room-summary-contractor, cost-comparison,
// premium-export-button).
// Hinweis: Einige generische Keys ('Stück', 'Menge', 'Einheit', 'Einheitspreis',
// 'Gesamt', 'Nettobetrag', 'Link wird erstellt …', 'Kopieren', 'Raum anlegen', 'zzgl.')
// sind bereits über pl.offers.ts/pl.shell.ts abgedeckt – hier bewusst NICHT erneut
// definiert (keine Duplikate über Dateien hinweg).
export const PL_SUMMARY: Record<string, string> = {
  // --- summary-page: Kopf / Raum speichern ---
  'Raum-Zusammenfassung als PDF exportieren': 'Eksportuj podsumowanie pomieszczenia jako PDF',
  'Lokales Projekt': 'Projekt lokalny',
  'Änderungen speichern': 'Zapisz zmiany',
  'Raum speichern': 'Zapisz pomieszczenie',
  'Maximal erreicht:': 'Osiągnięto limit:',
  'Bestehende Räume kannst du weiter bearbeiten.':
    'Istniejące pomieszczenia możesz nadal edytować.',
  'Änderungen wurden gespeichert.': 'Zmiany zostały zapisane.',
  'Raum wurde gespeichert.': 'Pomieszczenie zostało zapisane.',
  'Weiteren Raum hinzufügen': 'Dodaj kolejne pomieszczenie',
  'Zum Projekt-Dashboard': 'Do panelu projektu',
  'Materialliste dieses Raumes prüfen': 'Sprawdź listę materiałów tego pomieszczenia',

  // --- summary-page: DIY-Kostenschätzung ---
  'Zusammenfassung DIY': 'Podsumowanie DIY',
  'DIY-Kostenschätzung & Materialübersicht': 'Szacunek kosztów DIY i przegląd materiałów',
  Berechnungsgrundlage: 'Podstawa obliczeń',
  'Fliesenmenge & Verschnitt': 'Ilość płytek i zapas na docinanie',
  'Zu fliesende Fläche': 'Powierzchnia do wyłożenia płytkami',
  Verschnitt: 'Zapas na docinanie',
  'Inkl. Verschnitt': 'Z zapasem na docinanie',
  Fliesenformat: 'Format płytki',
  'Benötigte Fliesen': 'Potrzebne płytki',
  'Fläche nach Stückzahl': 'Powierzchnia wg liczby sztuk',
  'Aktuelle Auswahl': 'Aktualny wybór',
  'DIY-Materialkosten': 'Koszty materiałów DIY',
  'Aktive Materialpositionen': 'Aktywne pozycje materiałowe',
  'Deaktivierte Materialpositionen': 'Wyłączone pozycje materiałowe',
  'Materialkosten gesamt': 'Koszty materiałów razem',
  'Materialliste bearbeiten': 'Edytuj listę materiałów',

  // --- summary-page: Kostenvergleich DIY vs. Fliesenleger ---
  Kostenvergleich: 'Porównanie kosztów',
  'Eigenleistung vs. Fliesenleger': 'Praca własna a fachowiec',
  Ersparnis: 'Oszczędność',
  Eigenleistung: 'Praca własna',
  'Material & Zubehör': 'Materiał i akcesoria',
  Puffer: 'Bufor',
  Fliesenleger: 'Fachowiec',
  'Leistungspositionen netto': 'Pozycje usługowe netto',
  'Material laut Auswahl': 'Materiał wg wyboru',
  'Gesamt inkl. MwSt.': 'Razem z VAT',
  'Ohne Fliesenmaterial': 'Bez materiału płytkowego',
  'Das entspricht ca.': 'Odpowiada to ok.',
  '% der geschätzten Profi-Kosten.': '% szacowanych kosztów fachowca.',

  // --- summary-page: Kalkulation teilen ---
  'Kalkulation teilen': 'Udostępnij kalkulację',
  'Read-only-Link erzeugen': 'Utwórz link tylko do odczytu',
  'Teilen-Link erzeugen': 'Utwórz link do udostępnienia',
  'Zum Teilen bitte': 'Aby udostępnić, najpierw',
  anmelden: 'zaloguj się',
  '– ein geteilter Link speichert eine eingefrorene Momentaufnahme dieser Kalkulation.':
    '– udostępniony link zapisuje zamrożony stan tej kalkulacji.',
  'Kopiert ✓': 'Skopiowano ✓',
  'Jeder mit diesem Link sieht eine schreibgeschützte Ansicht – ohne deine übrigen Projektdaten.':
    'Każdy, kto ma ten link, zobaczy widok tylko do odczytu – bez pozostałych danych Twojego projektu.',

  // --- summary-page / room-summary-contractor: Profi-Angebotspositionen (Tabelle) ---
  Leistungspositionsmodell: 'Model pozycji usługowych',
  'Profi-Angebotspositionen': 'Pozycje oferty fachowca',
  'Profi-Kalkulation als PDF exportieren': 'Eksportuj kalkulację fachowca jako PDF',
  Position: 'Pozycja',
  optional: 'opcjonalnie',
  'nicht eingerechnet': 'nie wliczono',
  '% MwSt. (Leistung + Material)': '% VAT (usługa + materiał)',
  'Gesamtschätzung Fliesenleger': 'Szacunek łączny fachowca',
  'Aufteilung der Materialkosten': 'Podział kosztów materiałów',
  'Keine aktiven Materialkosten': 'Brak aktywnych kosztów materiałów',
  Berechnungsbasis: 'Podstawa obliczeń',
  Annahmen: 'Założenia',
  'Bitte beachten': 'Uwaga',
  'Hinweise und Risiken': 'Wskazówki i ryzyka',
  'Die Zusammenfassung erscheint erst, wenn du den finalen Button im Wizard drückst.':
    'Podsumowanie pojawi się dopiero po naciśnięciu ostatniego przycisku w kreatorze.',
  'Der Teilen-Link konnte nicht erstellt werden. Bitte erneut versuchen.':
    'Nie udało się utworzyć linku do udostępnienia. Spróbuj ponownie.',

  // --- room-summary-contractor: Angebot / Projekt speichern ---
  'Fliesenleger-Kalkulation als PDF exportieren': 'Eksportuj kalkulację fachowca jako PDF',
  'Angebot / Projekt': 'Oferta / projekt',
  'In welches Angebot speichern?': 'W której ofercie zapisać?',
  '+ Neues Angebot': '+ Nowa oferta',
  'Name des neuen Angebots': 'Nazwa nowej oferty',
  'Neues Angebot': 'Nowa oferta',
  'Raum wurde im Angebot „': 'Pomieszczenie zostało zapisane w ofercie „',
  '" gespeichert.': '”.',
  'Fliesenleger-Leistungspositionen': 'Pozycje usługowe fachowca',
  'Ohne Fliesenmaterial kalkuliert.': 'Skalkulowano bez materiału płytkowego.',

  // --- premium-export-button ---
  'PDF wird erstellt …': 'Tworzenie PDF…',
  'Excel wird erstellt …': 'Tworzenie pliku Excel…',
  'Es liegen noch keine Daten zum Export vor.': 'Brak jeszcze danych do eksportu.',
  '{format}-Export ist für deinen Zugang nicht verfügbar.':
    'Eksport {format} nie jest dostępny dla Twojego konta.',
  '{format} konnte nicht erstellt werden. Bitte erneut versuchen.':
    'Nie udało się utworzyć pliku {format}. Spróbuj ponownie.',

  // --- CostComparisonService: COST_GROUPS-Labels (dynamisch, group.label | t) ---
  Fliesenmaterial: 'Materiał płytkowy',
  Verlegematerial: 'Materiał do układania',
  Abdichtung: 'Izolacja',
  Untergrundvorbereitung: 'Przygotowanie podłoża',
  'Werkzeug & Schutz': 'Narzędzia i ochrona',
  Entsorgung: 'Utylizacja',
  Sonstiges: 'Pozostałe',

  // --- CostComparisonService: eigene Warnungen (dynamisch, warning | t) ---
  'Die Materialliste wurde angepasst. Entfernte Positionen sind nicht in der aktuellen Schätzung enthalten.':
    'Lista materiałów została dostosowana. Usunięte pozycje nie są uwzględnione w aktualnym szacunku.',
  'Fliesenmaterial wurde im Wizard ausgeschlossen und wird im Vergleich nicht eingerechnet.':
    'Materiał płytkowy został wykluczony w kreatorze i nie jest uwzględniony w porównaniu.',

  // --- CostComparisonService: savings.label (dynamisch) ---
  'Mögliche Ersparnis durch Eigenleistung': 'Możliwa oszczędność dzięki pracy własnej',
  'Keine rechnerische Ersparnis': 'Brak wyliczonej oszczędności',

  // --- CostComparisonService: eigene Assumptions (dynamisch, assumption | t) ---
  'DIY-Puffer: 10 %': 'Bufor DIY: 10%',
  'Profi-Materialkosten enthalten keine DIY-Werkzeuge, PSA oder Dokumentation.':
    'Koszty materiałów fachowca nie obejmują narzędzi DIY, środków ochrony indywidualnej ani dokumentacji.',

  // --- RoomLimitService.hint (dynamisch, außerhalb dieses Scopes) ---
  'Als Heimwerker kannst du bis zu 5 Räume pro Projekt anlegen.':
    'Jako majsterkowicz możesz utworzyć maksymalnie 5 pomieszczeń na projekt.',

  // --- CROSS_DOMAIN_PROJECT_HINT (dynamisch, außerhalb dieses Scopes) ---
  'Dein lokal gespeichertes Projekt bleibt auf diesem Gerät unter fliesen-kosten.de verfügbar.':
    'Twój lokalnie zapisany projekt pozostaje dostępny na tym urządzeniu pod fliesen-kosten.de.'
};
