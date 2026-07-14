import { computed, inject, Injectable, signal } from '@angular/core';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { SignupRole, UserProfile } from '../models/auth.model';
import { PlanType, UserRole } from '../models/commercial.model';
import { SUPABASE_CLIENT } from '../data-access/supabase-client';

/** Rohform einer `profiles`-Zeile. */
interface ProfileRow {
  id: string;
  role: UserRole;
  plan: PlanType;
  display_name: string | null;
}

/**
 * Kapselt die Supabase-Authentifizierung. Stellt Session + Profil (Rolle/Plan)
 * als Signals bereit; ist Supabase nicht konfiguriert (Client = null), verhält
 * sich der Service als „anonym" und die App läuft offline wie bisher.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly client = inject(SUPABASE_CLIENT);

  private readonly sessionSig = signal<Session | null>(null);
  private readonly profileSig = signal<UserProfile | null>(null);
  private readonly initializingSig = signal(true);

  /** User-ID des aktuell geladenen Profils – verhindert Neuladen bei gleichbleibendem User. */
  private loadedUserId: string | null = null;
  /** Laufender Profil-Ladevorgang (in-flight) zur Deduplizierung paralleler Events. */
  private inFlightUserId: string | null = null;
  private inFlight: Promise<void> | null = null;

  readonly session = this.sessionSig.asReadonly();
  readonly profile = this.profileSig.asReadonly();
  /** `true`, solange die initiale Session-Prüfung läuft. */
  readonly initializing = this.initializingSig.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSig() !== null);
  readonly userEmail = computed(() => this.sessionSig()?.user.email ?? null);
  /** `true`, wenn ein angemeldeter Nutzer die Rolle Profi (`contractor`) hat. */
  readonly isContractor = computed(() => this.profileSig()?.role === 'contractor');
  /** `true`, wenn überhaupt ein Supabase-Backend konfiguriert ist. */
  readonly isConfigured = this.client !== null;
  /** Auflösbar, sobald die initiale Session-/Profilprüfung abgeschlossen ist. */
  readonly ready: Promise<void>;

  constructor() {
    if (!this.client) {
      this.initializingSig.set(false);
      this.ready = Promise.resolve();
      return;
    }
    this.ready = this.initialize(this.client);
    this.client.auth.onAuthStateChange((_event, session) => {
      this.sessionSig.set(session);
      void this.loadProfile(session);
    });
  }

  async signUp(
    email: string,
    password: string,
    role: SignupRole,
    displayName?: string
  ): Promise<{ needsEmailConfirmation: boolean }> {
    const client = this.requireClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { role, display_name: displayName ?? null },
        // Bestätigungs-Mail zurück auf DIESEN Origin (nicht auf die künftige
        // Supabase-Site-URL, sonst landen alle Signups auf der falschen Domain).
        // SSR-sicher: `location` existiert im Build nicht; signUp läuft nur im Browser.
        emailRedirectTo: globalThis.location ? globalThis.location.origin + '/login' : undefined
      }
    });
    if (error) {
      throw error;
    }
    // Ohne aktive Session (data.session == null) ist eine E-Mail-Bestätigung nötig.
    return { needsEmailConfirmation: data.session === null };
  }

  async signIn(email: string, password: string): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  }

  /**
   * Startet den Google-OAuth-Login (PKCE). Start UND Rückkehr müssen auf demselben
   * Origin liegen – der PKCE-Verifier liegt per-Origin im localStorage –, daher
   * `redirectTo` immer auf `<origin>/login`. Der Browser navigiert weg; Fehler
   * werden geworfen und in der Komponente humanisiert.
   */
  async signInWithGoogle(): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: (globalThis.location?.origin ?? '') + '/login' }
    });
    if (error) {
      throw error;
    }
  }

  /**
   * Einmaliger Rollen-Anspruch customer→contractor für frisch per Google
   * registrierte Profis (RPC `claim_contractor_role`, Migration 0022). Der RPC
   * setzt die harten Prüfungen serverseitig durch (15-Min-Fenster, nur OAuth-
   * Signups ohne role-Metadatum). Gibt `true` bei Erfolg zurück; Fehler werden
   * NICHT geworfen, nur geloggt und als `false` gemeldet.
   */
  async claimContractorRole(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    const { error } = await this.client.rpc('claim_contractor_role');
    if (error) {
      console.warn('[auth] claim_contractor_role fehlgeschlagen:', error.message);
      return false;
    }
    return true;
  }

  /**
   * Erzwingt ein Neuladen des Profils zur aktuellen Session (z. B. nach einem
   * Rollen-Anspruch). Invalidiert den Dedup-Cache, damit `fetchProfile`
   * tatsächlich erneut liest.
   */
  async refreshProfile(): Promise<void> {
    const session = this.sessionSig();
    if (!session || !this.client) {
      return;
    }
    this.loadedUserId = null;
    this.inFlightUserId = null;
    this.inFlight = null;
    await this.loadProfile(session);
  }

  async signOut(): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
    this.sessionSig.set(null);
    this.profileSig.set(null);
    this.loadedUserId = null;
    this.inFlightUserId = null;
    this.inFlight = null;
  }

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Authentifizierung nicht verfügbar: Supabase ist nicht konfiguriert.');
    }
    return this.client;
  }

  private async initialize(client: SupabaseClient): Promise<void> {
    try {
      const { data } = await client.auth.getSession();
      this.sessionSig.set(data.session);
      await this.loadProfile(data.session);
    } finally {
      this.initializingSig.set(false);
    }
  }

  /**
   * Lädt das Profil zur Session. `onAuthStateChange` feuert mehrfach pro Seitenladen
   * (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, Fensterfokus …); daher wird nur bei
   * tatsächlichem User-Wechsel neu geladen und ein laufender Ladevorgang dedupliziert,
   * statt pro Event einen identischen `profiles`-Call abzusetzen.
   */
  private loadProfile(session: Session | null): Promise<void> {
    if (!session || !this.client) {
      this.loadedUserId = null;
      this.inFlightUserId = null;
      this.inFlight = null;
      this.profileSig.set(null);
      return Promise.resolve();
    }
    const userId = session.user.id;
    // Profil zu diesem User bereits geladen → kein erneuter DB-Call.
    if (userId === this.loadedUserId) {
      return Promise.resolve();
    }
    // Ladevorgang für denselben User bereits unterwegs → dessen Promise teilen.
    if (this.inFlight && userId === this.inFlightUserId) {
      return this.inFlight;
    }
    this.inFlightUserId = userId;
    this.inFlight = this.fetchProfile(session).finally(() => {
      if (this.inFlightUserId === userId) {
        this.inFlightUserId = null;
        this.inFlight = null;
      }
    });
    return this.inFlight;
  }

  private async fetchProfile(session: Session): Promise<void> {
    const { data } = await this.requireClient()
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    const row = data as ProfileRow | null;
    this.profileSig.set(
      row
        ? { id: row.id, role: row.role, plan: row.plan, displayName: row.display_name }
        : // Fallback, falls der handle_new_user-Trigger noch nicht durch ist.
          { id: session.user.id, role: 'customer', plan: 'free', displayName: null }
    );
    this.loadedUserId = session.user.id;
  }
}
