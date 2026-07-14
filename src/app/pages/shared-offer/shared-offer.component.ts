import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ExportDocumentData,
  ExportOfferGroup
} from '../../models/export-document.model';
import { ContractorOfferShareService } from '../../services/contractor-offer-share.service';

const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 120;

/**
 * Öffentliche, schreibgeschützte Ansicht eines geteilten Angebots (Phase 13).
 * Lädt das eingefrorene Exportdokument per Token (ohne Login) und rendert das
 * Leistungsverzeichnis inkl. Kopf, Summen und Rechtshinweis. Seit Phase (S2)
 * zählt sie zusätzlich einen View-Ping und bietet die digitale, verbindliche
 * Annahme des Angebots (Name + Zeitstempel, set-once serverseitig).
 */
@Component({
  selector: 'app-shared-offer',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './shared-offer.component.html',
  styleUrl: './shared-offer.component.css'
})
export class SharedOfferComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly shareService = inject(ContractorOfferShareService);

  private token: string | null = null;

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly doc = signal<ExportDocumentData | null>(null);

  /** Annahme-Status (aus dem Laden oder nach erfolgreichem `accept()`). */
  readonly acceptedAt = signal<string | null>(null);
  readonly acceptedByName = signal<string>('');

  /** Formular-State für die Annahme. */
  readonly acceptName = signal('');
  readonly accepting = signal(false);
  readonly acceptError = signal<string | null>(null);

  /** Positionsgruppen des Leistungsverzeichnisses. */
  readonly groups = computed<ExportOfferGroup[]>(() => {
    const section = this.doc()?.sections.find((entry) => entry.type === 'offer');
    return Array.isArray(section?.content) ? (section!.content as ExportOfferGroup[]) : [];
  });

  readonly isAccepted = computed(() => this.acceptedAt() !== null);

  /** Client-seitige Validierung: 2–120 Zeichen (nach Trim), analog zum Server. */
  readonly nameValid = computed(() => {
    const len = this.acceptName().trim().length;
    return len >= NAME_MIN_LENGTH && len <= NAME_MAX_LENGTH;
  });

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token');
    this.token = token;
    if (!token) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    try {
      const page = await this.shareService.loadSharePage(token);
      if (page) {
        this.doc.set(page.data);
        this.acceptedAt.set(page.acceptedAt);
        this.acceptedByName.set(page.acceptedByName);
      } else {
        // Fallback: alte Lademethode (z. B. Migration für Tracking/Annahme noch
        // nicht angewendet → RPC fehlt). Ohne Annahme-Features, aber die Seite
        // funktioniert weiterhin.
        const legacy = await this.shareService.loadShare(token);
        if (legacy) {
          this.doc.set(legacy);
        } else {
          this.notFound.set(true);
        }
      }
    } catch (error) {
      console.error('Geteiltes Angebot konnte nicht per loadSharePage geladen werden, versuche Fallback:', error);
      try {
        const legacy = await this.shareService.loadShare(token);
        if (legacy) {
          this.doc.set(legacy);
        } else {
          this.notFound.set(true);
        }
      } catch (fallbackError) {
        console.error('Geteiltes Angebot konnte nicht geladen werden:', fallbackError);
        this.notFound.set(true);
      }
    } finally {
      this.loading.set(false);
      if (!this.notFound() && this.token) {
        // Fire-and-forget: Aufruf zählen, nicht Teil des kritischen Ladepfads.
        void this.shareService.pingView(this.token);
      }
    }
  }

  async submitAcceptance(): Promise<void> {
    if (!this.token || !this.nameValid() || this.accepting()) {
      return;
    }
    this.accepting.set(true);
    this.acceptError.set(null);
    try {
      const result = await this.shareService.accept(this.token, this.acceptName().trim());
      if (result) {
        this.acceptedAt.set(result.acceptedAt);
        this.acceptedByName.set(result.acceptedByName);
      } else {
        this.acceptError.set(
          'Die Annahme konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.'
        );
      }
    } catch (error) {
      console.error('Angebot konnte nicht angenommen werden:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('invalid_name')) {
        this.acceptError.set('Bitte geben Sie Ihren Vor- und Nachnamen ein (2–120 Zeichen).');
      } else {
        this.acceptError.set(
          'Die Annahme konnte nicht übermittelt werden. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
        );
      }
    } finally {
      this.accepting.set(false);
    }
  }

  eur(value: number | undefined | null): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }

  num(value: number, digits = 2): string {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(Number.isFinite(value) ? value : 0);
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  unitLabel(unit: string): string {
    return (
      { pauschal: 'pauschal', m2: 'm²', lfm: 'lfm', piece: 'Stück', hour: 'Std.' }[unit] ?? unit
    );
  }
}
