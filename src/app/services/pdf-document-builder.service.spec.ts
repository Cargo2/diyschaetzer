import type { Content, ContentTable } from 'pdfmake/interfaces';
import { ExportDocumentData } from '../models/export-document.model';
import { PdfDocumentBuilderService } from './pdf-document-builder.service';

function flatten(content: unknown, sink: Record<string, unknown>[]): void {
  if (Array.isArray(content)) {
    content.forEach((entry) => flatten(entry, sink));
    return;
  }
  if (content && typeof content === 'object') {
    sink.push(content as Record<string, unknown>);
    for (const value of Object.values(content as Record<string, unknown>)) {
      flatten(value, sink);
    }
  }
}

function collectText(definitionContent: Content[]): string {
  const nodes: Record<string, unknown>[] = [];
  flatten(definitionContent, nodes);
  return nodes
    .map((node) => (typeof node['text'] === 'string' ? (node['text'] as string) : ''))
    .join(' ');
}

describe('PdfDocumentBuilderService', () => {
  const builder = new PdfDocumentBuilderService();

  function materialDocument(): ExportDocumentData {
    return {
      documentType: 'material_list',
      title: 'Materialliste',
      subtitle: 'Materialbedarf',
      projectName: null,
      roomName: 'Bad EG',
      createdAt: '2026-06-14T10:00:00.000Z',
      sections: [
        {
          id: 'adhesive',
          title: 'Fliesenkleber',
          type: 'table',
          content: [
            {
              name: 'Flexkleber',
              quantity: 64,
              unit: 'kg',
              packageCount: 3,
              packageUnit: '25-kg-Sack',
              unitPrice: 21.85,
              total: 65.55,
              active: true,
              note: '4 kg/m²'
            },
            {
              name: 'Ausgeschlossen',
              quantity: 1,
              unit: 'Stück',
              packageCount: 1,
              packageUnit: 'Stück',
              unitPrice: 5,
              total: 5,
              active: false
            }
          ]
        }
      ],
      totals: { materialTotal: 65.55 },
      legalNotice: 'Unverbindliche Schätzung.'
    };
  }

  it('renders a material table with the recommended purchase column', () => {
    const definition = builder.build(materialDocument());
    const text = collectText(definition.content as Content[]);

    expect(text).toContain('Materialliste');
    expect(text).toContain('Bad EG');
    expect(text).toContain('Empf. Einkauf');
    expect(text).toContain('Flexkleber');
    expect(text).toContain('25-kg-Sack');
    expect(text).toContain('Materialkosten gesamt');
    expect(text).toContain('Unverbindliche Schätzung.');
  });

  it('omits inactive material rows from the shopping list', () => {
    const definition = builder.build(materialDocument());
    const content = definition.content as Content[];
    const tables = ([] as Record<string, unknown>[]);
    flatten(content, tables);
    const tableNode = tables.find((node) => 'table' in node) as ContentTable | undefined;

    // Header + genau eine aktive Datenzeile.
    expect(tableNode?.table.body.length).toBe(2);
    expect(collectText(content)).not.toContain('Ausgeschlossen');
  });
});
