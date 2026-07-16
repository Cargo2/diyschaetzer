import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';

interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

/**
 * B2B-Landingpage „Für Fliesenleger" (`/fuer-fliesenleger`). SEO-relevant und
 * daher PRERENDERT (app.routes.server.ts: RenderMode.Prerender, Statikroute im
 * Sitemap-Generator). Bewusst OHNE PayPal-SDK – der Abschluss läuft erst im
 * eingeloggten Profil-Abo-Abschnitt. Setzt Title/Description/Canonical/OG +
 * FAQPage-JSON-LD analog den Kostenseiten.
 */
@Component({
  selector: 'app-fuer-fliesenleger',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './fuer-fliesenleger.component.html',
  styleUrl: './fuer-fliesenleger.component.css'
})
export class FuerFliesenlegerComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);

  /** Eingeloggter Profi → direkt zur Premium-Freischaltung; sonst zur Registrierung. */
  readonly isContractor = this.auth.isContractor;
  readonly ctaLink = computed(() => (this.isContractor() ? '/konto/premium' : '/login'));

  /**
   * Nicht eingeloggt → Login-Seite im Registrieren-Modus, Rolle „Betrieb"
   * vorausgewählt, mit Weiter-Ziel Premium. Nach der (E-Mail-bestätigten) Anmeldung
   * landet der Betrieb direkt bei /konto/premium. Für eingeloggte Profis sind keine
   * Query-Parameter nötig.
   */
  readonly ctaQueryParams = computed(() =>
    this.isContractor()
      ? {}
      : { modus: 'registrieren', rolle: 'betrieb', weiter: '/konto/premium' }
  );
  readonly ctaFragment = computed(() => (this.isContractor() ? 'abo' : undefined));

  readonly faq: readonly FaqItem[] = [
    {
      question: 'Was bekomme ich mit Premium – und was ist kostenlos?',
      answer:
        'Kostenlos kannst du bis zu 3 Angebote speichern und den Kostenrechner voll nutzen. ' +
        'Premium (1. Monat gratis, danach 29,99 €/Monat) schaltet unbegrenzt Angebote frei, du erhältst bestätigte ' +
        'Kundenanfragen aus deinen PLZ-Gebieten und dein Betrieb erscheint mit Kontaktdaten ' +
        'direkt im Kostenrechner in deiner Region.'
    },
    {
      question: 'Was kostet Premium?',
      answer:
        'Der erste Monat ist gratis, danach 29,99 € pro Monat. Gemäß § 19 UStG wird keine ' +
        'Umsatzsteuer berechnet. Das Abo ist monatlich kündbar; du gehst keine lange Vertragsbindung ein.'
    },
    {
      question: 'Was ist eine XRechnung – und betrifft mich die E-Rechnungspflicht?',
      answer:
        'Eine XRechnung ist eine strukturierte elektronische Rechnung nach EN 16931. Die E-Rechnung ' +
        'wird ab 2027 für B2B-Geschäfte in Deutschland schrittweise zur Pflicht (ab 2028 für alle ' +
        'Betriebe). Der XRechnung-Export ist in der App enthalten – ein Klick, fertig – und steht ' +
        'auch Free-Konten zur Verfügung.'
    },
    {
      question: 'Wie viele Anfragen bekomme ich?',
      answer:
        'Wir geben jede bestätigte Anfrage an maximal drei Betriebe weiter und filtern nach ' +
        'deinen PLZ-Gebieten und Raumarten. Eine bestimmte Anzahl an Anfragen können und ' +
        'dürfen wir nicht garantieren – das Abo verschafft dir den Zugang, kein Mengenversprechen.'
    },
    {
      question: 'Sind die Anfragen geprüft?',
      answer:
        'Jede Anfrage wird vor der Weitergabe per E-Mail bestätigt (Double-Opt-in). Unbestätigte ' +
        'Anfragen werden nie weitergegeben und nach kurzer Frist gelöscht.'
    },
    {
      question: 'Wie kündige ich?',
      answer:
        'Du kündigst jederzeit selbst in deinem PayPal-Konto. Das Abo läuft bis zum Ende der ' +
        'bereits bezahlten Periode und verlängert sich dann nicht mehr.'
    },
    {
      question: 'Was passiert nach der Kündigung mit meinen Anfragen?',
      answer:
        'Bereits an dich zugeteilte Anfragen bleibst du sehen und kannst sie weiter bearbeiten. ' +
        'Ohne aktives Abo erhältst du lediglich keine neuen Zuteilungen mehr.'
    }
  ];

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Für Fliesenleger: bestätigte Kundenanfragen im Monats-Abo',
      description:
        'Für Fliesenleger: Angebote & Rechnungen in Minuten, XRechnung (ab 2027 Pflicht) inklusive, ' +
        'bestätigte Anfragen aus deinen PLZ-Gebieten. 1. Monat gratis.',
      path: '/fuer-fliesenleger',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: this.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    });
  }
}
