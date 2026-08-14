import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4173';

const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};
const ok = (msg) => console.log(`✓ ${msg}`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /¡Hola/ }).waitFor({ timeout: 15000 });
  ok('Dashboard carga');

  // ---- Crear presupuesto ----
  await page.getByRole('button', { name: 'Nuevo presupuesto' }).first().click();
  await page.getByRole('combobox').first().fill('Cliente Smoke Test');
  await page.locator('textarea[placeholder^="Concepto"]').first().fill('Servicio de prueba');
  const numberInputs = page.locator('input[type="number"]');
  await numberInputs.nth(0).fill('2');
  await numberInputs.nth(1).fill('1000');
  await numberInputs.nth(2).fill('10');
  await page.getByRole('button', { name: 'Guardar presupuesto' }).click();

  await page.getByRole('heading', { name: 'P-0001' }).waitFor({ timeout: 10000 });
  ok('Presupuesto P-0001 creado y detalle abierto');

  // ---- Aceptar y facturar ----
  await page.locator('select').first().selectOption('accepted');
  await page.getByRole('button', { name: 'Crear factura' }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Crear factura' }).click();

  await page.getByRole('heading', { name: 'Facturas' }).waitFor({ timeout: 10000 });
  await page.getByText('F-0001', { exact: true }).first().waitFor({ timeout: 5000 });
  ok('Factura F-0001 creada desde el presupuesto aceptado');

  // ---- Marcar como cobrada ----
  await page.getByRole('button', { name: 'Acciones' }).first().click();
  await page.getByRole('button', { name: 'Marcar como cobrada' }).click();
  await page.getByText('Cobrada', { exact: true }).first().waitFor({ timeout: 5000 });
  ok('Factura marcada como cobrada');

  // ---- Dashboard: tasa de conversión ----
  await page.getByRole('button', { name: 'Inicio' }).click();
  await page.getByText('Conversión', { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText('1 de 1 enviados', { exact: true }).waitFor({ timeout: 5000 });
  ok('Dashboard muestra tasa de conversión 1 de 1 enviados');

  // ---- Autosave: borrador restaurado ----
  await page.getByRole('button', { name: 'Nuevo presupuesto' }).first().click();
  await page.getByRole('combobox').first().fill('Borrador Autosave');
  await page.getByRole('button', { name: 'Inicio' }).click();
  await page.getByRole('heading', { name: /¡Hola/ }).waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: 'Nuevo presupuesto' }).first().click();
  await page.getByText('Restauramos un borrador sin guardar').waitFor({ timeout: 10000 });
  ok('Borrador automático restaurado al volver a Nuevo presupuesto');

  if (errors.length > 0) {
    fail(`Errores de consola: ${errors.join(' | ')}`);
  } else {
    ok('Sin errores de consola');
  }
} catch (e) {
  fail(`Flujo falló: ${e.message}`);
} finally {
  await browser.close();
}
