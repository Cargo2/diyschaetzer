import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { absoluteUrl, SITE_NAME } from '../../config/site.config';
import { SeoService } from '../../services/seo.service';

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Heimwerker-SEO-Seite: „Fliesen verlegen: Material & Werkzeug – die komplette
 * Checkliste" (Route /vorlage/fliesen-verlegen-material-werkzeug, prerendert, indexierbar).
 * Pendant zur Profi-Vorlage (offer-template), aber DIY-fokussiert: was an Material
 * Pflicht/optional ist, welches Werkzeug man kauft vs. im Baumarkt leiht, und wie
 * der Schätzer daraus die Materialliste erzeugt. Teilt sich das Layout/CSS mit der
 * Profi-Vorlage (offer-template.component.css, alles `.tmpl-*`).
 *
 * Bild und Video sind als Platzhalter vorbereitet: sobald die Dateien vorliegen,
 * `imageSrc` bzw. `videoSrc` setzen (Datei nach `public/vorlage/` legen). Video
 * bewusst selbst gehostet (MP4) statt YouTube → keine Drittanbieter-Cookies.
 */
@Component({
  selector: 'app-material-template',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './material-template.component.html',
  styleUrl: './offer-template.component.css'
})
export class MaterialTemplateComponent implements OnInit {
  private readonly seo = inject(SeoService);

  /** Sobald vorhanden auf z. B. '/vorlage/material-hero.jpg' setzen (Datei nach public/vorlage/). */
  readonly imageSrc: string | null = '/vorlage/material-hero.jpg';
  /** Selbst gehostetes Screencast; per `preload="none"` erst beim Start geladen. */
  readonly videoSrc: string | null = '/vorlage/materialliste.mp4';
  /** Optionales Vorschaubild (Poster) fürs Video. */
  readonly videoPoster: string | null = null;

  readonly faq: FaqItem[] = [
    {
      question: 'Welches Werkzeug brauche ich zum Fliesen verlegen?',
      answer:
        'Das Grundwerkzeug ist günstig und gehört in jeden Werkzeugkasten: Zahnkelle, Rührquirl, ' +
        'zwei Eimer, Wasserwaage, Fugbrett (Gummiwischer), Schwammbrett, Fugenkreuze oder Keile und ' +
        'Knieschoner. Teures Spezialwerkzeug wie einen Nassschneider oder Bohrhammer leiht man besser, ' +
        'wenn man es nur einmal braucht.'
    },
    {
      question: 'Was kann ich im Baumarkt leihen statt kaufen?',
      answer:
        'Hornbach, Bauhaus und Obi haben Leihstationen. Sinnvoll zu leihen sind Geräte, die teuer sind ' +
        'und selten gebraucht werden: elektrischer Nassschneider (Fliesentisch), Bohrhammer, ' +
        'Winkelschleifer und Laser-Nivelliergerät. Tagessätze liegen meist im niedrigen zweistelligen ' +
        'Bereich; Kaution und Personalausweis nicht vergessen.'
    },
    {
      question: 'Wie viel Verschnitt soll ich einplanen?',
      answer:
        'Als Faustregel rund 10 % Verschnitt auf die reine Fläche. Bei kleinen, verwinkelten Räumen, ' +
        'Diagonalverlegung oder Großformat eher 15 %. Lieber etwas mehr aus derselben Charge kaufen – ' +
        'eine Nachbestellung hat oft eine leicht abweichende Farbnummer.'
    },
    {
      question: 'Brauche ich im Bad eine Abdichtung?',
      answer:
        'In Nassbereichen (Dusche, rund um die Badewanne, Spritzwasserzonen) ja: eine Verbundabdichtung ' +
        'unter den Fliesen plus Dichtband, Innen-/Außenecken und Manschetten an Rohrdurchführungen. ' +
        'Sie ist Pflicht und schützt vor Feuchteschäden – nicht daran sparen.'
    },
    {
      question: 'Welcher Fliesenkleber für Großformat?',
      answer:
        'Für große Formate (ab ca. 60 × 60 cm) einen flexiblen Dünnbettmörtel bzw. Flexkleber, oft als ' +
        'Mittelbettkleber für vollflächiges Verkleben. Achte auf die passende Zahnung der Kelle und auf ' +
        'einen tragfähigen, grundierten und ebenen Untergrund.'
    }
  ];

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Fliesen verlegen: Material & Werkzeug – komplette Checkliste',
      description:
        'Welches Material und Werkzeug du zum Fliesen verlegen wirklich brauchst: komplette ' +
        'Checkliste für Heimwerker – Pflicht, optional, einmalig kaufen oder im Baumarkt leihen.',
      path: '/vorlage/fliesen-verlegen-material-werkzeug',
      type: 'article',
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: 'Fliesen verlegen: Material & Werkzeug – die komplette Checkliste',
            description:
              'Material- und Werkzeug-Checkliste für Heimwerker: was Pflicht und was optional ist, ' +
              'welches Werkzeug man kauft oder im Baumarkt leiht und wie viel Material man braucht.',
            inLanguage: 'de-DE',
            author: { '@type': 'Organization', name: SITE_NAME },
            publisher: { '@type': 'Organization', name: SITE_NAME },
            mainEntityOfPage: absoluteUrl('/vorlage/fliesen-verlegen-material-werkzeug')
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
