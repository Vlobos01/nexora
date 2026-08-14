import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded' });
await page.getByRole('heading', { name: /¡Hola/ }).waitFor({ timeout: 15000 });

await page.getByRole('button', { name: 'Nuevo presupuesto' }).first().click();

// Nombre largo que envuelve en varias líneas
const longName =
  'Diseño UI/UX de landing page completa con 4 secciones, formulario de contacto con validación, mapa interactivo y animaciones';
await page.locator('textarea[placeholder^="Concepto"]').first().fill(longName);
await page.waitForTimeout(200);

const diag = await page.evaluate(() => {
  const el = document.querySelector('textarea[placeholder^="Concepto"]');
  const rect = el?.getBoundingClientRect();
  // La tarjeta de conceptos (ancho completo) contiene los inputs de las filas
  const card = el?.closest('.rounded-2xl');
  const nums = card ? card.querySelectorAll('input[type="number"]') : [];
  const qty = nums[0]?.getBoundingClientRect();
  const price = nums[1]?.getBoundingClientRect();
  const disc = nums[2]?.getBoundingClientRect();
  const header = [...document.querySelectorAll('div')].find(
    (d) => d.className.includes('uppercase') && d.textContent?.includes('Descripción'),
  );
  return {
    width: Math.round(rect?.width ?? 0),
    height: Math.round(rect?.height ?? 0),
    scrollHeight: el?.scrollHeight ?? 0,
    clientHeight: el?.clientHeight ?? 0,
    fullVisible: el ? el.scrollHeight <= el.clientHeight + 4 : false,
    qtyTop: Math.round(qty?.top ?? -1),
    priceTop: Math.round(price?.top ?? -1),
    discTop: Math.round(disc?.top ?? -1),
    headerPresent: !!header,
  };
});
console.log('diagnóstico:', JSON.stringify(diag));

let fail = false;
if (diag.width < 350) {
  console.log('✗ campo de descripción no ocupa el ancho completo');
  fail = true;
} else {
  console.log(`✓ tabla a ancho completo (descripción ${diag.width}px)`);
}
if (!diag.headerPresent) {
  console.log('✗ falta el encabezado de tabla');
  fail = true;
} else {
  console.log('✓ encabezados de tabla restaurados');
}
if (!diag.fullVisible) {
  console.log('✗ nombre completo no visible');
  fail = true;
} else {
  console.log('✓ nombre completo visible (el campo crece con el texto)');
}
// Fila única: cantidad, precio y descuento a la misma altura que el campo
const tops = [diag.qtyTop, diag.priceTop, diag.discTop];
if (tops.some((t) => Math.abs(t - diag.qtyTop) > 4)) {
  console.log('✗ controles desalineados en la fila');
  fail = true;
} else {
  console.log('✓ cantidad, precio y descuento alineados en la fila');
}

await page.screenshot({ path: '/tmp/nexora-form.png', fullPage: false });
console.log('screenshot: /tmp/nexora-form.png');

await browser.close();
process.exit(fail ? 1 : 0);
