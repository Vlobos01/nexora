import { round2 } from './calc';

export const CURRENCIES: { code: string; label: string; word: string }[] = [
  { code: 'ARS', label: 'Peso argentino (ARS)', word: 'pesos' },
  { code: 'USD', label: 'Dólar estadounidense (USD)', word: 'dólares' },
  { code: 'EUR', label: 'Euro (EUR)', word: 'euros' },
  { code: 'UYU', label: 'Peso uruguayo (UYU)', word: 'pesos uruguayos' },
  { code: 'CLP', label: 'Peso chileno (CLP)', word: 'pesos chilenos' },
  { code: 'MXN', label: 'Peso mexicano (MXN)', word: 'pesos mexicanos' },
  { code: 'COP', label: 'Peso colombiano (COP)', word: 'pesos colombianos' },
  { code: 'BRL', label: 'Real brasileño (BRL)', word: 'reales' },
  { code: 'PEN', label: 'Sol peruano (PEN)', word: 'soles' },
  { code: 'BOB', label: 'Boliviano (BOB)', word: 'bolivianos' },
  { code: 'PYG', label: 'Guaraní (PYG)', word: 'guaraníes' },
  { code: 'VES', label: 'Bolívar (VES)', word: 'bolívares' },
];

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency: string): string {
  const n = Number.isFinite(amount) ? round2(amount) : 0;
  const key = currency || 'ARS';
  let fmt = currencyFormatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: key,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatterCache.set(key, fmt);
  }
  return fmt.format(n);
}

export function formatQty(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(n);
}

export function currencyWord(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.word ?? '';
}

// ---------- Número a palabras (español) ----------
const UNIDADES = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés',
  'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
];
const DECENAS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function decenas(n: number): string {
  if (n <= 29) return UNIDADES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  const base = DECENAS[d];
  return u === 0 ? base : `${base} y ${UNIDADES[u]}`;
}

function tresDigitos(n: number): string {
  if (n === 0) return '';
  const c = Math.floor(n / 100);
  const rest = n % 100;
  let s = '';
  if (c === 1 && rest === 0) s = 'cien';
  else if (c > 0) s = CENTENAS[c];
  if (rest > 0) {
    const r = decenas(rest);
    s = s ? `${s} ${r}` : r;
  }
  return s;
}

function miles(n: number): string {
  const m = Math.floor(n / 1000);
  const rest = n % 1000;
  let s = '';
  if (m === 1) s = 'mil';
  else if (m > 1) s = `${tresDigitos(m)} mil`;
  if (rest > 0) s = s ? `${s} ${tresDigitos(rest)}` : tresDigitos(rest);
  return s || 'cero';
}

function millones(n: number): string {
  const m = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  let s = '';
  if (m === 1) s = 'un millón';
  else if (m > 1) s = `${miles(m)} millones`;
  if (rest > 0) s = s ? `${s} ${miles(rest)}` : miles(rest);
  return s || 'cero';
}

export function numberToWords(n: number): string {
  const abs = Math.abs(Math.trunc(n));
  return millones(abs);
}

/** "Mil doscientos treinta y cuatro pesos con 56/100" */
export function amountInWords(amount: number, currency: string): string {
  const rounded = round2(amount);
  const intPart = Math.trunc(rounded);
  const cents = Math.round((rounded - intPart) * 100);
  const words = numberToWords(intPart);
  const cap = words.charAt(0).toUpperCase() + words.slice(1);
  const word = currencyWord(currency);
  const cur = word ? ` ${word}` : '';
  return cents > 0 ? `${cap}${cur} con ${String(cents).padStart(2, '0')}/100` : `${cap}${cur}`;
}
