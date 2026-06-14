import {
  BathroomWizardData,
  RoomType
} from './bathroom-wizard.model';
import { MaterialListUserState } from './material-list.model';

export type ProjectStatus =
  | 'draft'
  | 'in_progress'
  | 'ready_for_review'
  | 'archived';

export interface LocalTileProject {
  id: string;
  name: string;
  status: ProjectStatus;
  rooms: SavedRoomCalculation[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedRoomCalculation {
  id: string;
  roomName: string;
  roomType: RoomType;
  isOutdoor: boolean;
  wizardData: BathroomWizardData;
  materialListUserState: MaterialListUserState;
  createdAt: string;
  updatedAt: string;
}
