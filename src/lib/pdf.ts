import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BusinessInfo, ClientInfo, Invoice, LineItem, PdfColors, Quote } from '../types';
import { computeTotals } from './calc';
import { formatDate } from './dates';
import { formatMoney, formatQty, amountInWords } from './money';
import { numberDisplay, quoteNumberDisplay } from './id';

const M = 14; // margen (mm)
const W = 210;
const H = 297;

const INK: [number, number, number] = [15, 23, 42];
const GRAY: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const SLATE50: [number, number, number] = [248, 250, 252];

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return [79, 70, 229];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

interface PdfDocConfig {
  /** Texto grande del encabezado: 'PRESUPUESTO' o 'FACTURA'. */
  docLabel: string;
  numberText: string;
  dateLabel: string;
  date: string;
  secondaryLabel: string;
  secondaryDate: string;
  title: string;
  client: ClientInfo;
  items: LineItem[];
  discountPct: number;
  ivaPct: number;
  currency: string;
  business: BusinessInfo;
  pdfColors: PdfColors;
  observations: string;
  conditions: string;
  pdfTitle: string;
  pdfSubject: string;
}

export function documentPdfDoc(cfg: PdfDocConfig): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const primary = hexToRgb(cfg.pdfColors?.primary || '#4f46e5');
  const accent = hexToRgb(cfg.pdfColors?.accent || '#10b981');
  // Modo "blanco y negro": sin rellenos de color para ahorrar tinta
  const mono = !!cfg.pdfColors?.monochrome;
  const headText: [number, number, number] = mono ? INK : [255, 255, 255];
  const headSub: [number, number, number] = mono ? GRAY : [226, 232, 240];
  const b = cfg.business;
  const totals = computeTotals(cfg.items, cfg.discountPct, cfg.ivaPct);

  doc.setProperties({
    title: cfg.pdfTitle,
    subject: cfg.pdfSubject,
    author: b.name || 'Mi Negocio',
    creator: 'Nexora',
  });

  // ---------- Encabezado ----------
  if (mono) {
    // Sin relleno: una línea negra marca el encabezado
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.6);
    doc.line(0, 29.4, W, 29.4);
  } else {
    doc.setFillColor(...primary);
    doc.rect(0, 0, W, 30, 'F');
    doc.setFillColor(...accent);
    doc.rect(0, 30, W, 1.4, 'F');
  }

  let textX = M;
  if (b.logo) {
    try {
      const isJpeg = b.logo.startsWith('data:image/jpeg');
      doc.addImage(b.logo, isJpeg ? 'JPEG' : 'PNG', M, 5, 20, 20);
      textX = M + 25;
    } catch {
      // logo inválido: se omite
    }
  }

  doc.setTextColor(...headText);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(b.name || 'Mi Negocio', textX, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...headSub);
  const contact: string[] = [];
  if (b.cuit) contact.push(`CUIT ${b.cuit}`);
  if (b.phone) contact.push(`Tel. ${b.phone}`);
  if (b.email) contact.push(b.email);
  if (b.address) contact.push(b.address);
  const maxW = W - M - 96;
  let lineY = 16.5;
  for (const line of contact.slice(0, 4)) {
    const wrapped = doc.splitTextToSize(line, maxW);
    for (const part of wrapped as string[]) {
      if (lineY > 28) break;
      doc.text(part, textX, lineY);
      lineY += 3.4;
    }
  }

  // Bloque derecho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(...headText);
  doc.text(cfg.docLabel, W - M, 11, { align: 'right' });
  doc.setFontSize(11);
  doc.text(cfg.numberText, W - M, 16.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...headSub);
  doc.text(`${cfg.dateLabel}: ${formatDate(cfg.date)}`, W - M, 21, { align: 'right' });
  doc.text(`${cfg.secondaryLabel}: ${formatDate(cfg.secondaryDate)}`, W - M, 24.3, { align: 'right' });

  // ---------- Cliente ----------
  const clientBoxY = 40;
  doc.setFillColor(...(mono ? ([255, 255, 255] as [number, number, number]) : SLATE50));
  doc.setDrawColor(...(mono ? INK : LINE));
  doc.roundedRect(M, clientBoxY, 96, 30, 2, 2, 'FD');
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CLIENTE', M + 6, clientBoxY + 8);
  doc.setTextColor(...INK);
  doc.setFontSize(11);
  doc.text(cfg.client.name || '—', M + 6, clientBoxY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  let cY = clientBoxY + 19.5;
  const cLines = [
    cfg.client.document && `Doc: ${cfg.client.document}`,
    cfg.client.phone && `Tel: ${cfg.client.phone}`,
    cfg.client.email && cfg.client.email,
    cfg.client.address && cfg.client.address,
  ].filter(Boolean) as string[];
  for (const l of cLines.slice(0, 3)) {
    if (cY > clientBoxY + 26) break;
    doc.text(l, M + 6, cY);
    cY += 3.6;
  }

  // Título del trabajo
  if (cfg.title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(cfg.title, W - M, clientBoxY + 8, { align: 'right' });
  }

  // ---------- Tabla de conceptos ----------
  const body = cfg.items.map((it, i) => {
    const gross = it.quantity * it.unitPrice;
    const disc = (gross * (it.discountPct || 0)) / 100;
    return [
      String(i + 1),
      it.description || '—',
      formatQty(it.quantity),
      formatMoney(it.unitPrice, cfg.currency),
      it.discountPct > 0 ? `${formatQty(it.discountPct)}%` : '—',
      formatMoney(gross - disc, cfg.currency),
    ];
  });

  autoTable(doc, {
    startY: clientBoxY + 36,
    margin: { left: M, right: M },
    head: [['#', 'Descripción', 'Cant.', 'Precio unit.', 'Desc.', 'Subtotal']],
    body,
    theme: 'grid',
    headStyles: {
      fillColor: mono ? INK : primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.4,
      textColor: INK,
      lineColor: mono ? INK : LINE,
      lineWidth: mono ? 0.25 : 0.15,
      valign: 'middle',
    },
    alternateRowStyles: mono ? { fillColor: [255, 255, 255] } : { fillColor: SLATE50 },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 17, halign: 'right' },
      5: { cellWidth: 27, halign: 'right' },
    },
  });

  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;

  // ---------- Totales (con salto de página si el listado es largo) ----------
  let blockY = afterTable + 8;
  if (blockY > 225) {
    doc.addPage();
    blockY = 34;
  }
  const totX = W - M - 80;
  const totW = 80;
  let ty = blockY;

  const rows: [string, string, boolean][] = [
    ['Subtotal', formatMoney(totals.net, cfg.currency), false],
  ];
  if (totals.itemDiscount > 0) {
    rows.push(['Descuentos por ítem', `-${formatMoney(totals.itemDiscount, cfg.currency)}`, false]);
  }
  if (totals.globalDiscount > 0) {
    rows.push(['Descuento adicional', `-${formatMoney(totals.globalDiscount, cfg.currency)}`, false]);
  }
  if (cfg.ivaPct > 0) {
    rows.push([`IVA (${formatQty(cfg.ivaPct)}%)`, formatMoney(totals.iva, cfg.currency), false]);
  }
  rows.push(['TOTAL', formatMoney(totals.total, cfg.currency), true]);

  doc.setFontSize(9);
  for (const [label, value, isTotal] of rows) {
    if (isTotal) {
      // En modo blanco y negro, el total va con fondo negro y letra blanca (igual que la cabecera)
      doc.setFillColor(...(mono ? INK : primary));
      doc.roundedRect(totX, ty - 1, totW, 8.5, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(label, totX + 6, ty + 4.8);
      doc.text(value, totX + totW - 6, ty + 4.8, { align: 'right' });
      ty += 11.5;
    } else {
      doc.setTextColor(...GRAY);
      doc.setFont('helvetica', 'normal');
      doc.text(label, totX + 2, ty + 2);
      doc.setTextColor(...INK);
      doc.text(value, totX + totW - 2, ty + 2, { align: 'right' });
      ty += 6.4;
    }
  }

  // ---------- Importe en letras ----------
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  const words = amountInWords(totals.total, cfg.currency);
  const wordsLines = doc.splitTextToSize(`Son: ${words}.`, totW) as string[];
  doc.text(wordsLines[0], totX, ty + 2);
  if (wordsLines[1]) doc.text(wordsLines[1], totX, ty + 6);

  // ---------- Observaciones y condiciones ----------
  const leftX = M;
  let ly = blockY + 2;
  if (cfg.observations) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text('Observaciones', leftX, ly);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    const obsLines = doc.splitTextToSize(cfg.observations, 88) as string[];
    ly += 4.5;
    for (const line of obsLines) {
      doc.text(line, leftX, ly);
      ly += 3.8;
      if (ly > 255) break;
    }
    ly += 4;
  }
  if (cfg.conditions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text('Condiciones comerciales', leftX, ly);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    ly += 4.5;
    for (const rawLine of cfg.conditions.split('\n')) {
      const condLines = doc.splitTextToSize(rawLine || ' ', 88) as string[];
      for (const line of condLines) {
        doc.text(line, leftX, ly);
        ly += 3.8;
        if (ly > 275) break;
      }
    }
  }

  // ---------- Pie de página ----------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M, H - 13, W - M, H - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    const left = [b.name, b.phone].filter(Boolean).join(' · ');
    doc.text(left || ' ', M, H - 8);
    doc.text(`Página ${i} de ${pages}`, W / 2, H - 8, { align: 'center' });
    doc.text(`Generado con Nexora · ${formatDate(cfg.date)}`, W - M, H - 8, {
      align: 'right',
    });
  }

  return doc;
}

// ---------- Presupuestos ----------

export function quotePdfDoc(q: Quote): jsPDF {
  return documentPdfDoc({
    docLabel: 'PRESUPUESTO',
    numberText: quoteNumberDisplay(q),
    dateLabel: 'Fecha',
    date: q.date,
    secondaryLabel: 'Vence',
    secondaryDate: q.expiryDate,
    title: q.title,
    client: q.client,
    items: q.items,
    discountPct: q.discountPct,
    ivaPct: q.ivaPct,
    currency: q.currency,
    business: q.business,
    pdfColors: q.pdfColors,
    observations: q.observations,
    conditions: q.business.commercialConditions,
    pdfTitle: `Presupuesto ${quoteNumberDisplay(q)}`,
    pdfSubject: q.title || `Presupuesto para ${q.client.name}`,
  });
}

export function quotePdfBlobUrl(q: Quote): string {
  return String(quotePdfDoc(q).output('bloburl'));
}

export function quotePdfFile(q: Quote): File {
  const blob = quotePdfDoc(q).output('blob') as Blob;
  const name = `Presupuesto-${quoteNumberDisplay(q)}.pdf`;
  return new File([blob], name, { type: 'application/pdf' });
}

export function downloadQuotePdf(q: Quote): void {
  quotePdfDoc(q).save(`Presupuesto-${quoteNumberDisplay(q)}.pdf`);
}

export function printQuotePdf(q: Quote): void {
  printPdfBlob(quotePdfBlobUrl(q));
}

export type ShareResult = 'shared' | 'unsupported' | 'aborted' | 'error';

export async function shareQuotePdf(q: Quote): Promise<ShareResult> {
  try {
    const file = quotePdfFile(q);
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
    };
    if (typeof navigator.share !== 'function' || !nav.canShare?.({ files: [file] })) {
      return 'unsupported';
    }
    await navigator.share({
      files: [file],
      title: `Presupuesto ${quoteNumberDisplay(q)}`,
      text: `Presupuesto ${quoteNumberDisplay(q)} — ${q.client.name}`,
    });
    return 'shared';
  } catch (e) {
    if ((e as { name?: string })?.name === 'AbortError') return 'aborted';
    return 'error';
  }
}

// ---------- Facturas ----------

export function invoicePdfDoc(inv: Invoice): jsPDF {
  const display = numberDisplay(inv.prefix, inv.number);
  return documentPdfDoc({
    docLabel: 'FACTURA',
    numberText: display,
    dateLabel: 'Fecha',
    date: inv.date,
    secondaryLabel: 'Vto. pago',
    secondaryDate: inv.dueDate,
    title: inv.title,
    client: inv.client,
    items: inv.items,
    discountPct: inv.discountPct,
    ivaPct: inv.ivaPct,
    currency: inv.currency,
    business: inv.business,
    pdfColors: inv.pdfColors,
    observations: inv.observations,
    // Igual que el presupuesto: mismas condiciones comerciales del negocio
    conditions: inv.business.commercialConditions,
    pdfTitle: `Factura ${display}`,
    pdfSubject: `Factura ${display} — ${inv.client.name}`,
  });
}

export function invoiceNumberDisplay(inv: Invoice): string {
  return numberDisplay(inv.prefix, inv.number);
}

export function invoicePdfBlobUrl(inv: Invoice): string {
  return String(invoicePdfDoc(inv).output('bloburl'));
}

export function downloadInvoicePdf(inv: Invoice): void {
  invoicePdfDoc(inv).save(`Factura-${invoiceNumberDisplay(inv)}.pdf`);
}

export function printInvoicePdf(inv: Invoice): void {
  printPdfBlob(invoicePdfBlobUrl(inv));
}

// ---------- Imprimir (compartido) ----------
function printPdfBlob(url: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(url, '_blank');
      }
    }, 350);
  };
  setTimeout(() => iframe.remove(), 120_000);
}
