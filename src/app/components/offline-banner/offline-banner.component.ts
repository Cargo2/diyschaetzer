import { Component, inject } from '@angular/core';
import { OnlineStatusService } from '../../services/online-status.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Dezente, fixe Leiste am unteren Rand, die nur erscheint, wenn der Browser offline
 * ist. Weist darauf hin, dass Änderungen lokal bleiben und nicht mit dem Konto
 * synchronisiert werden (Supabase braucht Netz). Kein Dismiss nötig – die Leiste
 * verschwindet, sobald die Verbindung zurück ist.
 *
 * Global neben dem Consent-Banner in `app.html` gemountet (läuft unter beiden Shells).
 * Zustand + Prerender-Sicherheit liegen im `OnlineStatusService`.
 */
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (!online.isOnline()) {
      <div class="offline-banner" role="status" aria-live="polite">
        <span class="offline-dot" aria-hidden="true"></span>
        <span class="offline-text">
          {{ 'Du bist offline – Änderungen werden lokal gespeichert und nicht mit deinem Konto synchronisiert.' | t }}
        </span>
      </div>
    }
  `,
  styles: [`
    .offline-banner {
      position: fixed;
      left: 50%;
      bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      z-index: 55;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      max-width: min(38rem, calc(100vw - 1.5rem));
      padding: 0.6rem 1rem;
      border-radius: 999px;
      background: rgba(40, 34, 26, 0.94);
      color: #f4ece0;
      box-shadow: 0 12px 30px -12px rgba(19, 23, 17, 0.55);
      font-size: 0.85rem;
      line-height: 1.4;
      animation: offline-rise-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes offline-rise-in {
      from { opacity: 0; transform: translate(-50%, 12px); }
      to   { opacity: 1; transform: translate(-50%, 0); }
    }

    .offline-dot {
      flex: 0 0 auto;
      width: 0.6rem;
      height: 0.6rem;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.25);
    }

    .offline-text {
      display: block;
    }

    @media (max-width: 640px) {
      .offline-banner {
        max-width: calc(100vw - 1rem);
        border-radius: 0.9rem;
      }
    }
  `]
})
export class OfflineBannerComponent {
  readonly online = inject(OnlineStatusService);
}
