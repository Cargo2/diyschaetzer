import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WizardComponent } from '../../components/wizard/wizard.component';
import { WizardStateService } from '../../services/wizard-state.service';

@Component({
  selector: 'app-wizard-page',
  standalone: true,
  imports: [CommonModule, WizardComponent],
  template: `
    @if (showResultsNotice()) {
      <section class="wizard-notice">
        Bitte schließe zuerst den Wizard ab, damit die Ergebnisse neu berechnet werden können.
      </section>
    }

    <app-wizard
      (progressChanged)="updateWizardProgress($event)"
      (completed)="completeWizard()"
    />
  `,
  styles: [
    `
      .wizard-notice {
        background: #ecfdf5;
        border: 1px solid #99f6e4;
        border-radius: 1rem;
        color: #134e4a;
        font-weight: 800;
        margin: 0 auto 1rem;
        padding: 1rem;
        width: min(80vw, 100%);
      }
    `
  ]
})
export class WizardPageComponent {
  private readonly wizardState = inject(WizardStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly showResultsNotice = () =>
    this.route.snapshot.queryParamMap.get('resultsLocked') === '1';

  updateWizardProgress(progress: { current: number; total: number; percent: number }): void {
    this.wizardState.setCurrentStepIndex(progress.current - 1);
  }

  completeWizard(): void {
    this.wizardState.markWizardCompleted();
    void this.router.navigate(['/zusammenfassung']);
  }
}
