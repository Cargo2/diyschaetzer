import { TestBed } from '@angular/core/testing';
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
