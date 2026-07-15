import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LEAD_REPOSITORY } from '../../data-access/lead-repository';
import {
  LEAD_CONSENT_TEXT,
  LEAD_SUBMIT_ERROR_MESSAGES,
  LEAD_TIMEFRAME_OPTIONS,
  LeadProjectSnapshot,
  LeadSubmitError,
  LeadTimeframe
} from '../../models/lead.model';
import { FeatureAccessService } from '../../services/feature-access.service';
import { LeadRegionService } from '../../services/lead-region.service';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

// Der Einwilligungstext endet auf „… Datenschutzerklärung." – für die Anzeige
// trennen wir das letzte Wort ab, um es als Link auf /datenschutz#leads zu setzen.
// Der SICHTBARE Text bleibt dadurch WÖRTLICH identisch zum Server-Consent.
const CONSENT_LINK_WORD = 'Datenschutzerklärung.';
const CONSENT_TEXT_PREFIX = LEAD_CONSENT_TEXT.slice(
  0,
  LEAD_CONSENT_TEXT.length - CONSENT_LINK_WORD.length
);

/**
 * Lead-Formular (Welle 1, Wizard-Abschluss). Wird NUR gerendert, wenn
 * FeatureAccessService.canSubmitLeads() true ist (Feature-Gate + Supabase). Ohne
 * Supabase existiert dieser Abschnitt gar nicht im DOM.
 *
 * DSGVO: Submit erst möglich, wenn Pflichtfelder valide sind UND die (nicht
 * vorbelegte) Einwilligungs-Checkbox gesetzt ist – zusätzlich zur serverseitigen
 * Durchsetzung. Es wird nichts im localStorage gespeichert.
 */
@Component({
  selector: 'app-lead-form',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './lead-form.component.html',
  styleUrl: './lead-form.component.css'
})
export class LeadFormComponent {
  private readonly repository = inject(LEAD_REPOSITORY);
  private readonly featureAccess = inject(FeatureAccessService);
  private readonly region = inject(LeadRegionService);
  private readonly i18n = inject(I18nService);

  /** Snapshot der Rechner-Ergebnisse (kein Live-Verweis, keine PII). */
  readonly snapshot = input.required<LeadProjectSnapshot>();

  readonly timeframeOptions = LEAD_TIMEFRAME_OPTIONS;
  readonly consentTextPrefix = CONSENT_TEXT_PREFIX;

  // Formularfelder
  name = '';
  /**
   * PLZ liegt im geteilten LeadRegionService, damit ein späteres Betriebe-
   * Verzeichnis das Feld vorbefüllen kann (und umgekehrt) – kein Doppel-Tippen.
   */
  get postalCode(): string {
    return this.region.postalCode();
  }
  set postalCode(value: string) {
    this.region.postalCode.set(value);
  }
  email = '';
  phone = '';
  timeframe: LeadTimeframe = 'asap';
  message = '';
  consent = false;
  /** Honeypot – von echten Nutzern nie befüllt. */
  website = '';

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly errorReason = signal<LeadSubmitError | null>(null);

  /**
   * Feature-Gate (Methode, damit sie bei jeder Change-Detection neu geprüft wird –
   * sie hängt nicht an Formular-Signalen). Ohne Supabase false → kein DOM.
   */
  canSubmitLeads(): boolean {
    return this.featureAccess.canSubmitLeads();
  }

  errorMessage(): string | null {
    const reason = this.errorReason();
    return reason ? this.i18n.t(LEAD_SUBMIT_ERROR_MESSAGES[reason]) : null;
  }

  /**
   * Pflichtfelder valide UND Einwilligung gesetzt (spiegelt die Server-Regel).
   * Bewusst Methode statt `computed`: die Felder sind einfache ngModel-Properties
   * (keine Signals); die Template-Bindung wertet sie pro CD-Zyklus neu aus.
   */
  formValid(): boolean {
    return (
      this.name.trim().length >= 2 &&
      /^[0-9]{5}$/.test(this.postalCode.trim()) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(this.email.trim()) &&
      this.consent
    );
  }

  canSubmit(): boolean {
    return this.formValid() && !this.submitting();
  }

  async submit(): Promise<void> {
    // Doppelte Absicherung zur Template-Bindung (Bots/Programmatik).
    if (!this.canSubmit()) {
      return;
    }
    this.errorReason.set(null);
    this.submitting.set(true);
    try {
      const result = await this.repository.submit({
        name: this.name.trim(),
        postalCode: this.postalCode.trim(),
        email: this.email.trim(),
        phone: this.phone.trim() || null,
        timeframe: this.timeframe,
        message: this.message.trim() || null,
        consent: this.consent,
        projectSnapshot: this.snapshot(),
        website: this.website
      });
      if (result.ok) {
        this.submitted.set(true);
      } else {
        this.errorReason.set(result.reason);
      }
    } catch {
      this.errorReason.set('unknown');
    } finally {
      this.submitting.set(false);
    }
  }
}
