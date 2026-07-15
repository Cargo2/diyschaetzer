import { TestBed } from '@angular/core/testing';
import { LocalTileProject } from '../models/local-project.model';
import { LocalProjectService } from './local-project.service';
import { WizardStateService } from './wizard-state.service';

/**
 * Deckt das neue `resetWizard`-Flag von {@link LocalProjectService.createProject}
 * ab (Grundlage für „+ Neues Angebot" in der Profi-Zusammenfassung): der noch
 * nicht gespeicherte Wizard-Raum darf beim Anlegen eines neuen Projekts nicht
 * verloren gehen.
 */
describe('LocalProjectService – createProject(resetWizard)', () => {
  let localProject: LocalProjectService;
  let wizardState: WizardStateService;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    wizardState = TestBed.inject(WizardStateService);
    localProject = TestBed.inject(LocalProjectService);
  });

  it('setzt beim Anlegen eines Projekts standardmäßig den Wizard zurück', () => {
    wizardState.markWizardCompleted();
    expect(wizardState.isResultsAvailable()).toBe(true);

    localProject.createProject('Neues Angebot');

    expect(wizardState.isResultsAvailable()).toBe(false);
    expect(localProject.getProject().name).toBe('Neues Angebot');
  });

  it('lässt den Wizard bei resetWizard=false unangetastet und speichert den Raum dort', () => {
    wizardState.setRoomType('bathroom');
    wizardState.setRoomName('Bad EG');
    wizardState.markWizardCompleted();
    const data = wizardState.payload();

    const project = localProject.createProject('Angebot Müller', false);

    expect(wizardState.isResultsAvailable()).toBe(true);
    expect(localProject.activeProjectId()).toBe(project.id);

    localProject.saveCurrentRoom(data);

    expect(localProject.getProject().rooms).toHaveLength(1);
    expect(localProject.getProject().rooms[0].roomName).toBe('Bad EG');
  });
});

/**
 * Deckt die Persistenz der Profi-Bestellliste ab (Aufgabe R1-A): das Feld
 * `orderedMaterialKeys` muss den Normalisierungs-Roundtrip überleben, Müll
 * (Nicht-Strings/Leerstrings/Duplikate) wird bereinigt, und `setMaterialOrdered`
 * toggelt bzw. dedupet aufs aktive Projekt.
 */
describe('LocalProjectService – orderedMaterialKeys (Profi-Bestellliste)', () => {
  let localProject: LocalProjectService;
  const now = '2026-07-15T10:00:00.000Z';

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    localProject = TestBed.inject(LocalProjectService);
  });

  it('behält gültige Schlüssel über die Normalisierung und bereinigt Müll', () => {
    const stored = {
      id: 'p1',
      name: 'Projekt',
      status: 'draft',
      rooms: [],
      createdAt: now,
      updatedAt: now,
      // gemischte Fremddaten: Duplikat, Leer-/Whitespace, Nicht-Strings
      orderedMaterialKeys: ['k1', 'k1', 'k2', '', '   ', 42, null, undefined]
    } as unknown as LocalTileProject;

    localProject.replaceProject(stored);

    expect(localProject.getProject().orderedMaterialKeys).toEqual(['k1', 'k2']);
  });

  it('normalisiert ein fehlendes Feld zu einer leeren Liste', () => {
    localProject.replaceProject({
      id: 'p2',
      name: 'Projekt',
      status: 'draft',
      rooms: [],
      createdAt: now,
      updatedAt: now
    } as LocalTileProject);

    expect(localProject.getProject().orderedMaterialKeys).toEqual([]);
  });

  it('toggelt Bestell-Häkchen und dedupet Schlüssel', () => {
    localProject.replaceProject({
      id: 'p3',
      name: 'Projekt',
      status: 'draft',
      rooms: [],
      createdAt: now,
      updatedAt: now
    } as LocalTileProject);

    localProject.setMaterialOrdered('a::project', true);
    localProject.setMaterialOrdered('a::project', true); // kein Duplikat
    localProject.setMaterialOrdered('b::room::r1', true);
    expect(localProject.getProject().orderedMaterialKeys).toEqual([
      'a::project',
      'b::room::r1'
    ]);

    localProject.setMaterialOrdered('a::project', false);
    expect(localProject.getProject().orderedMaterialKeys).toEqual(['b::room::r1']);

    // Leerschlüssel werden ignoriert (keine Mutation)
    localProject.setMaterialOrdered('   ', true);
    expect(localProject.getProject().orderedMaterialKeys).toEqual(['b::room::r1']);
  });
});
