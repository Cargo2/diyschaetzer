import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ArticleType, MaterialCatalogItem } from '../../data/material-catalog-with-prices';
import { CatalogService } from '../../services/catalog.service';
import { ADMIN_CATALOG_REPOSITORY } from './data-access/admin-catalog-repository';

const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  main_material: 'Hauptmaterial',
  consumable: 'Verbrauchsmaterial',
  tool: 'Werkzeug',
  psa: 'PSA',
  accessory: 'Zubehör',
  documentation: 'Dokumentation',
  waste_disposal: 'Entsorgung'
};

/**
 * Read-only Überblick über den Materialkatalog (Phase 15, Block 1). Liest den
 * bereits geladenen {@link CatalogService} – keine eigene DB-Anbindung, kein
 * Schreibpfad. Bearbeitung folgt in einem späteren Block.
 */
@Component({
  selector: 'app-admin-materials',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="materials">
      <div class="materials-bar">
        <input
          type="search"
          [value]="filter()"
          (input)="filter.set($any($event.target).value)"
          placeholder="Suchen (Name, ID, Typ, Tags) …"
          aria-label="Materialien filtern"
        />
        <span class="materials-count">{{ filtered().length }} / {{ total() }} Artikel</span>
      </div>

      @if (error()) {
        <p class="materials-error" role="alert">{{ error() }}</p>
      }

      <div class="materials-scroll">
        <table class="materials-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Typ</th>
              <th>Einheit</th>
              <th class="num">Richtpreis</th>
              <th>DIY</th>
              <th>Profi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (item of filtered(); track item.id) {
              <tr>
                <td class="mono">{{ item.id }}</td>
                <td>{{ item.name }}</td>
                <td>{{ articleTypeLabel(item.articleType) }}</td>
                <td>{{ item.unit }}</td>
                <td class="num">{{ formatPrice(item.price.amount) }}</td>
                <td>{{ item.includeInDiy ? '✓' : '–' }}</td>
                <td>{{ item.includeInProfessional ? '✓' : '–' }}</td>
                <td class="action">
                  <a [routerLink]="['/admin/material', item.id]">Bearbeiten</a>
                  <button type="button" (click)="duplicate(item)" [disabled]="working()">
                    Duplizieren
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="empty">Keine Artikel gefunden.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .materials {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .materials-bar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .materials-bar input {
        flex: 1 1 20rem;
        padding: 0.55rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.6rem;
        font-size: 0.9rem;
      }

      .materials-count {
        font-size: 0.85rem;
        color: #6b7280;
      }

      .materials-scroll {
        overflow-x: auto;
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
      }

      .materials-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
        min-width: 44rem;
      }

      .materials-table th,
      .materials-table td {
        text-align: left;
        padding: 0.5rem 0.7rem;
        border-bottom: 1px solid #f1f5f9;
        white-space: nowrap;
      }

      .materials-table thead th {
        position: sticky;
        top: 0;
        background: #f8fafc;
        font-weight: 600;
        color: #475569;
      }

      .materials-table tbody tr:hover {
        background: #f8fafc;
      }

      .materials-table .num {
        text-align: right;
      }

      .materials-table .mono {
        font-family: ui-monospace, monospace;
        color: #64748b;
      }

      .materials-table .action {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }

      .materials-table .action a {
        color: #4f46e5;
        text-decoration: none;
        font-weight: 600;
      }

      .materials-table .action a:hover {
        text-decoration: underline;
      }

      .materials-table .action button {
        background: none;
        border: none;
        padding: 0;
        color: #4f46e5;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      .materials-table .action button:hover {
        text-decoration: underline;
      }

      .materials-table .action button:disabled {
        opacity: 0.5;
        cursor: default;
        text-decoration: none;
      }

      .materials-error {
        margin: 0;
        color: #b91c1c;
        font-size: 0.85rem;
      }

      .materials-table td.empty {
        text-align: center;
        color: #6b7280;
        padding: 1.5rem;
      }
    `
  ]
})
export class AdminMaterialsComponent {
  private readonly catalog = inject(CatalogService);
  private readonly repository = inject(ADMIN_CATALOG_REPOSITORY);
  private readonly router = inject(Router);

  readonly filter = signal('');
  readonly working = signal(false);
  readonly error = signal<string | null>(null);

  readonly total = computed(() => this.catalog.materials().length);

  readonly filtered = computed(() => {
    const term = this.filter().trim().toLowerCase();
    const materials = this.catalog.materials();
    if (!term) {
      return materials;
    }
    return materials.filter((item) =>
      [item.id, item.name, ARTICLE_TYPE_LABELS[item.articleType], ...item.tags]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  });

  /**
   * Legt einen neuen Artikel als Duplikat eines bestehenden an (gültige
   * Berechnungs-/Bedingungskonfiguration als Startpunkt) und öffnet ihn im Editor.
   * Affiliate-Angebote werden bewusst nicht mitkopiert (neue id ohne Offers).
   */
  async duplicate(item: MaterialCatalogItem): Promise<void> {
    if (this.working()) {
      return;
    }
    this.error.set(null);
    this.working.set(true);
    try {
      const newId = this.uniqueId(item.id);
      const clone: MaterialCatalogItem = { ...item, id: newId, name: `${item.name} (Kopie)` };
      await this.repository.createMaterial(clone);
      await this.catalog.reload();
      void this.router.navigate(['/admin/material', newId]);
    } catch (err) {
      console.error('Material konnte nicht dupliziert werden:', err);
      this.error.set('Duplizieren fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      this.working.set(false);
    }
  }

  private uniqueId(baseId: string): string {
    const existing = new Set(this.catalog.materials().map((material) => material.id));
    let candidate = `${baseId}-kopie`;
    let n = 2;
    while (existing.has(candidate)) {
      candidate = `${baseId}-kopie-${n++}`;
    }
    return candidate;
  }

  articleTypeLabel(type: ArticleType): string {
    return ARTICLE_TYPE_LABELS[type];
  }

  formatPrice(amount: number | null): string {
    if (amount === null) {
      return '–';
    }
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }
}
