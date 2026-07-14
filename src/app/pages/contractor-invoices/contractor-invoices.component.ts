import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ContractorInvoice,
  ContractorInvoiceStatus,
  CONTRACTOR_INVOICE_STATUS_LABELS,
  hasXRechnungServiceDate,
  invoiceAsOffer,
  invoiceDiscountAmount,
  invoiceGrossTotal,
  invoiceNetAfterDiscount,
  invoiceNetTotal,
  invoiceVatAmount,
  isLikelyMalformedLeitwegId,
  listMissingXRechnungFields,
  listMissingXRechnungSellerFields,
  normalizeContractorInvoice,
  sanitizeContractorInvoice
} from '../../models/contractor-invoice.model';
import {
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
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { ContractorBrandingService } from '../../services/contractor-branding.service';
import { XRechnungExportService } from '../../services/xrechnung-export.service';
import { ExportDocumentData } from '../../models/export-document.model';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';

/**
 * Rechnungsmodul (M12). Nur über den contractorGuard erreichbar. Rechnungen
 * entstehen aus gespeicherten Angeboten („Als Rechnung übernehmen") und werden
 * hier verwaltet: Liste + editierbarer Rechnungskopf/Positionen, PDF- und
 * XRechnung-Download, Löschen. Ohne Angebots-Übernahme zeigt die Seite die Liste.
 */
@Component({
  selector: 'app-contractor-invoices',
  standalone: true,
  imports: [FormsModule, RouterLink, PremiumExportButtonComponent],
  templateUrl: './contractor-invoices.component.html',
  styleUrl: './contractor-invoices.component.css'
})
export class ContractorInvoicesComponent implements OnInit {
  private readonly repository = inject(CONTRACTOR_INVOICE_REPOSITORY);
  private readonly invoiceService = inject(ContractorInvoiceService);
  private readonly companyProfile = inject(CompanyProfileService);
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly branding = inject(ContractorBrandingService);
  private readonly xrechnung = inject(XRechnungExportService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly refreshingSeller = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);
  /** `true`, wenn die aktuelle Rechnung aus der DB geladen wurde (nicht frisch übernommen). */
  readonly loadedFromDb = signal(false);
  /** Alle Rechnungen des Profis (neueste zuerst). */
  readonly invoices = signal<ContractorInvoice[]>([]);

  /** Editierbare Arbeitskopie der aktuellen Rechnung. */
  invoice: ContractorInvoice | null = null;
  confirmingDeleteId: string | null = null;

  /** Fehlende XRechnung-Pflichtfelder (leer = Download freigegeben). */
  xrMissingFields(): string[] {
    return this.invoice ? listMissingXRechnungFields(this.invoice) : [];
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
    await this.loadList();
    if (pending) {
      this.setWorking(pending, false);
    } else if (this.invoices().length > 0) {
      this.setWorking(this.invoices()[0], true);
    }
    this.loading.set(false);
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
    return status ? CONTRACTOR_INVOICE_STATUS_LABELS[status] : '';
  }

  get hasInvoice(): boolean {
    return this.invoice !== null;
  }

  // ---- Speichern / Löschen -------------------------------------------------

  async save(): Promise<void> {
    if (!this.invoice) {
      return;
    }
    this.resetFeedback();
    this.saving.set(true);
    this.invoice = sanitizeContractorInvoice(this.invoice);
    try {
      await this.repository.save(this.invoice);
      this.loadedFromDb.set(true);
      this.saveSuccess.set('Rechnung gespeichert.');
      await this.loadList();
    } catch (error) {
      this.saveError.set(
        this.invoiceService.isDuplicateNumberError(error)
          ? INVOICE_DUPLICATE_NUMBER_MESSAGE
          : 'Speichern fehlgeschlagen. Bitte erneut versuchen.'
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
    if (!this.invoice) {
      return;
    }
    this.resetFeedback();
    this.refreshingSeller.set(true);
    try {
      const profile = await this.companyProfile.load();
      this.invoice.seller = this.invoiceService.sellerFromProfile(profile);
      this.saveSuccess.set('Firmendaten aus dem Profil übernommen. Zum Sichern bitte „Speichern".');
    } catch {
      this.saveError.set('Firmendaten konnten nicht geladen werden. Bitte erneut versuchen.');
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
    try {
      await this.repository.delete(id);
    } catch {
      this.saveError.set('Löschen fehlgeschlagen. Bitte erneut versuchen.');
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
    if (!this.invoice || this.xrBlocked()) {
      return;
    }
    this.xrechnung.download(sanitizeContractorInvoice(this.invoice));
  }

  private buildExportData(): ExportDocumentData {
    const data = this.exportMapper.buildContractorInvoiceExportData(
      sanitizeContractorInvoice(this.invoice!)
    );
    return this.branding.applyTo(data);
  }

  // ---- Editieren -----------------------------------------------------------

  addLine(section: ContractorOfferSection): void {
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
    section.lines = section.lines.filter((entry) => entry !== line);
  }

  moveLine(section: ContractorOfferSection, index: number, direction: -1 | 1): void {
    this.swap(section.lines, index, index + direction);
  }

  addSection(): void {
    this.invoice?.sections.push({
      id: this.createId(),
      kind: 'custom',
      title: 'Weitere Leistungen',
      lines: []
    });
  }

  removeSection(section: ContractorOfferSection): void {
    if (this.invoice) {
      this.invoice.sections = this.invoice.sections.filter((entry) => entry !== section);
    }
  }

  moveSection(index: number, direction: -1 | 1): void {
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
