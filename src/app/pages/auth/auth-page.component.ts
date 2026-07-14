import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SignupRole } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

type AuthMode = 'login' | 'register';

/**
 * sessionStorage-Schlüssel für das Weiter-Ziel. Muss die E-Mail-Bestätigung
 * überleben (Registrieren → Mail bestätigen → erneut anmelden → Ziel), daher
 * nicht nur im Query-Param/Signal gehalten.
 */
const REDIRECT_STORAGE_KEY = 'auth_redirect_target';

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

  readonly isConfigured = this.auth.isConfigured;
  readonly mode = signal<AuthMode>('login');
  readonly role = signal<SignupRole>('customer');
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly infoMsg = signal<string | null>(null);
  /** Internes Weiter-Ziel nach erfolgreichem Login (z. B. `/konto/premium`). */
  readonly redirectTarget = signal<string | null>(null);

  email = '';
  password = '';
  displayName = '';

  /**
   * Wertet die Deep-Link-Query-Parameter aus:
   * `modus=registrieren` → Registrieren-Tab, `rolle=betrieb` → Rolle Betrieb
   * vorausgewählt, `weiter=<pfad>` → Ziel nach der Anmeldung (überlebt die
   * E-Mail-Bestätigung via sessionStorage).
   */
  ngOnInit(): void {
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
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorMsg.set(null);
    this.infoMsg.set(null);
  }

  async submit(): Promise<void> {
    this.errorMsg.set(null);
    this.infoMsg.set(null);

    if (!this.email || !this.password) {
      this.errorMsg.set('Bitte E-Mail und Passwort angeben.');
      return;
    }

    this.loading.set(true);
    try {
      if (this.mode() === 'login') {
        await this.auth.signIn(this.email, this.password);
        await this.router.navigateByUrl(this.consumeRedirect() ?? '/');
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
      } else {
        await this.router.navigateByUrl(this.consumeRedirect() ?? '/');
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
    return message || 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.';
  }
}
