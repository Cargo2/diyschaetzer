import { Injectable, signal } from '@angular/core';
import { ContractorOffer } from '../models/contractor-offer.model';
import {
  ContractorInvoice,
  ContractorInvoiceCustomer,
  ContractorInvoiceSeller,
  InvoiceSellerSource,
  emptyInvoiceCustomer,
  invoiceDueDateIso,
  invoiceTodayIso,
  normalizeContractorInvoice
} from '../models/contractor-invoice.model';

/** Verständliche Meldung für eine bereits vergebene Rechnungsnummer (Unique-Konflikt). */
export const INVOICE_DUPLICATE_NUMBER_MESSAGE =
  'Diese Rechnungsnummer ist bereits vergeben. Bitte wähle eine andere Nummer.';

/**
 * Baut Rechnungen aus gespeicherten Angeboten, schlägt fortlaufende Nummern vor
 * und mappt DB-Unique-Konflikte. Die Summen werden – wie beim Angebot – aus dem
 * Modell abgeleitet (`invoiceNetTotal` etc.), nicht hier gespeichert.
 *
 * Zusätzlich hält der Service die frisch erzeugte, noch **ungespeicherte** Rechnung
 * für die Übergabe „Angebots-Editor → /rechnungen" (Handoff), damit sie beim
 * Navigieren nicht verloren geht.
 */
@Injectable({ providedIn: 'root' })
export class ContractorInvoiceService {
  private readonly pending = signal<ContractorInvoice | null>(null);

  /**
   * Erzeugt eine Rechnung aus einem gespeicherten Angebot. Übernommen werden **nur
   * aktive Pflichtpositionen** – Bedarfspositionen (`isOptional`) und deaktivierte
   * Zeilen fliegen raus (nicht beauftragt = nicht berechnet). Gruppen ohne
   * verbleibende Positionen entfallen. Preise/MwSt./Nachlass/Nummerierung wie im
   * Angebot; die Summen leiten sich neu ab.
   *
   * Der `profile`-Parameter ist bewusst der **strukturelle** {@link InvoiceSellerSource}
   * (nicht `CompanyProfile`), damit dieser Code nicht an der additiven Modell-
   * Erweiterung (`taxNumber`/`iban`/`bic`/`bankName`, Migration 0021) hängt.
   */
  buildFromOffer(
    offer: ContractorOffer,
    profile: InvoiceSellerSource,
    existingNumbers: string[]
  ): ContractorInvoice {
    const sections = offer.sections
      .map((section) => ({
        ...section,
        lines: section.lines
          .filter((line) => line.isActive && line.isOptional !== true)
          .map((line) => ({ ...line }))
      }))
      .filter((section) => section.lines.length > 0);

    return normalizeContractorInvoice({
      id: this.createId(),
      projectId: offer.projectId || null,
      offerId: offer.id || null,
      projectName: offer.projectName,
      invoiceNumber: this.nextInvoiceNumber(existingNumbers),
      invoiceDate: invoiceTodayIso(),
      serviceDate: invoiceTodayIso(),
      servicePeriodStart: '',
      servicePeriodEnd: '',
      dueDate: invoiceDueDateIso(14),
      buyerReference: 'n/a',
      status: 'draft',
      vatPercent: offer.vatPercent,
      discountPercent: offer.discountPercent ?? 0,
      sections,
      customer: this.parseCustomer(offer.customer),
      seller: this.sellerFromProfile(profile),
      introText: '',
      outroText: offer.outroText ?? ''
    });
  }

  /**
   * Schlägt die nächste Rechnungsnummer `RE-<JJJJ>-<lfd>` vor: höchste bereits
   * vergebene laufende Nummer des aktuellen Jahres + 1, dreistellig aufgefüllt.
   */
  nextInvoiceNumber(existing: string[], year: number = new Date().getFullYear()): string {
    const prefix = `RE-${year}-`;
    const maxRunning = existing
      .filter((number) => number.startsWith(prefix))
      .map((number) => Number.parseInt(number.slice(prefix.length), 10))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);
    return `${prefix}${String(maxRunning + 1).padStart(3, '0')}`;
  }

  /** Erkennt einen DB-Unique-Konflikt auf `(owner_id, invoice_number)`. */
  isDuplicateNumberError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
      if (String((error as { code: unknown }).code) === '23505') {
        return true;
      }
    }
    const message = this.messageOf(error).toLowerCase();
    return message.includes('duplicate key') || message.includes('unique');
  }

  // ---- Handoff: Angebots-Editor → /rechnungen ------------------------------

  /** Legt die frisch erzeugte Rechnung für die Übernahme auf /rechnungen ab. */
  setPending(invoice: ContractorInvoice): void {
    this.pending.set(invoice);
  }

  /** Holt die übergebene Rechnung **einmalig** ab (danach geleert). */
  takePending(): ContractorInvoice | null {
    const value = this.pending();
    this.pending.set(null);
    return value;
  }

  // ---- intern --------------------------------------------------------------

  private sellerFromProfile(profile: InvoiceSellerSource): ContractorInvoiceSeller {
    return {
      companyName: profile.companyName ?? '',
      contactName: profile.contactName ?? '',
      street: profile.street ?? '',
      postalCode: profile.postalCode ?? '',
      city: profile.city ?? '',
      countryCode: 'DE',
      phone: profile.phone ?? '',
      email: profile.email ?? '',
      website: profile.website ?? '',
      vatId: profile.vatId ?? '',
      taxNumber: profile.taxNumber ?? '',
      iban: profile.iban ?? '',
      bic: profile.bic ?? '',
      bankName: profile.bankName ?? ''
    };
  }

  /**
   * Best-Effort-Zerlegung der mehrzeiligen Angebots-Anschrift in die
   * strukturierten Käuferfelder (name/street/PLZ/Ort). Editierbar auf der Seite.
   */
  private parseCustomer(
    source: ContractorOffer['customer']
  ): ContractorInvoiceCustomer {
    const customer = emptyInvoiceCustomer();
    customer.name = source?.name?.trim() ?? '';
    const lines = (source?.address ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length === 0) {
      return customer;
    }
    // Letzte Zeile mit „PLZ Ort" (4–5 Ziffern + Rest) als Ort interpretieren.
    const cityLineIndex = lines.findIndex((line) => /^\d{4,5}\s+\S/.test(line));
    if (cityLineIndex >= 0) {
      const match = /^(\d{4,5})\s+(.+)$/.exec(lines[cityLineIndex]);
      if (match) {
        customer.postalCode = match[1];
        customer.city = match[2].trim();
      }
      const streetParts = lines.filter((_, index) => index !== cityLineIndex);
      customer.street = streetParts.join(' ');
    } else {
      customer.street = lines.join(' ');
    }
    return customer;
  }

  private messageOf(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return String(error);
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.()
      ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}
