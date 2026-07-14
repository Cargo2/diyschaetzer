import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * Übersetzt einen deutschen Quelltext-Key zur Laufzeit: `'Angebote' | t`.
 *
 * `pure: false` ist hier bewusst und billig: im Zoneless-Betrieb läuft Change
 * Detection nur, wenn ein gelesenes Signal kippt – die impure Pipe wird also
 * NICHT ständig, sondern nur bei signal-getriggerter CD (u. a. Sprachwechsel)
 * neu evaluiert. Eine pure Pipe würde stattdessen den beim ersten Render
 * memoisierten deutschen Wert festhalten und beim Sprachwechsel nicht
 * aktualisieren (gleicher Input-Key ⇒ Cache-Hit).
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string): string {
    return this.i18n.t(key);
  }
}
