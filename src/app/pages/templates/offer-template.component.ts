import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { absoluteUrl, SITE_NAME } from '../../config/site.config';
import { SeoService } from '../../services/seo.service';

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * B2B-SEO-Seite für Profis: „Angebot Fliesenleger schreiben: Muster & Kalkulation"
 * (Route /vorlage/angebot-fliesen-muster, prerendert, indexierbar). Erklärt den
 * Aufbau eines Angebots anhand der Logik des Schätzers (Positionen, Leistungen,
 * Material, Anfahrt) und führt ins Angebotsmodul.
 *
 * Bild und Video sind als Platzhalter vorbereitet: sobald die Dateien vorliegen,
 * `imageSrc` bzw. `videoSrc` setzen (Datei nach `public/vorlage/` legen). Video
 * bewusst selbst gehostet (MP4) statt YouTube → keine Drittanbieter-Cookies.
 */
@Component({
  selector: 'app-offer-template',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './offer-template.component.html',
  styleUrl: './offer-template.component.css'
})
export class OfferTemplateComponent implements OnInit {
  private readonly seo = inject(SeoService);

  /** Sobald vorhanden auf z. B. '/vorlage/angebot-muster.png' setzen (Datei nach public/vorlage/). */
  readonly imageSrc: string | null = null;
  /** Selbst gehostetes Screencast; per `preload="none"` erst beim Start geladen. */
  readonly videoSrc: string | null = '/vorlage/angebot.mp4';
  /** Optionales Vorschaubild (Poster) fürs Video. */
  readonly videoPoster: string | null = null;

  readonly faq: FaqItem[] = [
    {
      question: 'Was muss in ein Fliesenleger-Angebot?',
      answer:
        'Firmen- und Kundendaten, Angebotsnummer und Datum, ein nach Positionen gegliedertes ' +
        'Leistungsverzeichnis (je Position Leistungsbeschreibung, Menge, Einheit, Einheitspreis, ' +
        'Gesamtpreis), Baustelleneinrichtung und Anfahrt, Material, die Summen netto/MwSt/brutto sowie ' +
        'Gültigkeit und Zahlungsbedingungen.'
    },
    {
      question: 'Wie kalkuliere ich den Verschnitt?',
      answer:
        'Üblich sind rund 10 % Verschnitt, bei kleinen Räumen mit vielen Schnitten, Diagonal- oder ' +
        'Großformat-Verlegung eher 15 %. Wichtig: Verschnitt gehört in die Materialmenge, nicht in den ' +
        'Verlegepreis. Der Schätzer rechnet ihn formatabhängig automatisch ein.'
    },
    {
      question: 'Gehört die Anfahrt ins Angebot?',
      answer:
        'Ja. Anfahrt bzw. Fahrtkosten und die Baustelleneinrichtung (Schutz, Material einbringen, ' +
        'Entsorgung) sind eigene Positionen. Werden sie vergessen, schmälern sie direkt die Marge.'
    },
    {
      question: 'Sollte ich Material und Arbeit trennen?',
      answer:
        'Für den Kunden ist eine Trennung übersichtlich. Im Schätzer steht die Leistung im Vordergrund; ' +
        'das Material wird als eine kompakte Sammelposition ausgewiesen. Beides ist im Angebotsmodul ' +
        'frei anpassbar.'
    },
    {
      question: 'Wie lange ist ein Angebot gültig?',
      answer:
        'Üblich sind 2 bis 4 Wochen. Eine klare Gültigkeitsdauer schützt dich vor steigenden Material- ' +
        'und Lohnkosten und gehört in den Fußteil des Angebots.'
    }
  ];

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Angebot Fliesenleger schreiben: Muster & Kalkulation',
      description:
        'Wie du als Fliesenleger ein profitables Angebot schreibst: Aufbau, Positionsliste, ' +
        'Material und Anfahrt, mit Muster und einem Schätzer, der das Leistungsverzeichnis erzeugt.',
      path: '/vorlage/angebot-fliesen-muster',
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: 'Angebot Fliesenleger schreiben: Muster, Positionen & Kalkulation',
            description:
              'Aufbau eines Fliesenleger-Angebots mit Positionsliste, Material und Anfahrt, erklärt ' +
              'anhand der Logik des Fliesen-Kostenschätzers.',
            inLanguage: 'de-DE',
            author: { '@type': 'Organization', name: SITE_NAME },
            publisher: { '@type': 'Organization', name: SITE_NAME },
            mainEntityOfPage: absoluteUrl('/vorlage/angebot-fliesen-muster')
          },
          {
            '@type': 'FAQPage',
            mainEntity: this.faq.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer }
            }))
          }
        ]
      }
    });
  }
}
