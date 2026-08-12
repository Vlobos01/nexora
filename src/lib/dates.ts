import type { Quote, QuoteStatus } from '../types';

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function addDaysISO(days: number, from?: string): string {
  const d = from ? parseLocal(from) : new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function parseLocal(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = parseLocal(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isOverdue(iso: string): boolean {
  if (!iso) return false;
  return iso < todayISO();
}

/** Estado efectivo: calcula "vencido" automáticamente cuando corresponde. */
export function getEffectiveStatus(q: Quote): QuoteStatus {
  if (
    (q.status === 'draft' || q.status === 'sent') &&
    q.expiryDate &&
    isOverdue(q.expiryDate)
  ) {
    return 'expired';
  }
  return q.status;
}

export function daysUntil(iso: string): number {
  if (!iso) return 0;
  const ms = parseLocal(iso).getTime() - parseLocal(todayISO()).getTime();
  return Math.ceil(ms / 86_400_000);
}
