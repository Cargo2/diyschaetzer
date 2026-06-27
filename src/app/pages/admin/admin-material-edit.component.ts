import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MERCHANTS } from '../../config/affiliate.config';
import { MaterialCatalogItem } from '../../data/material-catalog-with-prices';
import { Merchant, MerchantId } from '../../models/affiliate.model';
import { CatalogService } from '../../services/catalog.service';
import {
  ADMIN_CATALOG_REPOSITORY,
  AdminMaterialOffer
} from './data-access/admin-catalog-repository';

/**
 * Editier-Formular für einen Materialartikel (Phase 15, Block 2). Bearbeitet einen
 * bewusst eng gefassten, „sicheren" Feldsatz (Bezeichnung, Beschreibung, Einheit,
 * Richtpreis, DIY/Profi-Flags, Hinweise) – Berechnungs-/Bedingungslogik bleibt
 * außen vor. Speichern läuft über das abgekapselte {@link ADMIN_CATALOG_REPOSITORY}
 * (is_admin()-RLS); danach wird der Katalog neu geladen.
 */
@Component({
  selector: 'app-admin-material-edit',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (notFound()) {
      <div class="edit-missing">
        <p>Artikel nicht gefunden.</p>
        <a routerLink="/admin/material">Zurück zur Liste</a>
      </div>
    } @else {
      <form class="edit" (submit)="save($event)">
        <div class="edit-head">
          <div>
            <p class="edit-eyebrow">Artikel bearbeiten</p>
            <h2>{{ originalName() }}</h2>
            <p class="edit-id mono">{{ materialId() }}</p>
          </div>
          <a routerLink="/admin/material" class="edit-back">Zurück zur Liste</a>
        </div>

        <label class="field">
          <span>Bezeichnung</span>
          <input type="text" [value]="name()" (input)="name.set($any($event.target).value)" required />
        </label>

        <label class="field">
          <span>Beschreibung</span>
          <textarea rows="2" [value]="description()" (input)="description.set($any($event.target).value)"></textarea>
        </label>

        <div class="field-row">
          <label class="field">
            <span>Einheit</span>
            <input type="text" [value]="unit()" (input)="unit.set($any($event.target).value)" />
          </label>
          <label class="field">
            <span>Richtpreis (EUR, inkl. MwSt.)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              [value]="priceAmount()"
              (input)="priceAmount.set($any($event.target).value)"
              placeholder="leer = kein Preis"
            />
          </label>
        </div>

        <label class="field">
          <span>Reichweite je Gebinde (m²)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            [value]="coverage()"
            (input)="coverage.set($any($event.target).value)"
            placeholder="leer = generische 20-m²-Pauschale"
          />
          <small class="field-hint">
            Nur für flächenbasierte Verbrauchsmaterialien (z. B. Vlies, Grundierung). Bestimmt
            „ein Gebinde je angefangene X m²". Leer = bisherige 20-m²-Pauschale.
          </small>
        </label>

        <div class="field-row">
          <label class="check">
            <input type="checkbox" [checked]="includeInDiy()" (change)="includeInDiy.set($any($event.target).checked)" />
            <span>In DIY-Kalkulation</span>
          </label>
          <label class="check">
            <input
              type="checkbox"
              [checked]="includeInProfessional()"
              (change)="includeInProfessional.set($any($event.target).checked)"
            />
            <span>In Profi-Kalkulation</span>
          </label>
          <label class="check">
            <input
              type="checkbox"
              [checked]="affiliateEligible()"
              (change)="affiliateEligible.set($any($event.target).checked)"
            />
            <span>Affiliate-fähig</span>
          </label>
        </div>

        <label class="field">
          <span>Hinweise</span>
          <textarea rows="2" [value]="notes()" (input)="notes.set($any($event.target).value)"></textarea>
        </label>

        <fieldset class="offers">
          <legend>Affiliate-Links</legend>
          <p class="offers-hint">
            Direkter Produkt-Link je Shop. Nur Shops mit hinterlegtem Link werden in der
            Materialliste als Icon angezeigt (sofern Affiliate aktiv ist). Feld leer = kein Icon.
          </p>
          @for (merchant of merchants; track merchant.id) {
            <label class="field">
              <span>{{ merchant.displayName }}</span>
              <input
                type="url"
                inputmode="url"
                [value]="offerUrls()[merchant.id]"
                (input)="setOfferUrl(merchant.id, $any($event.target).value)"
                placeholder="https://… (leer lassen für kein Angebot)"
              />
            </label>
          }
        </fieldset>

        @if (error()) {
          <p class="edit-error" role="alert">{{ error() }}</p>
        }
        @if (saved()) {
          <p class="edit-ok" role="status">Gespeichert ✓</p>
        }

        <div class="edit-actions">
          <button type="submit" [disabled]="saving()">
            {{ saving() ? 'Speichert …' : 'Speichern' }}
          </button>
          <a routerLink="/admin/material" class="edit-cancel">Abbrechen</a>
        </div>
      </form>
    }
  `,
  styles: [
    `
      .edit {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-width: 40rem;
      }

      .edit-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .edit-eyebrow {
        margin: 0;
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #6b7280;
      }

      .edit-head h2 {
        margin: 0.1rem 0 0.2rem;
        font-size: 1.2rem;
      }

      .edit-id {
        margin: 0;
        font-size: 0.8rem;
        color: #94a3b8;
      }

      .mono {
        font-family: ui-monospace, monospace;
      }

      .edit-back,
      .edit-cancel {
        font-size: 0.85rem;
        color: #4f46e5;
      }

      .field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
      }

      .field > span {
        font-weight: 600;
        color: #374151;
      }

      .field input,
      .field textarea {
        padding: 0.5rem 0.7rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.6rem;
        font: inherit;
      }

      .field-hint {
        color: #6b7280;
        font-size: 0.78rem;
      }

      .field-row {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .field-row .field {
        flex: 1 1 14rem;
      }

      .check {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        color: #374151;
      }

      .offers {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 0.9rem 1rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin: 0;
      }

      .offers legend {
        font-weight: 600;
        color: #374151;
        padding: 0 0.4rem;
        font-size: 0.9rem;
      }

      .offers-hint {
        margin: 0;
        font-size: 0.8rem;
        color: #6b7280;
      }

      .edit-error {
        margin: 0;
        color: #b91c1c;
        font-size: 0.85rem;
      }

      .edit-ok {
        margin: 0;
        color: #15803d;
        font-size: 0.85rem;
      }

      .edit-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .edit-actions button {
        padding: 0.55rem 1.2rem;
        border: none;
        border-radius: 0.6rem;
        background: #4f46e5;
        color: #fff;
        font-weight: 600;
        cursor: pointer;
      }

      .edit-actions button:disabled {
        opacity: 0.6;
        cursor: default;
      }

      .edit-missing {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
    `
  ]
})
export class AdminMaterialEditComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(CatalogService);
  private readonly repository = inject(ADMIN_CATALOG_REPOSITORY);

  private readonly original: MaterialCatalogItem | undefined;

  /** Alle bekannten Händler (OBI, toom, Amazon) – je Händler ein Link-Feld. */
  readonly merchants: Merchant[] = MERCHANTS;

  readonly materialId = signal('');
  readonly originalName = signal('');
  readonly notFound = signal(false);

  /** Affiliate-Link je Händler-ID; leer = kein Angebot für diesen Händler. */
  readonly offerUrls = signal<Record<MerchantId, string>>({
    obi: '',
    toom: '',
    amazon: ''
  });

  readonly name = signal('');
  readonly description = signal('');
  readonly unit = signal('');
  readonly priceAmount = signal('');
  readonly coverage = signal('');
  readonly includeInDiy = signal(false);
  readonly includeInProfessional = signal(false);
  readonly affiliateEligible = signal(false);
  readonly notes = signal('');

  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.materialId.set(id);
    const item = this.catalog.materialById(id);
    this.original = item;
    if (!item) {
      this.notFound.set(true);
      return;
    }
    this.originalName.set(item.name);
    this.name.set(item.name);
    this.description.set(item.description);
    this.unit.set(item.unit);
    this.priceAmount.set(item.price.amount === null ? '' : String(item.price.amount));
    this.coverage.set(
      typeof item.coverageM2PerPackage === 'number' ? String(item.coverageM2PerPackage) : ''
    );
    this.includeInDiy.set(item.includeInDiy);
    this.includeInProfessional.set(item.includeInProfessional);
    this.affiliateEligible.set(item.affiliateEligible);
    this.notes.set(item.notes);

    // Vorhandene Affiliate-Links je Händler in die Felder übernehmen.
    const existing = this.catalog.offersFor(id);
    const urls: Record<MerchantId, string> = { obi: '', toom: '', amazon: '' };
    for (const offer of existing) {
      urls[offer.merchantId] = offer.affiliateUrl ?? '';
    }
    this.offerUrls.set(urls);
  }

  setOfferUrl(merchantId: MerchantId, value: string): void {
    this.offerUrls.update((urls) => ({ ...urls, [merchantId]: value }));
  }

  async save(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.original || this.saving()) {
      return;
    }
    this.error.set(null);
    this.saved.set(false);

    const amount = this.parsePrice(this.priceAmount());
    if (amount === undefined) {
      this.error.set('Bitte einen gültigen Richtpreis (Zahl ≥ 0) oder leer eingeben.');
      return;
    }

    const coverage = this.parseCoverage(this.coverage());
    if (coverage === undefined) {
      this.error.set('Bitte eine gültige Reichweite (Zahl > 0) oder leer eingeben.');
      return;
    }

    const offers = this.collectOffers();
    if (offers === undefined) {
      this.error.set('Affiliate-Links müssen mit http:// oder https:// beginnen.');
      return;
    }

    const updated: MaterialCatalogItem = {
      ...this.original,
      name: this.name().trim(),
      description: this.description().trim(),
      unit: this.unit().trim(),
      price: { ...this.original.price, amount },
      coverageM2PerPackage: coverage,
      includeInDiy: this.includeInDiy(),
      includeInProfessional: this.includeInProfessional(),
      affiliateEligible: this.affiliateEligible(),
      notes: this.notes().trim()
    };

    this.saving.set(true);
    try {
      await this.repository.updateMaterial(updated);
      await this.repository.replaceMaterialOffers(updated.id, offers);
      await this.catalog.reload();
      this.saved.set(true);
      void this.router.navigate(['/admin/material']);
    } catch (err) {
      console.error('Material konnte nicht gespeichert werden:', err);
      this.error.set('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Baut den Affiliate-Angebotssatz aus den Feldern: nur nicht-leere Links, je
   * Händler einer. Ungültige URL (kein http/https) → undefined (Fehler).
   */
  private collectOffers(): AdminMaterialOffer[] | undefined {
    const urls = this.offerUrls();
    const offers: AdminMaterialOffer[] = [];
    for (const merchant of this.merchants) {
      const url = urls[merchant.id].trim();
      if (url === '') {
        continue;
      }
      if (!/^https?:\/\//i.test(url)) {
        return undefined;
      }
      offers.push({ merchantId: merchant.id, affiliateUrl: url });
    }
    return offers;
  }

  /** Leerer Wert → null (kein Preis); ungültig → undefined (Fehler). */
  private parsePrice(raw: string): number | null | undefined {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return null;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    return value;
  }

  /** Leer → null (Pauschale greift); ungültig oder ≤ 0 → undefined (Fehler). */
  private parseCoverage(raw: string): number | null | undefined {
    const trimmed = raw.trim();
    if (trimmed === '') {
      return null;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    return value;
  }
}
