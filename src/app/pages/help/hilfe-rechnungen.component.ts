import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Anwenderdoku „Rechnungen" (`/hilfe/rechnungen`, contractorGuard, beide Routen-Bäume).
 *
 * Bewusst OHNE i18n-Wrapping (Deutsch-only): die Seite liegt außerhalb des
 * i18n-Coverage-Scans (`i18n-coverage.spec.ts` → `SCANNED_FILES`), daher hier
 * KEINE `| t`-Pipes verwenden – sonst entstehen unübersetzte Keys, die der
 * Coverage-Test nicht erfasst (falsche Sicherheit) bzw. bei versehentlicher
 * Aufnahme in den Scan sofort durchfallen.
 */
@Component({
  selector: 'app-hilfe-rechnungen',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hilfe-rechnungen.component.html',
  styleUrl: './hilfe-rechnungen.component.css'
})
export class HilfeRechnungenComponent {}
