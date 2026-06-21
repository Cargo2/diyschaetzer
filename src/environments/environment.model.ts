/**
 * Form der App-Umgebungskonfiguration. Liegt bewusst in einer eigenen Datei,
 * damit der `fileReplacements`-Swap (environment.ts -> environment.development.ts)
 * den Typ nicht mit ersetzt.
 */
export interface AppEnvironment {
  production: boolean;
  supabase: {
    url: string;
    anonKey: string;
  };
}
