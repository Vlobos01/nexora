import type { Invoice, InvoiceStatus, LineItem, Quote } from '../types';

export function lineGross(item: LineItem): number {
  return item.quantity * item.unitPrice;
}

export function lineDiscountAmount(item: LineItem): number {
  return lineGross(item) * (item.discountPct || 0) / 100;
}

export function lineNet(item: LineItem): number {
  return lineGross(item) - lineDiscountAmount(item);
}

export interface Totals {
  gross: number;
  itemDiscount: number;
  net: number;
  globalDiscount: number;
  base: number;
  iva: number;
  total: number;
  totalDiscount: number;
}

export function computeTotals(
  items: LineItem[],
  discountPct: number,
  ivaPct: number,
): Totals {
  let gross = 0;
  let itemDiscount = 0;
  for (const it of items) {
    gross += lineGross(it);
    itemDiscount += lineDiscountAmount(it);
  }
  const net = gross - itemDiscount;
  const globalDiscount = (net * (discountPct || 0)) / 100;
  const base = net - globalDiscount;
  const iva = (base * (ivaPct || 0)) / 100;
  const total = base + iva;
  return {
    gross,
    itemDiscount,
    net,
    globalDiscount,
    base,
    iva,
    total,
    totalDiscount: itemDiscount + globalDiscount,
  };
}

export function quoteTotals(q: Quote): Totals {
  return computeTotals(q.items, q.discountPct, q.ivaPct);
}

export function invoiceTotals(inv: Invoice): Totals {
  return computeTotals(inv.items, inv.discountPct, inv.ivaPct);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Estado de una factura según el monto cobrado respecto del total. */
export function invoiceStatusFromPaid(total: number, paid: number): InvoiceStatus {
  if (paid <= 0) return 'pending';
  if (paid >= total) return 'paid';
  return 'partial';
}

/** Suma los montos de un historial de cobros (tolera valores inválidos). */
export function paymentsTotal(payments: { amount: number }[]): number {
  return payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

/** Convierte un valor arbitrario a número seguro, con fallback. */
export function toNumber(v: string | number | null | undefined, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}
