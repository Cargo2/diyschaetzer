import { Injectable } from '@angular/core';
import { BathroomWizardData } from '../models/bathroom-wizard.model';
import { isBathroomRoom } from './wizard-data-derivations';

export type WizardFieldKey =
  | 'sink'
  | 'shower'
  | 'bathtub'
  | 'toilet'
  | 'heating'
  | 'existing_covering'
  | 'existing_covering_removal'
  | 'old_sanitary_removal'
  | 'substrate_condition'
  | 'substrate_leveling'
  | 'primer'
  | 'waterproofing'
  | 'disposal'
  | 'wall_tiles';

export type WizardFieldDisplayStatus =
  | 'relevant'
  | 'not_relevant'
  | 'unknown'
  | 'answered';

export interface WizardFieldDisplayState {
  status: WizardFieldDisplayStatus;
  label: string;
  valueLabel: string;
  muted: boolean;
}

@Injectable({ providedIn: 'root' })
export class WizardFieldRelevanceService {
  /**
   * Relevanz wird aus den tatsächlichen Wizard-Antworten abgeleitet,
   * nicht aus einem Projekttyp: Ein Feld ist relevant, wenn es für den
   * Raumtyp gilt und die vorgelagerten Antworten es ins Spiel bringen.
   */
  isFieldRelevant(
    fieldKey: WizardFieldKey,
    wizardData: BathroomWizardData
  ): boolean {
    const isBathroom = isBathroomRoom(wizardData);
    const covering = wizardData.preparation?.existingCovering;
    const hasExistingCovering = covering?.status === 'yes';
    const coveringRemovalPlanned = covering?.removeRequired === 'yes';
    const sanitaryRemovalPlanned =
      wizardData.preparation?.oldSanitaryObjects?.removeRequired === 'yes';

    switch (fieldKey) {
      case 'sink':
      case 'shower':
      case 'bathtub':
      case 'toilet':
      case 'heating':
        return isBathroom;
      case 'existing_covering':
        return true;
      case 'existing_covering_removal':
        return hasExistingCovering;
      case 'disposal':
        return (hasExistingCovering && coveringRemovalPlanned) || sanitaryRemovalPlanned ||
          (hasExistingCovering && covering?.removeRequired === 'unknown');
      case 'old_sanitary_removal':
        return isBathroom && hasExistingCovering;
      case 'waterproofing':
        return isBathroom || wizardData.room?.isOutdoor === true;
      case 'wall_tiles':
        return wizardData.tilingScope !== 'floor_only';
      case 'substrate_condition':
      case 'substrate_leveling':
      case 'primer':
        return true;
      default:
        return true;
    }
  }

  getFieldDisplayState(
    fieldKey: WizardFieldKey,
    wizardData: BathroomWizardData,
    label: string,
    valueLabel: string,
    unknown: boolean
  ): WizardFieldDisplayState {
    if (!this.isFieldRelevant(fieldKey, wizardData)) {
      return {
        status: 'not_relevant',
        label,
        valueLabel: 'Nicht relevant',
        muted: true
      };
    }

    return {
      status: unknown ? 'unknown' : 'answered',
      label,
      valueLabel,
      muted: false
    };
  }
}
