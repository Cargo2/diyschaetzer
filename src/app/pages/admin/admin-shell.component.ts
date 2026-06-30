import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Rahmen des abgekapselten Admin-Bereichs (Phase 15). Eigene Sub-Navigation +
 * Router-Outlet; bewusst ohne Abhängigkeit zu den Endkunden-/Profi-Flows, damit
 * der Bereich später eigenständig (ggf. separat deploybar) wachsen kann.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-shell">
      <header class="admin-head">
        <p class="admin-eyebrow">Administration</p>
        <h1>Katalog &amp; Pflege</h1>
        <p class="admin-note">
          Interner Bereich – nur für Admins. Änderungen am Materialkatalog wirken
          sofort app-weit; bitte mit Bedacht bearbeiten.
        </p>
      </header>

      <nav class="admin-tabs" aria-label="Admin-Navigation">
        <a routerLink="material" routerLinkActive="active" class="admin-tab">Materialkatalog</a>
        <a routerLink="nutzer" routerLinkActive="active" class="admin-tab">Nutzer</a>
        <a routerLink="feedback" routerLinkActive="active" class="admin-tab">Feedback</a>
      </nav>

      <section class="admin-body">
        <router-outlet />
      </section>
    </div>
  `,
  styles: [
    `
      .admin-shell {
        /* Breite kommt vom überschriebenen .content-stage (10 % je Seite, app.css). */
        width: 100%;
        padding: 1.5rem 0 3rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .admin-eyebrow {
        margin: 0;
        font-size: 0.78rem;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #6b7280;
      }

      .admin-head h1 {
        margin: 0.15rem 0 0.35rem;
        font-size: 1.5rem;
      }

      .admin-note {
        margin: 0;
        font-size: 0.9rem;
        color: #6b7280;
      }

      .admin-tabs {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 0.5rem;
      }

      .admin-tab {
        padding: 0.45rem 0.9rem;
        border-radius: 0.6rem;
        font-size: 0.9rem;
        color: #374151;
        text-decoration: none;
        border: 1px solid transparent;
      }

      .admin-tab:hover {
        background: #f3f4f6;
      }

      .admin-tab.active {
        background: #eef2ff;
        border-color: #c7d2fe;
        color: #3730a3;
        font-weight: 600;
      }
    `
  ]
})
export class AdminShellComponent {}
