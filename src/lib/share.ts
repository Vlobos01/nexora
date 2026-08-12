import type { Quote } from '../types';
import { quoteTotals } from './calc';
import { formatDate } from './dates';
import { formatMoney } from './money';
import { quoteNumberDisplay } from './id';

/** Texto de presentación del presupuesto para WhatsApp / email. */
export function quoteShareText(q: Quote): string {
  const totals = quoteTotals(q);
  const firstName = q.client.name.trim().split(/\s+/)[0];
  const greeting = firstName
    ? `Hola ${firstName}! Te comparto el presupuesto ${quoteNumberDisplay(q)}:`
    : `Te comparto el presupuesto ${quoteNumberDisplay(q)}:`;
  const lines = [
    greeting,
    q.title ? `• ${q.title}` : null,
    `• Total: ${formatMoney(totals.total, q.currency)}`,
    q.expiryDate ? `• Válido hasta el ${formatDate(q.expiryDate)}` : null,
    '',
    'Te envío el detalle en el PDF adjunto. Quedo atento a tus dudas!',
  ].filter((l): l is string => l !== null);
  return lines.join('\n');
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^\d]/g, '');
  if (!digits) return '';
  // wa.me espera el formato internacional sin "+". Ayuditas para números locales
  // (ej. Argentina): "011 5555-5555" → "54 11..." y "15 5555-5555" → "549 15..."
  if (digits.length >= 10 && digits.startsWith('0')) {
    digits = `54${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith('15')) {
    digits = `549${digits.slice(2)}`;
  }
  return digits;
}

export function whatsappUrl(q: Quote): string {
  const phone = normalizePhone(q.client.phone);
  const text = encodeURIComponent(quoteShareText(q));
  // Si no hay teléfono (o es muy corto), se abre sin destinatario y el usuario elige el chat
  return phone.length >= 8 ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function mailtoUrl(q: Quote): string {
  const subject = encodeURIComponent(`Presupuesto ${quoteNumberDisplay(q)} — ${q.client.name}`);
  const body = encodeURIComponent(quoteShareText(q));
  return `mailto:${q.client.email}?subject=${subject}&body=${body}`;
}
