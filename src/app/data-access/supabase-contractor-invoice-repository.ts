import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { ContractorInvoice } from '../models/contractor-invoice.model';
import type { ContractorInvoiceRepository } from './contractor-invoice-repository';
import { SUPABASE_CLIENT } from './supabase-client';

/** Rohform einer `contractor_invoices`-Zeile. */
interface ContractorInvoiceRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  offer_id: string | null;
  invoice_number: string;
  invoice_data: ContractorInvoice;
}

/**
 * Supabase-Adapter für Rechnungen (M12). Owner-scoped über RLS; die `owner_id`
 * wird aus der angemeldeten Session abgeleitet (nicht aus Eingaben). Der komplette
 * Rechnungs-Blob liegt als jsonb `invoice_data`; `invoice_number` steht zusätzlich
 * als Spalte, damit die DB `unique (owner_id, invoice_number)` erzwingen kann.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseContractorInvoiceRepository implements ContractorInvoiceRepository {
  private readonly client = inject(SUPABASE_CLIENT);

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase ist nicht konfiguriert (environment.supabase fehlt).');
    }
    return this.client;
  }

  private async currentUserId(): Promise<string | null> {
    const { data } = await this.requireClient().auth.getUser();
    return data.user?.id ?? null;
  }

  async listMine(): Promise<ContractorInvoice[]> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      return [];
    }
    const { data, error } = await client
      .from('contractor_invoices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return ((data as ContractorInvoiceRow[]) ?? []).map((row) => this.map(row));
  }

  async save(invoice: ContractorInvoice): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Speichern nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('contractor_invoices').upsert({
      id: invoice.id,
      owner_id: userId,
      project_id: invoice.projectId ?? null,
      offer_id: invoice.offerId ?? null,
      invoice_number: invoice.invoiceNumber,
      invoice_data: invoice
    });
    if (error) {
      throw error;
    }
  }

  async delete(invoiceId: string): Promise<void> {
    const client = this.requireClient();
    const userId = await this.currentUserId();
    if (!userId) {
      throw new Error('Löschen nicht möglich: keine angemeldete Session.');
    }
    const { error } = await client.from('contractor_invoices').delete().eq('id', invoiceId);
    if (error) {
      throw error;
    }
  }

  /** DB-Zeile → Rechnung; Spalten (id/number/herkunft) sind maßgeblich. */
  private map(row: ContractorInvoiceRow): ContractorInvoice {
    return {
      ...row.invoice_data,
      id: row.id,
      projectId: row.project_id,
      offerId: row.offer_id,
      invoiceNumber: row.invoice_number
    };
  }
}
