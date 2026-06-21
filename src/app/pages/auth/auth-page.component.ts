import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SignupRole } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.css'
})
export class AuthPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isConfigured = this.auth.isConfigured;
  readonly mode = signal<AuthMode>('login');
  readonly role = signal<SignupRole>('customer');
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly infoMsg = signal<string | null>(null);

  email = '';
  password = '';
  displayName = '';

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
        await this.router.navigateByUrl('/');
        return;
      }

      const { needsEmailConfirmation } = await this.auth.signUp(
        this.email,
        this.password,
        this.role(),
        this.displayName.trim() || undefined
      );
      if (needsEmailConfirmation) {
        this.infoMsg.set(
          'Fast geschafft: Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben. Danach kannst du dich anmelden.'
        );
        this.mode.set('login');
        this.password = '';
      } else {
        await this.router.navigateByUrl('/');
      }
    } catch (error) {
      this.errorMsg.set(this.humanize(error));
    } finally {
      this.loading.set(false);
    }
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
