import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { WizardStateService } from '../services/wizard-state.service';

export const wizardCompletedGuard: CanActivateFn = () => {
  const wizardState = inject(WizardStateService);
  const router = inject(Router);

  if (wizardState.isResultsAvailable()) {
    return true;
  }

  return router.createUrlTree(['/raum-anlegen'], {
    queryParams: {
      resultsLocked: '1'
    }
  });
};
