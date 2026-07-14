// Maschinell übersetzt – Muttersprachler-Review ausstehend.
// Neutral-professionelles Englisch. Deutsch-als-Schlüssel (linker Wert = deutscher Quelltext).
export const EN_WIZARD: Record<string, string> = {
  // Aussparungs-Typ-Labels (openingTypeLabel() + Select-Optionen)
  Tuer: 'Door',
  Fenster: 'Window',
  Nische: 'Niche',
  Sonstige: 'Other',

  // validationMessage()
  'Bitte wähle einen Raumtyp und gib einen Raumnamen ein.':
    'Please choose a room type and enter a room name.',
  'Bitte wähle eine Raumgröße zwischen 1,0 und 100,0 m².':
    'Please choose a room size between 1.0 and 100.0 m².',
  'Bitte entscheide dich für eine Waschplatz-Lösung.':
    'Please choose a washing area solution.',
  'Bitte wähle eine Option für Dusche und Badewanne.':
    'Please choose an option for shower and bathtub.',
  'Bitte wähle eine Heizlösung aus.': 'Please choose a heating solution.',
  'Bitte wähle eine WC-Option aus.': 'Please choose a toilet option.',
  'Bitte wähle Fliesenumfang, Fliesenqualität und Fliesengröße aus.':
    'Please choose tiling scope, tile quality, and tile size.',
  'Bitte wähle die Wand-Fliesengröße und prüfe die Wandangaben.':
    'Please choose the wall tile size and check the wall details.',
  'Bitte beantworte die sichtbaren Fragen zu Vorarbeiten und Untergrund. "Unklar" ist erlaubt.':
    'Please answer the visible questions about preparation and substrate. "Unclear" is allowed.',
  'Bitte wähle Extras aus oder markiere den Bereich als keine Zusatzleistung oder noch unklar.':
    'Please choose extras or mark this area as no additional work or still unclear.',

  // Hartkodierte Template-Strings
  Fortschritt: 'Progress',
  Raumname: 'Room name',
  'z. B. Bad OG oder Terrasse Südseite': 'e.g. upstairs bathroom or south terrace',
  Außenbereich: 'Outdoor area',
  'Liegt dieser Bereich im Freien, z. B. Terrasse, Balkon oder Außentreppe?':
    'Is this area outdoors, e.g. a terrace, balcony, or outdoor stairs?',
  'Frostsichere, witterungsbeständige Outdoor-Fliesen oder Feinsteinzeug-Terrassenplatten werden empfohlen. Achte außerdem auf Rutschhemmung, Gefälle und eine funktionierende Entwässerung.':
    'Frost-resistant, weatherproof outdoor tiles or porcelain stoneware terrace slabs are recommended. Also pay attention to slip resistance, slope, and proper drainage.',
  Raumgröße: 'Room size',
  'Direkt eingeben': 'Enter directly',
  '1,0 m²': '1.0 m²',
  '100,0 m²': '100.0 m²',
  Optional: 'Optional',
  'Soll ein Unterschrank berücksichtigt werden?': 'Should a vanity unit be included?',
  Zusatzfrage: 'Additional question',
  'Welche Dusche ist geplant?': 'Which shower is planned?',
  'Welche Badewanne ist geplant?': 'Which bathtub is planned?',
  'Welche Fliesenqualität möchtest du ungefähr?': 'Roughly what tile quality would you like?',
  'Welche Fliesengröße ist für den Boden geplant?': 'What tile size is planned for the floor?',
  Flaechenbasis: 'Area basis',
  'Waende und Teilbereiche': 'Walls and sections',
  'Bodenflaeche:': 'Floor area:',
  'Wand hinzufuegen': 'Add wall',
  'Welche Fliesengröße ist für die Wände geplant?': 'What tile size is planned for the walls?',
  'Noch keine Wand erfasst. Bei "Noch unklar" ist das optional; bei Wandfliesen kannst du hier einzelne Waende oder Bereiche hinzufuegen.':
    'No wall recorded yet. With "Still unclear" this is optional; for wall tiling you can add individual walls or sections here.',
  'Netto-Fliesenflaeche:': 'Net tile area:',
  'Wand entfernen': 'Remove wall',
  'Name der Wand': 'Wall name',
  'Breite der Wand in m': 'Wall width in m',
  'Wandhoehe in m': 'Wall height in m',
  'Bis zu welcher Hoehe soll gefliest werden?': 'Up to what height should tiling go?',
  'Die Fliesenhoehe darf nicht groesser als die Wandhoehe sein.':
    'The tile height must not exceed the wall height.',
  Aussparungen: 'Openings',
  'Aussparung hinzufuegen': 'Add opening',
  'Keine Aussparungen erfasst.': 'No openings recorded.',
  Typ: 'Type',
  'Breite in m': 'Width in m',
  'Hoehe in m': 'Height in m',
  'Aussparung entfernen': 'Remove opening',
  'Die Aussparungen sind groesser als die zu fliesende Wandflaeche.':
    'The openings are larger than the wall area to be tiled.',
  Bruttoflaeche: 'Gross area',
  'Netto-Fliesenflaeche': 'Net tile area',
  'Alter Belag': 'Existing covering',
  'Ist aktuell ein alter Boden- oder Wandbelag vorhanden?':
    'Is there currently an old floor or wall covering?',
  Rückbau: 'Removal',
  'Soll der alte Belag entfernt werden?': 'Should the old covering be removed?',
  'Das Überfliesen vorhandener Beläge ist nicht immer möglich. Der Untergrund muss tragfähig, eben und geeignet sein.':
    'Tiling over existing coverings is not always possible. The substrate must be load-bearing, level, and suitable.',
  Sanitärobjekte: 'Sanitary fixtures',
  'Müssen alte Sanitärobjekte entfernt werden?': 'Do old sanitary fixtures need to be removed?',
  Untergrund: 'Substrate',
  'Ist der vorhandene Untergrund für das Fliesenlegen geeignet?':
    'Is the existing substrate suitable for tiling?',
  Grundierung: 'Primer',
  'Soll eine Grundierung berücksichtigt werden?': 'Should a primer be included?',
  Entsorgung: 'Disposal',
  'Soll Entsorgung berücksichtigt werden?': 'Should disposal be included?',
  'Für Nassbereiche wie Dusche oder Badewanne wird eine Abdichtung berücksichtigt.':
    'For wet areas such as showers or bathtubs, waterproofing is included.',
  Zurück: 'Back',
  'Zur Zusammenfassung': 'To the summary',
  Weiter: 'Next',

  // Wizard-Schritte: Eyebrows
  'Schritt 1 von 12': 'Step 1 of 12',
  'Schritt 2 von 12': 'Step 2 of 12',
  'Schritt 3 von 12': 'Step 3 of 12',
  'Schritt 4 von 12': 'Step 4 of 12',
  'Schritt 5 von 12': 'Step 5 of 12',
  'Schritt 6 von 12': 'Step 6 of 12',
  'Schritt 7 von 12': 'Step 7 of 12',
  'Schritt 8 von 12': 'Step 8 of 12',
  'Schritt 9 von 12': 'Step 9 of 12',
  'Schritt 10 von 12': 'Step 10 of 12',
  'Schritt 11 von 12': 'Step 11 of 12',
  'Schritt 12 von 12': 'Step 12 of 12',

  // Wizard-Schritte: Titel
  'Welchen Raum oder Bereich möchtest du fliesen?': 'Which room or area do you want to tile?',
  'Wie groß ist der Raum oder Bereich?': 'How large is the room or area?',
  'Welche Waschplatz-Lösung möchtest du?': 'Which washing area solution would you like?',
  'Was soll eingebaut werden?': 'What should be installed?',
  'Welche Heizlösung möchtest du?': 'Which heating solution would you like?',
  'Soll ein WC eingeplant werden?': 'Should a toilet be planned?',
  'Welche Bereiche sollen gefliest werden?': 'Which areas should be tiled?',
  'Wandflaechen erfassen': 'Record wall areas',
  'Vorarbeiten & Untergrund': 'Preparation & substrate',
  'Leistungsumfang & Ausschlüsse': 'Scope of work & exclusions',
  'Welche zusätzliche Ausstattung soll berücksichtigt werden?':
    'What additional features should be included?',
  'Zusammenfassung und Annahmen': 'Summary and assumptions',

  // Wizard-Schritte: Beschreibungen
  'Wähle den Raumtyp und vergib einen eindeutigen Namen für diese Kalkulation.':
    'Choose the room type and give this calculation a unique name.',
  'Nutze den Slider für eine erste Grobplanung zwischen 1,0 und 100,0 m².':
    'Use the slider for an initial rough estimate between 1.0 and 100.0 m².',
  'Wähle die passende Lösung für den Waschbereich.':
    'Choose the right solution for the washing area.',
  'Definiere, ob Dusche, Badewanne oder eine Kombination geplant ist.':
    'Define whether a shower, bathtub, or a combination is planned.',
  'Wähle die gewünschte Heizoption für den neuen Badkomfort.':
    'Choose the desired heating option for the new bathroom comfort.',
  'Lege fest, welche WC-Variante in die Planung gehort.':
    'Specify which toilet variant belongs in the plan.',
  'Erfasse Fliesenumfang und die ungefähr gewünschte Materialqualität.':
    'Record the tiling scope and the approximate desired material quality.',
  'Fuege hier die Waende oder Teilbereiche hinzu, die gefliest werden sollen. Du kannst jede Wand einzeln benennen und die Masse anpassen.':
    'Add the walls or sections to be tiled here. You can name each wall individually and adjust the dimensions.',
  'Kläre Rückbau, vorhandenen Untergrund, Grundierung, Abdichtung und Entsorgung.':
    'Clarify removal, existing substrate, primer, waterproofing, and disposal.',
  'Lege fest, welche Positionen in der späteren Schätzung enthalten sein sollen.':
    'Specify which items should be included in the later estimate.',
  'Wähle einzelne Extras aus oder markiere den Bereich als offen.':
    'Choose individual extras or mark this area as open.',
  'Prüfe alle Angaben und öffne anschließend die JSON-Ausgabe im Menü.':
    'Check all details and then open the JSON output in the menu.',

  // Raumtyp: Titel
  Bad: 'Bathroom',
  'Gäste-WC': 'Guest toilet',
  Küche: 'Kitchen',
  Flur: 'Hallway',
  Wohnraum: 'Living area',
  Keller: 'Basement',
  Hauswirtschaftsraum: 'Utility room',
  'Terrasse / Balkon': 'Terrace / balcony',
  'Anderer Raum': 'Other room',

  // Raumtyp: Beschreibungen
  'Bad mit optionalen Sanitär- und Nassbereichsfragen.':
    'Bathroom with optional sanitary and wet-area questions.',
  'Kompakter Sanitärraum mit passenden Zusatzfragen.':
    'Compact sanitary room with matching additional questions.',
  'Boden und optionaler Fliesenspiegel oder Wandbereich.':
    'Floor and optional tile splashback or wall area.',
  'Robuste Bodenfläche mit optionalen Sockeln.': 'Robust floor area with optional skirting tiles.',
  'Wohnbereich mit Boden- und optionalen Wandfliesen.':
    'Living area with floor and optional wall tiles.',
  'Kellerfläche mit Fokus auf Untergrund und Boden.':
    'Basement area with focus on substrate and floor.',
  'Nutzraum mit Boden- und optionalen Wandflächen.':
    'Utility area with floor and optional wall areas.',
  'Außenbereich mit Frost-, Gefälle- und Entwässerungshinweisen.':
    'Outdoor area with notes on frost resistance, slope, and drainage.',
  'Freie Raumbezeichnung mit allgemeiner Fliesenplanung.':
    'Free-form room name with general tiling planning.',

  // Waschplatz: Titel
  Einzelwaschtisch: 'Single vanity',
  Doppelwaschtisch: 'Double vanity',
  'Zwei separate Waschbecken': 'Two separate washbasins',
  'Kein Waschbecken': 'No washbasin',

  // Waschplatz: Beschreibungen
  'Klassische Lösung für kompakte oder mittelgroße Bäder.':
    'Classic solution for compact or medium-sized bathrooms.',
  'Gemeinsamer Waschplatz mit zwei Armaturen an einem Möbel.':
    'Shared washing area with two fittings on one unit.',
  'Getrennte Waschplätze für mehr Flexibilität in der Raumaufteilung.':
    'Separate washing areas for more flexibility in the room layout.',
  'Falls kein Waschplatz vorgesehen ist oder später entschieden wird.':
    'If no washing area is planned or the decision is made later.',

  // Ja / Nein / Noch unklar (mehrfach genutzt)
  Ja: 'Yes',
  Nein: 'No',
  'Noch unklar': 'Still unclear',

  // Unterschrank: Beschreibungen
  'Ein Unterschrank soll direkt mitgedacht werden.':
    'A vanity unit should be planned in from the start.',
  'Der Waschplatz wird ohne Unterschrank geplant.':
    'The washing area is planned without a vanity unit.',
  'Die Entscheidung soll erst in einer späteren Phase fallen.':
    'The decision will be made at a later stage.',

  // Dusche/Badewanne: Titel
  'Nur Dusche': 'Shower only',
  'Nur Badewanne': 'Bathtub only',
  'Dusche und Badewanne': 'Shower and bathtub',
  Duschbadewanne: 'Shower-bath combination',
  'Weder Dusche noch Badewanne': 'Neither shower nor bathtub',

  // Dusche/Badewanne: Beschreibungen
  'Fokus auf eine reine Duschlösung.': 'Focus on a pure shower solution.',
  'Es wird ausschliesslich eine Badewanne eingeplant.': 'Only a bathtub is planned.',
  'Beide Elemente sind separat vorgesehen.': 'Both elements are planned separately.',
  'Eine kombinierte Lösung für kompaktere Grundrisse.':
    'A combined solution for more compact floor plans.',
  'Für Sonderfälle wie ein reines WC oder Gästebad.':
    'For special cases such as a toilet-only room or guest bathroom.',

  // Duschart: Titel
  'Standard-Duschkabine': 'Standard shower cabin',
  'Bodengleiche Dusche': 'Walk-in floor-level shower',
  'Walk-in-Dusche': 'Walk-in shower',

  // Duschart: Beschreibungen
  'Klassische Kabine mit klarer Trennung zum restlichen Raum.':
    'Classic cabin with a clear separation from the rest of the room.',
  'Barrierearme Lösung mit flachem Einstieg.': 'Low-barrier solution with a flat entry.',
  'Offene, moderne Dusche mit großzügigem Einstieg.':
    'Open, modern shower with a generous entry.',
  'Die Duschart ist für den MVP noch offen.': 'The shower type is still open for the MVP.',

  // Wannenart: Titel
  'Standard-Badewanne': 'Standard bathtub',
  'Freistehende Badewanne': 'Freestanding bathtub',
  Eckbadewanne: 'Corner bathtub',

  // Wannenart: Beschreibungen
  'Die klassische Einbaulösung für viele Grundrisse.':
    'The classic built-in solution for many floor plans.',
  'Designorientierte Variante mit hoher Raumwirkung.':
    'Design-focused variant with a strong visual impact.',
  'Spezielle Form zur Raumnutzung in Ecken.': 'Special shape to make use of corner space.',
  'Die genaue Wannenart ist noch nicht festgelegt.':
    'The exact bathtub type has not yet been decided.',

  // Heizung: Titel
  'Nur Fußbodenheizung': 'Underfloor heating only',
  'Nur Handtuchheizkörper': 'Towel radiator only',
  'Fußbodenheizung und Handtuchheizkörper': 'Underfloor heating and towel radiator',
  'Keine neue Heizung': 'No new heating',

  // Heizung: Beschreibungen
  'Flächenwärme für hohen Komfort und freie Wandflächen.':
    'Radiant floor heat for high comfort and free wall space.',
  'Kompakte Zusatzheizung mit Platz für Handtücher.':
    'Compact supplementary heating with space for towels.',
  'Die MVP-Variante für die Kombination beider Systeme.': 'The MVP variant combining both systems.',
  'Die vorhandene Heizsituation bleibt unberuhrt.': 'The existing heating setup remains unchanged.',
  'Die Heizungsfrage wird später entschieden.': 'The heating question will be decided later.',

  // WC: Titel
  'Wand-WC': 'Wall-hung toilet',
  'Stand-WC': 'Floor-standing toilet',
  'Dusch-WC': 'Shower toilet',
  'Kein WC': 'No toilet',

  // WC: Beschreibungen
  'Moderne, pflegeleichte Lösung mit Unterputztechnik.':
    'Modern, low-maintenance solution with concealed installation.',
  'Klassische Aufstellung direkt auf dem Boden.': 'Classic installation directly on the floor.',
  'Komfortoption mit integrierter Reinigungsfunktion.':
    'Comfort option with an integrated cleaning function.',
  'Für Badkonzepte ohne Toilette im Raum.': 'For bathroom concepts without a toilet in the room.',
  'Die Entscheidung zur WC-Art ist noch offen.': 'The decision on the toilet type is still open.',

  // Fliesenumfang: Titel
  'Nur Boden': 'Floor only',
  'Boden und Wände teilweise': 'Floor and walls partially',
  'Boden und Wände vollständig': 'Floor and walls completely',
  'Nur bestimmte Bereiche': 'Specific areas only',

  // Fliesenumfang: Beschreibungen
  'Es wird ausschließlich der Fußboden gefliest.': 'Only the floor is tiled.',
  'Typische Lösung mit Teilverfliesung an ausgewählten Flächen.':
    'Typical solution with partial tiling on selected areas.',
  'Umfassende Verfliesung für ein homogenes Erscheinungsbild.':
    'Comprehensive tiling for a uniform appearance.',
  'Zum Beispiel nur in der Dusche oder an einzelnen Zonen.':
    'For example only in the shower or in individual zones.',
  'Der Fliesenumfang wird später festgelegt.': 'The tiling scope will be defined later.',

  // Fliesenqualität: Titel
  'Einfach / günstig': 'Basic / budget',
  Mittel: 'Medium',
  Hochwertig: 'High-quality',

  // Fliesenqualität: Beschreibungen
  'Preisbewusste Auswahl mit funktionalem Anspruch.':
    'Price-conscious choice with a functional focus.',
  'Ausgewogene Wahl aus Preis und Qualität.': 'Balanced choice of price and quality.',
  'Deutlich höhere Material- und Oberflächenanmutung.':
    'Noticeably higher material and surface quality.',
  'Anspruchsvolle Design- und Materialqualität.': 'Sophisticated design and material quality.',
  'Die genaue Fliesenqualität ist noch offen.': 'The exact tile quality is still open.',

  // Fliesengröße: Titel
  '30 x 30 cm': '30 x 30 cm',
  '60 x 60 cm': '60 x 60 cm',
  '30 x 60 cm': '30 x 60 cm',
  '60 x 120 cm': '60 x 120 cm',
  '120 x 120 cm': '120 x 120 cm',
  Mosaik: 'Mosaic',

  // Fliesengröße: Beschreibungen
  'Kompaktes Format für kleinere Flächen oder klassische Raster.':
    'Compact format for smaller areas or classic grid layouts.',
  'Modernes Standardformat mit ruhigem Fugenbild.':
    'Modern standard format with a calm grout pattern.',
  'Rechteckiges Format für flexible Verlegemuster.':
    'Rectangular format for flexible laying patterns.',
  'Großformatig für wenige Fugen und eine ruhige Fläche.':
    'Large-format for fewer grout lines and a calm surface.',
  'Quadratisches Großformat mit 1,44 m² Fläche pro Fliese.':
    'Square large-format tile with 1.44 m² area per tile.',
  'Kleine Fliesen für Akzente, Nischen oder besondere Bereiche.':
    'Small tiles for accents, niches, or special areas.',
  'Die genaue Fliesengröße wird später entschieden.': 'The exact tile size will be decided later.',

  // Extras: Titel
  'Extras auswählen': 'Select extras',
  'Keine zusätzliche Ausstattung': 'No additional features',

  // Extras: Beschreibungen
  'Einzelne Zusatzoptionen werden jetzt aktiv markiert.':
    'Individual extra options are now actively selected.',
  'Es sollen keine weiteren Extras aufgenommen werden.': 'No further extras should be included.',
  'Zusatzwünsche sind für den MVP noch offen.': 'Additional requests are still open for the MVP.',

  // Extra-Optionen: Titel
  'Neue Beleuchtung': 'New lighting',
  'Spiegelschrank mit Licht': 'Mirror cabinet with light',
  'Zusätzliche Steckdosen': 'Additional power outlets',
  'Lüfter / Abluft': 'Fan / extraction',
  'Elektro & Anschlüsse im Fliesenbereich': 'Electrics & connections in the tiled area',

  // Extra-Optionen: Beschreibungen
  'Neue Decken-, Wand- oder Akzentbeleuchtung.': 'New ceiling, wall, or accent lighting.',
  'Stauraum mit integrierter Beleuchtung.': 'Storage space with integrated lighting.',
  'Mehr Anschlussmöglichkeiten am Waschplatz oder im Raum.':
    'More connection options at the washing area or in the room.',
  'Mechanische Entlüftung für Feuchte und Geruch.': 'Mechanical ventilation for moisture and odor.',
  'Zusätzliche Elektro-Anschlusspunkte für die weitere Detailplanung.':
    'Additional electrical connection points for further detailed planning.',

  // Alter Belag: Titel
  'Ja, am Boden': 'Yes, on the floor',
  'Ja, an den Wänden': 'Yes, on the walls',
  'Ja, Boden und Wände': 'Yes, floor and walls',
  Unklar: 'Unclear',

  // Alter Belag: Beschreibungen
  'Ein alter Bodenbelag ist vorhanden.': 'An old floor covering is present.',
  'Alte Wandbeläge sind vorhanden.': 'Old wall coverings are present.',
  'Boden und Wände haben alte Beläge.': 'Floor and walls have old coverings.',
  'Es ist kein alter Belag vorhanden.': 'There is no old covering present.',
  'Der Bestand muss noch geprüft werden.': 'The existing condition still needs to be checked.',

  // Arbeitsstatus (Ja/Nein/Unklar): Beschreibungen
  'Die Position soll berücksichtigt werden.': 'This item should be included.',
  'Die Position wird nicht berücksichtigt.': 'This item is not included.',
  'Die Entscheidung bleibt als offener Punkt sichtbar.':
    'The decision remains visible as an open item.',

  // Untergrund: Titel
  'Ja, eben und tragfähig': 'Yes, level and load-bearing',
  'Kleine Ausbesserungen / Spachtelarbeiten nötig': 'Minor repairs / filling work needed',
  'Stärkere Unebenheiten, Ausgleichsmasse nötig':
    'More significant unevenness, leveling compound needed',

  // Untergrund: Beschreibungen
  'Der vorhandene Untergrund ist für das Fliesenlegen geeignet.':
    'The existing substrate is suitable for tiling.',
  'Kleine Reparaturen werden als fliesenrelevante Vorarbeit berücksichtigt.':
    'Minor repairs are included as tiling-relevant preparation.',
  'Ausgleichsmasse wird als fliesenrelevante Vorarbeit berücksichtigt.':
    'Leveling compound is included as tiling-relevant preparation.',
  'Der vorhandene Untergrund muss vor der Fliesenverlegung geprüft werden.':
    'The existing substrate must be checked before tiling.',

  // Leistungsumfang: Titel
  'Fliesenmaterial einbeziehen': 'Include tile material',
  'Verlegematerial einbeziehen': 'Include installation materials',
  'Abdichtung einbeziehen': 'Include waterproofing',
  'Fliesensockel einbeziehen': 'Include tile skirting',
  'Werkzeug / Zubehör einbeziehen': 'Include tools / accessories',
  'Entsorgung einbeziehen': 'Include disposal',
  'Untergrundausgleich einbeziehen': 'Include substrate leveling',

  // Leistungsumfang: Beschreibungen
  'Fliesen bleiben Teil der Schätzung.': 'Tiles remain part of the estimate.',
  'Kleber, Fuge und ähnliche Materialien bleiben enthalten.':
    'Adhesive, grout, and similar materials remain included.',
  'Abdichtmaterialien werden berücksichtigt.': 'Waterproofing materials are included.',
  'Sockelfliesen werden aufgenommen.': 'Skirting tiles are included.',
  'Werkzeug und Zubehör bleiben enthalten.': 'Tools and accessories remain included.',
  'Entsorgung wird berücksichtigt.': 'Disposal is included.',
  'Ausgleichsarbeiten werden berücksichtigt.': 'Leveling work is included.'
};
