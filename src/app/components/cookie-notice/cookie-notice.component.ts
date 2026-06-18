import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Schlanker, informativer Hinweis auf die technisch notwendige lokale Speicherung
 * (localStorage). Kein Consent-Gate: Die App setzt selbst keine nicht-essentiellen
 * Cookies. Ein vollwertiger Consent-Manager mit Opt-in folgt erst mit dem
 * Affiliate-/Monetarisierungs-Livegang (siehe CLAUDE.md).
 */
@Component({
  selector: 'app-cookie-notice',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (visible()) {
      <div class="cookie-notice" role="dialog" aria-label="Hinweis zur lokalen Speicherung">
        <p class="cookie-text">
          Diese Anwendung speichert deine Eingaben nur lokal in deinem Browser
          (technisch notwendig). Es werden keine Tracking-Cookies gesetzt. Mehr dazu in der
          <a routerLink="/datenschutz">Datenschutzerklärung</a>.
        </p>
        <button type="button" class="cookie-accept" (click)="acknowledge()">Verstanden</button>
      </div>
    }
  `,
  styles: [`
    .cookie-notice {
      align-items: center;
      background: rgba(255, 253, 248, 0.92);
      backdrop-filter: blur(16px) saturate(1.4);
      -webkit-backdrop-filter: blur(16px) saturate(1.4);
      border: 1px solid rgba(255, 255, 255, 0.7);
      border-radius: 1.2rem;
      bottom: 1rem;
      box-shadow: 0 2px 4px rgba(19, 23, 17, 0.06), 0 24px 48px -16px rgba(10, 53, 47, 0.3);
      display: flex;
      gap: 1rem 1.4rem;
      justify-content: space-between;
      left: 50%;
      margin: 0 auto;
      max-width: min(94%, 52rem);
      padding: 0.95rem 1.2rem;
      position: fixed;
      transform: translateX(-50%);
      width: max-content;
      z-index: 60;
      animation: rise-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .cookie-text {
      color: var(--ink-soft);
      font-size: 0.9rem;
      line-height: 1.55;
      margin: 0;
      max-width: 40ch;
    }

    .cookie-text a {
      color: var(--verde-deep);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .cookie-text a:hover {
      color: var(--copper);
    }

    .cookie-accept {
      background: linear-gradient(120deg, var(--verde), var(--verde-deep));
      border: 0;
      border-radius: 999px;
      color: #eef5f0;
      cursor: pointer;
      flex: 0 0 auto;
      font: inherit;
      font-weight: 800;
      min-height: 2.7rem;
      padding: 0.6rem 1.4rem;
      transition: transform 200ms ease, box-shadow 200ms ease;
    }

    .cookie-accept:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 22px -8px rgba(10, 53, 47, 0.5);
    }

    .cookie-accept:focus-visible {
      outline: 2px solid var(--copper);
      outline-offset: 2px;
    }

    @media (max-width: 560px) {
      .cookie-notice {
        align-items: stretch;
        flex-direction: column;
        left: 0.7rem;
        right: 0.7rem;
        max-width: none;
        transform: none;
        width: auto;
      }

      .cookie-text {
        max-width: none;
      }

      .cookie-accept {
        width: 100%;
      }
    }
  `]
})
export class CookieNoticeComponent {
  private readonly storageKey = 'badprojekt:cookie-notice-ack';
  readonly visible = signal(!this.alreadyAcknowledged());

  acknowledge(): void {
    try {
      globalThis.localStorage?.setItem(this.storageKey, '1');
    } catch {
      // Speicherfehler ignorieren – der Hinweis wird dann erneut angezeigt.
    }
    this.visible.set(false);
  }

  private alreadyAcknowledged(): boolean {
    try {
      return globalThis.localStorage?.getItem(this.storageKey) === '1';
    } catch {
      return false;
    }
  }
}
