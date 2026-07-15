import { Injectable, signal } from '@angular/core';
import {
  ContractorOffer,
  ContractorOfferSection,
  liftLegacyOfferAddress,
  offerGrossTotal
} from '../models/contractor-offer.model';
import {
  ContractorInvoice,
  ContractorInvoiceCustomer,
  ContractorInvoiceSeller,
  InvoiceSellerSource,
  SettledPayment,
  emptyInvoiceCustomer,
  invoiceDueDateIso,
  invoiceGrossTotal,
  invoiceNetAfterDiscount,
  invoiceTodayIso,
  invoiceVatAmount,
  normalizeContractorInvoice
} from '../models/contractor-invoice.model';

/** Verständliche Meldung für eine bereits vergebene Rechnungsnummer (Unique-Konflikt). */
export const INVOICE_DUPLICATE_NUMBER_MESSAGE =
  'Diese Rechnungsnummer ist bereits vergeben. Bitte wähle eine andere Nummer.';

/** Kaufmännisch auf zwei Nachkommastellen runden (wie die Modell-Summenhelfer). */
function round2(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

/** `0` für nicht-numerische/fehlende Werte (wie im Angebots-Modell). */
function toNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

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
   * Baut eine **Anzahlungsrechnung** (§ 14 Abs. 5 UStG) über einen Prozentsatz der
   * Angebots-Bruttosumme. Anders als {@link buildFromOffer} übernimmt sie **keine**
   * Positionen aus dem Angebot, sondern genau **eine** Sammelposition mit dem
   * gewünschten Netto-Betrag – der Nachlass ist bereits in der Zielsumme enthalten
   * (Rückrechnung aus dem Brutto), daher wird `discountPercent` hart auf `0` gesetzt,
   * um ihn nicht ein zweites Mal abzuziehen. (Delegiert an {@link buildAdvanceInvoice}
   * mit `kind: 'deposit'`; öffentliche Signatur unverändert.)
   */
  buildDepositInvoice(
    offer: ContractorOffer,
    profile: InvoiceSellerSource,
    existingNumbers: string[],
    percent: number
  ): ContractorInvoice {
    return this.buildAdvanceInvoice('deposit', offer, profile, existingNumbers, percent);
  }

  /**
   * Baut eine **Abschlagsrechnung** (§ 14 Abs. 5 UStG) – wie die Anzahlung eine
   * einzelne Sammelposition über einen Prozentsatz der Angebots-Bruttosumme, jedoch
   * mit fortlaufender `sequenceNumber` in Beschriftung/Hinweis (mehrere Abschläge je
   * Projekt üblich). Der Aufrufer zählt die Nummer hoch (z. B. aus vorhandenen
   * Abschlagsrechnungen des Angebots + 1).
   */
  buildPartialInvoice(
    offer: ContractorOffer,
    profile: InvoiceSellerSource,
    existingNumbers: string[],
    percent: number,
    sequenceNumber: number
  ): ContractorInvoice {
    return this.buildAdvanceInvoice('partial', offer, profile, existingNumbers, percent, sequenceNumber);
  }

  /**
   * Gemeinsamer Kern für Anzahlungs- (`deposit`) und Abschlagsrechnung (`partial`):
   * eine einzelne pauschale Netto-Sammelposition (Rückrechnung aus dem Ziel-Brutto),
   * `discountPercent: 0` und ein art-spezifischer § 14-Hinweistext. `sequenceNumber`
   * ist nur für `partial` relevant (Default 1).
   */
  private buildAdvanceInvoice(
    kind: 'deposit' | 'partial',
    offer: ContractorOffer,
    profile: InvoiceSellerSource,
    existingNumbers: string[],
    percent: number,
    sequenceNumber = 1
  ): ContractorInvoice {
    const vatPercent = toNumber(offer.vatPercent);
    const safePercent = Number.isFinite(percent) ? percent : 0;
    const grossTarget = round2(offerGrossTotal(offer) * safePercent / 100);
    const net = round2(grossTarget / (1 + vatPercent / 100));
    const reference = this.offerReference(offer);
    const isDeposit = kind === 'deposit';
    const percentText = this.formatPercent(safePercent);

    const sectionTitle = isDeposit ? 'Anzahlung' : 'Abschlag';
    const lineLabel = isDeposit
      ? `Anzahlung ${percentText} % auf Angebot ${reference}`
      : `Abschlagszahlung Nr. ${sequenceNumber} (${percentText} %) auf Angebot ${reference}`;

    const noteLead = isDeposit
      ? `Anzahlungsrechnung gemäß § 14 Abs. 5 UStG zum Angebot ${reference}.`
      : `Abschlagsrechnung Nr. ${sequenceNumber} gemäß § 14 Abs. 5 UStG zum Angebot ${reference}.`;
    const anrechnung = isDeposit
      ? 'Die Anzahlung wird in der Schlussrechnung angerechnet.'
      : 'Der Abschlag wird in der Schlussrechnung angerechnet.';
    const note = `${noteLead} ${anrechnung}`;
    const outroText = offer.outroText ? `${note}\n\n${offer.outroText}` : note;

    const section: ContractorOfferSection = {
      id: this.createId(),
      kind: 'custom',
      title: sectionTitle,
      lines: [
        {
          id: this.createId(),
          label: lineLabel,
          description: '',
          quantity: 1,
          unit: 'pauschal',
          unitPrice: net,
          isActive: true,
          isOptional: false,
          origin: 'custom'
        }
      ]
    };

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
      kind,
      vatPercent,
      discountPercent: 0,
      sections: [section],
      customer: this.parseCustomer(offer.customer),
      seller: this.sellerFromProfile(profile),
      introText: '',
      outroText
    });
  }

  /**
   * Baut die **Schlussrechnung** (§ 14 Abs. 5 UStG): die volle Rechnung aus dem
   * Angebot (Wiederverwendung von {@link buildFromOffer}), angereichert um `kind:
   * 'final'` und einen **eingefrorenen** Snapshot der bereits gestellten Anzahlungs-/
   * Abschlagsrechnungen (`settledPayments`).
   *
   * Angerechnet werden Vor-Rechnungen mit **gleicher `offerId`** und entweder
   * `kind` ∈ {`deposit`, `partial`} **oder** – als Fallback für Alt-Anzahlungen ohne
   * `kind`-Feld – einem **Legacy-Fingerprint**: genau EINE Section mit
   * `kind === 'custom' && title === 'Anzahlung'`. Der Fingerprint kann in seltenen
   * Fällen handgebaute Einzel-„Anzahlung"-Sections fälschlich einfangen (akzeptierte
   * False-Positives); der Nutzer korrigiert das über das Löschen der Anrechnung.
   *
   * **Alle** Vor-Rechnungen fließen ein – auch Entwürfe: Der Nutzer steuert die
   * Anrechnung, indem er nicht (mehr) relevante Rechnungen löscht.
   *
   * Die Beträge (`grossAmount`/`netAmount`/`vatAmount`) werden **zum Erstellzeitpunkt
   * eingefroren** und danach nie neu berechnet.
   */
  buildFinalInvoice(
    offer: ContractorOffer,
    profile: InvoiceSellerSource,
    existingNumbers: string[],
    priorInvoices: ContractorInvoice[]
  ): ContractorInvoice {
    const base = this.buildFromOffer(offer, profile, existingNumbers);
    const settledPayments = this.collectSettledPayments(offer.id ?? null, priorInvoices);
    const reference = this.offerReference(offer);
    const note =
      `Schlussrechnung zum Angebot ${reference}. ` +
      'Bereits gestellte Abschlags-/Anzahlungsrechnungen sind unten angerechnet.';
    const outroText = offer.outroText ? `${note}\n\n${offer.outroText}` : note;

    return normalizeContractorInvoice({
      ...base,
      kind: 'final',
      settledPayments,
      outroText
    });
  }

  /**
   * Sammelt die angerechneten Teilentgelte aus den Vor-Rechnungen des Angebots,
   * friert je Rechnung die Beträge ein und sortiert nach Rechnungsdatum.
   */
  private collectSettledPayments(
    offerId: string | null,
    priorInvoices: ContractorInvoice[]
  ): SettledPayment[] {
    return priorInvoices
      .filter((invoice) => this.isSettleableAdvance(offerId, invoice))
      .map((invoice) => this.toSettledPayment(invoice))
      .sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));
  }

  /** Ob eine Vor-Rechnung als Anzahlung/Abschlag dieses Angebots anzurechnen ist. */
  private isSettleableAdvance(offerId: string | null, invoice: ContractorInvoice): boolean {
    const target = (offerId ?? '').trim();
    if (target === '' || (invoice.offerId ?? '').trim() !== target) {
      return false;
    }
    if (invoice.kind === 'deposit' || invoice.kind === 'partial') {
      return true;
    }
    // Legacy: Anzahlung ohne `kind`-Feld (normalize setzt sie auf 'standard').
    if (invoice.kind === undefined || invoice.kind === 'standard') {
      return this.hasLegacyDepositFingerprint(invoice);
    }
    return false;
  }

  /** Legacy-Fingerprint: genau EINE Custom-Section mit dem Titel „Anzahlung". */
  private hasLegacyDepositFingerprint(invoice: ContractorInvoice): boolean {
    const depositSections = invoice.sections.filter(
      (section) => section.kind === 'custom' && section.title === 'Anzahlung'
    );
    return depositSections.length === 1;
  }

  /** Friert die Beträge einer Vor-Rechnung als {@link SettledPayment} ein. */
  private toSettledPayment(invoice: ContractorInvoice): SettledPayment {
    return {
      invoiceId: invoice.id ?? '',
      invoiceNumber: invoice.invoiceNumber,
      kind: invoice.kind ?? 'standard',
      invoiceDate: invoice.invoiceDate,
      grossAmount: invoiceGrossTotal(invoice),
      netAmount: invoiceNetAfterDiscount(invoice),
      vatAmount: invoiceVatAmount(invoice)
    };
  }

  /** Angebots-Kennung für Anzahlungs-Referenztexte: Nummer, sonst Label, sonst Projektname. */
  private offerReference(offer: ContractorOffer): string {
    const offerNumber = offer.offerNumber?.trim();
    if (offerNumber) {
      return offerNumber;
    }
    const label = offer.label?.trim();
    if (label) {
      return label;
    }
    return offer.projectName;
  }

  /** Prozentwert ohne unnötige Nachkommastellen für Positionstexte (`30`, `12.5`, …). */
  private formatPercent(percent: number): string {
    return String(Math.round(percent * 100) / 100);
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

  /**
   * Baut den Verkäufer-Snapshot aus einer Firmenprofil-Quelle. Öffentlich, damit
   * die Rechnungsseite den Snapshot einer bereits bestehenden Rechnung auf
   * bewusste Nutzeraktion („Firmendaten aus Profil aktualisieren") neu befüllen
   * kann – ohne das § 14-Snapshot-Prinzip für automatisch/still zu unterlaufen.
   */
  sellerFromProfile(profile: InvoiceSellerSource): ContractorInvoiceSeller {
    return {
      companyName: profile.companyName ?? '',
      contactName: profile.contactName ?? '',
      street: profile.street ?? '',
      postalCode: profile.postalCode ?? '',
      city: profile.city ?? '',
      countryCode: (profile.countryCode ?? 'DE').trim().toUpperCase() || 'DE',
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
   * Überführt die Angebots-Anschrift in die strukturierten Käuferfelder. Sind die
   * strukturierten Felder des Angebots gepflegt (neues Modell), werden sie **direkt
   * kopiert** (inkl. E-Mail); sonst greift der Legacy-Fallback über die geteilte
   * PLZ-Zeilen-Heuristik ({@link liftLegacyOfferAddress}) auf das Freitextfeld
   * `address`. Editierbar auf der Rechnungsseite.
   */
  private parseCustomer(
    source: ContractorOffer['customer']
  ): ContractorInvoiceCustomer {
    const customer = emptyInvoiceCustomer();
    customer.name = source?.name?.trim() ?? '';
    const hasStructured = !!(
      source?.street?.trim() ||
      source?.postalCode?.trim() ||
      source?.city?.trim()
    );
    if (hasStructured) {
      customer.street = source?.street?.trim() ?? '';
      customer.postalCode = source?.postalCode?.trim() ?? '';
      customer.city = source?.city?.trim() ?? '';
      customer.countryCode = source?.countryCode?.trim() || 'DE';
      customer.email = source?.email?.trim() ?? '';
      return customer;
    }
    // Legacy: mehrzeiliger Freitext → strukturierte Felder (geteilte Heuristik).
    const lifted = liftLegacyOfferAddress(source?.address);
    customer.street = lifted.street;
    customer.postalCode = lifted.postalCode;
    customer.city = lifted.city;
    if (source?.email?.trim()) {
      customer.email = source.email.trim();
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
