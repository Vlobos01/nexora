import { describe, expect, it } from 'vitest';
import { amountInWords, currencyWord, formatMoney, formatQty, numberToWords } from './money';

describe('formatMoney', () => {
  it('formatea con el símbolo de la moneda y 2 decimales', () => {
    expect(formatMoney(1234.5, 'ARS')).toContain('$');
    expect(formatMoney(1234.5, 'ARS')).toContain('1.234,50');
  });

  it('tolera valores no numéricos', () => {
    expect(formatMoney(Number.NaN, 'ARS')).toContain('0,00');
    expect(formatMoney(Number.POSITIVE_INFINITY, 'ARS')).toContain('0,00');
  });

  it('redondea a 2 decimales', () => {
    expect(formatMoney(1.005, 'USD')).toContain('1,01');
  });
});

describe('formatQty', () => {
  it('formatea cantidades con hasta 3 decimales', () => {
    expect(formatQty(1000)).toContain('1.000');
    expect(formatQty(1.5)).toBe('1,5');
  });
});

describe('currencyWord', () => {
  it('devuelve la palabra en español para monedas conocidas', () => {
    expect(currencyWord('ARS')).toBe('pesos');
    expect(currencyWord('USD')).toBe('dólares');
  });

  it('devuelve vacío para monedas desconocidas', () => {
    expect(currencyWord('XYZ')).toBe('');
  });
});

describe('numberToWords', () => {
  it('convierte unidades, decenas y centenas', () => {
    expect(numberToWords(0)).toBe('cero');
    expect(numberToWords(7)).toBe('siete');
    expect(numberToWords(21)).toBe('veintiuno');
    expect(numberToWords(45)).toBe('cuarenta y cinco');
    expect(numberToWords(100)).toBe('cien');
    expect(numberToWords(342)).toBe('trescientos cuarenta y dos');
  });

  it('convierte miles y millones', () => {
    expect(numberToWords(1000)).toBe('mil');
    expect(numberToWords(1500)).toBe('mil quinientos');
    expect(numberToWords(234567)).toBe(
      'doscientos treinta y cuatro mil quinientos sesenta y siete',
    );
    expect(numberToWords(1_000_000)).toBe('un millón');
    expect(numberToWords(2_500_000)).toBe('dos millones quinientos mil');
  });

  it('ignora decimales y toma el valor absoluto', () => {
    expect(numberToWords(-1234.99)).toBe('mil doscientos treinta y cuatro');
  });
});

describe('amountInWords', () => {
  it('arma el importe en letras con centavos', () => {
    expect(amountInWords(1234.56, 'ARS')).toBe('Mil doscientos treinta y cuatro pesos con 56/100');
  });

  it('omite los centavos cuando son 0', () => {
    expect(amountInWords(100, 'USD')).toBe('Cien dólares');
  });
});
