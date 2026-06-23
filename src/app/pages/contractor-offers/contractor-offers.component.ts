import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ContractorOffer,
  ContractorOfferSection,
  offerGrossTotal,
  offerLineTotal,
  offerNetTotal,
  offerSectionSubtotal,
  offerVatAmount,
  ContractorOfferLine
} from '../../models/contractor-offer.model';
import { LocalProjectService } from '../../services/local-project.service';
import { ContractorOfferService } from '../../services/contractor-offer.service';
import { ProfessionalLineItemUnit } from '../../services/professional-offer.service';
import { CONTRACTOR_OFFER_REPOSITORY } from '../../data-access/contractor-offer-repository';
import { ExportDataMapperService } from '../../services/export-data-mapper.service';
import { ExportDocumentData } from '../../models/export-document.model';
import { PremiumExportButtonComponent } from '../../components/premium-export-button/premium-export-button.component';

/**
 * Profi-Angebotsmodul (Phase 13). Nur über den contractorGuard erreichbar.
 * Projektauswahl + editierbares Leistungsverzeichnis (Block B/C); Persistenz und
 * PDF-Download bauen darauf auf.
 */
@Component({
  selector: 'app-contractor-offers',
  standalone: true,
  imports: [FormsModule, PremiumExportButtonComponent],
  templateUrl: './contractor-offers.component.html',
  styleUrl: './contractor-offers.component.css'
})
export class ContractorOffersComponent implements OnInit {
  private readonly localProject = inject(LocalProjectService);
  private readonly offerService = inject(ContractorOfferService);
  private readonly repository = inject(CONTRACTOR_OFFER_REPOSITORY);
  private readonly exportMapper = inject(ExportDataMapperService);

  /** Liefert das Exportdokument erst beim Klick (immer der aktuelle Editier-Stand). */
  readonly exportDocumentFn = (): ExportDocumentData | null =>
    this.offer ? this.exportMapper.buildContractorOfferExportData(this.offer) : null;

  readonly projects = this.localProject.projects;
  readonly activeProjectId = this.localProject.activeProjectId;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal<string | null>(null);
  /** `true`, wenn das aktuelle Angebot aus der DB geladen wurde (nicht frisch erzeugt). */
  readonly loadedFromDb = signal(false);

  readonly unitOptions: { value: ProfessionalLineItemUnit; label: string }[] = [
    { value: 'pauschal', label: 'pauschal' },
    { value: 'm2', label: 'm²' },
    { value: 'lfm', label: 'lfm' },
    { value: 'piece', label: 'Stück' },
    { value: 'hour', label: 'Std.' }
  ];

  /** Editierbare Arbeitskopie des aktuellen Angebots (regeneriert aus dem Projekt). */
  offer: ContractorOffer | null = null;
  newProjectName = '';
  confirmingDeleteId: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.localProject.ready;
    await this.loadOrGenerate();
    this.loading.set(false);
  }

  // ---- Projektverwaltung ---------------------------------------------------

  selectProject(id: string): void {
    this.localProject.switchProject(id);
    void this.loadOrGenerate();
  }

  createProject(): void {
    this.localProject.createProject(this.newProjectName);
    this.newProjectName = '';
    void this.loadOrGenerate();
  }

  rename(id: string, name: string): void {
    this.localProject.renameProject(id, name);
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
    void this.loadOrGenerate();
  }

  roomCount(projectId: string): number {
    return this.projects().find((project) => project.id === projectId)?.rooms.length ?? 0;
  }

  // ---- Angebot laden / erzeugen / speichern --------------------------------

  /**
   * Lädt das gespeicherte Angebot zum aktiven Projekt aus der DB; existiert keines,
   * wird eines aus dem Projekt erzeugt. Wird bei Projektwechsel/Initialisierung genutzt.
   */
  private async loadOrGenerate(): Promise<void> {
    this.resetSaveFeedback();
    const project = this.localProject.getProject();
    try {
      const saved = await this.repository.load(project.id);
      if (saved) {
        // Projektnamen mit dem aktuellen Stand synchron halten (falls umbenannt).
        this.offer = { ...saved, projectName: project.name };
        this.loadedFromDb.set(true);
        return;
      }
    } catch {
      // Backend offline o. Ä.: auf Neu-Erzeugung zurückfallen.
    }
    this.offer = this.offerService.buildOffer(project);
    this.loadedFromDb.set(false);
  }

  /** (Neu) erzeugt das Angebot aus dem aktiven Projekt – verwirft lokale Edits. */
  generate(): void {
    this.resetSaveFeedback();
    this.offer = this.offerService.buildOffer(this.localProject.getProject());
    this.loadedFromDb.set(false);
  }

  /** Speichert das aktuelle Angebot in der DB (pro Projekt). */
  async save(): Promise<void> {
    if (!this.offer) {
      return;
    }
    this.resetSaveFeedback();
    this.saving.set(true);
    try {
      await this.repository.save(this.offer);
      this.loadedFromDb.set(true);
      this.saveSuccess.set('Angebot gespeichert.');
    } catch {
      this.saveError.set('Speichern fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      this.saving.set(false);
    }
  }

  private resetSaveFeedback(): void {
    this.saveError.set(null);
    this.saveSuccess.set(null);
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

  // ---- Positionsnummern & Summen ------------------------------------------

  /** 1-basierter „Pos."-Index unter allen Gruppen außer „Baustelle einrichten". */
  posNumber(section: ContractorOfferSection): number | null {
    if (!this.offer) {
      return null;
    }
    const numbered = this.offer.sections.filter((entry) => entry.kind !== 'site_setup');
    const index = numbered.indexOf(section);
    return index >= 0 ? index + 1 : null;
  }

  lineNumber(section: ContractorOfferSection, lineIndex: number): string {
    const suffix = String(lineIndex + 1).padStart(3, '0');
    if (section.kind === 'site_setup') {
      return suffix;
    }
    const pos = this.posNumber(section);
    return pos ? `${pos}.${suffix}` : suffix;
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
