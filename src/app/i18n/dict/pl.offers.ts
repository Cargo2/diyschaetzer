// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Förmliches Polnisch. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Hinweis: 'Angebote'/'Rechnungen'/'Firmenprofil'/'Premium freischalten' sind bereits über
// pl.shell.ts (Navigation) übersetzt, 'PLZ'/'Ort'/'E-Mail'/'IBAN'/'USt-IdNr.'/'Pflicht für
// XRechnung'/'%'/'MwSt.' bereits über pl.konto.ts – hier NICHT erneut definieren.
export const PL_OFFERS: Record<string, string> = {
  // --- Nachrichten (TS) ---
  'Limit erreicht – lösche ein Angebot oder schalte Premium frei.':
    'Osiągnięto limit – usuń ofertę lub odblokuj Premium.',
  'Angebot gespeichert.': 'Oferta zapisana.',
  'Speichern fehlgeschlagen. Bitte erneut versuchen.': 'Zapis nie powiódł się. Spróbuj ponownie.',
  'Löschen fehlgeschlagen. Bitte erneut versuchen.': 'Usuwanie nie powiodło się. Spróbuj ponownie.',
  'Teilen fehlgeschlagen. Bitte erneut versuchen.': 'Udostępnianie nie powiodło się. Spróbuj ponownie.',
  'Rechnung konnte nicht erstellt werden. Bitte erneut versuchen.':
    'Nie udało się utworzyć faktury. Spróbuj ponownie.',
  'Anzahlungsrechnung konnte nicht erstellt werden. Bitte erneut versuchen.':
    'Nie udało się utworzyć faktury zaliczkowej. Spróbuj ponownie.',

  // --- Status-/Einheiten-Labels (dynamisch: statusOptions/unitOptions, DYNAMIC_KEYS) ---
  Entwurf: 'Szkic',
  Versendet: 'Wysłana',
  Angenommen: 'Zaakceptowana',
  pauschal: 'ryczałt',
  'm²': 'm²',
  lfm: 'mb',
  Stück: 'szt.',
  'Std.': 'godz.',

  // --- Seite / Projektverwaltung ---
  'Wähle ein Projekt, erzeuge daraus eine Schätzung und passe die Positionen an. Die Handwerkerleistung steht im Vordergrund; Material erscheint als kompakte Sammelposition.':
    'Wybierz projekt, utwórz na jego podstawie wycenę i dostosuj pozycje. Na pierwszym planie jest usługa fachowca; materiał pojawia się jako jedna zbiorcza pozycja.',
  'Projekte werden geladen …': 'Ładowanie projektów…',
  Projekte: 'Projekty',
  'Name des neuen Projekts': 'Nazwa nowego projektu',
  'Neues Projekt': 'Nowy projekt',
  'Raum/Räume': 'pomieszczenie/pomieszczeń',
  Ausgewählt: 'Wybrany',
  Auswählen: 'Wybierz',
  'Sicher?': 'Na pewno?',
  'Ja, löschen': 'Tak, usuń',
  Abbrechen: 'Anuluj',
  Löschen: 'Usuń',

  // --- Angebotskopf / Aktionen ---
  'Schätzung:': 'Wycena:',
  von: 'z',
  'Angeboten (Free)': 'ofert (Free)',
  'Gespeicherter Stand': 'Zapisany stan',
  'Nicht gespeichert': 'Niezapisane',
  'Aus Projekt aktualisieren': 'Aktualizuj z projektu',
  'Speichern …': 'Zapisywanie…',
  Speichern: 'Zapisz',
  'PDF herunterladen': 'Pobierz PDF',
  'Bitte zuerst speichern': 'Najpierw zapisz',
  'Link wird erstellt …': 'Tworzenie linku…',
  'Teilen-Link': 'Link do udostępnienia',
  'Nur aktive Pflichtpositionen werden übernommen':
    'Przenoszone są tylko aktywne pozycje obowiązkowe',
  'Speichere zuerst das Angebot': 'Najpierw zapisz ofertę',
  'Rechnung wird erstellt …': 'Tworzenie faktury…',
  'Als Rechnung übernehmen': 'Przenieś jako fakturę',

  // --- Versionen ---
  'Versionen:': 'Wersje:',
  'Noch keine gespeicherte Version.': 'Brak jeszcze zapisanej wersji.',
  '+ Neue Version': '+ Nowa wersja',
  'Version löschen?': 'Usunąć wersję?',
  Ja: 'Tak',
  Nein: 'Nie',
  'Diese Version löschen': 'Usuń tę wersję',

  // --- Meldungen / Teilen / Tracking ---
  'Das Projekt hat sich seit dem gespeicherten Angebot geändert.':
    'Projekt zmienił się od czasu zapisania oferty.',
  '– deine Anpassungen bleiben erhalten.': '– Twoje zmiany zostaną zachowane.',
  'Öffentlicher Link (read-only):': 'Publiczny link (tylko do odczytu):',
  Kopieren: 'Kopiuj',
  'Geteilt am': 'Udostępniono',
  'Zuletzt angesehen am': 'Ostatnio wyświetlono',
  Aufrufe: 'wyświetleń',
  'Angenommen von': 'Zaakceptowano przez',
  am: 'w dniu',

  // --- Ohne Räume / Angebotskopf-Felder ---
  'Dieses Projekt hat noch keine Räume. Lege zuerst über den Wizard Räume an – danach kannst du hier die Schätzung erzeugen und bearbeiten.':
    'Ten projekt nie ma jeszcze pomieszczeń. Najpierw dodaj pomieszczenia w kreatorze – potem możesz tutaj utworzyć i edytować wycenę.',
  'Kunde / Empfänger': 'Klient / odbiorca',
  'Name des Kunden': 'Nazwa klienta',
  Anschrift: 'Adres',
  'Straße Nr.': 'Ulica nr',
  'PLZ Ort': 'Kod pocztowy miejscowość',
  Angebotsnummer: 'Numer oferty',
  'z. B. 2026-042': 'np. 2026-042',
  Angebotsdatum: 'Data oferty',
  'Gültig bis': 'Ważna do',
  Status: 'Status',
  'Versions-Bezeichnung': 'Oznaczenie wersji',
  'z. B. nach Kundengespräch': 'np. po rozmowie z klientem',
  'Einleitungstext (optional)': 'Tekst wprowadzający (opcjonalnie)',

  // --- Positionstabelle ---
  'Pos.': 'Poz.',
  'Nach oben': 'W górę',
  'Nach unten': 'W dół',
  'Gruppe löschen': 'Usuń grupę',
  Pos: 'Poz.',
  Bezeichnung: 'Nazwa',
  Menge: 'Ilość',
  Einheit: 'Jednostka',
  Einheitspreis: 'Cena jednostkowa',
  Gesamt: 'Razem',
  Bedarf: 'Opcjonalne',
  Aktiv: 'Aktywne',
  'Beschreibung (optional)': 'Opis (opcjonalnie)',
  'Bedarfsposition (nicht in der Summe)': 'Pozycja opcjonalna (nieuwzględniona w sumie)',
  'Position nach oben': 'Pozycja w górę',
  'Position nach unten': 'Pozycja w dół',
  'Position löschen': 'Usuń pozycję',
  '+ Position': '+ Pozycja',

  // --- Kalkulationsoptionen / Summen ---
  'Material je Raum ausweisen': 'Wykaż materiał dla każdego pomieszczenia',
  Materialaufschlag: 'Marża na materiał',
  Nachlass: 'Rabat',
  '+ Gruppe hinzufügen': '+ Dodaj grupę',
  Nettobetrag: 'Kwota netto',
  'Zwischensumme netto': 'Suma częściowa netto',
  'zzgl.': 'plus',
  Gesamtsumme: 'Suma całkowita',

  // --- Anzahlungsrechnung ---
  Anzahlungsrechnung: 'Faktura zaliczkowa',
  Anteil: 'Udział',
  'Anzahlungsrechnung erstellen': 'Utwórz fakturę zaliczkową',

  // --- Schlusstext / Mobile ---
  'Schlusstext (optional)': 'Tekst końcowy (opcjonalnie)',
  'Zahlungsbedingungen, Ausführungszeitraum, Gewährleistung … z. B.: Zahlbar innerhalb von 14 Tagen ohne Abzug. Ausführung nach Absprache.':
    'Warunki płatności, termin realizacji, gwarancja … np.: Płatne w ciągu 14 dni bez potrąceń. Realizacja po uzgodnieniu terminu.'
};
