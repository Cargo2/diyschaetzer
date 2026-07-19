import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { SignupRole } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';
import { AppHostService } from '../../services/app-host.service';

type AuthMode = 'login' | 'register' | 'reset';

/**
 * sessionStorage-Schlüssel für das Weiter-Ziel. Muss die E-Mail-Bestätigung
 * überleben (Registrieren → Mail bestätigen → erneut anmelden → Ziel), daher
 * nicht nur im Query-Param/Signal gehalten.
 */
const REDIRECT_STORAGE_KEY = 'auth_redirect_target';

/**
 * sessionStorage-Schlüssel für die bei der Google-Registrierung gewählte Rolle.
 * Muss den OAuth-Redirect (weg zu Google und zurück) überleben, weil die Rolle
 * bei OAuth nicht als Signup-Metadatum ankommt und nach der Rückkehr über den
 * einmaligen Rollen-Anspruch nachgezogen wird.
 */
const SIGNUP_ROLE_STORAGE_KEY = 'auth_signup_role';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css'
})
export class AuthPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly appHost = inject(AppHostService);

  readonly isConfigured = this.auth.isConfigured;
  readonly mode = signal<AuthMode>('login');
  readonly role = signal<SignupRole>('customer');
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly infoMsg = signal<string | null>(null);
  /** Internes Weiter-Ziel nach erfolgreichem Login (z. B. `/konto/premium`). */
  readonly redirectTarget = signal<string | null>(null);
  /** `true`, sobald das Passwort-Bestätigen-Feld (Register-Tab) berührt wurde. */
  readonly confirmTouched = signal(false);

  email = '';
  password = '';
  passwordConfirm = '';
  displayName = '';

  /**
   * Wertet die Deep-Link-Query-Parameter aus:
   * `modus=registrieren` → Registrieren-Tab, `rolle=betrieb` → Rolle Betrieb
   * vorausgewählt, `weiter=<pfad>` → Ziel nach der Anmeldung (überlebt die
   * E-Mail-Bestätigung via sessionStorage).
   */
  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('modus') === 'registrieren') {
      this.mode.set('register');
    }
    if (params.get('rolle') === 'betrieb') {
      this.role.set('contractor');
    }
    const target = this.sanitizeRedirect(params.get('weiter'));
    if (target) {
      this.redirectTarget.set(target);
      this.storeRedirect(target);
    } else {
      // Kein Query-Ziel: ein zuvor gespeichertes (vor der E-Mail-Bestätigung) übernehmen.
      const stored = this.readRedirect();
      if (stored) {
        this.redirectTarget.set(stored);
      }
    }

    await this.handleAuthenticatedEntry(params);
  }

  /**
   * Nach OAuth-Rückkehr ODER wenn `/login` trotz bestehender Anmeldung besucht
   * wird: sobald eine Session vorliegt, den Rollen-Anspruch (falls Google-Signup
   * als Betrieb) auslösen und weiterleiten.
   */
  private async handleAuthenticatedEntry(params: ParamMap): Promise<void> {
    if (!this.isConfigured) {
      return;
    }
    // Nutzer-Abbruch auf dem Google-Consent-Screen kommt als `?error=` zurück –
    // still behandeln (keine Fehlermeldung), Seite normal anzeigen.
    if (params.get('error')) {
      return;
    }

    await this.auth.ready;

    // detectSessionInUrl tauscht den `?code=` asynchron (ggf. erst nach `ready`
    // per onAuthStateChange). Bei OAuth-Rückkehr kurz auf die Session warten;
    // Timeout-Fallback zeigt die Seite normal an.
    if (!this.auth.isAuthenticated() && params.get('code')) {
      await this.waitForAuthenticated();
    }
    if (!this.auth.isAuthenticated()) {
      return;
    }

    // Bewusst als Betrieb per Google registriert? Rolle einmalig nachziehen.
    const signupRole = this.consumeSignupRole();
    if (signupRole === 'contractor' && this.auth.profile()?.role === 'customer') {
      const claimed = await this.auth.claimContractorRole();
      if (claimed) {
        await this.auth.refreshProfile();
      } else {
        this.infoMsg.set(
          'Dein Konto wurde als Heimwerker angelegt. Melde dich über Feedback/Kontakt, ' +
            'wenn du auf Betrieb umstellen möchtest.'
        );
      }
    }

    await this.router.navigateByUrl(this.consumeRedirect() ?? this.defaultTarget());
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    // Bestätigungsfeld/-fehler beim Tab-Wechsel zurücksetzen.
    this.passwordConfirm = '';
    this.confirmTouched.set(false);
  }

  /** Startet den Google-OAuth-Login. Auf dem Register-Tab wird die gewählte Rolle
   *  zwischengespeichert, damit sie nach der Rückkehr nachgezogen werden kann. */
  async signInWithGoogle(): Promise<void> {
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    if (this.mode() === 'register') {
      this.storeSignupRole(this.role());
    } else {
      this.clearSignupRole();
    }
    this.loading.set(true);
    try {
      await this.auth.signInWithGoogle();
      // Erfolg → Browser navigiert zu Google; `loading` bleibt bis zum Wegnavigieren.
    } catch (error) {
      this.loading.set(false);
      this.errorMsg.set(this.humanize(error));
    }
  }

  /**
   * Fordert die Passwort-Reset-Mail an („Passwort vergessen?"). Die Erfolgs-
   * meldung ist bewusst neutral (kein Hinweis, ob das Konto existiert).
   */
  async requestReset(): Promise<void> {
    this.errorMsg.set(null);
    this.infoMsg.set(null);
    if (!this.email) {
      this.errorMsg.set('Bitte E-Mail-Adresse angeben.');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.requestPasswordReset(this.email);
      this.infoMsg.set(
        'Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum ' +
          'Zurücksetzen des Passworts geschickt. Bitte prüfe auch den Spam-Ordner.'
      );
    } catch (error) {
      this.errorMsg.set(this.humanize(error));
    } finally {
      this.loading.set(false);
    }
  }

  /** `true`, wenn im Register-Tab Passwort und Bestätigung nicht übereinstimmen. */
  get passwordsMismatch(): boolean {
    return this.mode() === 'register' && this.password !== this.passwordConfirm;
  }

  /** Inline-Fehler nur zeigen, wenn das Feld berührt wurde und nicht übereinstimmt. */
  showConfirmError(): boolean {
    return this.confirmTouched() && this.passwordsMismatch;
  }

  async submit(): Promise<void> {
    this.errorMsg.set(null);
    this.infoMsg.set(null);

    if (!this.email || !this.password) {
      this.errorMsg.set('Bitte E-Mail und Passwort angeben.');
      return;
    }

    if (this.mode() === 'register' && this.password !== this.passwordConfirm) {
      this.confirmTouched.set(true);
      this.errorMsg.set('Die Passwörter stimmen nicht überein.');
      return;
    }

    this.loading.set(true);
    try {
      if (this.mode() === 'login') {
        await this.auth.signIn(this.email, this.password);
        await this.router.navigateByUrl(this.consumeRedirect() ?? this.defaultTarget());
        return;
      }

      const { needsEmailConfirmation } = await this.auth.signUp(
        this.email,
        this.password,
        this.role(),
        this.displayName.trim() || undefined
      );
      if (needsEmailConfirmation) {
        // Weiter-Ziel NICHT verbrauchen – es soll die Bestätigung + spätere Anmeldung
        // überleben (bleibt im sessionStorage und im Signal erhalten).
        this.infoMsg.set(this.confirmationMessage());
        this.mode.set('login');
        this.password = '';
        this.passwordConfirm = '';
        this.confirmTouched.set(false);
      } else {
        await this.router.navigateByUrl(this.consumeRedirect() ?? this.defaultTarget());
      }
    } catch (error) {
      this.errorMsg.set(this.humanize(error));
    } finally {
      this.loading.set(false);
    }
  }

  /** Erfolgsmeldung nach Registrierung – bei Premium-Ziel mit klarem Ablauf-Hinweis. */
  private confirmationMessage(): string {
    if (this.redirectTarget() === '/konto/premium') {
      return (
        'Fast geschafft: Bestätige deine E-Mail-Adresse über den Link, den wir dir ' +
        'geschickt haben. Danach einfach anmelden – du landest direkt bei Premium.'
      );
    }
    return (
      'Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir ' +
      'geschickt haben. Danach kannst du dich anmelden.'
    );
  }

  /**
   * Lässt nur interne Pfade zu (Open-Redirect-Schutz): müssen mit „/" beginnen,
   * aber nicht mit „//" oder „/\\" (protokoll-relative bzw. Backslash-Tricks).
   */
  private sanitizeRedirect(target: string | null): string | null {
    if (!target || !target.startsWith('/')) {
      return null;
    }
    if (target.startsWith('//') || target.startsWith('/\\')) {
      return null;
    }
    return target;
  }

  private storeRedirect(target: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      globalThis.sessionStorage?.setItem(REDIRECT_STORAGE_KEY, target);
    } catch {
      // sessionStorage nicht verfügbar (z. B. Privatmodus): Signal reicht als Fallback.
    }
  }

  private readRedirect(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      return this.sanitizeRedirect(globalThis.sessionStorage?.getItem(REDIRECT_STORAGE_KEY) ?? null);
    } catch {
      return null;
    }
  }

  private clearRedirect(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      globalThis.sessionStorage?.removeItem(REDIRECT_STORAGE_KEY);
    } catch {
      // Ignorieren – nächster erfolgreicher Login räumt erneut auf.
    }
  }

  /** Liefert das Weiter-Ziel (Signal oder gespeichert) und räumt den Speicher auf. */
  private consumeRedirect(): string | null {
    const target = this.redirectTarget() ?? this.readRedirect();
    this.clearRedirect();
    return target;
  }

  /** Standard-Ziel ohne explizites Weiter: im App-Host das Dashboard, sonst Start. */
  private defaultTarget(): string {
    return this.appHost.isAppHost ? '/projekt-dashboard' : '/';
  }

  private storeSignupRole(role: SignupRole): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      globalThis.sessionStorage?.setItem(SIGNUP_ROLE_STORAGE_KEY, role);
    } catch {
      // sessionStorage nicht verfügbar – dann eben ohne Rollen-Nachzug.
    }
  }

  private clearSignupRole(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      globalThis.sessionStorage?.removeItem(SIGNUP_ROLE_STORAGE_KEY);
    } catch {
      // Ignorieren.
    }
  }

  /** Liest die (vor dem OAuth-Redirect) gewählte Rolle und löscht sie sofort. */
  private consumeSignupRole(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      const role = globalThis.sessionStorage?.getItem(SIGNUP_ROLE_STORAGE_KEY) ?? null;
      globalThis.sessionStorage?.removeItem(SIGNUP_ROLE_STORAGE_KEY);
      return role;
    } catch {
      return null;
    }
  }

  /**
   * Wartet, bis eine Session vorliegt (Signal-Poll), maximal `timeoutMs`. Der
   * PKCE-Code-Tausch läuft asynchron; ohne diese kurze Wartezeit wäre bei der
   * OAuth-Rückkehr noch keine Session da. Timeout-Fallback: Seite normal zeigen.
   */
  private waitForAuthenticated(timeoutMs = 5000): Promise<void> {
    if (this.auth.isAuthenticated()) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (this.auth.isAuthenticated() || Date.now() - start > timeoutMs) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  }

  private humanize(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();
    if (normalized.includes('invalid login credentials')) {
      return 'E-Mail oder Passwort ist falsch.';
    }
    if (normalized.includes('user already registered')) {
      return 'Für diese E-Mail existiert bereits ein Konto. Bitte melde dich an.';
    }
    if (normalized.includes('password should be at least')) {
      return 'Das Passwort ist zu kurz (mindestens 6 Zeichen).';
    }
    if (normalized.includes('email not confirmed')) {
      return 'Bitte bestätige zuerst deine E-Mail-Adresse über den zugesandten Link.';
    }
    // Supabase-Rate-Limit beim Passwort-Reset („you can only request this once every …").
    if (normalized.includes('you can only request this')) {
      return 'Bitte warte einen Moment, bevor du erneut einen Link anforderst.';
    }
    // OAuth-Provider (Google) im Supabase-Dashboard nicht aktiviert.
    if (normalized.includes('provider is not enabled') || normalized.includes('is not enabled')) {
      return 'Google-Anmeldung ist derzeit nicht verfügbar.';
    }
    return message || 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.';
  }
}
