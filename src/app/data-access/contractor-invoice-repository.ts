import { inject, InjectionToken } from '@angular/core';
import { ContractorInvoice } from '../models/contractor-invoice.model';
import { SupabaseContractorInvoiceRepository } from './supabase-contractor-invoice-repository';

/**
 * Persistenz-Grenze für Rechnungen (M12). Reines Backend-Feature (nur angemeldete
 * Profis), daher kein localStorage-Fallback. Das Frontend spricht ausschließlich
 * gegen dieses Interface (austauschbares Backend).
 */
export interface ContractorInvoiceRepository {
  /** Alle Rechnungen des angemeldeten Profis (neueste zuerst). */
  listMine(): Promise<ContractorInvoice[]>;
  /**
   * Speichert (upsert über die Rechnungs-`id`) eine Rechnung. Eine verletzte
   * `unique (owner_id, invoice_number)`-Beschränkung wird als Fehler durchgereicht
   * (der Service mappt sie auf eine verständliche Meldung).
   */
  save(invoice: ContractorInvoice): Promise<void>;
  /** Löscht eine Rechnung anhand ihrer `id`. */
  delete(invoiceId: string): Promise<void>;
}

export const CONTRACTOR_INVOICE_REPOSITORY =
  new InjectionToken<ContractorInvoiceRepository>('CONTRACTOR_INVOICE_REPOSITORY', {
    providedIn: 'root',
    factory: () => inject(SupabaseContractorInvoiceRepository)
  });
