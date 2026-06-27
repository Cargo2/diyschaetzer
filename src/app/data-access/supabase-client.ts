import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  factory: () => {
    // Beim Prerendering (Server/Node) keinen Supabase-Client erzeugen. Sonst würde
    // der Bootstrap (AuthService, Katalog) Auth-/WebSocket-/Netzwerkaufrufe im Build
    // auslösen – das scheitert u. a. unter Node 20 ("ohne native WebSocket support").
    // Mit null läuft die App im anonymen Offline-Modus (gebündelter Katalog); die
    // prerenderten Inhaltsseiten brauchen weder DB noch Auth.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return null;
    }
    return createSupabaseClient();
  }
});
