import { Injectable } from '@angular/core';
import {
  ESTIMATE_EXPORT_LEGAL_NOTICE,
  ExportDocumentData,
  ExportDocumentSection,
  ExportInvoiceMeta,
  ExportOfferGroup,
  ExportOfferMeta,
  INVOICE_EXPORT_LEGAL_NOTICE,
  OFFER_EXPORT_LEGAL_NOTICE
} from '../models/export-document.model';
import {
  ContractorOffer,
  offerDiscountAmount,
  offerGrossTotal,
  offerLineNumber,
  offerLineTotal,
  offerNetAfterDiscount,
  offerNetTotal,
  offerPositionNumber,
  offerRenderableSections,
  offerSectionSubtotal,
  offerVatAmount
} from '../models/contractor-offer.model';
import {
  ContractorInvoice,
  invoiceAsOffer,
  invoiceDiscountAmount,
  invoiceGrossTotal,
  invoiceNetAfterDiscount,
  invoiceNetTotal,
  invoiceVatAmount
} from '../models/contractor-invoice.model';
import { BathroomWizardData, ROOM_TYPE_DEFAULT_NAMES } from '../models/bathroom-wizard.model';
import { MaterialListViewModel } from '../models/material-list.model';
import { ProjectMaterialListViewModel } from '../models/project-material-list.model';
import { CostComparisonViewModel } from './cost-comparison.service';
import { ProjectAggregationResult } from './project-aggregation.service';

@Injectable({ providedIn: 'root' })
export class ExportDataMapperService {
  buildRoomSummaryExportData(
    wizardData: BathroomWizardData,
    materialListViewModel: MaterialListViewModel,
    costComparisonViewModel: CostComparisonViewModel
  ): ExportDocumentData {
    const roomType = wizardData.room.roomType ?? 'bathroom';
    const sections: ExportDocumentSection[] = [
      {
        id: 'room',
        title: 'Raumübersicht',
        type: 'summary_cards',
        content: {
          roomName: wizardData.room.roomName,
          roomType: ROOM_TYPE_DEFAULT_NAMES[roomType],
          tileAreaM2: materialListViewModel.tileCalculation.baseTileAreaM2,
          tileAreaWithWasteM2: materialListViewModel.tileCalculation.tileAreaWithWasteM2
        }
      },
      {
        id: 'important_assumptions',
        title: 'Wichtige Annahmen',
        type: 'text',
        content: {
          wastePercent: wizardData.assumptions.wastePercent.value,
          tilePricePerM2: wizardData.assumptions.materialPrices.tilePricePerM2.value
        }
      }
    ];
    this.addWarningsSection(sections, [
      ...materialListViewModel.warnings,
      ...costComparisonViewModel.warnings
    ]);
    return this.createDocument({
      documentType: 'room_summary',
      title: 'Raum-Zusammenfassung',
      subtitle: ROOM_TYPE_DEFAULT_NAMES[roomType],
      roomName: wizardData.room.roomName,
      sections,
      totals: {
        materialTotal: materialListViewModel.totalDisplayCost,
        diyTotal: costComparisonViewModel.diy.totalCost,
        professionalTotal: costComparisonViewModel.professional.totalCost
      }
    });
  }

  buildMaterialListExportData(
    wizardDataOrMaterialList: BathroomWizardData | MaterialListViewModel,
    optionalMaterialList?: MaterialListViewModel
  ): ExportDocumentData {
    const wizardData = optionalMaterialList
      ? wizardDataOrMaterialList as BathroomWizardData
      : null;
    const materialListViewModel = optionalMaterialList
      ?? wizardDataOrMaterialList as MaterialListViewModel;
    const sections: ExportDocumentSection[] = materialListViewModel.sections.map(
      (section) => ({
        id: section.id,
        title: section.title,
        type: 'table',
        content: section.items.map((item) => ({
          id: item.materialId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          packageCount: item.packageCount,
          packageUnit: item.packageUnit,
          unitPrice: item.unitPrice,
          total: item.displayCost,
          active: item.isActive,
          note: item.calculationNote
        }))
      })
    );

    this.addWarningsSection(sections, materialListViewModel.warnings);

    return this.createDocument({
      documentType: 'material_list',
      title: 'Materialliste',
      subtitle: 'Materialbedarf und unverbindliche Kostenschätzung',
      roomName: wizardData?.room.roomName ?? null,
      sections,
      totals: {
        grossTotal: materialListViewModel.totalDisplayCost,
        materialTotal: materialListViewModel.totalDisplayCost
      }
    });
  }

  buildProjectMaterialListExportData(
    projectMaterialListViewModel: ProjectMaterialListViewModel
  ): ExportDocumentData {
    const sections: ExportDocumentSection[] =
      projectMaterialListViewModel.sections.map((section) => ({
        id: section.id,
        title: section.title,
        type: 'table',
        content: section.items
      }));
    this.addWarningsSection(
      sections,
      projectMaterialListViewModel.warnings.map((warning) => warning.message)
    );
    return this.createDocument({
      documentType: 'project_material_list',
      title: 'Projekt-Materialliste',
      subtitle: 'Materialbedarf aller gespeicherten Räume',
      sections,
      totals: {
        materialTotal: projectMaterialListViewModel.totalDisplayCost
      }
    });
  }

  buildProjectSummaryExportData(
    projectAggregationResult: ProjectAggregationResult
  ): ExportDocumentData {
    const sections: ExportDocumentSection[] = [
      {
        id: 'project_totals',
        title: 'Projektübersicht',
        type: 'summary_cards',
        content: {
          roomCount: projectAggregationResult.roomCount,
          totalTileAreaM2: projectAggregationResult.totalTileAreaM2,
          totalTileAreaWithWasteM2:
            projectAggregationResult.totalTileAreaWithWasteM2,
          totalMaterialCost: projectAggregationResult.totalMaterialCost,
          totalToolCostDeduplicated:
            projectAggregationResult.totalToolCostDeduplicated,
          totalSavings: projectAggregationResult.totalSavings
        }
      },
      {
        id: 'rooms',
        title: 'Räume',
        type: 'table',
        content: projectAggregationResult.roomSummaries
      }
    ];

    this.addWarningsSection(
      sections,
      projectAggregationResult.warnings.map((warning) =>
        warning.roomName
          ? `${warning.roomName}: ${warning.message}`
          : warning.message
      )
    );

    return this.createDocument({
      documentType: 'project_summary',
      title: 'Projektzusammenfassung',
      subtitle: 'Zusammenfassung aller gespeicherten Räume',
      sections,
      totals: {
        diyTotal: projectAggregationResult.totalDiyCost,
        professionalTotal: projectAggregationResult.totalProfessionalCost
      }
    });
  }

  buildProfessionalComparisonExportData(
    costComparisonViewModel: CostComparisonViewModel
  ): ExportDocumentData {
    const offer = costComparisonViewModel.professional.offer;
    const sections: ExportDocumentSection[] = [
      {
        id: 'comparison',
        title: 'Kostenvergleich',
        type: 'summary_cards',
        content: {
          diyTotal: costComparisonViewModel.diy.totalCost,
          professionalTotal: costComparisonViewModel.professional.totalCost,
          savingsAmount: costComparisonViewModel.savings.amount,
          savingsPercent: costComparisonViewModel.savings.percent
        }
      },
      {
        id: 'professional_line_items',
        title: 'Profi-Leistungspositionen',
        type: 'line_items',
        content: offer.lineItems
      },
      {
        id: 'assumptions',
        title: 'Annahmen',
        type: 'text',
        content: costComparisonViewModel.assumptions
      }
    ];

    this.addWarningsSection(sections, costComparisonViewModel.warnings);

    return this.createDocument({
      documentType: 'professional_comparison',
      title: 'Profi-Vergleich',
      subtitle: 'DIY-Kosten und geschätzte Fachbetriebskosten',
      sections,
      totals: {
        netTotal: offer.netTotal,
        vatPercent: offer.vatPercent,
        vatAmount: offer.vatAmount,
        grossTotal: offer.grossTotal,
        diyTotal: costComparisonViewModel.diy.totalCost,
        professionalTotal: costComparisonViewModel.professional.totalCost
      }
    });
  }

  buildContractorOfferExportData(offer: ContractorOffer): ExportDocumentData {
    const groups = this.buildOfferGroups(offer);

    const sections: ExportDocumentSection[] = [
      { id: 'offer', title: 'Leistungsverzeichnis', type: 'offer', content: groups }
    ];

    const taxNote = offer.vatPercent === 0
      ? 'Gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer berechnet.'
      : null;

    const offerMeta: ExportOfferMeta = {
      customerName: offer.customer?.name ?? '',
      customerAddress: offer.customer?.address ?? '',
      offerNumber: offer.offerNumber ?? '',
      offerDate: offer.offerDate ?? '',
      validUntil: offer.validUntil ?? ''
    };

    const discountAmount = offerDiscountAmount(offer);
    const hasDiscount = discountAmount > 0;

    return this.createDocument({
      documentType: 'contractor_offer',
      title: 'Angebot',
      subtitle: offer.projectName,
      projectName: offer.projectName,
      sections,
      totals: {
        netTotal: offerNetTotal(offer),
        // Nachlass nur ausweisen, wenn vorhanden – als negativer Betrag + Zwischensumme.
        ...(hasDiscount
          ? {
              discountPercent: offer.discountPercent,
              discountAmount: -discountAmount,
              netAfterDiscount: offerNetAfterDiscount(offer)
            }
          : {}),
        vatPercent: offer.vatPercent,
        vatAmount: offerVatAmount(offer),
        grossTotal: offerGrossTotal(offer)
      },
      legalNotice: OFFER_EXPORT_LEGAL_NOTICE,
      offerMeta,
      introText: offer.introText ?? null,
      outroText: offer.outroText ?? null,
      taxNote
    });
  }

  buildContractorInvoiceExportData(invoice: ContractorInvoice): ExportDocumentData {
    const offerLike = invoiceAsOffer(invoice);
    const groups = this.buildOfferGroups(offerLike);

    const sections: ExportDocumentSection[] = [
      { id: 'invoice', title: 'Leistungsverzeichnis', type: 'offer', content: groups }
    ];

    const taxNote = invoice.vatPercent === 0
      ? 'Gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer berechnet.'
      : null;

    const seller = invoice.seller;
    const customer = invoice.customer;
    const invoiceMeta: ExportInvoiceMeta = {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      serviceDate: invoice.serviceDate ?? '',
      servicePeriodStart: invoice.servicePeriodStart ?? '',
      servicePeriodEnd: invoice.servicePeriodEnd ?? '',
      dueDate: invoice.dueDate,
      buyerReference: invoice.buyerReference,
      status: invoice.status,
      sellerName: seller.companyName,
      sellerAddressLines: this.addressLines(seller.street, seller.postalCode, seller.city),
      sellerVatId: seller.vatId,
      sellerTaxNumber: seller.taxNumber,
      sellerContactLines: [
        seller.contactName,
        seller.phone ? `Tel. ${seller.phone}` : '',
        seller.email,
        seller.website
      ].filter((part) => part.trim().length > 0),
      customerName: customer.name,
      customerAddressLines: this.addressLines(
        customer.street,
        customer.postalCode,
        customer.city
      ),
      iban: seller.iban,
      bic: seller.bic,
      bankName: seller.bankName
    };

    const discountAmount = invoiceDiscountAmount(invoice);
    const hasDiscount = discountAmount > 0;

    return this.createDocument({
      documentType: 'contractor_invoice',
      title: 'Rechnung',
      subtitle: invoice.projectName,
      projectName: invoice.projectName,
      sections,
      totals: {
        netTotal: invoiceNetTotal(invoice),
        ...(hasDiscount
          ? {
              discountPercent: invoice.discountPercent,
              discountAmount: -discountAmount,
              netAfterDiscount: invoiceNetAfterDiscount(invoice)
            }
          : {}),
        vatPercent: invoice.vatPercent,
        vatAmount: invoiceVatAmount(invoice),
        grossTotal: invoiceGrossTotal(invoice)
      },
      legalNotice: INVOICE_EXPORT_LEGAL_NOTICE,
      invoiceMeta,
      introText: invoice.introText ?? null,
      outroText: invoice.outroText ?? null,
      taxNote
    });
  }

  /**
   * Baut die Positionsgruppen für den Leistungsverzeichnis-Export (Angebot **und**
   * Rechnung, letztere über {@link invoiceAsOffer}). Nur renderbare Gruppen (mind.
   * eine aktive Position); Nummerierung identisch zum Editor über die geteilten
   * Helfer, damit „Pos. 1.003" überall gleich ist.
   */
  private buildOfferGroups(offer: ContractorOffer): ExportOfferGroup[] {
    return offerRenderableSections(offer).map((section) => {
      const isSetup = section.kind === 'site_setup';
      const pos = offerPositionNumber(offer, section);
      const activeLines = section.lines.filter((line) => line.isActive);
      return {
        positionLabel: isSetup ? null : `Pos. ${pos}`,
        title: section.title,
        rows: activeLines.map((line) => ({
          number: offerLineNumber(offer, section, line) ?? '',
          label: line.label,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          total: offerLineTotal(line),
          isOptional: line.isOptional === true
        })),
        // Einzelne Sammelpositionen (Baustelle/Material) brauchen keine Zwischensumme.
        subtotal: isSetup || section.kind === 'material'
          ? null
          : offerSectionSubtotal(section)
      };
    });
  }

  /** Baut Anschriftszeilen (Straße, „PLZ Ort") ohne Leerzeilen. */
  private addressLines(street: string, postalCode: string, city: string): string[] {
    const cityLine = [postalCode, city].map((part) => part.trim()).filter(Boolean).join(' ');
    return [street.trim(), cityLine].filter((line) => line.length > 0);
  }

  private createDocument(
    values: Pick<
      ExportDocumentData,
      'documentType' | 'title' | 'subtitle' | 'sections' | 'totals'
    > &
      Partial<
        Pick<
          ExportDocumentData,
          | 'projectName'
          | 'roomName'
          | 'legalNotice'
          | 'offerMeta'
          | 'invoiceMeta'
          | 'introText'
          | 'outroText'
          | 'taxNote'
        >
      >
  ): ExportDocumentData {
    return {
      ...values,
      projectName: values.projectName ?? null,
      roomName: values.roomName ?? null,
      createdAt: new Date().toISOString(),
      legalNotice: values.legalNotice ?? ESTIMATE_EXPORT_LEGAL_NOTICE
    };
  }

  private addWarningsSection(
    sections: ExportDocumentSection[],
    warnings: string[]
  ): void {
    if (warnings.length > 0) {
      sections.push({
        id: 'warnings',
        title: 'Hinweise',
        type: 'warnings',
        content: warnings
      });
    }
  }
}
