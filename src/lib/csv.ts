import type { ClientEntry, ProductEntry, Quote } from '../types';
import { quoteTotals } from './calc';
import { getEffectiveStatus, todayISO } from './dates';
import { quoteNumberDisplay } from './id';

function csvEscape(value: string | number): string {
  let s = String(value ?? '');
  // Evita inyección de fórmulas: si empieza con = + - @, Excel lo vería como fórmula
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  // BOM UTF-8: necesario para que Excel muestre bien los acentos
  const csv = '\uFEFF' + buildCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fecha ISO (aaaa-mm-dd) a dd/mm/aaaa, numérica para Excel. */
function dmy(iso: string): string {
  const [y, m, d] = (iso || '').split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso || '';
}

const two = (n: number) => n.toFixed(2);

export function exportQuotesCsv(quotes: Quote[]) {
  const rows: (string | number)[][] = [
    ['Presupuesto', 'Estado', 'Cliente', 'Documento', 'Fecha', 'Vence', 'Título', 'Subtotal', 'Descuento', 'IVA', 'Total', 'Moneda', 'Observaciones'],
  ];
  for (const q of quotes) {
    const t = quoteTotals(q);
    rows.push([
      quoteNumberDisplay(q),
      getEffectiveStatus(q),
      q.client.name,
      q.client.document,
      dmy(q.date),
      dmy(q.expiryDate),
      q.title,
      two(t.net),
      two(t.totalDiscount),
      two(t.iva),
      two(t.total),
      q.currency,
      q.observations.replace(/\s+/g, ' ').trim(),
    ]);
  }
  downloadCsv(`nexora-presupuestos-${todayISO()}.csv`, rows);
}

export function exportClientsCsv(clients: ClientEntry[]) {
  const rows: (string | number)[][] = [
    ['Nombre', 'Documento', 'Teléfono', 'Email', 'Dirección'],
    ...clients.map((c) => [c.name, c.document, c.phone, c.email, c.address]),
  ];
  downloadCsv(`nexora-clientes-${todayISO()}.csv`, rows);
}

export function exportProductsCsv(products: ProductEntry[]) {
  const rows: (string | number)[][] = [
    ['Nombre', 'Precio unitario', 'Unidad', 'Descripción'],
    ...products.map((p) => [p.name, two(p.unitPrice), p.unit, p.description]),
  ];
  downloadCsv(`nexora-productos-${todayISO()}.csv`, rows);
}
