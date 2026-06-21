import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Liefert einen konfigurierten Supabase-Client – oder `null`, wenn keine
 * Zugangsdaten gesetzt sind. Solange `null`, bleibt der localStorage-Adapter
 * aktiv (siehe app.config.ts) und die App funktioniert offline weiter.
 */
export function createSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = environment.supabase;
  if (!url || !anonKey) {
    return null;
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient | null>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: createSupabaseClient
});
