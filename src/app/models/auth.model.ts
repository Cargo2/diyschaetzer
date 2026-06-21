import { PlanType, UserRole } from './commercial.model';

/** Bei der Registrierung wählbare Rollen: Hobby (customer) oder Profi (contractor). */
export type SignupRole = 'customer' | 'contractor';

/** Aus der `profiles`-Tabelle geladenes Nutzerprofil. */
export interface UserProfile {
  id: string;
  role: UserRole;
  plan: PlanType;
  displayName: string | null;
}
