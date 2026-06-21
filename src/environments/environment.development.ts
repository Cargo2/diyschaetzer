import { AppEnvironment } from './environment.model';

/**
 * Lokale Entwicklungswerte. Hier deine Supabase-Daten eintragen
 * (Project Settings -> API): `url` = Project URL, `anonKey` = anon/public key.
 *
 * Solange leer, bleibt der localStorage-Adapter aktiv (siehe app.config.ts).
 */
export const environment: AppEnvironment = {
  production: false,
  supabase: {
    url: '',
    anonKey: ''
  }
};
