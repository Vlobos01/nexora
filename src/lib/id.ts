let counter = 0;

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  counter += 1;
  return `id-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function padNumber(n: number, width = 4): string {
  return String(Math.max(0, Math.trunc(n))).padStart(width, '0');
}

export function numberDisplay(prefix: string, n: number): string {
  return `${prefix || 'P'}-${padNumber(n)}`;
}

export function quoteNumberDisplay(q: { prefix: string; number: number }): string {
  return numberDisplay(q.prefix, q.number);
}
