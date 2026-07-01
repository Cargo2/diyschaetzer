import { TestBed } from '@angular/core/testing';
import { RoomSummaryContractorComponent } from './room-summary-contractor.component';
import { LocalProjectService } from '../../services/local-project.service';
import { WizardStateService } from '../../services/wizard-state.service';

/**
 * Deckt die Angebots-/Projektauswahl beim Speichern auf der Profi-Zusammenfassung
 * ab: neuer Raum in ein bestehendes bzw. neues Angebot, und dass ein bearbeiteter
 * Raum NICHT verschoben wird.
 */
describe('RoomSummaryContractorComponent – Angebotsauswahl beim Speichern', () => {
  let localProject: LocalProjectService;
  let wizardState: WizardStateService;
  let component: RoomSummaryContractorComponent;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    wizardState = TestBed.inject(WizardStateService);
    localProject = TestBed.inject(LocalProjectService);

    // Aktuellen Wizard-Raum vorbereiten (wie nach einem Wizard-Durchlauf).
    wizardState.setRoomType('bathroom');
    wizardState.setRoomName('Bad EG');
    wizardState.markWizardCompleted();

    component = TestBed.createComponent(RoomSummaryContractorComponent).componentInstance;
  });

  it('legt bei „+ Neues Angebot" ein neues Projekt an und speichert den Raum dort', () => {
    const initialProjectId = localProject.activeProjectId();
    component.targetOfferId.set(component.NEW_OFFER);
    component.newOfferName.set('Angebot Müller');

    component.saveRoom();

    expect(component.roomSaved()).toBe(true);
    expect(component.savedOfferName()).toBe('Angebot Müller');

    const active = localProject.getProject();
    expect(active.name).toBe('Angebot Müller');
    expect(active.rooms).toHaveLength(1);
    expect(active.rooms[0].roomName).toBe('Bad EG');

    // Ursprüngliches Projekt bleibt unangetastet, Wizard nicht zurückgesetzt.
    const initial = localProject.projects().find((p) => p.id === initialProjectId);
    expect(initial?.rooms).toHaveLength(0);
    expect(wizardState.isResultsAvailable()).toBe(true);
  });

  it('speichert den Raum in ein gewähltes bestehendes Angebot', () => {
    const target = localProject.createProject('Angebot B'); // setzt Wizard zurück
    const homeId = localProject.projects()[0].id;

    // Wizard neu befüllen und ein anderes Projekt aktiv machen als das Ziel.
    wizardState.setRoomType('bathroom');
    wizardState.setRoomName('Bad OG');
    wizardState.markWizardCompleted();
    localProject.switchProject(homeId);

    component.targetOfferId.set(target.id);
    component.saveRoom();

    expect(localProject.activeProjectId()).toBe(target.id);
    expect(component.savedOfferName()).toBe('Angebot B');

    const targetRooms = localProject.projects().find((p) => p.id === target.id)?.rooms;
    expect(targetRooms).toHaveLength(1);
    expect(targetRooms?.[0].roomName).toBe('Bad OG');

    const homeRooms = localProject.projects().find((p) => p.id === homeId)?.rooms;
    expect(homeRooms).toHaveLength(0);
  });

  it('verschiebt einen bearbeiteten Raum nicht, sondern aktualisiert ihn an Ort und Stelle', () => {
    const room = localProject.saveCurrentRoom(wizardState.payload());
    const homeId = localProject.activeProjectId();
    const otherProject = localProject.createProject('Anderes Angebot', false);

    // Zurück ins Heimprojekt und Raum zum Bearbeiten laden.
    localProject.switchProject(homeId);
    localProject.loadRoomIntoWizard(room.id);
    expect(localProject.getEditingRoomId()).toBe(room.id);

    // Dropdown zeigt woanders hin – beim Bearbeiten muss es ignoriert werden.
    component.targetOfferId.set(otherProject.id);
    component.saveRoom();

    expect(localProject.getEditingRoomId()).toBe(room.id);
    const homeRooms = localProject.projects().find((p) => p.id === homeId)?.rooms;
    expect(homeRooms).toHaveLength(1);
    const otherRooms = localProject.projects().find((p) => p.id === otherProject.id)?.rooms;
    expect(otherRooms).toHaveLength(0);
  });
});
