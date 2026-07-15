/**
 * Dynamische Übersetzungs-Keys für den Bereich Zusammenfassung
 * (summary-page, room-summary-contractor, cost-comparison, premium-export-button).
 *
 * Zweck: Keys, die zur Laufzeit über Variablen gerendert werden – z. B.
 * `...Object.values(LABEL_MAP)` oder `value | t` mit einem Variablen-Wert – und
 * die der Literal-Scan der Coverage-Spec (`'…' | t` / `t('…')`) NICHT sieht.
 *
 * Damit die Orphan-Prüfung solche Keys nicht als tot meldet, werden sie hier
 * gepflegt und von der Coverage-Spec in ihr `DYNAMIC_KEYS`-Array übernommen.
 * Jedes Übersetzungspaket pflegt NUR sein eigenes Modul.
 *
 * Herkunft der Einträge:
 * - `CostComparisonService.buildCostComparison()` (Berechnungsergebnis-Metadaten:
 *   die Strings BLEIBEN im Service deutsch, werden aber in summary-page/
 *   room-summary-contractor per `assumption | t` / `warning | t` / `group.label | t` /
 *   `comparison.savings.label | t` gerendert – also Variable, kein Literal).
 *   `COST_GROUPS`-Labels: 'Fliesenmaterial' … 'Sonstiges'. Die zwei eigenen Warnungen
 *   und die zwei `savings.label`-Varianten. Der DIY-Puffer-Assumption-String ist mit
 *   `DIY_COST_DEFAULTS.riskBufferPercent` (fixe Konstante = 10) komponiert – da der
 *   Wert zur Build-Zeit feststeht, wird der volle Satz "DIY-Puffer: 10 %" als
 *   statisches Template registriert (kein Split nötig).
 * - `RoomLimitService.hint` (aus `room-limit.service.ts`, außerhalb dieses Scopes):
 *   `HOBBY_MAX_ROOMS` ist ebenfalls eine fixe Konstante (= 5) → voll komponierter
 *   Satz als statisches Template registriert, Rendering über `roomLimitHint() | t`.
 * - `CROSS_DOMAIN_PROJECT_HINT` (aus `app-host.service.ts`, außerhalb dieses Scopes):
 *   Modul-Konstante, Rendering über `crossDomainProjectHint | t`.
 */
export const DYNAMIC_KEYS_SUMMARY: readonly string[] = [
  // --- CostComparisonService: COST_GROUPS-Labels (group.label | t) ---
  'Fliesenmaterial',
  'Verlegematerial',
  'Abdichtung',
  'Untergrundvorbereitung',
  'Werkzeug & Schutz',
  'Entsorgung',
  'Sonstiges',
  // --- CostComparisonService: eigene Warnungen (warning | t) ---
  'Die Materialliste wurde angepasst. Entfernte Positionen sind nicht in der aktuellen Schätzung enthalten.',
  'Fliesenmaterial wurde im Wizard ausgeschlossen und wird im Vergleich nicht eingerechnet.',
  // --- CostComparisonService: savings.label (comparison.savings.label | t) ---
  'Mögliche Ersparnis durch Eigenleistung',
  'Keine rechnerische Ersparnis',
  // --- CostComparisonService: eigene Assumptions (assumption | t) ---
  'DIY-Puffer: 10 %',
  'Profi-Materialkosten enthalten keine DIY-Werkzeuge, PSA oder Dokumentation.',
  // --- RoomLimitService.hint (roomLimitHint() | t), außerhalb dieses Scopes ---
  'Als Heimwerker kannst du bis zu 5 Räume pro Projekt anlegen.',
  // --- CROSS_DOMAIN_PROJECT_HINT (crossDomainProjectHint | t), außerhalb dieses Scopes ---
  'Dein lokal gespeichertes Projekt bleibt auf diesem Gerät unter fliesen-kosten.de verfügbar.'
];
