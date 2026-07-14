// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Förmliches Polnisch, Fliesenleger-Fachvokabular. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
export const PL_WIZARD: Record<string, string> = {
  // Aussparungs-Typ-Labels (openingTypeLabel() + Select-Optionen)
  Tuer: 'Drzwi',
  Fenster: 'Okno',
  Nische: 'Nisza',
  Sonstige: 'Inne',

  // validationMessage()
  'Bitte wähle einen Raumtyp und gib einen Raumnamen ein.':
    'Wybierz typ pomieszczenia i podaj nazwę pomieszczenia.',
  'Bitte wähle eine Raumgröße zwischen 1,0 und 100,0 m².':
    'Wybierz wielkość pomieszczenia między 1,0 a 100,0 m².',
  'Bitte entscheide dich für eine Waschplatz-Lösung.':
    'Wybierz rozwiązanie dla strefy umywalki.',
  'Bitte wähle eine Option für Dusche und Badewanne.':
    'Wybierz opcję dotyczącą prysznica i wanny.',
  'Bitte wähle eine Heizlösung aus.': 'Wybierz rozwiązanie grzewcze.',
  'Bitte wähle eine WC-Option aus.': 'Wybierz opcję dotyczącą WC.',
  'Bitte wähle Fliesenumfang, Fliesenqualität und Fliesengröße aus.':
    'Wybierz zakres płytek, jakość płytek i rozmiar płytek.',
  'Bitte wähle die Wand-Fliesengröße und prüfe die Wandangaben.':
    'Wybierz rozmiar płytek ściennych i sprawdź dane ścian.',
  'Bitte beantworte die sichtbaren Fragen zu Vorarbeiten und Untergrund. "Unklar" ist erlaubt.':
    'Odpowiedz na widoczne pytania dotyczące prac przygotowawczych i podłoża. Odpowiedź "Niejasne" jest dozwolona.',
  'Bitte wähle Extras aus oder markiere den Bereich als keine Zusatzleistung oder noch unklar.':
    'Wybierz dodatkowe elementy albo oznacz ten obszar jako brak dodatkowych prac lub jeszcze niejasne.',

  // Hartkodierte Template-Strings
  Fortschritt: 'Postęp',
  Raumname: 'Nazwa pomieszczenia',
  'z. B. Bad OG oder Terrasse Südseite': 'np. łazienka na piętrze lub taras od strony południowej',
  Außenbereich: 'Strefa zewnętrzna',
  'Liegt dieser Bereich im Freien, z. B. Terrasse, Balkon oder Außentreppe?':
    'Czy ten obszar znajduje się na zewnątrz, np. taras, balkon lub schody zewnętrzne?',
  'Frostsichere, witterungsbeständige Outdoor-Fliesen oder Feinsteinzeug-Terrassenplatten werden empfohlen. Achte außerdem auf Rutschhemmung, Gefälle und eine funktionierende Entwässerung.':
    'Zalecane są mrozoodporne, odporne na warunki atmosferyczne płytki zewnętrzne lub płyty tarasowe z gresu. Zwróć też uwagę na antypoślizgowość, spadek i sprawne odwodnienie.',
  Raumgröße: 'Wielkość pomieszczenia',
  'Direkt eingeben': 'Wpisz bezpośrednio',
  '1,0 m²': '1,0 m²',
  '100,0 m²': '100,0 m²',
  Optional: 'Opcjonalnie',
  'Soll ein Unterschrank berücksichtigt werden?': 'Czy uwzględnić szafkę pod umywalkę?',
  Zusatzfrage: 'Dodatkowe pytanie',
  'Welche Dusche ist geplant?': 'Jaki prysznic jest planowany?',
  'Welche Badewanne ist geplant?': 'Jaka wanna jest planowana?',
  'Welche Fliesenqualität möchtest du ungefähr?': 'Jaką jakość płytek preferujesz w przybliżeniu?',
  'Welche Fliesengröße ist für den Boden geplant?': 'Jaki rozmiar płytek jest planowany na podłogę?',
  Flaechenbasis: 'Podstawa powierzchni',
  'Waende und Teilbereiche': 'Ściany i fragmenty powierzchni',
  'Bodenflaeche:': 'Powierzchnia podłogi:',
  'Wand hinzufuegen': 'Dodaj ścianę',
  'Welche Fliesengröße ist für die Wände geplant?': 'Jaki rozmiar płytek jest planowany na ściany?',
  'Noch keine Wand erfasst. Bei "Noch unklar" ist das optional; bei Wandfliesen kannst du hier einzelne Waende oder Bereiche hinzufuegen.':
    'Nie dodano jeszcze żadnej ściany. Przy odpowiedzi "Jeszcze niejasne" jest to opcjonalne; przy płytkach ściennych możesz tutaj dodać poszczególne ściany lub fragmenty powierzchni.',
  'Netto-Fliesenflaeche:': 'Powierzchnia netto do wyłożenia płytkami:',
  'Wand entfernen': 'Usuń ścianę',
  'Name der Wand': 'Nazwa ściany',
  'Breite der Wand in m': 'Szerokość ściany w m',
  'Wandhoehe in m': 'Wysokość ściany w m',
  'Bis zu welcher Hoehe soll gefliest werden?': 'Do jakiej wysokości mają być ułożone płytki?',
  'Die Fliesenhoehe darf nicht groesser als die Wandhoehe sein.':
    'Wysokość okładziny nie może być większa niż wysokość ściany.',
  Aussparungen: 'Otwory',
  'Aussparung hinzufuegen': 'Dodaj otwór',
  'Keine Aussparungen erfasst.': 'Nie dodano żadnych otworów.',
  Typ: 'Typ',
  'Breite in m': 'Szerokość w m',
  'Hoehe in m': 'Wysokość w m',
  'Aussparung entfernen': 'Usuń otwór',
  'Die Aussparungen sind groesser als die zu fliesende Wandflaeche.':
    'Otwory są większe niż powierzchnia ściany przeznaczona do wyłożenia płytkami.',
  Bruttoflaeche: 'Powierzchnia brutto',
  'Netto-Fliesenflaeche': 'Powierzchnia netto do wyłożenia płytkami',
  'Alter Belag': 'Istniejąca okładzina',
  'Ist aktuell ein alter Boden- oder Wandbelag vorhanden?':
    'Czy obecnie istnieje stara okładzina podłogi lub ścian?',
  Rückbau: 'Demontaż',
  'Soll der alte Belag entfernt werden?': 'Czy stara okładzina ma zostać usunięta?',
  'Das Überfliesen vorhandener Beläge ist nicht immer möglich. Der Untergrund muss tragfähig, eben und geeignet sein.':
    'Ułożenie płytek na istniejącej okładzinie nie zawsze jest możliwe. Podłoże musi być nośne, równe i odpowiednie.',
  Sanitärobjekte: 'Obiekty sanitarne',
  'Müssen alte Sanitärobjekte entfernt werden?': 'Czy stare obiekty sanitarne muszą zostać usunięte?',
  Untergrund: 'Podłoże',
  'Ist der vorhandene Untergrund für das Fliesenlegen geeignet?':
    'Czy istniejące podłoże nadaje się do układania płytek?',
  Grundierung: 'Grunt',
  'Soll eine Grundierung berücksichtigt werden?': 'Czy uwzględnić gruntowanie?',
  Entsorgung: 'Utylizacja',
  'Soll Entsorgung berücksichtigt werden?': 'Czy uwzględnić utylizację?',
  'Für Nassbereiche wie Dusche oder Badewanne wird eine Abdichtung berücksichtigt.':
    'Dla stref mokrych, takich jak prysznic lub wanna, uwzględniana jest hydroizolacja.',
  Zurück: 'Wstecz',
  'Zur Zusammenfassung': 'Do podsumowania',
  Weiter: 'Dalej',

  // Wizard-Schritte: Eyebrows
  'Schritt 1 von 12': 'Krok 1 z 12',
  'Schritt 2 von 12': 'Krok 2 z 12',
  'Schritt 3 von 12': 'Krok 3 z 12',
  'Schritt 4 von 12': 'Krok 4 z 12',
  'Schritt 5 von 12': 'Krok 5 z 12',
  'Schritt 6 von 12': 'Krok 6 z 12',
  'Schritt 7 von 12': 'Krok 7 z 12',
  'Schritt 8 von 12': 'Krok 8 z 12',
  'Schritt 9 von 12': 'Krok 9 z 12',
  'Schritt 10 von 12': 'Krok 10 z 12',
  'Schritt 11 von 12': 'Krok 11 z 12',
  'Schritt 12 von 12': 'Krok 12 z 12',

  // Wizard-Schritte: Titel
  'Welchen Raum oder Bereich möchtest du fliesen?':
    'Które pomieszczenie lub obszar chcesz wyłożyć płytkami?',
  'Wie groß ist der Raum oder Bereich?': 'Jak duże jest to pomieszczenie lub obszar?',
  'Welche Waschplatz-Lösung möchtest du?': 'Jakie rozwiązanie strefy umywalki preferujesz?',
  'Was soll eingebaut werden?': 'Co ma zostać zamontowane?',
  'Welche Heizlösung möchtest du?': 'Jakie rozwiązanie grzewcze preferujesz?',
  'Soll ein WC eingeplant werden?': 'Czy zaplanować WC?',
  'Welche Bereiche sollen gefliest werden?': 'Które obszary mają zostać wyłożone płytkami?',
  'Wandflaechen erfassen': 'Wprowadź powierzchnie ścian',
  'Vorarbeiten & Untergrund': 'Prace przygotowawcze i podłoże',
  'Leistungsumfang & Ausschlüsse': 'Zakres prac i wyłączenia',
  'Welche zusätzliche Ausstattung soll berücksichtigt werden?':
    'Jakie dodatkowe wyposażenie ma zostać uwzględnione?',
  'Zusammenfassung und Annahmen': 'Podsumowanie i założenia',

  // Wizard-Schritte: Beschreibungen
  'Wähle den Raumtyp und vergib einen eindeutigen Namen für diese Kalkulation.':
    'Wybierz typ pomieszczenia i nadaj jednoznaczną nazwę dla tej kalkulacji.',
  'Nutze den Slider für eine erste Grobplanung zwischen 1,0 und 100,0 m².':
    'Użyj suwaka do wstępnego oszacowania w zakresie od 1,0 do 100,0 m².',
  'Wähle die passende Lösung für den Waschbereich.':
    'Wybierz odpowiednie rozwiązanie dla strefy umywalki.',
  'Definiere, ob Dusche, Badewanne oder eine Kombination geplant ist.':
    'Określ, czy planowany jest prysznic, wanna czy ich kombinacja.',
  'Wähle die gewünschte Heizoption für den neuen Badkomfort.':
    'Wybierz preferowaną opcję ogrzewania dla komfortu nowej łazienki.',
  'Lege fest, welche WC-Variante in die Planung gehort.':
    'Określ, jaki wariant WC ma zostać uwzględniony w planowaniu.',
  'Erfasse Fliesenumfang und die ungefähr gewünschte Materialqualität.':
    'Określ zakres płytek oraz przybliżoną, preferowaną jakość materiału.',
  'Fuege hier die Waende oder Teilbereiche hinzu, die gefliest werden sollen. Du kannst jede Wand einzeln benennen und die Masse anpassen.':
    'Dodaj tutaj ściany lub fragmenty powierzchni, które mają zostać wyłożone płytkami. Każdą ścianę możesz nazwać osobno i dostosować wymiary.',
  'Kläre Rückbau, vorhandenen Untergrund, Grundierung, Abdichtung und Entsorgung.':
    'Wyjaśnij kwestie demontażu, istniejącego podłoża, gruntowania, hydroizolacji i utylizacji.',
  'Lege fest, welche Positionen in der späteren Schätzung enthalten sein sollen.':
    'Określ, które pozycje mają zostać uwzględnione w późniejszej wycenie.',
  'Wähle einzelne Extras aus oder markiere den Bereich als offen.':
    'Wybierz poszczególne dodatkowe elementy albo oznacz ten obszar jako otwarty.',
  'Prüfe alle Angaben und öffne anschließend die JSON-Ausgabe im Menü.':
    'Sprawdź wszystkie dane, a następnie otwórz eksport JSON w menu.',

  // Raumtyp: Titel
  Bad: 'Łazienka',
  'Gäste-WC': 'WC dla gości',
  Küche: 'Kuchnia',
  Flur: 'Korytarz',
  Wohnraum: 'Pomieszczenie mieszkalne',
  Keller: 'Piwnica',
  Hauswirtschaftsraum: 'Pomieszczenie gospodarcze',
  'Terrasse / Balkon': 'Taras / balkon',
  'Anderer Raum': 'Inne pomieszczenie',

  // Raumtyp: Beschreibungen
  'Bad mit optionalen Sanitär- und Nassbereichsfragen.':
    'Łazienka z opcjonalnymi pytaniami o armaturę sanitarną i strefę mokrą.',
  'Kompakter Sanitärraum mit passenden Zusatzfragen.':
    'Kompaktowe pomieszczenie sanitarne z odpowiednimi pytaniami dodatkowymi.',
  'Boden und optionaler Fliesenspiegel oder Wandbereich.':
    'Podłoga oraz opcjonalny fartuch z płytek lub obszar ścienny.',
  'Robuste Bodenfläche mit optionalen Sockeln.':
    'Wytrzymała powierzchnia podłogi z opcjonalnymi cokołami.',
  'Wohnbereich mit Boden- und optionalen Wandfliesen.':
    'Pomieszczenie mieszkalne z płytkami podłogowymi i opcjonalnie ściennymi.',
  'Kellerfläche mit Fokus auf Untergrund und Boden.':
    'Powierzchnia piwnicy ze szczególnym uwzględnieniem podłoża i podłogi.',
  'Nutzraum mit Boden- und optionalen Wandflächen.':
    'Pomieszczenie gospodarcze z podłogą i opcjonalnie powierzchniami ściennymi.',
  'Außenbereich mit Frost-, Gefälle- und Entwässerungshinweisen.':
    'Strefa zewnętrzna z uwagami dotyczącymi mrozoodporności, spadku i odwodnienia.',
  'Freie Raumbezeichnung mit allgemeiner Fliesenplanung.':
    'Dowolna nazwa pomieszczenia z ogólnym planowaniem układania płytek.',

  // Waschplatz: Titel
  Einzelwaschtisch: 'Pojedyncza umywalka',
  Doppelwaschtisch: 'Podwójna umywalka',
  'Zwei separate Waschbecken': 'Dwie oddzielne umywalki',
  'Kein Waschbecken': 'Brak umywalki',

  // Waschplatz: Beschreibungen
  'Klassische Lösung für kompakte oder mittelgroße Bäder.':
    'Klasyczne rozwiązanie dla kompaktowych lub średniej wielkości łazienek.',
  'Gemeinsamer Waschplatz mit zwei Armaturen an einem Möbel.':
    'Wspólna strefa umywalkowa z dwiema armaturami na jednej szafce.',
  'Getrennte Waschplätze für mehr Flexibilität in der Raumaufteilung.':
    'Oddzielne strefy umywalkowe dla większej elastyczności w układzie pomieszczenia.',
  'Falls kein Waschplatz vorgesehen ist oder später entschieden wird.':
    'Jeśli nie planuje się strefy umywalkowej lub decyzja zostanie podjęta później.',

  // Ja / Nein / Noch unklar (mehrfach genutzt)
  Ja: 'Tak',
  Nein: 'Nie',
  'Noch unklar': 'Jeszcze niejasne',

  // Unterschrank: Beschreibungen
  'Ein Unterschrank soll direkt mitgedacht werden.':
    'Szafka pod umywalkę ma zostać uwzględniona od razu.',
  'Der Waschplatz wird ohne Unterschrank geplant.':
    'Strefa umywalkowa jest planowana bez szafki.',
  'Die Entscheidung soll erst in einer späteren Phase fallen.':
    'Decyzja ma zostać podjęta dopiero na późniejszym etapie.',

  // Dusche/Badewanne: Titel
  'Nur Dusche': 'Tylko prysznic',
  'Nur Badewanne': 'Tylko wanna',
  'Dusche und Badewanne': 'Prysznic i wanna',
  Duschbadewanne: 'Wannoprysznic',
  'Weder Dusche noch Badewanne': 'Ani prysznic, ani wanna',

  // Dusche/Badewanne: Beschreibungen
  'Fokus auf eine reine Duschlösung.': 'Skupienie na rozwiązaniu wyłącznie prysznicowym.',
  'Es wird ausschliesslich eine Badewanne eingeplant.': 'Planowana jest wyłącznie wanna.',
  'Beide Elemente sind separat vorgesehen.': 'Oba elementy są przewidziane oddzielnie.',
  'Eine kombinierte Lösung für kompaktere Grundrisse.':
    'Rozwiązanie łączone dla bardziej kompaktowych układów pomieszczeń.',
  'Für Sonderfälle wie ein reines WC oder Gästebad.':
    'Dla przypadków szczególnych, np. samo WC lub łazienka dla gości.',

  // Duschart: Titel
  'Standard-Duschkabine': 'Standardowa kabina prysznicowa',
  'Bodengleiche Dusche': 'Prysznic bezprogowy',
  'Walk-in-Dusche': 'Prysznic walk-in',

  // Duschart: Beschreibungen
  'Klassische Kabine mit klarer Trennung zum restlichen Raum.':
    'Klasyczna kabina z wyraźnym oddzieleniem od reszty pomieszczenia.',
  'Barrierearme Lösung mit flachem Einstieg.': 'Rozwiązanie niskoprogowe z płaskim wejściem.',
  'Offene, moderne Dusche mit großzügigem Einstieg.':
    'Otwarty, nowoczesny prysznic z przestronnym wejściem.',
  'Die Duschart ist für den MVP noch offen.': 'Rodzaj prysznica pozostaje na razie otwarty.',

  // Wannenart: Titel
  'Standard-Badewanne': 'Standardowa wanna',
  'Freistehende Badewanne': 'Wanna wolnostojąca',
  Eckbadewanne: 'Wanna narożna',

  // Wannenart: Beschreibungen
  'Die klassische Einbaulösung für viele Grundrisse.':
    'Klasyczne rozwiązanie zabudowane, pasujące do wielu układów pomieszczeń.',
  'Designorientierte Variante mit hoher Raumwirkung.':
    'Wariant zorientowany na design, o dużym walorze wizualnym.',
  'Spezielle Form zur Raumnutzung in Ecken.': 'Specjalny kształt wykorzystujący przestrzeń w narożniku.',
  'Die genaue Wannenart ist noch nicht festgelegt.':
    'Dokładny rodzaj wanny nie został jeszcze ustalony.',

  // Heizung: Titel
  'Nur Fußbodenheizung': 'Tylko ogrzewanie podłogowe',
  'Nur Handtuchheizkörper': 'Tylko grzejnik drabinkowy',
  'Fußbodenheizung und Handtuchheizkörper': 'Ogrzewanie podłogowe i grzejnik drabinkowy',
  'Keine neue Heizung': 'Bez nowego ogrzewania',

  // Heizung: Beschreibungen
  'Flächenwärme für hohen Komfort und freie Wandflächen.':
    'Ciepło płaszczyznowe zapewniające wysoki komfort i wolne powierzchnie ścienne.',
  'Kompakte Zusatzheizung mit Platz für Handtücher.':
    'Kompaktowe ogrzewanie dodatkowe z miejscem na ręczniki.',
  'Die MVP-Variante für die Kombination beider Systeme.': 'Wariant łączący oba systemy.',
  'Die vorhandene Heizsituation bleibt unberuhrt.': 'Istniejący system ogrzewania pozostaje bez zmian.',
  'Die Heizungsfrage wird später entschieden.': 'Kwestia ogrzewania zostanie rozstrzygnięta później.',

  // WC: Titel
  'Wand-WC': 'WC podwieszane',
  'Stand-WC': 'WC stojące',
  'Dusch-WC': 'WC myjące',
  'Kein WC': 'Brak WC',

  // WC: Beschreibungen
  'Moderne, pflegeleichte Lösung mit Unterputztechnik.':
    'Nowoczesne, łatwe w utrzymaniu rozwiązanie z techniką podtynkową.',
  'Klassische Aufstellung direkt auf dem Boden.': 'Klasyczne ustawienie bezpośrednio na podłodze.',
  'Komfortoption mit integrierter Reinigungsfunktion.':
    'Opcja komfortowa ze zintegrowaną funkcją mycia.',
  'Für Badkonzepte ohne Toilette im Raum.': 'Dla koncepcji łazienki bez toalety w pomieszczeniu.',
  'Die Entscheidung zur WC-Art ist noch offen.': 'Decyzja dotycząca rodzaju WC jest jeszcze otwarta.',

  // Fliesenumfang: Titel
  'Nur Boden': 'Tylko podłoga',
  'Boden und Wände teilweise': 'Podłoga i częściowo ściany',
  'Boden und Wände vollständig': 'Podłoga i ściany w całości',
  'Nur bestimmte Bereiche': 'Tylko wybrane obszary',

  // Fliesenumfang: Beschreibungen
  'Es wird ausschließlich der Fußboden gefliest.': 'Płytkami wykładana jest wyłącznie podłoga.',
  'Typische Lösung mit Teilverfliesung an ausgewählten Flächen.':
    'Typowe rozwiązanie z częściowym wyłożeniem płytkami na wybranych powierzchniach.',
  'Umfassende Verfliesung für ein homogenes Erscheinungsbild.':
    'Pełne wyłożenie płytkami dla jednolitego wyglądu.',
  'Zum Beispiel nur in der Dusche oder an einzelnen Zonen.':
    'Na przykład tylko w prysznicu lub w wybranych strefach.',
  'Der Fliesenumfang wird später festgelegt.': 'Zakres płytek zostanie ustalony później.',

  // Fliesenqualität: Titel
  'Einfach / günstig': 'Proste / ekonomiczne',
  Mittel: 'Średnia',
  Hochwertig: 'Wysoka jakość',

  // Fliesenqualität: Beschreibungen
  'Preisbewusste Auswahl mit funktionalem Anspruch.':
    'Wybór uwzględniający cenę, z naciskiem na funkcjonalność.',
  'Ausgewogene Wahl aus Preis und Qualität.': 'Wyważony wybór między ceną a jakością.',
  'Deutlich höhere Material- und Oberflächenanmutung.':
    'Wyraźnie wyższa jakość materiału i wykończenia powierzchni.',
  'Anspruchsvolle Design- und Materialqualität.': 'Wymagająca jakość designu i materiału.',
  'Die genaue Fliesenqualität ist noch offen.': 'Dokładna jakość płytek jest jeszcze otwarta.',

  // Fliesengröße: Titel
  '30 x 30 cm': '30 x 30 cm',
  '60 x 60 cm': '60 x 60 cm',
  '30 x 60 cm': '30 x 60 cm',
  '60 x 120 cm': '60 x 120 cm',
  '120 x 120 cm': '120 x 120 cm',
  Mosaik: 'Mozaika',

  // Fliesengröße: Beschreibungen
  'Kompaktes Format für kleinere Flächen oder klassische Raster.':
    'Kompaktowy format na mniejsze powierzchnie lub klasyczne układy siatki.',
  'Modernes Standardformat mit ruhigem Fugenbild.':
    'Nowoczesny format standardowy ze spokojnym układem fug.',
  'Rechteckiges Format für flexible Verlegemuster.':
    'Prostokątny format do elastycznych wzorów układania.',
  'Großformatig für wenige Fugen und eine ruhige Fläche.':
    'Wielki format zapewniający mniej fug i spokojną powierzchnię.',
  'Quadratisches Großformat mit 1,44 m² Fläche pro Fliese.':
    'Kwadratowy wielki format o powierzchni 1,44 m² na płytkę.',
  'Kleine Fliesen für Akzente, Nischen oder besondere Bereiche.':
    'Małe płytki na akcenty, nisze lub szczególne obszary.',
  'Die genaue Fliesengröße wird später entschieden.':
    'Dokładny rozmiar płytek zostanie ustalony później.',

  // Extras: Titel
  'Extras auswählen': 'Wybierz dodatkowe elementy',
  'Keine zusätzliche Ausstattung': 'Bez dodatkowego wyposażenia',

  // Extras: Beschreibungen
  'Einzelne Zusatzoptionen werden jetzt aktiv markiert.':
    'Poszczególne opcje dodatkowe są teraz aktywnie zaznaczane.',
  'Es sollen keine weiteren Extras aufgenommen werden.':
    'Nie mają zostać uwzględnione żadne dalsze dodatkowe elementy.',
  'Zusatzwünsche sind für den MVP noch offen.': 'Dodatkowe życzenia pozostają na razie otwarte.',

  // Extra-Optionen: Titel
  'Neue Beleuchtung': 'Nowe oświetlenie',
  'Spiegelschrank mit Licht': 'Szafka lustrzana z oświetleniem',
  'Zusätzliche Steckdosen': 'Dodatkowe gniazdka',
  'Lüfter / Abluft': 'Wentylator / wywiew powietrza',
  'Elektro & Anschlüsse im Fliesenbereich': 'Instalacja elektryczna i przyłącza w strefie płytek',

  // Extra-Optionen: Beschreibungen
  'Neue Decken-, Wand- oder Akzentbeleuchtung.': 'Nowe oświetlenie sufitowe, ścienne lub akcentujące.',
  'Stauraum mit integrierter Beleuchtung.': 'Przestrzeń do przechowywania ze zintegrowanym oświetleniem.',
  'Mehr Anschlussmöglichkeiten am Waschplatz oder im Raum.':
    'Więcej możliwości podłączenia przy umywalce lub w pomieszczeniu.',
  'Mechanische Entlüftung für Feuchte und Geruch.':
    'Wentylacja mechaniczna odprowadzająca wilgoć i zapachy.',
  'Zusätzliche Elektro-Anschlusspunkte für die weitere Detailplanung.':
    'Dodatkowe punkty przyłączy elektrycznych do dalszego planowania szczegółowego.',

  // Alter Belag: Titel
  'Ja, am Boden': 'Tak, na podłodze',
  'Ja, an den Wänden': 'Tak, na ścianach',
  'Ja, Boden und Wände': 'Tak, podłoga i ściany',
  Unklar: 'Niejasne',

  // Alter Belag: Beschreibungen
  'Ein alter Bodenbelag ist vorhanden.': 'Istnieje stara okładzina podłogi.',
  'Alte Wandbeläge sind vorhanden.': 'Istnieją stare okładziny ścienne.',
  'Boden und Wände haben alte Beläge.': 'Podłoga i ściany mają stare okładziny.',
  'Es ist kein alter Belag vorhanden.': 'Nie ma żadnej starej okładziny.',
  'Der Bestand muss noch geprüft werden.': 'Stan istniejący musi zostać jeszcze sprawdzony.',

  // Arbeitsstatus (Ja/Nein/Unklar): Beschreibungen
  'Die Position soll berücksichtigt werden.': 'Ta pozycja ma zostać uwzględniona.',
  'Die Position wird nicht berücksichtigt.': 'Ta pozycja nie zostanie uwzględniona.',
  'Die Entscheidung bleibt als offener Punkt sichtbar.':
    'Decyzja pozostaje widoczna jako punkt otwarty.',

  // Untergrund: Titel
  'Ja, eben und tragfähig': 'Tak, równe i nośne',
  'Kleine Ausbesserungen / Spachtelarbeiten nötig': 'Potrzebne drobne naprawy / szpachlowanie',
  'Stärkere Unebenheiten, Ausgleichsmasse nötig':
    'Większe nierówności, potrzebna masa wyrównująca',

  // Untergrund: Beschreibungen
  'Der vorhandene Untergrund ist für das Fliesenlegen geeignet.':
    'Istniejące podłoże nadaje się do układania płytek.',
  'Kleine Reparaturen werden als fliesenrelevante Vorarbeit berücksichtigt.':
    'Drobne naprawy są uwzględniane jako prace przygotowawcze związane z układaniem płytek.',
  'Ausgleichsmasse wird als fliesenrelevante Vorarbeit berücksichtigt.':
    'Masa wyrównująca jest uwzględniana jako prace przygotowawcze związane z układaniem płytek.',
  'Der vorhandene Untergrund muss vor der Fliesenverlegung geprüft werden.':
    'Istniejące podłoże musi zostać sprawdzone przed ułożeniem płytek.',

  // Leistungsumfang: Titel
  'Fliesenmaterial einbeziehen': 'Uwzględnij materiał płytek',
  'Verlegematerial einbeziehen': 'Uwzględnij materiały do układania',
  'Abdichtung einbeziehen': 'Uwzględnij hydroizolację',
  'Fliesensockel einbeziehen': 'Uwzględnij cokoły z płytek',
  'Werkzeug / Zubehör einbeziehen': 'Uwzględnij narzędzia / akcesoria',
  'Entsorgung einbeziehen': 'Uwzględnij utylizację',
  'Untergrundausgleich einbeziehen': 'Uwzględnij wyrównanie podłoża',

  // Leistungsumfang: Beschreibungen
  'Fliesen bleiben Teil der Schätzung.': 'Płytki pozostają częścią wyceny.',
  'Kleber, Fuge und ähnliche Materialien bleiben enthalten.':
    'Klej, fuga i podobne materiały pozostają uwzględnione.',
  'Abdichtmaterialien werden berücksichtigt.': 'Materiały hydroizolacyjne są uwzględniane.',
  'Sockelfliesen werden aufgenommen.': 'Płytki cokołowe są uwzględniane.',
  'Werkzeug und Zubehör bleiben enthalten.': 'Narzędzia i akcesoria pozostają uwzględnione.',
  'Entsorgung wird berücksichtigt.': 'Utylizacja jest uwzględniana.',
  'Ausgleichsarbeiten werden berücksichtigt.': 'Prace wyrównawcze są uwzględniane.'
};
