import { Component, HostListener, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Login-Hinweis-Dialog für die ausgegrauten Profi-Menüpunkte der App-Sidebar:
 * anonyme Nutzer sehen die Punkte (Schaufenster), ein Klick öffnet diesen Dialog
 * mit Link auf `/login` statt zu navigieren (Konzept „Menü ohne Login", Block A2).
 *
 * Muster analog Consent-Banner (`components/consent-banner/`): Vollbild-Overlay,
 * `role="dialog"` + `aria-modal`, Klick auf den Hintergrund oder Escape schließt.
 * Die Sichtbarkeit steuert der Aufrufer (Signal `loginDialogOpen` im
 * `injectShellNavState()`); die Komponente selbst ist reine Anzeige/Interaktion.
 */
@Component({
  selector: 'app-login-required-dialog',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './login-required-dialog.component.html',
  styleUrl: './login-required-dialog.component.css'
})
export class LoginRequiredDialogComponent {
  /** Schließen-Wunsch (Backdrop, Escape, Abbrechen oder nach Klick auf Anmelden). */
  readonly closed = output<void>();

  /** Escape schließt den Dialog (nice-to-have analog Drawer-Escape der Shell). */
  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
