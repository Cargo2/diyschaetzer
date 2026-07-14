/**
 * Öffentliches Betriebe-Verzeichnis nach PLZ (Nutzerauftrag 12.07.2026).
 * Nur Marketing-Felder AKTIVER Premium-Betriebe (leads_active + aktives Abo),
 * geliefert von der anon-callbaren RPC `list_active_contractors`. Enthält bewusst
 * keine personenbezogenen Daten – reine Firmen-/Kontaktangaben.
 */
export interface ContractorDirectoryEntry {
  /** Firmenname (nie leer – die RPC filtert leere Namen heraus). */
  readonly companyName: string;
  /** Ort (kann leer sein). */
  readonly city: string;
  /** Telefonnummer (leer, wenn nicht hinterlegt). */
  readonly phone: string;
  /** Website-URL (leer, wenn nicht hinterlegt). */
  readonly website: string;
  /** Bevorzugte Raumarten/Einsatzbereiche (RoomType-Werte). */
  readonly leadRoomTypes: readonly string[];
}
