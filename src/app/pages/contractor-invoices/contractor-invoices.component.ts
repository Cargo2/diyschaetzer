import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ContractorInvoice,
  ContractorInvoiceKind,
  ContractorInvoiceStatus,
  CONTRACTOR_INVOICE_STATUS_LABELS,
  hasXRechnungServiceDate,
  invoiceAsOffer,
  invoiceDiscountAmount,
  invoiceGrossTotal,
  invoiceNetAfterDiscount,
  invoiceNetTotal,
  invoicePayableGross,
  invoiceSettledGross,
  invoiceVatAmount,
  isGermanInvoiceSeller,
  isLikelyMalformedLeitwegId,
  listMissingXRechnungFields,
  listMissingXRechnungSellerFields,
  normalizeContractorInvoice,
  sanitizeContractorInvoice,
  SettledPayment
} from '../../models/contractor-invoice.model';
import {
  ContractorOffer,
  ContractorOfferLine,
  ContractorOfferSection,
  offerLineNumber,
  offerLineTotal,
  offerPositionNumber,
  offerSectionSubtotal
} from '../../models/contractor-offer.model';
import { ProfessionalLineItemUnit } from '../../services/professional-offer.service';
import {
  ContractorInvoiceService,
  INVOICE_DUPLICATE_NUMBER_MESSAGE
} from '../../services/contractor-invoice.service';
import { CompanyProfileService } from '../../services/company-profile.service';
import { CONTRACTOR_INVOICE_REPOSITORY } from '../../data-access/contractor-invoice-repository';
import { CONTRACTOR_OFFER_REPOSITORY } from '../../data-access/contractor-offer-repository';
import { SubscriptionStatusService } from '../../services/subscription-status.service';
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { ContractorBrandingService } from '../../services/contractor-branding.service';
import { XRechnungExportService } from '../../services/xrechnung-export.service';
import { InvoiceExportService } from '../../services/invoice-export.service';
import { ExportDocumentData } from '../../models/export-document.model';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/**
 * Eine nach Herkunftsangebot gruppierte Rechnungskette (Anzahlung → Abschlag →
 * Schlussrechnung). Rein abgeleitetes ViewModel, wird nie gespeichert.
 */
interface InvoiceGroup {
  /** Gruppierungsschlüssel: `offerId` bzw. `'__none__'` für Rechnungen ohne Angebot. */
  key: string;
  /** `true` für die Sammelgruppe „Weitere Rechnungen" (Rechnungen ohne Angebotsbezug). */
  isNone: boolean;
  /** Projektname (Gruppentitel); leer bei der Sammelgruppe. */
  title: string;
  /** Rechnungen der Gruppe, chronologisch nach Rechnungsdatum aufsteigend. */
  invoices: ContractorInvoice[];
  /** Jüngstes Rechnungsdatum der Gruppe (steuert die Gruppen-Sortierung). */
  latestDate: string;
  /**
   * Ehrliche „Σ gestellt"-Summe ohne Doppelzählung: Anzahlungen/Abschläge/
   * Standardrechnungen mit vollem Brutto, Schlussrechnungen nur mit dem
   * verbleibenden Restbetrag ({@link invoicePayableGross}), da deren angerechnete
   * Teilentgelte bereits über die Vor-Rechnungen gestellt wurden.
   */
  billedTotal: number;
  /**
   * Abgeleiteter Bezahlt-Status der Rechnungskette – rein aus den Rechnungsstatus
   * berechnet, NIE persistiert (die Gruppe ist kein DB-Objekt, kein Phantom-Datensatz):
   * `'paid'` = alle Rechnungen bezahlt, `'partial'` = manche bezahlt, `'open'` = keine.
   */
  paidState: 'paid' | 'partial' | 'open';
}

/**
 * Rechnungsmodul (M12). Nur über den contractorGuard erreichbar. Rechnungen
 * entstehen aus gespeicherten Angeboten („Als Rechnung übernehmen") und werden
 * hier verwaltet: gruppierte Liste + editierbarer Rechnungskopf/Positionen, PDF-
 * und XRechnung-Download, Löschen. Ohne Angebots-Übernahme zeigt die Seite die Liste.
 */
@Component({
  selector: 'app-contractor-invoices',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, RouterLink, PremiumExportButtonComponent, TranslatePipe],
  templateUrl: './contractor-invoices.component.html',
  styleUrl: './contractor-invoices.component.css'
})
export class ContractorInvoicesComponent implements OnInit {
  private readonly repository = inject(CONTRACTOR_INVOICE_REPOSITORY);
  private readonly offerRepository = inject(CONTRACTOR_OFFER_REPOSITORY);
  private readonly invoiceService = inject(ContractorInvoiceService);
  private readonly companyProfile = inject(CompanyProfileService);
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly branding = inject(ContractorBrandingService);
  private readonly xrechnung = inject(XRechnungExportService);
  private readonly invoiceExport = inject(InvoiceExportService);
  private readonly subscriptionStatus = inject(SubscriptionStatusService);
  private readonly i18n = inject(I18nService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly refreshingSeller = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);
  /** `true`, wenn die aktuelle Rechnung aus der DB geladen wurde (nicht frisch übernommen). */
  readonly loadedFromDb = signal(false);
  /** Alle Rechnungen des Profis (neueste zuerst). */
  readonly invoices = signal<ContractorInvoice[]>([]);
  /** ID der Rechnung, die gerade als „bezahlt" markiert wird (Busy-Guard). */
  readonly markingPaidId = signal<string | null>(null);

  // ---- Datenexport (ZIP: PDFs + XRechnung-XMLs + CSV-Übersicht) -------------
  /** Optionaler Zeitraum-Filter (ISO `yyyy-mm-dd`); leer = offen. */
  exportDateFrom = '';
  exportDateTo = '';
  /** Optionaler Rechnungsnummern-Filter (String-Bereich); leer = offen. */
  exportNumberFrom = '';
  exportNumberTo = '';
  /** Läuft der ZIP-Export gerade? Sperrt die Sektion nur während des Exports. */
  readonly exporting = signal(false);
  /** Zahl der zuletzt exportierten Rechnungen (für die Ergebnismeldung). */
  readonly exportedCount = signal(0);
  /** Ergebnis der letzten Exportaktion (steuert die Meldung). */
  readonly exportState = signal<'success' | 'empty' | 'error' | null>(null);

  /**
   * Bezahlt-Lock: `true`, sobald die im Editor offene Rechnung **bezahlt und
   * gespeichert** ist – dann ist sie unveränderlich (§-14-Snapshot bleibt ehrlich).
   * Bewusst ein Signal, NICHT aus `invoice.status` abgeleitet: der Lock greift erst
   * NACH dem Speichern, nicht schon beim Wählen von „Bezahlt" im Status-Dropdown.
   * Gesetzt an genau drei Stellen: {@link setWorking} (Laden), {@link save} (nach
   * erfolgreichem Speichern) und – via `setWorking` – in {@link markPaid}.
   */
  readonly paidLock = signal(false);

  /**
   * Premium-Nur-Lese-Modus (client-seitig v1): ohne aktives Abo ist das
   * Rechnungs-SCHREIBEN gesperrt (Ansehen/PDF/XML/Export bleiben frei). Bewusst
   * hier direkt aus dem {@link SubscriptionStatusService} abgeleitet und NICHT
   * über `FeatureAccessService`, um den Zyklus FeatureAccess ↔ SubscriptionStatus
   * zu vermeiden (SubscriptionStatusService injiziert FeatureAccessService bereits).
   */
  readonly readOnly = computed(() => !this.subscriptionStatus.isActive());

  /**
   * Kombinierte Bearbeitbarkeit: nur wenn die Rechnung weder bezahlt-gesperrt noch
   * abo-schreibgeschützt ist. Die Editor-Templates binden EINHEITLICH hieran, statt
   * `paidLock`/`readOnly` doppelt zu streuen.
   */
  readonly editable = computed(() => !this.paidLock() && !this.readOnly());

  /**
   * Angebote des Profis nach `id` (projektübergreifend), einmalig beim Laden geholt.
   * Basis der Live-Gruppenüberschrift: Wird ein Angebot umbenannt, folgt der
   * Rechnungs-Gruppenkopf dem **aktuellen** Angebotsnamen statt dem eingefrorenen
   * `invoice.projectName`. Leer (Backend-Fehler) ⇒ Fallback auf den Snapshot-Namen.
   */
  readonly offersById = signal<Map<string, ContractorOffer>>(new Map());
  /**
   * Key der aktuell aufgeklappten Rechnungskette (Accordion – höchstens EINE Gruppe
   * gleichzeitig offen; `null` = alle zu). Die Sammelgruppe „Weitere Rechnungen"
   * (`__none__`) rendert ihre Zeilen immer flach und ignoriert dieses Signal.
   */
  readonly expandedGroupKey = signal<string | null>(null);

  /**
   * Rechnungen nach Herkunftsangebot gruppiert (ZONELESS: rein aus dem
   * unveränderlichen `invoices`-Signal abgeleitet, NIE aus dem mutablen
   * `invoice`-Editorfeld). Sammelgruppe „Weitere Rechnungen" (`__none__`) zuletzt,
   * sonst neueste Aktivität zuerst; innerhalb der Gruppe chronologisch aufsteigend.
   */
  readonly groupedInvoices = computed<InvoiceGroup[]>(() => {
    const buckets = new Map<string, ContractorInvoice[]>();
    for (const invoice of this.invoices()) {
      const key = invoice.offerId ?? '__none__';
      const bucket = buckets.get(key) ?? [];
      bucket.push(invoice);
      buckets.set(key, bucket);
    }
    const groups: InvoiceGroup[] = [];
    for (const [key, list] of buckets) {
      const sorted = [...list].sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));
      const latest = sorted[sorted.length - 1];
      const paidCount = sorted.filter((invoice) => invoice.status === 'paid').length;
      groups.push({
        key,
        isNone: key === '__none__',
        title: key === '__none__' ? '' : latest?.projectName ?? '',
        invoices: sorted,
        latestDate: latest?.invoiceDate ?? '',
        billedTotal: sorted.reduce(
          (sum, invoice) =>
            sum + (invoice.kind === 'final' ? invoicePayableGross(invoice) : invoiceGrossTotal(invoice)),
          0
        ),
        paidState: paidCount === sorted.length ? 'paid' : paidCount > 0 ? 'partial' : 'open'
      });
    }
    groups.sort((a, b) => {
      if (a.isNone !== b.isNone) {
        return a.isNone ? 1 : -1;
      }
      return b.latestDate.localeCompare(a.latestDate);
    });
    return groups;
  });

  /** Editierbare Arbeitskopie der aktuellen Rechnung. */
  invoice: ContractorInvoice | null = null;
  confirmingDeleteId: string | null = null;
  /** ID der Rechnung, deren „Bezahlt markieren" gerade bestätigt werden soll. */
  confirmingMarkPaidId: string | null = null;

  /**
   * Aufgabe X1: XRechnung ist nur für Betriebe mit Sitz in Deutschland relevant
   * (Verkäufer-Snapshot der Rechnung). Nicht-deutsche Betriebe sollen nicht mit
   * Pflichtfeld-Warnungen gegängelt werden – die gesamte XRechnung-UI blendet aus.
   */
  xrApplicable(): boolean {
    return this.invoice !== null && isGermanInvoiceSeller(this.invoice.seller);
  }

  /** Fehlende XRechnung-Pflichtfelder (leer = Download freigegeben). */
  xrMissingFields(): string[] {
    return this.invoice ? listMissingXRechnungFields(this.invoice) : [];
  }

  /** {@link xrMissingFields}, aber jedes Feld übersetzt und für die Anzeige verbunden. */
  xrMissingFieldsLabel(): string {
    return this.xrMissingFields()
      .map((field) => this.i18n.t(field))
      .join(', ');
  }

  xrBlocked(): boolean {
    return this.invoice === null || this.xrMissingFields().length > 0;
  }

  /** Fehlen Verkäuferfelder, hilft nur das Firmenprofil (Snapshot-Quelle). */
  xrSellerIncomplete(): boolean {
    return this.invoice !== null && listMissingXRechnungSellerFields(this.invoice.seller).length > 0;
  }

  /** § 14 UStG: Leistungsdatum ODER vollständiger Leistungszeitraum ist Pflicht. */
  xrServiceDateMissing(): boolean {
    return this.invoice !== null && !hasXRechnungServiceDate(this.invoice);
  }

  /** Fehlt dem Rechnungsempfänger die E-Mail (BT-49, Pflicht für den XRechnung-Versand). */
  xrCustomerEmailMissing(): boolean {
    return this.invoice !== null && this.isBlank(this.invoice.customer.email);
  }

  /** Soft-Validierung Käuferreferenz: sieht nach einer Leitweg-ID aus, entspricht aber nicht dem Format. */
  buyerReferenceLooksMalformed(): boolean {
    return this.invoice !== null && isLikelyMalformedLeitwegId(this.invoice.buyerReference);
  }

  isBlank(value: string | null | undefined): boolean {
    return !value || value.trim().length === 0;
  }

  readonly statusOptions: { value: ContractorInvoiceStatus; label: string }[] = [
    { value: 'draft', label: CONTRACTOR_INVOICE_STATUS_LABELS.draft },
    { value: 'sent', label: CONTRACTOR_INVOICE_STATUS_LABELS.sent },
    { value: 'paid', label: CONTRACTOR_INVOICE_STATUS_LABELS.paid }
  ];

  readonly unitOptions: { value: ProfessionalLineItemUnit; label: string }[] = [
    { value: 'pauschal', label: 'pauschal' },
    { value: 'm2', label: 'm²' },
    { value: 'lfm', label: 'lfm' },
    { value: 'piece', label: 'Stück' },
    { value: 'hour', label: 'Std.' }
  ];

  /** Liefert das Exportdokument erst beim Klick (immer der aktuelle, bereinigte Stand). */
  readonly exportDocumentFn = (): ExportDocumentData | null =>
    this.invoice && !this.xrServiceDateMissing() ? this.buildExportData() : null;

  async ngOnInit(): Promise<void> {
    // Frisch aus dem Angebot übernommene (noch ungespeicherte) Rechnung abholen.
    const pending = this.invoiceService.takePending();
    // Abo-Status für den Nur-Lese-Modus laden (No-op ohne Browser/Supabase/Profi).
    await this.subscriptionStatus.ensureLoaded();
    await this.loadList();
    // Angebots-Metadaten (für die Live-Gruppenüberschrift) parallel/danach – Fehler geschluckt.
    await this.loadOffersMeta();
    if (pending) {
      this.setWorking(pending, false);
    } else if (this.invoices().length > 0) {
      this.setWorking(this.invoices()[0], true);
    }
    this.loading.set(false);
  }

  /**
   * Lädt alle Angebote des Profis (projektübergreifend) und indiziert sie nach
   * `id` für die Live-Gruppenüberschrift. Fehler werden geschluckt – dann greift
   * der Fallback auf den eingefrorenen `invoice.projectName` der Gruppe.
   */
  private async loadOffersMeta(): Promise<void> {
    try {
      const offers = await this.offerRepository.listMine();
      const map = new Map<string, ContractorOffer>();
      for (const offer of offers) {
        if (offer.id) {
          map.set(offer.id, offer);
        }
      }
      this.offersById.set(map);
    } catch {
      // Backend offline o. Ä.: Gruppenkopf nutzt den eingefrorenen Snapshot-Namen.
    }
  }

  /**
   * Live-Gruppenüberschrift einer Rechnungskette: folgt dem **aktuellen**
   * Angebot (Umbenennung), sofern es (noch) existiert. Darstellung bewusst schlank:
   * `„AN-… · Projektname"` (Angebotsnummer nur wenn vergeben; Versions-`label` nur
   * ergänzt, wenn gesetzt und ungleich dem Namen). Ohne Angebotstreffer (gelöscht /
   * Backend-Fehler) bleibt der eingefrorene `invoice.projectName` der Gruppe stehen.
   */
  groupHeader(group: InvoiceGroup): string {
    const offer = this.offersById().get(group.key);
    if (!offer) {
      return group.title || '—';
    }
    const name = (offer.projectName || group.title || '—').trim();
    const number = offer.offerNumber?.trim();
    const label = offer.label?.trim();
    let header = number ? `${number} · ${name}` : name;
    if (label && label !== name) {
      header += ` · ${label}`;
    }
    return header;
  }

  private async loadList(): Promise<void> {
    try {
      const list = (await this.repository.listMine()).map((invoice) =>
        normalizeContractorInvoice(invoice)
      );
      this.invoices.set(list);
    } catch {
      // Backend offline o. Ä.: mit dem bisherigen Stand weiterarbeiten.
    }
  }

  private setWorking(invoice: ContractorInvoice, fromDb: boolean): void {
    this.invoice = normalizeContractorInvoice({ ...invoice });
    this.loadedFromDb.set(fromDb);
    // Bezahlt-Lock nur für eine gespeicherte, bereits bezahlte Rechnung (greift auch
    // nach markPaid, das über diese Methode einspeist); frische/übernommene: kein Lock.
    this.paidLock.set(fromDb && this.invoice.status === 'paid');
    // Kette der geöffneten Rechnung automatisch aufklappen, damit die aktive Zeile
    // sichtbar ist (greift bei initialem Laden, takePending, selectInvoice, markPaid).
    this.expandedGroupKey.set(this.invoice.offerId ?? '__none__');
  }

  /**
   * Accordion-Umschalter der Rechnungskette: öffnet die geklickte Gruppe und schließt
   * damit implizit jede andere (nur der Key wird ersetzt); ein erneuter Klick auf die
   * bereits offene Gruppe schließt sie.
   */
  toggleGroup(key: string): void {
    this.expandedGroupKey.set(this.expandedGroupKey() === key ? null : key);
  }

  isGroupExpanded(key: string): boolean {
    return this.expandedGroupKey() === key;
  }

  selectInvoice(id: string): void {
    const entry = this.invoices().find((invoice) => invoice.id === id);
    if (entry) {
      this.resetFeedback();
      this.setWorking(entry, true);
    }
  }

  isCurrent(id: string | undefined): boolean {
    return !!id && this.invoice?.id === id;
  }

  statusLabel(status: ContractorInvoiceStatus | undefined): string {
    return status ? this.i18n.t(CONTRACTOR_INVOICE_STATUS_LABELS[status]) : '';
  }

  get hasInvoice(): boolean {
    return this.invoice !== null;
  }

  // ---- Speichern / Löschen -------------------------------------------------

  async save(): Promise<void> {
    // Nicht speicherbar ohne Rechnung, unter Bezahlt-Lock oder im Abo-Nur-Lese-Modus.
    if (!this.invoice || !this.editable()) {
      return;
    }
    this.resetFeedback();
    this.saving.set(true);
    this.invoice = sanitizeContractorInvoice(this.invoice);
    try {
      await this.repository.save(this.invoice);
      this.loadedFromDb.set(true);
      // Bezahlt-Lock greift jetzt (nach dem Speichern), wenn „Bezahlt" gewählt wurde.
      this.paidLock.set(this.invoice.status === 'paid');
      this.saveSuccess.set(this.i18n.t('Rechnung gespeichert.'));
      await this.loadList();
    } catch (error) {
      this.saveError.set(
        this.i18n.t(
          this.invoiceService.isDuplicateNumberError(error)
            ? INVOICE_DUPLICATE_NUMBER_MESSAGE
            : 'Speichern fehlgeschlagen. Bitte erneut versuchen.'
        )
      );
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Befüllt den Verkäufer-Snapshot dieser Rechnung neu aus dem **aktuellen**
   * Firmenprofil. Bewusste Nutzeraktion (Button), damit nachgetragene Daten (z. B.
   * IBAN) in eine bereits erzeugte Rechnung übernommen werden – das § 14-Snapshot-
   * Prinzip bleibt gewahrt, weil es nie automatisch/still geschieht. Der neue Stand
   * wird erst mit „Speichern" persistiert.
   */
  async refreshSellerFromProfile(): Promise<void> {
    if (!this.invoice || !this.editable()) {
      return;
    }
    this.resetFeedback();
    this.refreshingSeller.set(true);
    try {
      const profile = await this.companyProfile.load();
      this.invoice.seller = this.invoiceService.sellerFromProfile(profile);
      this.saveSuccess.set(
        this.i18n.t('Firmendaten aus dem Profil übernommen. Zum Sichern bitte „Speichern".')
      );
    } catch {
      this.saveError.set(
        this.i18n.t('Firmendaten konnten nicht geladen werden. Bitte erneut versuchen.')
      );
    } finally {
      this.refreshingSeller.set(false);
    }
  }

  requestDelete(id: string): void {
    this.confirmingDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmingDeleteId = null;
  }

  async confirmDelete(id: string): Promise<void> {
    this.confirmingDeleteId = null;
    // Löschen bleibt unter dem Bezahlt-Lock erlaubt, im Abo-Nur-Lese-Modus jedoch nicht
    // (Datenerhalt-Zusage: „Deine Daten bleiben erhalten").
    if (this.readOnly()) {
      return;
    }
    try {
      await this.repository.delete(id);
    } catch {
      this.saveError.set(this.i18n.t('Löschen fehlgeschlagen. Bitte erneut versuchen.'));
      return;
    }
    // Falls die aktuell offene Rechnung gelöscht wurde, Editor entkoppeln.
    if (this.invoice?.id === id) {
      this.invoice = null;
      this.loadedFromDb.set(false);
    }
    await this.loadList();
  }

  // ---- Downloads -----------------------------------------------------------

  /** Lädt die aktuelle Rechnung als XRechnung-XML herunter. */
  downloadXml(): void {
    if (!this.invoice || !this.xrApplicable() || this.xrBlocked()) {
      return;
    }
    this.xrechnung.download(sanitizeContractorInvoice(this.invoice));
  }

  /**
   * Sammel-Export aller Rechnungen (gefiltert) als ZIP – PDFs + XRechnung-XMLs +
   * CSV-Übersicht fürs Archiv/Buchhaltungssystem. Bewusst unabhängig vom Editor und
   * vom Nur-Lese-Modus: der Export bleibt auch ohne Abo möglich (Datenerhalt-Zusage).
   * Leere Filter = alle Rechnungen. Nur während des laufenden Exports gesperrt.
   */
  async exportInvoices(): Promise<void> {
    if (this.exporting()) {
      return;
    }
    this.exportState.set(null);
    this.exporting.set(true);
    try {
      const { count } = await this.invoiceExport.exportZip(this.invoices(), {
        dateFrom: this.exportDateFrom || undefined,
        dateTo: this.exportDateTo || undefined,
        numberFrom: this.exportNumberFrom || undefined,
        numberTo: this.exportNumberTo || undefined
      });
      this.exportedCount.set(count);
      this.exportState.set(count > 0 ? 'success' : 'empty');
    } catch {
      this.exportState.set('error');
    } finally {
      this.exporting.set(false);
    }
  }

  private buildExportData(): ExportDocumentData {
    const data = this.exportMapper.buildContractorInvoiceExportData(
      sanitizeContractorInvoice(this.invoice!)
    );
    return this.branding.applyTo(data);
  }

  // ---- Editieren -----------------------------------------------------------

  addLine(section: ContractorOfferSection): void {
    if (!this.editable()) {
      return;
    }
    section.lines.push({
      id: this.createId(),
      label: 'Neue Position',
      description: '',
      quantity: 1,
      unit: 'pauschal',
      unitPrice: 0,
      isActive: true,
      isOptional: false,
      origin: 'custom'
    });
  }

  removeLine(section: ContractorOfferSection, line: ContractorOfferLine): void {
    if (!this.editable()) {
      return;
    }
    section.lines = section.lines.filter((entry) => entry !== line);
  }

  moveLine(section: ContractorOfferSection, index: number, direction: -1 | 1): void {
    if (!this.editable()) {
      return;
    }
    this.swap(section.lines, index, index + direction);
  }

  addSection(): void {
    if (!this.editable()) {
      return;
    }
    this.invoice?.sections.push({
      id: this.createId(),
      kind: 'custom',
      title: 'Weitere Leistungen',
      lines: []
    });
  }

  removeSection(section: ContractorOfferSection): void {
    if (!this.editable()) {
      return;
    }
    if (this.invoice) {
      this.invoice.sections = this.invoice.sections.filter((entry) => entry !== section);
    }
  }

  moveSection(index: number, direction: -1 | 1): void {
    if (!this.editable()) {
      return;
    }
    if (this.invoice) {
      this.swap(this.invoice.sections, index, index + direction);
    }
  }

  // ---- Positionsnummern & Summen (geteilte Angebots-Helfer) ----------------

  posNumber(section: ContractorOfferSection): number | null {
    return this.invoice ? offerPositionNumber(invoiceAsOffer(this.invoice), section) : null;
  }

  lineNumber(section: ContractorOfferSection, line: ContractorOfferLine): string {
    return (this.invoice && offerLineNumber(invoiceAsOffer(this.invoice), section, line)) || '–';
  }

  lineTotal(line: ContractorOfferLine): number {
    return offerLineTotal(line);
  }

  sectionSubtotal(section: ContractorOfferSection): number {
    return offerSectionSubtotal(section);
  }

  netTotal(): number {
    return this.invoice ? invoiceNetTotal(this.invoice) : 0;
  }

  discountAmount(): number {
    return this.invoice ? invoiceDiscountAmount(this.invoice) : 0;
  }

  netAfterDiscount(): number {
    return this.invoice ? invoiceNetAfterDiscount(this.invoice) : 0;
  }

  vatAmount(): number {
    return this.invoice ? invoiceVatAmount(this.invoice) : 0;
  }

  grossTotal(): number {
    return this.invoice ? invoiceGrossTotal(this.invoice) : 0;
  }

  /** Bruttosumme einer Listen-Rechnung (für die Übersichtstabelle). */
  grossOf(invoice: ContractorInvoice): number {
    return invoiceGrossTotal(invoice);
  }

  /** Verbleibender Restbetrag (brutto) einer Schlussrechnung nach Anrechnung. */
  restOf(invoice: ContractorInvoice): number {
    return invoicePayableGross(invoice);
  }

  /**
   * Übersetzte Beschriftung der Rechnungsart. Bewusst ein expliziter Switch über
   * String-Literale (statt `t(CONTRACTOR_INVOICE_KIND_LABELS[kind])` mit Variable),
   * damit der i18n-Coverage-Literal-Scan die Keys erfasst – ohne Eintrag in die
   * (nicht in diesem Scope liegende) DYNAMIC_KEYS-Allowlist.
   */
  kindLabel(kind: ContractorInvoiceKind | undefined): string {
    switch (kind) {
      case 'deposit':
        return this.i18n.t('Anzahlung');
      case 'partial':
        return this.i18n.t('Abschlag');
      case 'final':
        return this.i18n.t('Schlussrechnung');
      default:
        return this.i18n.t('Rechnung');
    }
  }

  /** ISO-Datum (`yyyy-mm-dd`) als deutsches Datum; leere/ungültige Werte bleiben leer. */
  dateDe(iso: string | undefined): string {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  // ---- Schlussrechnungs-Karte (eingefrorene Anrechnung) --------------------

  /** Ist die aktuelle Rechnung eine Schlussrechnung mit angerechneten Teilentgelten? */
  isFinalWithSettlements(): boolean {
    return (
      this.invoice !== null &&
      this.invoice.kind === 'final' &&
      (this.invoice.settledPayments?.length ?? 0) > 0
    );
  }

  /** Die eingefrorenen angerechneten Teilentgelte der aktuellen Rechnung. */
  settledPayments(): SettledPayment[] {
    return this.invoice?.settledPayments ?? [];
  }

  /** Summe der angerechneten Teilentgelte (brutto). */
  settledGross(): number {
    return this.invoice ? invoiceSettledGross(this.invoice) : 0;
  }

  /** Restbetrag (brutto) der aktuellen Schlussrechnung; negativ = Kundenguthaben. */
  payableGross(): number {
    return this.invoice ? invoicePayableGross(this.invoice) : 0;
  }

  /** Öffnet die Inline-Bestätigung „Bezahlt markieren?" für eine Listenzeile. */
  requestMarkPaid(id: string): void {
    this.confirmingMarkPaidId = id;
  }

  cancelMarkPaid(): void {
    this.confirmingMarkPaidId = null;
  }

  /**
   * Markiert eine Rechnung als bezahlt (bestätigte Quick-Action der Liste – die
   * Aktion ist faktisch irreversibel, siehe Bezahlt-Lock). Persistiert eine
   * **Kopie** mit `status: 'paid'` (KEINE In-Place-Mutation des Listeneintrags),
   * lädt danach die Liste neu und spiegelt den Stand in den offenen Editor (wodurch
   * `setWorking` dort den Bezahlt-Lock setzt).
   */
  async markPaid(invoice: ContractorInvoice): Promise<void> {
    this.confirmingMarkPaidId = null;
    // Im Abo-Nur-Lese-Modus ist auch das Bezahlt-Markieren gesperrt.
    if (this.readOnly() || invoice.status === 'paid' || this.markingPaidId() !== null || !invoice.id) {
      return;
    }
    this.resetFeedback();
    this.markingPaidId.set(invoice.id);
    const updated = sanitizeContractorInvoice({ ...invoice, status: 'paid' });
    try {
      await this.repository.save(updated);
      if (this.invoice?.id === invoice.id) {
        this.setWorking(updated, true);
      }
      await this.loadList();
    } catch {
      this.saveError.set(this.i18n.t('Speichern fehlgeschlagen. Bitte erneut versuchen.'));
    } finally {
      this.markingPaidId.set(null);
    }
  }

  eur(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number.isFinite(value) ? value : 0);
  }

  private resetFeedback(): void {
    this.saveError.set(null);
    this.saveSuccess.set(null);
  }

  private swap<T>(list: T[], a: number, b: number): void {
    if (a < 0 || b < 0 || a >= list.length || b >= list.length) {
      return;
    }
    [list[a], list[b]] = [list[b], list[a]];
  }

  private createId(): string {
    return globalThis.crypto?.randomUUID?.()
      ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}
