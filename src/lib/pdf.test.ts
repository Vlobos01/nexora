import { describe, expect, it } from 'vitest';
import { quotePdfDoc } from './pdf';
import type { Quote } from '../types';
import { uid } from './id';

const business = {
  name: 'Mi Negocio',
  logo: null,
  cuit: '20-12345678-9',
  phone: '11 5555 5555',
  email: 'hola@minegocio.com',
  address: 'Av. Siempre Viva 123',
  commercialConditions: '• Validez 30 días.\n• Anticipo 50%.',
};

const client = {
  name: 'Cliente S.A.',
  document: '30-98765432-1',
  phone: '11 6666 6666',
  email: 'cliente@correo.com',
  address: 'Calle Falsa 456',
};

const baseQuote: Quote = {
  id: uid(),
  number: 7,
  prefix: 'P',
  status: 'accepted',
  createdAt: '2026-01-01T00:00:00.000Z',
  date: '2026-01-01',
  expiryDate: '2026-01-31',
  dueDate: '',
  title: 'Desarrollo de landing page',
  observations: 'Entrega estimada: 10 días hábiles.',
  client,
  items: [
    {
      id: uid(),
      description: 'Diseño UI/UX',
      quantity: 1,
      unitPrice: 180000,
      discountPct: 0,
    },
    {
      id: uid(),
      description: 'Maquetado responsive',
      quantity: 2,
      unitPrice: 120000,
      discountPct: 10,
    },
  ],
  discountPct: 5,
  ivaPct: 21,
  currency: 'ARS',
  business,
  pdfColors: { primary: '#4f46e5', accent: '#10b981' },
  paidAmount: 0,
  payments: [],
};

/** Devuelve los primeros bytes del PDF generado como string ASCII. */
function pdfHeader(doc: ReturnType<typeof quotePdfDoc>): string {
  const bytes = new Uint8Array(doc.output('arraybuffer').slice(0, 8));
  return String.fromCharCode(...bytes);
}

describe('pdf', () => {
  it('genera un PDF de presupuesto válido', () => {
    const doc = quotePdfDoc(baseQuote);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000);
    expect(pdfHeader(doc)).toBe('%PDF-1.3');
  });

  it('tolera un presupuesto mínimo (sin ítems ni datos opcionales)', () => {
    const minimal: Quote = {
      ...baseQuote,
      title: '',
      observations: '',
      client: { name: 'Cliente', document: '', phone: '', email: '', address: '' },
      items: [],
      discountPct: 0,
      ivaPct: 0,
      pdfColors: { primary: '#4f46e5', accent: '#10b981', monochrome: true },
    };
    const doc = quotePdfDoc(minimal);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(500);
    expect(pdfHeader(doc)).toBe('%PDF-1.3');
  });
});
