import { ProfessionalLineItemUnit } from '../services/professional-offer.service';

/** Herkunft einer Angebotsposition: aus der Kalkulation erzeugt oder vom Profi ergänzt. */
export type ContractorOfferLineOrigin = 'generated' | 'custom';

/** Art einer Angebots-Sektion: Baustelle, Raum, Material-Sammelposition oder freie Gruppe. */
export type ContractorOfferSectionKind = 'site_setup' | 'room' | 'material' | 'custom';

/** Eine einzelne Position im Profi-Angebot (editierbar in Block C). */
export interface ContractorOfferLine {
  id: string;
  label: string;
  description: string;
  quantity: number;
  unit: ProfessionalLineItemUnit;
  unitPrice: number;
  isActive: boolean;
  origin: ContractorOfferLineOrigin;
  /**
   * Bedarfs-/Eventualposition: erscheint im Leistungsverzeichnis mit Preis, zählt
   * aber **nicht** in die Angebotssumme. Optional (Altstand ⇒ `false`).
   */
  isOptional?: boolean;
}

/** Eine Positionsgruppe (z. B. „Pos. 1 Bad OG") mit ihren Unterpositionen. */
export interface ContractorOfferSection {
  id: string;
  kind: ContractorOfferSectionKind;
  title: string;
  lines: ContractorOfferLine[];
}

/** Anschrift des Angebotsempfängers (Kunde). */
export interface ContractorOfferCustomer {
  name: string;
  /** Mehrzeilige Anschrift (Straße, PLZ Ort …). */
  address: string;
}

/** Bearbeitungsstand eines Angebots (Versionierung). */
export type ContractorOfferStatus = 'draft' | 'sent' | 'accepted';

/** Deutsche Beschriftung je Status (für die UI). */
export const CONTRACTOR_OFFER_STATUS_LABELS: Record<ContractorOfferStatus, string> = {
  draft: 'Entwurf',
  sent: 'Versendet',
  accepted: 'Angenommen'
};

/**
 * Das gesamte editierbare Angebot zu einem Projekt. Summen werden abgeleitet (s. u.).
 * Alle Kopf-/Textfelder sind optional, weil sie erst mit Phase 13 (Angebotskopf)
 * hinzukamen und im jsonb-Blob `offer_data` liegen – ältere gespeicherte Angebote
 * bringen sie nicht mit und werden über {@link normalizeContractorOffer} aufgefüllt.
 */
export interface ContractorOffer {
  /** Eindeutige Angebots-ID (PK in der DB). Mehrere Angebote je Projekt möglich. */
  id?: string;
  projectId: string;
  projectName: string;
  /** Fortlaufende Version innerhalb eines Projekts (V1, V2 …). */
  version?: number;
  /** Bearbeitungsstand (Entwurf/Versendet/Angenommen). */
  status?: ContractorOfferStatus;
  /** Freie Bezeichnung der Version (z. B. „nach Kundengespräch"). */
  label?: string;
  vatPercent: number;
  sections: ContractorOfferSection[];
  /** Angebotsnummer (frei vergeben). */
  offerNumber?: string;
  /** Angebotsdatum (ISO `yyyy-mm-dd`). */
  offerDate?: string;
  /** Bindefrist / gültig bis (ISO `yyyy-mm-dd`, leer = ohne Angabe). */
  validUntil?: string;
  /** Angebotsempfänger. */
  customer?: ContractorOfferCustomer;
  /** Einleitungstext über dem Leistungsverzeichnis. */
  introText?: string;
  /** Schlusstext unter den Summen (Zahlung, Ausführung, Gewährleistung). */
  outroText?: string;
  /** Material je Raum getrennt ausweisen (statt einer Sammelposition). */
  materialBreakdown?: boolean;
  /** Aufschlag auf die Materialkosten in % (0 = ohne). */
  materialSurchargePercent?: number;
  /** Nachlass/Rabatt in % auf den Nettobetrag (0 = ohne). */
  discountPercent?: number;
  /** `project.updatedAt` zum Erzeugungszeitpunkt – Basis der Stale-Erkennung. */
  sourceUpdatedAt?: string;
}

function round(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function toNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Heutiges Datum als ISO `yyyy-mm-dd`. */
export function offerTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Ob eine Position in die Summe einzahlt (aktiv und keine Bedarfsposition). */
function countsToSum(line: ContractorOfferLine): boolean {
  return line.isActive && line.isOptional !== true;
}

/** Positionssumme für die Anzeige (0, wenn inaktiv). Bedarfspositionen zeigen ihren Wert. */
export function offerLineTotal(line: ContractorOfferLine): number {
  return line.isActive ? round(toNumber(line.quantity) * toNumber(line.unitPrice)) : 0;
}

/** Summen-Beitrag einer Position (0, wenn inaktiv **oder** Bedarfsposition). */
export function offerLineSumContribution(line: ContractorOfferLine): number {
  return countsToSum(line) ? round(toNumber(line.quantity) * toNumber(line.unitPrice)) : 0;
}

/** Zwischensumme einer Gruppe (nur summenwirksame Positionen). */
export function offerSectionSubtotal(section: ContractorOfferSection): number {
  return round(section.lines.reduce((sum, line) => sum + offerLineSumContribution(line), 0));
}

/** Nettobetrag über alle Gruppen (vor Nachlass). */
export function offerNetTotal(offer: ContractorOffer): number {
  return round(
    offer.sections.reduce((sum, section) => sum + offerSectionSubtotal(section), 0)
  );
}

/** Nachlassbetrag (Rabatt auf den Nettobetrag). 0, wenn kein Nachlass. */
export function offerDiscountAmount(offer: ContractorOffer): number {
  const percent = toNumber(offer.discountPercent);
  return percent > 0 ? round(offerNetTotal(offer) * percent / 100) : 0;
}

/** Nettobetrag nach Abzug des Nachlasses (Bemessungsgrundlage der MwSt.). */
export function offerNetAfterDiscount(offer: ContractorOffer): number {
  return round(offerNetTotal(offer) - offerDiscountAmount(offer));
}

/** MwSt.-Betrag auf den Nettobetrag nach Nachlass. */
export function offerVatAmount(offer: ContractorOffer): number {
  return round(offerNetAfterDiscount(offer) * toNumber(offer.vatPercent) / 100);
}

/** Bruttosumme (Netto nach Nachlass + MwSt.). */
export function offerGrossTotal(offer: ContractorOffer): number {
  return round(offerNetAfterDiscount(offer) + offerVatAmount(offer));
}

// ---- Geteilte Positionsnummerierung (Editor UND PDF nutzen dieselbe Logik) ----

/** Sektionen, die im Export erscheinen (mindestens eine aktive Position). */
export function offerRenderableSections(offer: ContractorOffer): ContractorOfferSection[] {
  return offer.sections.filter((section) => section.lines.some((line) => line.isActive));
}

/**
 * 1-basierte „Pos."-Nummer unter allen **renderbaren** Gruppen außer der
 * Baustelle. `null` für die Baustelle bzw. leere/nicht renderbare Gruppen.
 */
export function offerPositionNumber(
  offer: ContractorOffer,
  section: ContractorOfferSection
): number | null {
  if (section.kind === 'site_setup') {
    return null;
  }
  const numbered = offerRenderableSections(offer).filter((s) => s.kind !== 'site_setup');
  const index = numbered.indexOf(section);
  return index >= 0 ? index + 1 : null;
}

/**
 * Positionsnummer einer Zeile („1.001"). `null` für inaktive Zeilen (die
 * erscheinen nicht im Export). Zählt nur aktive Zeilen der Gruppe.
 */
export function offerLineNumber(
  offer: ContractorOffer,
  section: ContractorOfferSection,
  line: ContractorOfferLine
): string | null {
  if (!line.isActive) {
    return null;
  }
  const activeLines = section.lines.filter((entry) => entry.isActive);
  const suffix = String(activeLines.indexOf(line) + 1).padStart(3, '0');
  if (section.kind === 'site_setup') {
    return suffix;
  }
  const pos = offerPositionNumber(offer, section);
  return pos ? `${pos}.${suffix}` : suffix;
}

/** Füllt fehlende (optionale) Felder eines geladenen/älteren Angebots mit Defaults. */
export function normalizeContractorOffer(offer: ContractorOffer): ContractorOffer {
  return {
    ...offer,
    id: offer.id ?? '',
    version: offer.version ?? 1,
    status: offer.status ?? 'draft',
    label: offer.label ?? '',
    offerNumber: offer.offerNumber ?? '',
    offerDate: offer.offerDate ?? offerTodayIso(),
    validUntil: offer.validUntil ?? '',
    customer: offer.customer ?? { name: '', address: '' },
    introText: offer.introText ?? '',
    outroText: offer.outroText ?? '',
    materialBreakdown: offer.materialBreakdown ?? false,
    materialSurchargePercent: offer.materialSurchargePercent ?? 0,
    discountPercent: offer.discountPercent ?? 0,
    sourceUpdatedAt: offer.sourceUpdatedAt ?? '',
    sections: offer.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({ ...line, isOptional: line.isOptional ?? false }))
    }))
  };
}

/**
 * Bereinigt numerische Eingaben vor Persistenz/Export: leere Felder (`null`) und
 * `NaN` aus den Zahleneingaben werden zu `0`, damit kein `null` im jsonb landet
 * und Summen deterministisch bleiben.
 */
export function sanitizeContractorOffer(offer: ContractorOffer): ContractorOffer {
  return {
    ...offer,
    vatPercent: toNumber(offer.vatPercent),
    materialSurchargePercent: toNumber(offer.materialSurchargePercent),
    discountPercent: toNumber(offer.discountPercent),
    sections: offer.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        quantity: toNumber(line.quantity),
        unitPrice: toNumber(line.unitPrice)
      }))
    }))
  };
}
