// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Förmliches Polnisch. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
// Bereich: Lead-Formular (components/lead-form) + Handwerkerverzeichnis
// (components/contractor-directory).
// Hinweis: 'PLZ'/'E-Mail'/'Website' sind bereits über pl.konto.ts übersetzt – hier
// NICHT erneut definieren.
export const PL_LEADS: Record<string, string> = {
  // --- Lead-Formular: Kopf ---
  'Angebote von Fliesenlegern erhalten': 'Otrzymaj oferty od firm układających płytki',
  'Kostenlos passende Fachbetriebe anfragen': 'Bezpłatnie zapytaj pasujące firmy fachowe',
  'Wir geben deine Anfrage an': 'Przekazujemy Twoje zapytanie do',
  'bis zu 3 passende Fliesenleger-Betriebe': 'maksymalnie 3 pasujące firmy układające płytki',
  'weiter – unverbindlich und kostenlos. Die Eckdaten deines Raums hängen wir automatisch an.':
    'dalej – niezobowiązująco i bezpłatnie. Podstawowe dane Twojego pomieszczenia dołączamy automatycznie.',

  // --- Erfolgsmeldung (Double-Opt-in) ---
  'Fast geschafft – bitte E-Mail bestätigen.': 'Prawie gotowe – potwierdź adres e-mail.',
  'Wir haben dir eine E-Mail geschickt. Bestätige darin deine Anfrage, damit wir sie an passende Betriebe weitergeben dürfen. Ohne Bestätigung wird nichts weitergegeben.':
    'Wysłaliśmy Ci wiadomość e-mail. Potwierdź w niej swoje zapytanie, abyśmy mogli przekazać je odpowiednim firmom. Bez potwierdzenia nic nie zostanie przekazane.',

  // --- Formularfelder ---
  'Bitte dieses Feld leer lassen': 'Proszę pozostawić to pole puste',
  Name: 'Imię i nazwisko',
  Pflichtfeld: 'Pole obowiązkowe',
  'Telefon (optional)': 'Telefon (opcjonalnie)',
  'Gewünschter Zeitraum': 'Preferowany termin',
  'Nachricht (optional)': 'Wiadomość (opcjonalnie)',
  'Besonderheiten, Wünsche, Erreichbarkeit …': 'Szczególne wymagania, życzenia, dostępność…',

  // --- Einwilligungstext (Consent) ---
  'Ich willige ein, dass fliesen-kosten meine Angaben (Name, PLZ, E-Mail, Telefonnummer) und die Projektdaten aus dem Rechner an bis zu 3 passende Fliesenleger-Betriebe weitergibt, damit diese mich zwecks Angebotserstellung kontaktieren. Ich kann diese Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Details und Widerrufskontakt: ':
    'Wyrażam zgodę, aby fliesen-kosten przekazało moje dane (imię i nazwisko, kod pocztowy, e-mail, numer telefonu) oraz dane projektu z kalkulatora maksymalnie 3 pasującym firmom układającym płytki, aby mogły się ze mną skontaktować w celu przygotowania oferty. Mogę odwołać tę zgodę w dowolnym momencie ze skutkiem na przyszłość. Szczegóły i kontakt w sprawie odwołania: ',
  Datenschutzerklärung: 'Polityka prywatności',

  // --- Buttons/Status ---
  'Wird gesendet …': 'Wysyłanie…',
  'Anfrage absenden': 'Wyślij zapytanie',

  // --- Zeitraum-Optionen (LEAD_TIMEFRAME_OPTIONS, dynamisch) ---
  'So bald wie möglich': 'Jak najszybciej',
  'In 1–3 Monaten': 'Za 1–3 miesiące',
  'In 3–6 Monaten': 'Za 3–6 miesięcy',
  'Zeitlich noch flexibel': 'Termin jeszcze elastyczny',

  // --- Fehlermeldungen (LEAD_SUBMIT_ERROR_MESSAGES, dynamisch) ---
  'Bitte prüfe deine Eingaben (Name, PLZ, E-Mail) und setze die Einwilligung, dann erneut absenden.':
    'Sprawdź swoje dane (imię i nazwisko, kod pocztowy, e-mail) i zaznacz zgodę, a następnie wyślij ponownie.',
  'Für diese E-Mail-Adresse liegen bereits mehrere Anfragen vor. Bitte versuche es später erneut.':
    'Dla tego adresu e-mail zarejestrowano już kilka zapytań. Spróbuj ponownie później.',
  'Die Anfrage konnte gerade nicht verschickt werden (Bestätigungsmail nicht verfügbar). Bitte versuche es später noch einmal.':
    'Nie udało się teraz wysłać zapytania (e-mail potwierdzający niedostępny). Spróbuj ponownie później.',
  'Das hat leider nicht geklappt. Bitte versuche es in einigen Minuten erneut.':
    'Niestety się nie udało. Spróbuj ponownie za kilka minut.',

  // --- Handwerker-Verzeichnis (contractor-directory) ---
  'Fachbetriebe finden': 'Znajdź firmy fachowe',
  'Betriebe in deiner Region': 'Firmy w Twojej okolicy',
  'Gib deine Postleitzahl ein und sieh Premium-Fachbetriebe, die in deinem Gebiet Fliesen verlegen. Die PLZ übernehmen wir gleich in die Anfrage unten.':
    'Podaj swój kod pocztowy i zobacz firmy Premium, które układają płytki w Twojej okolicy. Kod pocztowy przeniesiemy od razu do zapytania poniżej.',
  Postleitzahl: 'Kod pocztowy',
  'Suche …': 'Szukanie…',
  'Betriebe anzeigen': 'Pokaż firmy',
  'Die Betriebe konnten nicht geladen werden. Bitte versuche es erneut.':
    'Nie udało się załadować firm. Spróbuj ponownie.',
  'Noch kein Premium-Betrieb in deiner Region – stelle trotzdem eine Anfrage.':
    'W Twojej okolicy nie ma jeszcze firmy Premium – mimo to wyślij zapytanie.'
};
