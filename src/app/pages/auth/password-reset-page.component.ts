import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AppHostService } from '../../services/app-host.service';

/** Supabase-Default: Passwörter müssen mindestens 6 Zeichen lang sein. */
const MIN_PASSWORD_LENGTH = 6;

/**
 * Seite `/passwort-neu`: Ziel des Passwort-Reset-Links aus der Mail
 * (`AuthService.requestPasswordReset`). supabase-js tauscht das Recovery-Token
 * aus der URL automatisch gegen eine Session (`detectSessionInUrl`); sobald die
 * Session da ist, darf hier das neue Passwort gesetzt werden. Ohne gültige
 * Recovery-Session (abgelaufener/ungültiger Link) erscheint ein Hinweis mit
 * Link zur Anmeldung.
 *
 * Prerender-sicher: fasst Browser-APIs/Supabase nur nach `isPlatformBrowser`-
 * Guard in `ngOnInit` an; die Route läuft ohnehin unter `RenderMode.Client`
 * (`**`-Fallback in app.routes.server.ts).
 */
@Component({
  selector: 'app-password-reset-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './password-reset-page.component.html',
  styleUrl: './auth-page.component.css'
})
export class PasswordResetPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly appHost = inject(AppHostService);

  readonly isConfigured = this.auth.isConfigured;
  /** `true`, solange auf die Recovery-Session aus dem Mail-Link gewartet wird. */
  readonly checking = signal(true);
  /** `true`, wenn eine (Recovery-)Session vorliegt und das Formular gezeigt wird. */
  readonly hasSession = signal(false);
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errorMsg = signal<string | null>(null);

  password = '';
  passwordConfirm = '';

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.isConfigured) {
      this.checking.set(false);
      return;
    }
    await this.auth.ready;
    // Der Token-Tausch (detectSessionInUrl) läuft asynchron – bei vorhandenem
    // Recovery-Token in der URL kurz auf die Session warten. Ohne Token (oder
    // bei `#error=…`, z. B. otp_expired) sofort den Ungültig-Hinweis zeigen.
    if (!this.auth.isAuthenticated() && this.urlHasRecoveryToken()) {
      await this.waitForAuthenticated();
    }
    this.hasSession.set(this.auth.isAuthenticated());
    this.checking.set(false);
  }

  async submit(): Promise<void> {
    this.errorMsg.set(null);
    if (!this.password || !this.passwordConfirm) {
      this.errorMsg.set('Bitte beide Passwort-Felder ausfüllen.');
      return;
    }
    if (this.password.length < MIN_PASSWORD_LENGTH) {
      this.errorMsg.set('Das Passwort ist zu kurz (mindestens 6 Zeichen).');
      return;
    }
    if (this.password !== this.passwordConfirm) {
      this.errorMsg.set('Die Passwörter stimmen nicht überein.');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.updatePassword(this.password);
      this.success.set(true);
      // Kurz den Erfolg zeigen, dann weiter (Recovery-Session = angemeldet).
      setTimeout(() => void this.router.navigateByUrl(this.continueTarget()), 2500);
    } catch (error) {
      this.errorMsg.set(this.humanize(error));
    } finally {
      this.loading.set(false);
    }
  }

  /** Ziel nach dem Setzen: im App-Host das Dashboard, sonst die Startseite. */
  continueTarget(): string {
    return this.appHost.isAppHost ? '/projekt-dashboard' : '/';
  }

  /** `true`, wenn die URL ein Recovery-Token trägt (Hash- oder PKCE-Variante). */
  private urlHasRecoveryToken(): boolean {
    const location = globalThis.location;
    if (!location) {
      return false;
    }
    return location.hash.includes('access_token') || location.search.includes('code=');
  }

  /** Wartet per Signal-Poll auf die Session (analog AuthPageComponent). */
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
    if (normalized.includes('password should be at least')) {
      return 'Das Passwort ist zu kurz (mindestens 6 Zeichen).';
    }
    // Supabase lehnt das Wiederverwenden des alten Passworts ab.
    if (normalized.includes('different from the old password')) {
      return 'Das neue Passwort muss sich vom bisherigen unterscheiden.';
    }
    if (normalized.includes('auth session missing')) {
      return 'Die Sitzung ist abgelaufen. Bitte fordere einen neuen Link an.';
    }
    return message || 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.';
  }
}
