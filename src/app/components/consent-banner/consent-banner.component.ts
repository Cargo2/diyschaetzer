import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConsentService } from '../../services/consent.service';

/**
 * Consent-Manager-UI (Opt-in). Ersetzt den früheren reinen localStorage-Hinweis:
 *
 *  - Banner beim ersten Besuch mit „Alle akzeptieren" / „Nur essenziell" /
 *    „Einstellungen".
 *  - Einstellungen-Dialog mit den Kategorien (essenziell = fest an) und
 *    Beschreibungen; jederzeit über den Footer-Link „Cookie-Einstellungen"
 *    erneut aufrufbar (Widerruf).
 *
 * Zustand + Persistenz liegen im ConsentService (prerender-sicher). Diese
 * Komponente ist reine Anzeige/Interaktion.
 */
@Component({
  selector: 'app-consent-banner',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (consent.bannerVisible() && !consent.settingsOpen()) {
      <div class="consent-banner" role="dialog" aria-label="Datenschutz-Einstellungen">
        <p class="consent-text">
          Diese Website nutzt technisch notwendige Speicherung für deine Eingaben (lokal im
          Browser) und deine Sitzung. Für optionale externe Dienste (z. B. Zahlungsanbieter)
          und Statistik holen wir vorab deine Einwilligung ein. Details in der
          <a routerLink="/datenschutz">Datenschutzerklärung</a>.
        </p>
        <div class="consent-actions">
          <button type="button" class="consent-btn ghost" (click)="consent.openSettings()">
            Einstellungen
          </button>
          <button type="button" class="consent-btn ghost" (click)="consent.acceptEssentialOnly()">
            Nur essenziell
          </button>
          <button type="button" class="consent-btn solid" (click)="consent.acceptAll()">
            Alle akzeptieren
          </button>
        </div>
      </div>
    }

    @if (consent.settingsOpen()) {
      <div class="consent-overlay" (click)="consent.closeSettings()">
        <div
          class="consent-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-dialog-title"
          (click)="$event.stopPropagation()"
        >
          <h2 id="consent-dialog-title">Datenschutz-Einstellungen</h2>
          <p class="consent-dialog-intro">
            Wähle, welche optionalen Dienste du zulässt. Deine Wahl kannst du jederzeit über den
            Link „Cookie-Einstellungen" im Seitenfuß ändern oder widerrufen.
          </p>

          <div class="consent-category">
            <label class="consent-category-head">
              <input type="checkbox" checked disabled />
              <span class="consent-category-name">Essenziell (immer aktiv)</span>
            </label>
            <p class="consent-category-desc">
              Technisch notwendige Speicherung: deine Rechner-Eingaben (localStorage) und – falls
              du dich anmeldest – deine Sitzung. Ohne diese läuft die Seite nicht.
            </p>
          </div>

          <div class="consent-category">
            <label class="consent-category-head">
              <input type="checkbox" [checked]="optExternal()" (change)="optExternal.set($any($event.target).checked)" />
              <span class="consent-category-name">Externe Dienste</span>
            </label>
            <p class="consent-category-desc">
              Eingebettete Dienste von Dritten, z. B. der Zahlungsanbieter PayPal für das
              Fliesenleger-Abo. Wird erst geladen, wenn du zustimmst.
            </p>
          </div>

          <div class="consent-category">
            <label class="consent-category-head">
              <input type="checkbox" [checked]="optStatistics()" (change)="optStatistics.set($any($event.target).checked)" />
              <span class="consent-category-name">Statistik</span>
            </label>
            <p class="consent-category-desc">
              Anonyme Reichweitenmessung, um das Angebot zu verbessern (z. B. Google Analytics).
              Wird erst nach deiner Zustimmung geladen. Aktuell noch nicht im Einsatz.
            </p>
          </div>

          <div class="consent-dialog-actions">
            <button type="button" class="consent-btn ghost" (click)="consent.acceptEssentialOnly()">
              Nur essenziell
            </button>
            <button type="button" class="consent-btn ghost" (click)="save()">
              Auswahl speichern
            </button>
            <button type="button" class="consent-btn solid" (click)="consent.acceptAll()">
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .consent-banner {
      align-items: center;
      background: rgba(255, 253, 248, 0.94);
      backdrop-filter: blur(16px) saturate(1.4);
      -webkit-backdrop-filter: blur(16px) saturate(1.4);
      border: 1px solid rgba(255, 255, 255, 0.7);
      border-radius: 1.2rem;
      bottom: 1rem;
      box-shadow: 0 2px 4px rgba(19, 23, 17, 0.06), 0 24px 48px -16px rgba(61, 39, 22, 0.3);
      display: flex;
      gap: 1rem 1.4rem;
      justify-content: space-between;
      left: 50%;
      margin: 0 auto;
      max-width: min(94%, 60rem);
      padding: 0.95rem 1.2rem;
      position: fixed;
      transform: translateX(-50%);
      width: max-content;
      z-index: 60;
      animation: rise-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .consent-text {
      color: var(--ink-soft);
      font-size: 0.9rem;
      line-height: 1.55;
      margin: 0;
      max-width: 42ch;
    }

    .consent-text a {
      color: var(--verde-deep);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .consent-text a:hover { color: var(--copper); }

    .consent-actions {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: wrap;
      gap: 0.55rem;
    }

    .consent-btn {
      border-radius: 999px;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      min-height: 2.7rem;
      padding: 0.6rem 1.2rem;
      transition: transform 200ms ease, box-shadow 200ms ease;
    }

    .consent-btn.solid {
      background: linear-gradient(120deg, var(--verde), var(--verde-deep));
      border: 0;
      color: #f4ece0;
    }

    .consent-btn.solid:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 22px -8px rgba(61, 39, 22, 0.5);
    }

    .consent-btn.ghost {
      background: transparent;
      border: 1px solid var(--verde);
      color: var(--verde-deep);
    }

    .consent-btn.ghost:hover { background: rgba(111, 74, 41, 0.08); }

    .consent-btn:focus-visible {
      outline: 2px solid var(--copper);
      outline-offset: 2px;
    }

    .consent-overlay {
      position: fixed;
      inset: 0;
      background: rgba(28, 23, 16, 0.42);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      z-index: 70;
      animation: rise-in 240ms ease both;
    }

    .consent-dialog {
      background: var(--card);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-float);
      max-width: 34rem;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 1.6rem 1.6rem 1.3rem;
    }

    .consent-dialog h2 {
      margin: 0 0 0.5rem;
      font-size: 1.35rem;
    }

    .consent-dialog-intro {
      color: var(--ink-soft);
      font-size: 0.9rem;
      line-height: 1.55;
      margin: 0 0 1.1rem;
    }

    .consent-category {
      border-top: 1px solid var(--paper-deep);
      padding: 0.9rem 0;
    }

    .consent-category-head {
      align-items: center;
      cursor: pointer;
      display: flex;
      gap: 0.6rem;
    }

    .consent-category-head input {
      width: 1.15rem;
      height: 1.15rem;
      accent-color: var(--verde);
    }

    .consent-category-name {
      font-weight: 700;
      color: var(--ink);
    }

    .consent-category-desc {
      color: var(--ink-soft);
      font-size: 0.85rem;
      line-height: 1.5;
      margin: 0.4rem 0 0 1.75rem;
    }

    .consent-dialog-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
      justify-content: flex-end;
      margin-top: 1.2rem;
    }

    @media (max-width: 560px) {
      .consent-banner {
        align-items: stretch;
        flex-direction: column;
        left: 0.7rem;
        right: 0.7rem;
        max-width: none;
        transform: none;
        width: auto;
      }

      .consent-text { max-width: none; }
      .consent-actions .consent-btn { flex: 1 1 auto; }
      .consent-dialog-actions .consent-btn { flex: 1 1 auto; }
    }
  `]
})
export class ConsentBannerComponent {
  readonly consent = inject(ConsentService);

  /** Lokaler Formularstand des Einstellungen-Dialogs. */
  readonly optExternal = signal(false);
  readonly optStatistics = signal(false);

  constructor() {
    // Beim Öffnen des Dialogs die Schalter mit dem gespeicherten Stand vorbelegen.
    effect(() => {
      if (this.consent.settingsOpen()) {
        const granted = this.consent.grantedChanges();
        this.optExternal.set(granted.external_services);
        this.optStatistics.set(granted.statistics);
      }
    });
  }

  save(): void {
    this.consent.saveSelection({
      external_services: this.optExternal(),
      statistics: this.optStatistics()
    });
  }
}
