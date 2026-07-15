import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { ContractorSnippetService } from '../../services/contractor-snippet.service';
import {
  ContractorSnippet,
  ContractorSnippetPositionData,
  ContractorSnippetTextData
} from '../../models/contractor-snippet.model';
import { ProfessionalLineItemUnit } from '../../services/professional-offer.service';

/** Art des Textbausteins (Einleitung/Schluss) – teilen sich dieselbe Formularlogik. */
type TextKind = 'intro' | 'outro';

/** Bearbeitungszustand des Positions-Inline-Formulars (`id: null` = neuer Baustein). */
interface PositionFormState {
  id: string | null;
  label: string;
  description: string;
  unit: ProfessionalLineItemUnit;
  unitPrice: number | null;
  isOptional: boolean;
}

/** Bearbeitungszustand eines Text-Inline-Formulars (Einleitung ODER Schluss). */
interface TextFormState {
  id: string | null;
  label: string;
  text: string;
}

/** Einheiten-Auswahl – gleiche Werte/Labels wie im Angebots-Editor (`unitOptions`). */
const UNIT_OPTIONS: readonly { value: ProfessionalLineItemUnit; label: string }[] = [
  { value: 'pauschal', label: 'pauschal' },
  { value: 'm2', label: 'm²' },
  { value: 'lfm', label: 'lfm' },
  { value: 'piece', label: 'Stück' },
  { value: 'hour', label: 'Std.' }
];

/**
 * Konto → „Vorlagen" (contractorGuard, Phase R2-B). Verwaltet die wiederverwendbaren
 * Positions- und Textbausteine ({@link ContractorSnippetService}), die der Profi im
 * Angebots-Editor per Klick in ein Angebot übernehmen kann. Drei Sektionen
 * (Positionen/Einleitungstexte/Schlusstexte), je mit kompakter Liste + Inline-
 * Bearbeitungsformular + Inline-Löschbestätigung (Muster wie im Angebots-Editor).
 */
@Component({
  selector: 'app-konto-vorlagen',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './konto-vorlagen.component.html',
  styleUrls: ['./profile-page.component.css', './konto-vorlagen.component.css']
})
export class KontoVorlagenComponent implements OnInit {
  private readonly snippets = inject(ContractorSnippetService);
  private readonly i18n = inject(I18nService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);

  readonly unitOptions = UNIT_OPTIONS;

  positions: ContractorSnippet[] = [];
  introTexts: ContractorSnippet[] = [];
  outroTexts: ContractorSnippet[] = [];

  positionForm: PositionFormState | null = null;
  introForm: TextFormState | null = null;
  outroForm: TextFormState | null = null;

  /** Global statt je Sektion: IDs sind echte UUIDs, Kollisionen ausgeschlossen. */
  confirmingDeleteId: string | null = null;

  async ngOnInit(): Promise<void> {
    await this.load();
    this.loading.set(false);
  }

  private async load(): Promise<void> {
    try {
      const [positions, introTexts, outroTexts] = await Promise.all([
        this.snippets.listByKind('position'),
        this.snippets.listByKind('intro'),
        this.snippets.listByKind('outro')
      ]);
      this.positions = positions;
      this.introTexts = introTexts;
      this.outroTexts = outroTexts;
    } catch {
      this.errorMsg.set(this.i18n.t('Die Vorlagen konnten nicht geladen werden.'));
    }
  }

  // --- Positionen ---

  newPosition(): void {
    this.positionForm = {
      id: null,
      label: '',
      description: '',
      unit: 'pauschal',
      unitPrice: null,
      isOptional: false
    };
  }

  editPosition(snippet: ContractorSnippet): void {
    const data = this.positionData(snippet);
    this.positionForm = {
      id: snippet.id,
      label: snippet.label,
      description: data.description,
      unit: data.unit,
      unitPrice: data.unitPrice,
      isOptional: data.isOptional ?? false
    };
  }

  cancelPositionForm(): void {
    this.positionForm = null;
  }

  async savePosition(): Promise<void> {
    const form = this.positionForm;
    if (!form || !form.label.trim()) {
      return;
    }
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.saving.set(true);
    try {
      const existing = form.id ? this.positions.find((s) => s.id === form.id) : undefined;
      const label = form.label.trim();
      const data: ContractorSnippetPositionData = {
        label,
        description: form.description.trim(),
        unit: form.unit,
        unitPrice: form.unitPrice ?? 0,
        isOptional: form.isOptional
      };
      const snippet: ContractorSnippet = {
        id: form.id ?? crypto.randomUUID(),
        kind: 'position',
        label,
        data,
        sortOrder: existing ? existing.sortOrder : this.nextSortOrder(this.positions)
      };
      await this.snippets.save(snippet);
      this.positionForm = null;
      this.successMsg.set(this.i18n.t('Vorlage gespeichert.'));
      await this.load();
    } catch {
      this.errorMsg.set(this.i18n.t('Speichern der Vorlage fehlgeschlagen.'));
    } finally {
      this.saving.set(false);
    }
  }

  // --- Textbausteine (Einleitung/Schluss) ---

  newText(kind: TextKind): void {
    const form: TextFormState = { id: null, label: '', text: '' };
    if (kind === 'intro') {
      this.introForm = form;
    } else {
      this.outroForm = form;
    }
  }

  editText(kind: TextKind, snippet: ContractorSnippet): void {
    const data = this.textData(snippet);
    const form: TextFormState = { id: snippet.id, label: snippet.label, text: data.text };
    if (kind === 'intro') {
      this.introForm = form;
    } else {
      this.outroForm = form;
    }
  }

  cancelTextForm(kind: TextKind): void {
    if (kind === 'intro') {
      this.introForm = null;
    } else {
      this.outroForm = null;
    }
  }

  async saveText(kind: TextKind): Promise<void> {
    const form = kind === 'intro' ? this.introForm : this.outroForm;
    if (!form || !form.label.trim()) {
      return;
    }
    this.errorMsg.set(null);
    this.successMsg.set(null);
    this.saving.set(true);
    try {
      const list = kind === 'intro' ? this.introTexts : this.outroTexts;
      const existing = form.id ? list.find((s) => s.id === form.id) : undefined;
      const label = form.label.trim();
      const data: ContractorSnippetTextData = { text: form.text.trim() };
      const snippet: ContractorSnippet = {
        id: form.id ?? crypto.randomUUID(),
        kind,
        label,
        data,
        sortOrder: existing ? existing.sortOrder : this.nextSortOrder(list)
      };
      await this.snippets.save(snippet);
      this.cancelTextForm(kind);
      this.successMsg.set(this.i18n.t('Vorlage gespeichert.'));
      await this.load();
    } catch {
      this.errorMsg.set(this.i18n.t('Speichern der Vorlage fehlgeschlagen.'));
    } finally {
      this.saving.set(false);
    }
  }

  // --- Löschen (gemeinsam für alle Bausteine, Muster wie Angebots-Editor) ---

  requestDelete(id: string): void {
    this.confirmingDeleteId = id;
  }

  cancelDelete(): void {
    this.confirmingDeleteId = null;
  }

  async confirmDelete(id: string): Promise<void> {
    this.confirmingDeleteId = null;
    this.errorMsg.set(null);
    try {
      await this.snippets.delete(id);
      await this.load();
    } catch {
      this.errorMsg.set(this.i18n.t('Löschen der Vorlage fehlgeschlagen.'));
    }
  }

  // --- Anzeige-Helfer ---

  /** Sicherer Cast: `positions` enthält ausschließlich `kind === 'position'` (via `listByKind`). */
  positionData(snippet: ContractorSnippet): ContractorSnippetPositionData {
    return snippet.data as ContractorSnippetPositionData;
  }

  /** Sicherer Cast: `introTexts`/`outroTexts` enthalten ausschließlich Textbausteine. */
  textData(snippet: ContractorSnippet): ContractorSnippetTextData {
    return snippet.data as ContractorSnippetTextData;
  }

  unitLabel(unit: ProfessionalLineItemUnit): string {
    return this.unitOptions.find((option) => option.value === unit)?.label ?? unit;
  }

  formatPrice(value: number): string {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  }

  textExcerpt(text: string): string {
    const trimmed = text.trim();
    return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
  }

  private nextSortOrder(list: readonly ContractorSnippet[]): number {
    return list.length === 0 ? 0 : Math.max(...list.map((s) => s.sortOrder)) + 1;
  }
}
