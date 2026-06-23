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
}

/** Eine Positionsgruppe (z. B. „Pos. 1 Bad OG") mit ihren Unterpositionen. */
export interface ContractorOfferSection {
  id: string;
  kind: ContractorOfferSectionKind;
  title: string;
  lines: ContractorOfferLine[];
}

/** Das gesamte editierbare Angebot zu einem Projekt. Summen werden abgeleitet (s. u.). */
export interface ContractorOffer {
  projectId: string;
  projectName: string;
  vatPercent: number;
  sections: ContractorOfferSection[];
}

function round(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

/** Positionssumme (0, wenn inaktiv). */
export function offerLineTotal(line: ContractorOfferLine): number {
  return line.isActive ? round(line.quantity * line.unitPrice) : 0;
}

/** Zwischensumme einer Gruppe (nur aktive Positionen). */
export function offerSectionSubtotal(section: ContractorOfferSection): number {
  return round(section.lines.reduce((sum, line) => sum + offerLineTotal(line), 0));
}

/** Nettobetrag über alle Gruppen. */
export function offerNetTotal(offer: ContractorOffer): number {
  return round(
    offer.sections.reduce((sum, section) => sum + offerSectionSubtotal(section), 0)
  );
}

/** MwSt.-Betrag zum Nettobetrag. */
export function offerVatAmount(offer: ContractorOffer): number {
  return round(offerNetTotal(offer) * offer.vatPercent / 100);
}

/** Bruttosumme (Netto + MwSt.). */
export function offerGrossTotal(offer: ContractorOffer): number {
  return round(offerNetTotal(offer) + offerVatAmount(offer));
}
