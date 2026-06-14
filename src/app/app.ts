import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { WizardStateService } from './services/wizard-state.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly wizardState = inject(WizardStateService);
  private readonly router = inject(Router);

  readonly resultsAvailable = this.wizardState.resultsAvailable;

  openResultsPage(path: '/materialliste' | '/summary'): void {
    if (this.resultsAvailable()) {
      void this.router.navigate([path]);
      return;
    }

    void this.router.navigate(['/wizard'], {
      queryParams: {
        resultsLocked: '1'
      }
    });
  }
}
