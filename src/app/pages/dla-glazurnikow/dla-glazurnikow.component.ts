import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';

interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

/**
 * Polnischsprachige B2B-Landingpage „Dla glazurników" (`/dla-glazurnikow`).
 * BEWUSSTE AUSNAHME von der Regel „Marketing immer deutsch": Zielgruppe sind
 * polnischsprachige Fliesenleger-Betriebe in Deutschland (für spätere Google-Ads
 * auf polnische Keywords). Inhaltlich eine Übersetzung/Adaption von
 * `fuer-fliesenleger`. SEO-relevant und daher PRERENDERT (app.routes.server.ts:
 * RenderMode.Prerender, Statikroute im Sitemap-Generator). Host trägt `lang="pl"`,
 * das globale <html> bleibt deutsch. Rechtsbegriffe (§ 19 UStG, XRechnung, UStG)
 * bleiben bewusst deutsch, weil sie in Deutschland auch für polnische Betriebe gelten.
 */
@Component({
  selector: 'app-dla-glazurnikow',
  standalone: true,
  host: { lang: 'pl' },
  imports: [RouterLink],
  templateUrl: './dla-glazurnikow.component.html',
  styleUrl: './dla-glazurnikow.component.css'
})
export class DlaGlazurnikowComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);

  /** Eingeloggter Profi → direkt zur Premium-Freischaltung; sonst zur Registrierung. */
  readonly isContractor = this.auth.isContractor;
  readonly ctaLink = computed(() => (this.isContractor() ? '/konto/premium' : '/login'));

  readonly ctaQueryParams = computed(() =>
    this.isContractor()
      ? {}
      : { modus: 'registrieren', rolle: 'betrieb', weiter: '/konto/premium' }
  );
  readonly ctaFragment = computed(() => (this.isContractor() ? 'abo' : undefined));

  readonly faq: readonly FaqItem[] = [
    {
      question: 'Co dostaję w abonamencie Premium – a co jest za darmo?',
      answer:
        'Za darmo zapiszesz do 3 ofert, na ich podstawie wystawisz faktury wraz z XRechnung ' +
        'i skorzystasz w pełni z kalkulatora kosztów. Abonament Premium (pierwszy miesiąc gratis, ' +
        'potem 29,99 € / miesiąc) odblokowuje wszystkie funkcje dla firm bez limitu – nieograniczoną ' +
        'liczbę ofert, pełny łańcuch faktur (zaliczkowa, częściowa i końcowa), szablony tekstów oraz ' +
        'linki do ofert ze śledzeniem akceptacji. Dodatkowo otrzymujesz potwierdzone zapytania klientów ' +
        'z Twoich obszarów kodów pocztowych, a Twoja firma pojawia się z danymi kontaktowymi ' +
        'bezpośrednio w kalkulatorze kosztów w Twoim regionie.'
    },
    {
      question: 'Ile kosztuje Premium?',
      answer:
        'Pierwszy miesiąc jest gratis, potem 29,99 € miesięcznie. Zgodnie z § 19 UStG ' +
        '(niemiecki przepis o drobnych przedsiębiorcach) nie doliczamy podatku VAT. Abonament można ' +
        'wypowiedzieć co miesiąc – nie wiążesz się długim kontraktem.'
    },
    {
      question: 'W jakim języku jest aplikacja i dokumenty?',
      answer:
        'Interfejs aplikacji jest dostępny po polsku – wystarczy przełączyć język w panelu bocznym ' +
        '(DE / PL / EN). Uczciwie zaznaczamy: dokumenty (oferty i faktury) oraz strona logowania ' +
        'i rejestracji są po niemiecku, ponieważ trafiają do niemieckich klientów i urzędów. ' +
        'Tak wygląda dokument, który wysyłasz – Ty pracujesz po polsku, klient otrzymuje ofertę po niemiecku.'
    },
    {
      question: 'Czym jest XRechnung – i czy dotyczy mnie obowiązek e-faktury?',
      answer:
        'XRechnung to ustrukturyzowana faktura elektroniczna zgodna z normą EN 16931. E-faktura ' +
        'stanie się w Niemczech stopniowo obowiązkowa w obrocie B2B od 2027 roku (od 2028 dla wszystkich ' +
        'firm). Eksport XRechnung jest wbudowany w aplikację – jedno kliknięcie i gotowe – i jest ' +
        'dostępny także w koncie darmowym.'
    },
    {
      question: 'Czy mogę wystawiać faktury zaliczkowe, częściowe i końcowe?',
      answer:
        'Tak. Z zaakceptowanej oferty utworzysz cały łańcuch faktur: zaliczkową, częściową i końcową. ' +
        'Kwoty już wystawione i zapłacone są rozliczane w fakturze końcowej zgodnie z § 14 ust. 5 UStG, ' +
        'a pozostałą kwotę do zapłaty aplikacja wylicza automatycznie.'
    },
    {
      question: 'Jak działa link do oferty ze śledzeniem akceptacji?',
      answer:
        'Zamiast pliku PDF wysyłasz klientowi link. Otwiera on ofertę online i może ją zaakceptować ' +
        'cyfrowo od razu. W ofercie widzisz status – udostępniona, obejrzana, zaakceptowana – więc ' +
        'zawsze wiesz, na czym stoisz.'
    },
    {
      question: 'Czy mogę zainstalować aplikację na telefonie?',
      answer:
        'Tak. Aplikację można zainstalować na smartfonie jako PWA i uruchamiać jak natywną aplikację – ' +
        'bez pobierania ze sklepu. Dzięki temu tworzysz i udostępniasz oferty oraz faktury także ' +
        'w terenie, na budowie.'
    },
    {
      question: 'Ile zapytań otrzymam?',
      answer:
        'Każde potwierdzone zapytanie przekazujemy maksymalnie trzem firmom i filtrujemy je według ' +
        'Twoich obszarów kodów pocztowych i rodzajów pomieszczeń. Nie możemy i nie chcemy gwarantować ' +
        'konkretnej liczby zapytań – abonament daje Ci dostęp, a nie obietnicę ilościową.'
    },
    {
      question: 'Czy zapytania są zweryfikowane?',
      answer:
        'Każde zapytanie jest przed przekazaniem potwierdzane mailowo (double opt-in). Niepotwierdzone ' +
        'zapytania nigdy nie są przekazywane i po krótkim czasie zostają usunięte.'
    },
    {
      question: 'Jak wypowiedzieć abonament?',
      answer:
        'Wypowiadasz go w dowolnym momencie samodzielnie w swoim koncie PayPal. Abonament działa do końca ' +
        'już opłaconego okresu i po nim się nie przedłuża.'
    },
    {
      question: 'Co dzieje się z moimi zapytaniami po wypowiedzeniu?',
      answer:
        'Zapytania już Ci przydzielone pozostają widoczne i możesz je dalej obsługiwać. Bez aktywnego ' +
        'abonamentu po prostu nie otrzymujesz nowych przydziałów.'
    }
  ];

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Dla glazurników: oferty, faktury i XRechnung w abonamencie Premium',
      description:
        'Dla polskojęzycznych firm glazurniczych w Niemczech: oferty i faktury w kilka minut, pełny ' +
        'łańcuch faktur, XRechnung (od 2027 obowiązkowa) w cenie, linki do ofert ze śledzeniem ' +
        'akceptacji – oraz potwierdzone zapytania z Twoich obszarów PLZ. Pierwszy miesiąc gratis.',
      path: '/dla-glazurnikow',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: 'pl',
        mainEntity: this.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      },
      alternates: [
        { hreflang: 'de', path: '/fuer-fliesenleger' },
        { hreflang: 'pl', path: '/dla-glazurnikow' },
        { hreflang: 'x-default', path: '/fuer-fliesenleger' }
      ]
    });
  }
}
