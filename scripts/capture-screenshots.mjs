import { chromium } from 'playwright';
import fs from 'node:fs';

// Genera las capturas de docs/screenshots/ usadas en el README.
// Uso: npm run preview (u otra URL en BASE) y luego `node scripts/capture-screenshots.mjs`
// Los datos de demo se crean en un perfil de navegador temporal: no tocan tus datos reales.

const BASE = 'https://nexora-pied-mu.vercel.app';
const OUT = 'docs/screenshots';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log('·', ...a);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
  locale: 'es-AR',
  timezoneId: 'America/Argentina/Buenos_Aires',
});
const page = await ctx.newPage();
const settle = (ms = 1200) => page.waitForTimeout(ms);

async function shot(name) {
  await settle();
  await page.screenshot({ path: `${OUT}/${name}.png` });
  log('captura', name);
}

async function crear(cliente, titulo, concepto, precio, estado) {
  await page.getByRole('button', { name: 'Nuevo presupuesto' }).first().click();
  await page.getByRole('combobox').first().fill(cliente);
  await page.getByPlaceholder('Ej: Desarrollo de landing page').fill(titulo);
  await page.locator('textarea[placeholder^="Concepto"]').first().fill(concepto);
  const nums = page.locator('input[type="number"]');
  await nums.nth(0).fill('1');
  await nums.nth(1).fill(String(precio));
  await page.getByRole('button', { name: 'Guardar presupuesto' }).click();
  await page.getByRole('heading', { name: /^P-\d{4}$/ }).waitFor({ timeout: 15000 });
  const num = (await page.getByRole('heading', { name: /^P-\d{4}$/ }).first().innerText()).trim();
  if (estado) {
    await page.locator('select').first().selectOption(estado);
    await page.waitForTimeout(700);
  }
  log('presupuesto', num, '-', cliente, estado ? `(${estado})` : '');
  return num;
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /¡Hola/ }).waitFor({ timeout: 20000 });
  await page.evaluate(() => localStorage.setItem('demo-banner-dismissed', 'true'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /¡Hola/ }).waitFor({ timeout: 20000 });

  // datos del negocio (solo en este navegador temporal)
  await page.getByRole('button', { name: 'Configuración' }).click();
  await page.waitForTimeout(800);
  await page.getByPlaceholder('Mi Negocio').fill('Lobos Dev');
  await page.getByPlaceholder('+54 11 5555-5555').first().fill('+54 11 5555-5555');
  await page.getByPlaceholder('info@negocio.com').fill('hola@lobos.dev');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.waitForTimeout(1000);
  log('negocio configurado');

  await page.getByRole('button', { name: 'Inicio' }).click();
  await page.waitForTimeout(600);

  await crear('Estudio Ríos', 'Desarrollo de landing page', 'Diseño y desarrollo de landing page responsive', 850000, 'accepted');

  // cobro parcial sobre el aceptado
  await page.getByRole('button', { name: 'Registrar cobro' }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.waitFor({ timeout: 8000 });
  await dlg.locator('input[type="number"]').fill('500000');
  await dlg.getByRole('button', { name: 'Registrar', exact: true }).click();
  await page.waitForTimeout(1200);
  log('cobro parcial registrado');

  const p2 = await crear('Cooperativa Sur', 'Mantenimiento mensual', 'Soporte técnico y mantenimiento del sitio', 120000, 'accepted');
  await crear('Marta Gómez', 'Identidad visual', 'Diseño de marca, logo y manual de uso', 480000, 'sent');
  await crear('Norte Digital', 'Rediseño de e-commerce', 'Migración y rediseño de tienda online', 260000, 'draft');

  // recargar limpia las notificaciones
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /¡Hola/ }).waitFor({ timeout: 20000 });
  await shot('dashboard');

  await page.getByRole('button', { name: 'Presupuestos' }).click();
  await shot('presupuestos');

  await page.getByText(p2, { exact: true }).first().click();
  await page.waitForTimeout(1200);
  await shot('presupuesto-detalle');

  // mobile con el mismo estado
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Inicio' }).click();
  await shot('movil-dashboard');
  await page.getByRole('button', { name: 'Presupuestos' }).click();
  await shot('movil-presupuestos');
} catch (e) {
  console.error('FALLO:', e.message);
  await page.screenshot({ path: `${OUT}/_error.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  const files = fs.readdirSync(OUT).map((f) => `${f} (${Math.round(fs.statSync(`${OUT}/${f}`).size / 1024)}KB)`);
  console.log('archivos:', files.join(', '));
}
