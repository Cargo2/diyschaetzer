/**
 * Produktions-Defaults. Echte Werte werden NICHT eingecheckt – sie werden
 * im Deploy gesetzt bzw. lokal in environment.development.ts hinterlegt.
 *
 * Hinweis: Der Supabase-`anonKey` ist per Design öffentlich (RLS schützt die
 * Daten). Wir halten ihn dennoch aus dem Repo, solange das Backend nicht
 * produktiv verdrahtet ist.
 */
import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  supabase: {
    url: '',
    anonKey: ''
  }
};
