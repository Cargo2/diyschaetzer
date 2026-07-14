import { Injectable, signal } from '@angular/core';

/**
 * Gemeinsamer PLZ-Zustand für den unteren Lead-Bereich der Zusammenfassung. Die
 * im Lead-Formular eingegebene PLZ liegt hier zentral, damit ein späteres
 * Betriebe-Verzeichnis dieselbe PLZ vorbefüllen kann (und umgekehrt) – der Nutzer
 * tippt sie nur einmal. Bewusst ein winziger Signal-Container ohne Persistenz.
 */
@Injectable({ providedIn: 'root' })
export class LeadRegionService {
  /** Aktuelle PLZ, geteilt zwischen Verzeichnis-Sektion und Lead-Formular. */
  readonly postalCode = signal('');
}
