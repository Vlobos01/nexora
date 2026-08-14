import { describe, expect, it } from 'vitest';
import {
  computeTotals,
  lineDiscountAmount,
  lineGross,
  lineNet,
  quoteTotals,
  round2,
  toNumber,
} from './calc';
import type { LineItem, Quote } from '../types';

function item(overrides: Partial<LineItem> = {}): LineItem {
  return {
    id: 'i1',
    description: 'Concepto',
    quantity: 1,
    unitPrice: 100,
    discountPct: 0,
    ...overrides,
  };
}

describe('lineGross / lineDiscountAmount / lineNet', () => {
  it('calcula el bruto como cantidad × precio', () => {
    expect(lineGross(item({ quantity: 3, unitPrice: 250 }))).toBe(750);
  });

  it('calcula el descuento por ítem en porcentaje', () => {
    const it = item({ quantity: 2, unitPrice: 100, discountPct: 10 });
    expect(lineDiscountAmount(it)).toBe(20);
    expect(lineNet(it)).toBe(180);
  });

  it('no aplica descuento cuando es 0', () => {
    expect(lineNet(item())).toBe(100);
  });
});

describe('computeTotals', () => {
  it('suma correctamente sin descuentos ni IVA', () => {
    const t = computeTotals(
      [item({ unitPrice: 100 }), item({ unitPrice: 200 })],
      0,
      0,
    );
    expect(t.gross).toBe(300);
    expect(t.itemDiscount).toBe(0);
    expect(t.net).toBe(300);
    expect(t.globalDiscount).toBe(0);
    expect(t.base).toBe(300);
    expect(t.iva).toBe(0);
    expect(t.total).toBe(300);
    expect(t.totalDiscount).toBe(0);
  });

  it('aplica descuento por ítem, descuento general e IVA en orden', () => {
    // 2 × 100 con 10% → neto 180; 20% general → base 144; IVA 21% → 30,24
    const t = computeTotals(
      [item({ quantity: 2, unitPrice: 100, discountPct: 10 })],
      20,
      21,
    );
    expect(t.itemDiscount).toBe(20);
    expect(t.net).toBe(180);
    expect(t.globalDiscount).toBe(36);
    expect(t.base).toBe(144);
    expect(t.iva).toBeCloseTo(30.24, 2);
    expect(t.total).toBeCloseTo(174.24, 2);
    expect(t.totalDiscount).toBe(56);
  });

  it('maneja listas vacías', () => {
    const t = computeTotals([], 0, 0);
    expect(t).toEqual({
      gross: 0,
      itemDiscount: 0,
      net: 0,
      globalDiscount: 0,
      base: 0,
      iva: 0,
      total: 0,
      totalDiscount: 0,
    });
  });

  it('el IVA se calcula sobre la base ya descontada', () => {
    const t = computeTotals([item({ unitPrice: 100 })], 50, 21);
    expect(t.base).toBe(50);
    expect(t.iva).toBe(10.5);
    expect(t.total).toBe(60.5);
  });
});

describe('quoteTotals', () => {
  it('usa los datos del presupuesto', () => {
    const q: Quote = {
      id: 'q1',
      number: 1,
      prefix: 'P',
      status: 'draft',
      createdAt: '2026-01-01T00:00:00.000Z',
      date: '2026-01-01',
      expiryDate: '2026-01-31',
      title: 'Trabajo',
      observations: '',
      client: { name: 'Cliente', document: '', phone: '', email: '', address: '' },
      items: [item({ unitPrice: 500 })],
      discountPct: 0,
      ivaPct: 21,
      currency: 'ARS',
      business: {
        name: 'Negocio',
        logo: null,
        cuit: '',
        phone: '',
        email: '',
        address: '',
        commercialConditions: '',
      },
      pdfColors: { primary: '#4f46e5', accent: '#10b981' },
    };
    expect(quoteTotals(q).total).toBeCloseTo(605, 2);
  });
});

describe('round2 / toNumber', () => {
  it('redondea a 2 decimales', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.5)).toBe(2.5);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('convierte cadenas numéricas con coma decimal', () => {
    expect(toNumber('12,5')).toBe(12.5);
    expect(toNumber('0')).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('abc')).toBe(0);
    expect(toNumber('abc', 7)).toBe(7);
    expect(toNumber(42)).toBe(42);
  });
});
