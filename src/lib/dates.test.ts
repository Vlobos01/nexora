import { describe, expect, it } from 'vitest';
import {
  addDaysISO,
  daysUntil,
  formatDate,
  getEffectiveStatus,
  isOverdue,
  todayISO,
} from './dates';
import type { Quote } from '../types';

const baseQuote: Quote = {
  id: 'q1',
  number: 1,
  prefix: 'P',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  date: '2026-01-01',
  expiryDate: '2026-02-01',
  dueDate: '',
  title: '',
  observations: '',
  client: { name: 'Cliente', document: '', phone: '', email: '', address: '' },
  items: [],
  discountPct: 0,
  ivaPct: 0,
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
  paidAmount: 0,
  payments: [],
};

describe('todayISO / addDaysISO', () => {
  it('devuelve fechas en formato ISO (YYYY-MM-DD)', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('suma días respetando meses y años', () => {
    expect(addDaysISO(30, '2026-01-15')).toBe('2026-02-14');
    expect(addDaysISO(1, '2026-12-31')).toBe('2027-01-01');
    expect(addDaysISO(-1, '2026-03-01')).toBe('2026-02-28');
  });

  it('parte de hoy si no se pasa fecha base', () => {
    expect(addDaysISO(0)).toBe(todayISO());
  });
});

describe('formatDate', () => {
  it('formatea fechas válidas', () => {
    const out = formatDate('2026-01-05');
    // El texto exacto depende del ICU del entorno (navegador vs Node)
    expect(out).toContain('ene');
    expect(out).toContain('2026');
    expect(out.startsWith('05')).toBe(true);
  });

  it('devuelve em dash para valores vacíos', () => {
    expect(formatDate('')).toBe('—');
  });

  it('devuelve el valor original si la fecha no es válida', () => {
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha');
  });
});

describe('isOverdue / daysUntil', () => {
  it('detecta vencimiento por comparación ISO', () => {
    expect(isOverdue('2000-01-01')).toBe(true);
    expect(isOverdue('2999-01-01')).toBe(false);
  });

  it('calcula días restantes', () => {
    expect(daysUntil('2999-01-01')).toBeGreaterThan(0);
    expect(daysUntil('2000-01-01')).toBeLessThan(0);
  });
});

describe('getEffectiveStatus', () => {
  it('marca como vencido un borrador/enviado con fecha pasada', () => {
    expect(
      getEffectiveStatus({ ...baseQuote, status: 'draft', expiryDate: '2000-01-01' }),
    ).toBe('expired');
    expect(
      getEffectiveStatus({ ...baseQuote, status: 'sent', expiryDate: '2000-01-01' }),
    ).toBe('expired');
  });

  it('respeta estados finales aunque la fecha haya pasado', () => {
    expect(
      getEffectiveStatus({ ...baseQuote, status: 'accepted', expiryDate: '2000-01-01' }),
    ).toBe('accepted');
    expect(
      getEffectiveStatus({ ...baseQuote, status: 'rejected', expiryDate: '2000-01-01' }),
    ).toBe('rejected');
  });

  it('mantiene el estado si no está vencido', () => {
    expect(getEffectiveStatus({ ...baseQuote, status: 'draft', expiryDate: '2999-01-01' })).toBe(
      'draft',
    );
  });
});
