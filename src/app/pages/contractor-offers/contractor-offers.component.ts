import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ContractorOffer,
  ContractorOfferSection,
  ContractorOfferStatus,
  CONTRACTOR_OFFER_STATUS_LABELS,
  offerDiscountAmount,
  offerGrossTotal,
  offerLineNumber,
  offerLineTotal,
  offerNetAfterDiscount,
  offerNetTotal,
  offerPositionNumber,
  offerSectionSubtotal,
  offerVatAmount,
  ContractorOfferLine,
  normalizeContractorOffer,
  sanitizeContractorOffer
} from '../../models/contractor-offer.model';
import { LocalProjectService } from '../../services/local-project.service';
import {
  ContractorOfferService,
  ContractorOfferDefaults
} from '../../services/contractor-offer.service';
import { CompanyProfileService } from '../../services/company-profile.service';
import { ProfileAssumptionDefaultsService } from '../../services/profile-assumption-defaults.service';
import { ProfessionalLineItemUnit } from '../../services/professional-offer.service';
import { CONTRACTOR_OFFER_REPOSITORY } from '../../data-access/contractor-offer-repository';
import { CONTRACTOR_INVOICE_REPOSITORY } from '../../data-access/contractor-invoice-repository';
import { ContractorInvoiceService } from '../../services/contractor-invoice.service';
import { ContractorOfferShareService } from '../../services/contractor-offer-share.service';
import { SharedOfferTracking } from '../../models/shared-offer-tracking.model';
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { ContractorBrandingService } from '../../services/contractor-branding.service';
import { ExportDocumentData } from '../../models/export-document.model';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';
import { SubscriptionStatusService } from '../../services/subscription-status.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

/** Ohne aktives Abo gespeicherte Angebote/Versionen (spiegelt den DB-Trigger). */
const FREE_OFFER_LIMIT = 3;
/** Verständliche Meldung für erreichte Grenze – als Badge-Hinweis und Fehlertext. */
const OFFER_LIMIT_MESSAGE =
  'Limit erreicht – lösche ein Angebot oder schalte Premium frei.';

/** Erkennt den serverseitigen Trigger-Fehler `offer_limit_reached` (aus Migration 0020). */
function isOfferLimitError(error: unknown): boolean {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return message.includes('offer_limit_reached');
}

/**
 * Profi-Angebotsmodul (Phase 13). Nur über den contractorGuard erreichbar.
 * Projektauswahl + mehrere Angebots-Versionen je Projekt + editierbares
 * Leistungsverzeichnis; Persistenz, PDF-Download und Teilen-Link bauen darauf auf.
 */
@Component({
  selector: 'app-contractor-offers',
  standalone: true,
  imports: [FormsModule, RouterLink, PremiumExportButtonComponent, TranslatePipe],
  templateUrl: './contractor-offers.component.html',
  styleUrl: './contractor-offers.component.css'
})
export class ContractorOffersComponent implements OnInit {
  private readonly localProject = inject(LocalProjectService);
  private readonly offerService = inject(ContractorOfferService);
  private readonly companyProfile = inject(CompanyProfileService);
  private readonly profileDefaults = inject(ProfileAssumptionDefaultsService);
  private readonly repository = inject(CONTRACTOR_OFFER_REPOSITORY);
  private readonly shareService = inject(ContractorOfferShareService);
  private readonly exportMapper = inject(ExportDataMapperService);
  private readonly branding = inject(ContractorBrandingService);
  private readonly subscriptionStatus = inject(SubscriptionStatusService);
  private readonly invoiceRepository = inject(CONTRACTOR_INVOICE_REPOSITORY);
  private readonly invoiceService = inject(ContractorInvoiceService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  /** Für die Vorlage sichtbarer Grenzwert-Hinweis. */
  readonly offerLimitMessage = OFFER_LIMIT_MESSAGE;
  readonly freeOfferLimit = FREE_OFFER_LIMIT;

  /** `true`, wenn ein aktives (oder Probe-)Abo besteht → kein Limit, kein Badge. */
  readonly isSubscribed = this.subscriptionStatus.isActive;
  /** Gesamtzahl gespeicherter Angebote/Versionen (projektübergreifend, aus der DB). */
  readonly offerCount = signal(0);
  /** Free-Badge „X von 3" nur ohne aktives Abo. */
  readonly showLimitBadge = computed(() => !this.isSubscribed());
  /** Grenze erreicht (nur ohne Abo). Blockt das ANLEGEN neuer Angebote/Versionen. */
  readonly limitReached = computed(
    () => !this.isSubscribed() && this.offerCount() >= FREE_OFFER_LIMIT
  );

  /** Profil-Standardwerte (Texte/Materialaufschlag), die neue Angebote vorbefüllen. */
  private offerDefaults: ContractorOfferDefaults = {};

  /** Liefert das Exportdokument erst beim Klick (immer der aktuelle, bereinigte Editier-Stand). */
  readonly exportDocumentFn = (): ExportDocumentData | null =>
    this.offer ? this.buildExportData() : null;

  readonly projects = this.localProject.projects;
  readonly activeProjectId = this.localProject.activeProjectId;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);
  /** `true`, wenn das aktuelle Angebot aus der DB geladen wurde (nicht frisch erzeugt). */
  readonly loadedFromDb = signal(false);
  /** `true`, wenn das Projekt seit dem gespeicherten Angebot geändert wurde. */
  readonly projectChanged = signal(false);
  /** Alle Versionen des aktiven Projekts (aus der DB). */
  readonly offersList = signal<ContractorOffer[]>([]);
  /**
   * Ausgeklappte Versions-Zeile (deren Editor sichtbar ist). `null` = Liste eingeklappt.
   * Startet bei `null` und wird bei jeder Neu-Ladung (Projektwechsel) zurückgesetzt.
   */
  readonly expandedId = signal<string | null>(null);
  /**
   * Editor + Kopf-Aktionen/Feedback/Tracking sind sichtbar, sobald eine Zeile
   * ausgeklappt ist ODER das Angebot noch nicht gespeichert ist – der Unsaved-Fall
   * deckt frische Projekte ohne gespeicherte Version UND frisch erzeugte Versionen
   * ab (denen fehlt die Listen-Zeile zum Ausklappen noch).
   */
  readonly editorVisible = computed(() => this.expandedId() !== null || !this.loadedFromDb());
  /** Läuft die Übernahme „Als Rechnung"? */
  readonly creatingInvoice = signal(false);
  readonly invoiceError = signal<string | null>(null);

  /** Teilen-Link des aktuellen Angebots (nach dem Erzeugen). */
  readonly shareUrl = signal<string | null>(null);
  readonly sharing = signal(false);
  readonly shareError = signal<string | null>(null);
  /** Owner-scoped Tracking (Aufrufe/Annahme) zum Teilen-Link des aktuellen Angebots. */
  readonly tracking = signal<SharedOfferTracking | null>(null);

  /**
   * `true`, sobald das aktuelle Angebot **angenommen und gespeichert** ist. Bewusst
   * ein Signal (nicht aus `offer.status` abgeleitet – `offer` ist kein Signal): der
   * Lock greift erst NACH dem Speichern, nicht schon beim Wählen von „Angenommen".
   * Gesetzt an genau drei Stellen: {@link setWorking} (Laden), {@link loadTracking}
   * (Remote-Annahme), {@link save} (nach erfolgreichem Speichern).
   */
  readonly acceptedLock = signal(false);
  /** Geteilt, aber (noch) nicht angenommen → sperrt Bearbeitung, bis der Link gelöscht wird. */
  readonly sharedLock = computed(() => this.tracking() !== null && !this.acceptedLock());
  /** Gesamt-Sperre: angenommen ODER geteilt. Treibt das Read-only-Gating im Template. */
  readonly locked = computed(() => this.acceptedLock() || this.sharedLock());
  /** Inline-Bestätigung „Link löschen & bearbeiten" (Muster wie `confirmingDelete*`). */
  confirmingUnlock = false;

  /** Anteil (%) für die Anzahlungsrechnung (Block „Anzahlungsrechnung"). */
  depositPercent = 30;

  readonly statusOptions: { value: ContractorOfferStatus; label: string }[] = [
    { value: 'draft', label: CONTRACTOR_OFFER_STATUS_LABELS.draft },
    { value: 'sent', label: CONTRACTOR_OFFER_STATUS_LABELS.sent },
    { value: 'accepted', label: CONTRACTOR_OFFER_STATUS_LABELS.accepted }
  ];

  readonly unitOptions: { value: ProfessionalLineItemUnit; label: string }[] = [
    { value: 'pauschal', label: 'pauschal' },
    { value: 'm2', label: 'm²' },
    { value: 'lfm', label: 'lfm' },
    { value: 'piece', label: 'Stück' },
    { value: 'hour', label: 'Std.' }
  ];

  /** Editierbare Arbeitskopie des aktuellen Angebots. */
  offer: ContractorOffer | null = null;
  newProjectName = '';
  confirmingDeleteId: string | null = null;
  /** Angebots-Version, deren Löschung bestätigt werden soll. */
  confirmingDeleteVersionId: string | null = null;

  /** Monoton steigendes Token, damit nur die zuletzt angeforderte Ladung übernimmt. */
  private loadToken = 0;
  /** Eigenes Token für das (unabhängig nachladbare) Tracking, gegen Ladungs-Races. */
  private trackingToken = 0;

  async ngOnInit(): Promise<void> {
    await this.localProject.ready;
    // Profil-Standardpreise abwarten, damit „Aus Projekt erzeugen" die eigenen
    // Einheitspreise nutzt und nicht (bei schnellerer Hydration) die System-Defaults.
    await this.profileDefaults.ready;
    await this.loadOfferDefaults();
    await this.loadOffers();
    // Abo-Status + Gesamtzahl der Angebote für die Free-Limit-Anzeige laden.
    await this.subscriptionStatus.ensureLoaded();
    await this.refreshOfferCount();
    this.loading.set(false);
  }

  /**
   * Blockt das ANLEGEN eines neuen Angebots/einer neuen Version bei erreichter
   * Grenze. Ein bereits gespeichertes Angebot (loadedFromDb) darf weiter
   * überschrieben werden – das ist ein Update, kein neuer Insert.
   */
  newOfferBlocked(): boolean {
    return this.limitReached() && !this.loadedFromDb();
  }

  /** Lädt die Gesamtzahl gespeicherter Angebote neu (No-op bei Backend-Fehler). */
  private async refreshOfferCount(): Promise<void> {
    try {
      this.offerCount.set(await this.repository.countMine());
    } catch {
      // Zählung nicht verfügbar: Badge zeigt den letzten bekannten Stand.
    }
  }

  /** Lädt die Profil-Standardwerte (Texte + Materialaufschlag) für neue Angebote. */
  private async loadOfferDefaults(): Promise<void> {
    try {
      const profile = await this.companyProfile.load();
      this.offerDefaults = {
        introText: profile.offerIntroText,
        outroText: profile.offerOutroText,
        materialSurchargePercent: profile.materialSurchargePercent
      };
    } catch {
      this.offerDefaults = {};
    }
  }

  // ---- Projektverwaltung ---------------------------------------------------

  selectProject(id: string): void {
    this.localProject.switchProject(id);
    void this.loadOffers();
  }

  createProject(): void {
    this.localProject.createProject(this.newProjectName);
    this.newProjectName = '';
    void this.loadOffers();
  }

  rename(id: string, name: string): void {
    this.localProject.renameProject(id, name);
    // Umbenanntes aktives Projekt sofort im Angebot spiegeln (Untertitel/Dateiname).
    if (this.offer && id === this.activeProjectId()) {
      this.offer.projectName = this.activeProjectName;
    }
  }

  requestDelete(id: string): void {
    this.confirmingDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmingDeleteId = null;
  }

  confirmDelete(id: string): void {
    this.localProject.deleteProject(id);
    this.confirmingDeleteId = null;
    void this.loadOffers();
  }

  roomCount(projectId: string): number {
    return this.projects().find((project) => project.id === projectId)?.rooms.length ?? 0;
  }

  // ---- Angebote/Versionen laden & wechseln ---------------------------------

  /**
   * Lädt alle Versionen des aktiven Projekts und wählt die höchste als Arbeitskopie;
   * gibt es keine, wird eine frische V1 erzeugt (noch nicht gespeichert). Über ein
   * Token wird bei schnellem Projektwechsel nur die zuletzt angeforderte Ladung übernommen.
   */
  private async loadOffers(): Promise<void> {
    const token = ++this.loadToken;
    this.resetFeedback();
    // Liste startet eingeklappt bei jeder (Neu-)Ladung (Projektwechsel/Erstladung).
    this.expandedId.set(null);
    const project = this.localProject.getProject();
    let list: ContractorOffer[] = [];
    try {
      list = await this.repository.listByProject(project.id);
    } catch {
      // Backend offline o. Ä.: mit leerer Liste auf Neu-Erzeugung zurückfallen.
    }
    if (token !== this.loadToken) {
      return; // Ein neuerer Projektwechsel hat diese Ladung überholt.
    }
    list = list.map((offer) =>
      normalizeContractorOffer({ ...offer, projectName: project.name })
    );
    this.offersList.set(list);

    if (list.length > 0) {
      const latest = [...list].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
      this.setWorking(latest, true, project);
    } else {
      const fresh = this.offerService.buildOffer(project, undefined, this.offerDefaults);
      this.setWorking(fresh, false, project);
    }
  }

  /** Setzt die Arbeitskopie (normalisiert/entkoppelt) und die abhängigen Flags. */
  private setWorking(
    offer: ContractorOffer,
    fromDb: boolean,
    project = this.localProject.getProject()
  ): void {
    this.offer = normalizeContractorOffer({ ...offer });
    this.loadedFromDb.set(fromDb);
    this.shareUrl.set(null);
    this.tracking.set(null);
    this.confirmingUnlock = false;
    // (a) Lock beim Laden: nur ein gespeichertes, angenommenes Angebot ist gesperrt.
    this.acceptedLock.set(fromDb && this.offer.status === 'accepted');
    this.projectChanged.set(
      fromDb && !!offer.sourceUpdatedAt && offer.sourceUpdatedAt !== project.updatedAt
    );
    if (fromDb && this.offer.id) {
      void this.loadTracking(this.offer.id);
    }
  }

  /**
   * Lädt das Teilen-Tracking eines gespeicherten Angebots (owner-scoped). Über ein
   * eigenes Token gegen schnellen Versions-/Projektwechsel abgesichert. Spiegelt
   * eine bereits erfolgte Annahme (`acceptedAt`) dezent in den lokalen Status –
   * die DB hat den Status bereits per RPC gesetzt, hier wird nur nachgezogen,
   * ohne ein Speichern zu erzwingen.
   */
  private async loadTracking(offerId: string): Promise<void> {
    const token = ++this.trackingToken;
    let result: SharedOfferTracking | null = null;
    try {
      result = await this.shareService.trackingForOffer(offerId);
    } catch {
      result = null;
    }
    if (token !== this.trackingToken) {
      return; // Ein neuerer Wechsel hat diese Ladung überholt.
    }
    this.tracking.set(result);
    if (result) {
      // Der Teilen-Link ist bei jedem Laden dauerhaft sichtbar (nicht nur direkt nach dem Erstellen).
      this.shareUrl.set(this.shareService.shareUrl(result.token));
    }
    if (
      result?.acceptedAt &&
      this.offer &&
      this.offer.id === offerId &&
      this.offer.status !== 'accepted'
    ) {
      this.offer.status = 'accepted';
    }
    // (b) Lock aus Remote-Annahme: liegt eine Annahme vor, ist das Angebot unveränderlich.
    if (result?.acceptedAt) {
      this.acceptedLock.set(true);
    }
  }

  /** Deutsches Datum/Uhrzeit-Format für die Tracking-Anzeige. */
  formatTrackingDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  /** Wechselt zu einer gespeicherten Version. */
  selectVersion(id: string): void {
    const entry = this.offersList().find((offer) => offer.id === id);
    if (entry) {
      this.resetFeedback();
      this.setWorking(entry, true);
    }
  }

  isCurrentVersion(id: string): boolean {
    return this.offer?.id === id;
  }

  /**
   * Zeilen-Klick in der Versionsliste: aktive UND bereits ausgeklappte Zeile klappt
   * ein; sonst wird die Version gewählt und ausgeklappt.
   */
  toggleVersionRow(entry: ContractorOffer): void {
    if (!entry.id) {
      return;
    }
    if (this.isCurrentVersion(entry.id) && this.expandedId() === entry.id) {
      this.expandedId.set(null);
    } else {
      this.selectVersion(entry.id);
      this.expandedId.set(entry.id);
    }
  }

  /** Bruttobetrag einer beliebigen Version (für die Zeilenliste, unabhängig von der Arbeitskopie). */
  offerGross(entry: ContractorOffer): number {
    return offerGrossTotal(entry);
  }

  /** Legt eine neue Version als Kopie der aktuellen an (noch nicht gespeichert). */
  newVersion(): void {
    // Ohne Abo bei erreichter Grenze keine neue Version anlegen (wäre ein Insert).
    if (!this.offer || this.limitReached()) {
      return;
    }
    this.resetFeedback();
    const maxVersion = Math.max(
      this.offer.version ?? 0,
      ...this.offersList().map((offer) => offer.version ?? 0)
    );
    const copy = this.offerService.duplicateAsNewVersion(this.offer, maxVersion + 1);
    this.setWorking(copy, false);
  }

  /**
   * Eingerückte Aktion unter einer ANGENOMMENEN Version: legt darauf aufbauend eine
   * neue Version an – unabhängig davon, welche Version gerade Arbeitskopie ist.
   */
  newVersionFrom(entry: ContractorOffer): void {
    if (this.limitReached()) {
      return;
    }
    this.resetFeedback();
    const maxVersion = Math.max(
      entry.version ?? 0,
      this.offer?.version ?? 0,
      ...this.offersList().map((offer) => offer.version ?? 0)
    );
    const copy = this.offerService.duplicateAsNewVersion(entry, maxVersion + 1);
    this.setWorking(copy, false);
  }

  requestDeleteVersion(id: string): void {
    this.confirmingDeleteVersionId = id;
  }

  cancelDeleteVersion(): void {
    this.confirmingDeleteVersionId = null;
  }

  async confirmDeleteVersion(id: string): Promise<void> {
    this.confirmingDeleteVersionId = null;
    // Verwaisten öffentlichen Link zuerst entfernen (FK `on delete set null` in 0024 würde
    // ihn sonst nach dem Löschen der Version weiterleben lassen). Fehler nicht blockierend.
    try {
      await this.shareService.deleteShareForOffer(id);
    } catch {
      // Löschen der Version trotzdem fortsetzen – ein evtl. verbleibender Link ist unkritisch.
    }
    try {
      await this.repository.delete(id);
    } catch {
      this.saveError.set(this.i18n.t('Löschen fehlgeschlagen. Bitte erneut versuchen.'));
      return;
    }
    await this.loadOffers();
    await this.refreshOfferCount();
  }

  statusLabel(status: ContractorOfferStatus | undefined): string {
    return status ? this.i18n.t(CONTRACTOR_OFFER_STATUS_LABELS[status]) : '';
  }

  /**
   * Frischt die Kalkulationsbasis aus dem aktiven Projekt auf und übernimmt dabei
   * die bestehenden Anpassungen (Preise, Texte, eigene Positionen) – verwirft sie also **nicht**.
   */
  updateFromProject(): void {
    this.resetFeedback();
    const project = this.localProject.getProject();
    this.offer = normalizeContractorOffer(
      this.offerService.buildOffer(project, this.offer ?? undefined, this.offerDefaults)
    );
    this.loadedFromDb.set(false);
    this.projectChanged.set(false);
  }

  /** Speichert das aktuelle Angebot (bereinigt) in der DB. */
  async save(): Promise<void> {
    if (!this.offer) {
      return;
    }
    // Neues Angebot bei erreichter Free-Grenze gar nicht erst senden.
    if (this.newOfferBlocked()) {
      this.resetFeedback();
      this.saveError.set(this.i18n.t(OFFER_LIMIT_MESSAGE));
      return;
    }
    this.resetFeedback();
    this.saving.set(true);
    // Eingaben bereinigen (leere Zahlenfelder → 0) und den bereinigten Stand anzeigen.
    this.offer = sanitizeContractorOffer(this.offer);
    try {
      await this.repository.save(this.offer);
      this.loadedFromDb.set(true);
      // Zeile bleibt ausgeklappt: sonst würde der Editor direkt nach dem ersten
      // Speichern einer neuen Version wieder einklappen (die Liste kannte sie vorher nicht).
      this.expandedId.set(this.offer.id ?? null);
      // (c) Lock nach dem Speichern: „Angenommen" gespeichert → ab jetzt unveränderlich.
      this.acceptedLock.set(this.offer.status === 'accepted');
      this.saveSuccess.set(this.i18n.t('Angebot gespeichert.'));
      await this.refreshList();
      await this.refreshOfferCount();
    } catch (error) {
      // Serverseitigen Trigger-Fehler in dieselbe verständliche Meldung übersetzen.
      if (isOfferLimitError(error)) {
        this.saveError.set(this.i18n.t(OFFER_LIMIT_MESSAGE));
        await this.refreshOfferCount();
      } else {
        this.saveError.set(this.i18n.t('Speichern fehlgeschlagen. Bitte erneut versuchen.'));
      }
    } finally {
      this.saving.set(false);
    }
  }

  /** Lädt die Versionsliste neu, ohne die Arbeitskopie zu ersetzen. */
  private async refreshList(): Promise<void> {
    const project = this.localProject.getProject();
    try {
      const list = (await this.repository.listByProject(project.id)).map((offer) =>
        normalizeContractorOffer({ ...offer, projectName: project.name })
      );
      this.offersList.set(list);
    } catch {
      // Liste bleibt wie sie ist.
    }
  }

  // ---- Teilen (öffentlicher read-only Link) --------------------------------

  /**
   * Erzeugt **einmalig** den Teilen-Link eines **gespeicherten** Angebots (ein Link je
   * Angebot). Ist bereits geteilt (`tracking`), passiert nichts – der Link bleibt sichtbar
   * und der Bearbeiten-Lock greift. Beim ersten Teilen aus einem Entwurf wird der Status
   * auf „Versendet" gehoben und einmal gespeichert, bevor der Link entsteht.
   */
  async share(): Promise<void> {
    if (!this.offer || !this.offer.id || !this.loadedFromDb() || this.tracking()) {
      return;
    }
    const offerId = this.offer.id;
    this.shareError.set(null);
    this.shareUrl.set(null);
    this.sharing.set(true);
    try {
      // Entwurf → „Versendet" (einmaliges Update; der Limit-Trigger feuert bei Updates nicht).
      if (this.offer.status === 'draft') {
        this.offer.status = 'sent';
        this.offer = sanitizeContractorOffer(this.offer);
        await this.repository.save(this.offer);
      }
      const token = await this.shareService.createShareForOffer(offerId, this.buildExportData());
      this.shareUrl.set(this.shareService.shareUrl(token));
      // Tracking laden → `sharedLock` greift sofort; Liste neu laden → Badge „Versendet".
      await this.loadTracking(offerId);
      await this.refreshList();
    } catch {
      this.shareError.set(this.i18n.t('Teilen fehlgeschlagen. Bitte erneut versuchen.'));
    } finally {
      this.sharing.set(false);
    }
  }

  async copyShareUrl(): Promise<void> {
    const url = this.shareUrl();
    if (url) {
      try {
        await globalThis.navigator?.clipboard?.writeText(url);
      } catch {
        // Clipboard nicht verfügbar – der Link steht sichtbar zum manuellen Kopieren.
      }
    }
  }

  // ---- Sperre lösen (geteiltes Angebot wieder bearbeitbar machen) ----------

  requestUnlock(): void {
    this.confirmingUnlock = true;
  }

  cancelUnlock(): void {
    this.confirmingUnlock = false;
  }

  /**
   * Löscht den geteilten Link des aktuellen Angebots und entsperrt es damit
   * (`sharedLock` → false). Der Kunde kann den Link danach nicht mehr öffnen.
   */
  async confirmUnlock(): Promise<void> {
    this.confirmingUnlock = false;
    if (!this.offer?.id) {
      return;
    }
    this.shareError.set(null);
    try {
      await this.shareService.deleteShareForOffer(this.offer.id);
      this.tracking.set(null);
      this.shareUrl.set(null);
    } catch {
      this.shareError.set(
        this.i18n.t('Link konnte nicht gelöscht werden. Bitte erneut versuchen.')
      );
    }
  }

  // ---- Als Rechnung übernehmen (M12) ---------------------------------------

  /**
   * Erzeugt aus dem **gespeicherten** Angebot eine Rechnung (nur aktive
   * Pflichtpositionen), übergibt sie an /rechnungen und navigiert dorthin.
   */
  async createInvoiceFromOffer(): Promise<void> {
    if (!this.offer || !this.loadedFromDb()) {
      return;
    }
    this.invoiceError.set(null);
    this.creatingInvoice.set(true);
    try {
      const profile = await this.companyProfile.load();
      let existingNumbers: string[] = [];
      try {
        existingNumbers = (await this.invoiceRepository.listMine()).map(
          (invoice) => invoice.invoiceNumber
        );
      } catch {
        // Ohne Nummernliste startet der Vorschlag bei 001 – editierbar auf /rechnungen.
      }
      const invoice = this.invoiceService.buildFromOffer(
        sanitizeContractorOffer(this.offer),
        profile,
        existingNumbers
      );
      this.invoiceService.setPending(invoice);
      await this.router.navigate(['/rechnungen']);
    } catch {
      this.invoiceError.set(
        this.i18n.t('Rechnung konnte nicht erstellt werden. Bitte erneut versuchen.')
      );
    } finally {
      this.creatingInvoice.set(false);
    }
  }

  /**
   * Erzeugt aus dem **angenommenen, gespeicherten** Angebot eine Anzahlungsrechnung
   * über `depositPercent` % der Bruttosumme (§ 14 Abs. 5 UStG), übergibt sie an
   * /rechnungen und navigiert dorthin – analog {@link createInvoiceFromOffer}.
   */
  async createDepositInvoice(): Promise<void> {
    if (!this.offer || !this.loadedFromDb() || this.offer.status !== 'accepted') {
      return;
    }
    this.invoiceError.set(null);
    this.creatingInvoice.set(true);
    try {
      const profile = await this.companyProfile.load();
      let existingNumbers: string[] = [];
      try {
        existingNumbers = (await this.invoiceRepository.listMine()).map(
          (invoice) => invoice.invoiceNumber
        );
      } catch {
        // Ohne Nummernliste startet der Vorschlag bei 001 – editierbar auf /rechnungen.
      }
      const invoice = this.invoiceService.buildDepositInvoice(
        sanitizeContractorOffer(this.offer),
        profile,
        existingNumbers,
        this.depositPercent
      );
      this.invoiceService.setPending(invoice);
      await this.router.navigate(['/rechnungen']);
    } catch {
      this.invoiceError.set(
        this.i18n.t('Anzahlungsrechnung konnte nicht erstellt werden. Bitte erneut versuchen.')
      );
    } finally {
      this.creatingInvoice.set(false);
    }
  }

  /** Neutrales Exportdokument des aktuellen Stands, mit Branding (Absender). */
  private buildExportData(): ExportDocumentData {
    const data = this.exportMapper.buildContractorOfferExportData(
      sanitizeContractorOffer(this.offer!)
    );
    return this.branding.applyTo(data);
  }

  private resetFeedback(): void {
    this.saveError.set(null);
    this.saveSuccess.set(null);
    this.shareError.set(null);
  }

  get activeProjectName(): string {
    return this.localProject.getProject().name;
  }

  get hasRooms(): boolean {
    return this.localProject.getProject().rooms.length > 0;
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
    this.offer?.sections.push({
      id: this.createId(),
      kind: 'custom',
      title: 'Weitere Leistungen',
      lines: []
    });
  }

  removeSection(section: ContractorOfferSection): void {
    if (this.offer) {
      this.offer.sections = this.offer.sections.filter((entry) => entry !== section);
    }
  }

  moveSection(index: number, direction: -1 | 1): void {
    if (this.offer) {
      this.swap(this.offer.sections, index, index + direction);
    }
  }

  /**
   * Baut die Material-Sektion nach Umschalten von Aufschlüsselung/Aufschlag neu.
   * Reihenfolge bleibt: Baustelle/Räume → Material → eigene Gruppen.
   */
  applyMaterialSettings(): void {
    if (!this.offer) {
      return;
    }
    const materials = this.offerService.rebuildMaterialSections(
      this.localProject.getProject(),
      {
        breakdown: !!this.offer.materialBreakdown,
        surchargePercent: this.offer.materialSurchargePercent ?? 0
      }
    );
    const base = this.offer.sections.filter(
      (section) => section.kind !== 'material' && section.kind !== 'custom'
    );
    const customs = this.offer.sections.filter((section) => section.kind === 'custom');
    this.offer.sections = [...base, ...materials, ...customs];
  }

  // ---- Positionsnummern & Summen ------------------------------------------

  /** 1-basierter „Pos."-Index (geteilt mit dem PDF-Export). */
  posNumber(section: ContractorOfferSection): number | null {
    return this.offer ? offerPositionNumber(this.offer, section) : null;
  }

  /** Positionsnummer einer Zeile („1.003") – identisch zum PDF; `–` für inaktive. */
  lineNumber(section: ContractorOfferSection, line: ContractorOfferLine): string {
    return (this.offer && offerLineNumber(this.offer, section, line)) || '–';
  }

  lineTotal(line: ContractorOfferLine): number {
    return offerLineTotal(line);
  }

  sectionSubtotal(section: ContractorOfferSection): number {
    return offerSectionSubtotal(section);
  }

  netTotal(): number {
    return this.offer ? offerNetTotal(this.offer) : 0;
  }

  discountAmount(): number {
    return this.offer ? offerDiscountAmount(this.offer) : 0;
  }

  netAfterDiscount(): number {
    return this.offer ? offerNetAfterDiscount(this.offer) : 0;
  }

  vatAmount(): number {
    return this.offer ? offerVatAmount(this.offer) : 0;
  }

  grossTotal(): number {
    return this.offer ? offerGrossTotal(this.offer) : 0;
  }

  eur(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number.isFinite(value) ? value : 0);
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
