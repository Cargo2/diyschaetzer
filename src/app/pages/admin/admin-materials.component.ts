import { Component, computed, inject, signal } from '@angular/core';
import { ArticleType } from '../../data/material-catalog-with-prices';
import { CatalogService } from '../../services/catalog.service';

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
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty">Keine Artikel gefunden.</td>
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

  readonly filter = signal('');

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
