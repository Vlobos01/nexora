import { useMemo, useState } from 'react';
import {
  BookUser,
  BookmarkPlus,
  Building2,
  CalendarDays,
  Clock,
  Copy,
  Download,
  Eye,
  FileDown,
  FileText,
  Mail,
  MessageCircle,
  Pencil,
  Printer,
  Receipt,
  Send,
  Share2,
  Trash2,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { lineDiscountAmount, lineNet, quoteTotals } from '../lib/calc';
import { formatDate, getEffectiveStatus, isOverdue } from '../lib/dates';
import { amountInWords, formatMoney, formatQty } from '../lib/money';
import { quoteNumberDisplay } from '../lib/id';
import { downloadQuotePdf, printQuotePdf, quotePdfBlobUrl, shareQuotePdf, invoiceNumberDisplay } from '../lib/pdf';
import { mailtoUrl, whatsappUrl } from '../lib/share';
import { Button, Card, ConfirmDialog, Menu, Modal, Select, StatusBadge, cn, type MenuItem } from './ui';
import type { Quote, QuoteStatus, View } from '../types';

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviado' },
  { value: 'accepted', label: 'Aceptado' },
  { value: 'rejected', label: 'Rechazado' },
];

export default function QuoteDetail({
  quote,
  onNavigate,
}: {
  quote: Quote;
  onNavigate: (v: View) => void;
}) {
  const {
    setQuoteStatus,
    duplicateQuote,
    deleteQuote,
    saveTemplate,
    pushToast,
    clients,
    addClient,
    settings,
    invoices,
    createInvoiceFromQuote,
  } = useApp();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const totals = useMemo(() => quoteTotals(quote), [quote]);
  const effective = getEffectiveStatus(quote);
  const overdue = isOverdue(quote.expiryDate) && quote.status !== 'rejected';

  const openPreview = () => {
    setBlobUrl(quotePdfBlobUrl(quote));
    setPreviewOpen(true);
  };

  const handleShare = async () => {
    const result = await shareQuotePdf(quote);
    if (result === 'shared') {
      pushToast('success', 'Presupuesto compartido.');
    } else if (result === 'unsupported') {
      pushToast('info', 'Tu navegador no soporta compartir archivos. Descargá el PDF y enviáselo a tu cliente.');
    } else if (result === 'error') {
      pushToast('error', 'No se pudo compartir el presupuesto.');
    }
  };

  const hasInvoice = invoices.some((i) => i.quoteId === quote.id);

  const handleCreateInvoice = () => {
    const inv = createInvoiceFromQuote(quote);
    if (!inv) {
      pushToast('info', 'Este presupuesto ya tiene una factura asociada.');
      return;
    }
    pushToast('success', `Factura ${invoiceNumberDisplay(inv)} creada a partir del presupuesto.`);
    onNavigate({ name: 'invoices' });
  };

  const handleDuplicate = () => {
    const copy = duplicateQuote(quote.id);
    if (copy) {
      pushToast('success', `Presupuesto duplicado como ${quoteNumberDisplay(copy)}.`);
      onNavigate({ name: 'detail', id: copy.id });
    }
  };

  const isInBook =
    quote.client.name.trim() !== '' &&
    clients.some((c) => c.name.trim().toLowerCase() === quote.client.name.trim().toLowerCase());

  const handleSaveClient = () => {
    if (!quote.client.name.trim()) return;
    const outcome = addClient(quote.client);
    pushToast(
      'success',
      outcome === 'added'
        ? 'Cliente guardado en la libreta.'
        : 'El cliente ya estaba en la libreta: se actualizaron sus datos.',
    );
  };

  const handleSaveAsTemplate = () => {
    const tpl = {
      date: quote.date,
      expiryDate: quote.expiryDate,
      title: quote.title,
      observations: quote.observations,
      client: quote.client,
      items: quote.items,
      discountPct: quote.discountPct,
      ivaPct: quote.ivaPct,
    };
    saveTemplate(tpl, `${quote.title || quoteNumberDisplay(quote)} (plantilla)`);
    pushToast('success', 'Guardado como plantilla. Encontrá la sección en Plantillas.');
  };

  const changeStatus = (s: QuoteStatus) => {
    setQuoteStatus(quote.id, s);
    pushToast('success', `Estado actualizado a "${STATUS_OPTIONS.find((o) => o.value === s)?.label}".`);
  };

  // Opciones de envío: solo las que el usuario activó en Configuración
  const sendItems: MenuItem[] = [];
  if (settings.enableWhatsapp) {
    sendItems.push({
      label: 'Por WhatsApp',
      icon: <MessageCircle className="h-4 w-4" />,
      onClick: () => window.open(whatsappUrl(quote), '_blank', 'noopener,noreferrer'),
    });
  }
  if (settings.enableEmail) {
    sendItems.push({
      label: 'Por email',
      icon: <Mail className="h-4 w-4" />,
      onClick: () => {
        window.location.href = mailtoUrl(quote);
      },
    });
  }
  if (settings.enableShare) {
    if (sendItems.length > 0) sendItems.push({ label: '---' });
    sendItems.push({ label: 'Compartir PDF (nativo)', icon: <Share2 className="h-4 w-4" />, onClick: handleShare });
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {quoteNumberDisplay(quote)}
            </h1>
            <StatusBadge status={effective} />
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {quote.client.name || 'Sin cliente'} · Emitido {formatDate(quote.date)}
          </p>
          {overdue && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" /> Venció el {formatDate(quote.expiryDate)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={openPreview}>
            <Eye className="h-4 w-4" /> Vista previa
          </Button>
          <Button onClick={() => downloadQuotePdf(quote)}>
            <FileDown className="h-4 w-4" /> Descargar PDF
          </Button>
          {sendItems.length > 0 && (
            <Menu
              trigger={
                <Button variant="secondary">
                  <Send className="h-4 w-4" /> Enviar
                </Button>
              }
              items={sendItems}
            />
          )}
          <Button variant="ghost" onClick={() => printQuotePdf(quote)} title="Imprimir">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Cliente */}
          <Card className="p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Building2 className="h-4 w-4" /> Cliente
            </div>
            <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Nombre" value={quote.client.name} />
              <Detail label="DNI / CUIT" value={quote.client.document} />
              <Detail label="Teléfono" value={quote.client.phone} />
              <Detail label="Email" value={quote.client.email} />
              <Detail label="Dirección" value={quote.client.address} className="sm:col-span-2" />
            </div>
          </Card>

          {/* Conceptos */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {quote.title || 'Productos y servicios'}
                </h3>
                <p className="text-xs text-slate-400">{quote.items.length} conceptos</p>
              </div>
              <CalendarDays className="h-4.5 w-4.5 text-slate-300" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-5 py-3">Descripción</th>
                    <th className="px-3 py-3 text-right">Cant.</th>
                    <th className="px-3 py-3 text-right">Precio</th>
                    <th className="px-3 py-3 text-right">Desc.</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {quote.items.map((it) => {
                    const disc = lineDiscountAmount(it);
                    return (
                      <tr key={it.id}>
                        <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200">
                          {it.description || '—'}
                        </td>
                        <td className="px-3 py-3.5 text-right text-slate-500 dark:text-slate-400">{formatQty(it.quantity)}</td>
                        <td className="px-3 py-3.5 text-right text-slate-500 dark:text-slate-400">{formatMoney(it.unitPrice, quote.currency)}</td>
                        <td className="px-3 py-3.5 text-right text-slate-500 dark:text-slate-400">
                          {it.discountPct > 0 ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              -{formatQty(it.discountPct)}% ({formatMoney(disc, quote.currency)})
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-extrabold text-slate-800 dark:text-slate-100">
                          {formatMoney(lineNet(it), quote.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Observaciones y condiciones */}
          {(quote.observations || quote.business.commercialConditions) && (
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {quote.observations && (
                <div className="p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Observaciones</h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                    {quote.observations}
                  </p>
                </div>
              )}
              {quote.business.commercialConditions && (
                <div className="p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Condiciones comerciales</h3>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
                    {quote.business.commercialConditions}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Total</p>
              <p className="text-2xl font-extrabold text-white">{formatMoney(totals.total, quote.currency)}</p>
            </div>
            <div className="space-y-2 p-5 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.net, quote.currency)} />
              {totals.itemDiscount > 0 && <Row label="Descuentos por ítem" value={`-${formatMoney(totals.itemDiscount, quote.currency)}`} muted />}
              {totals.globalDiscount > 0 && <Row label="Descuento general" value={`-${formatMoney(totals.globalDiscount, quote.currency)}`} muted />}
              {quote.ivaPct > 0 && <Row label={`IVA (${formatQty(quote.ivaPct)}%)`} value={formatMoney(totals.iva, quote.currency)} />}
              <p className="border-t border-slate-100 pt-2 text-xs italic leading-relaxed text-slate-400 dark:border-slate-800">
                Son: <span className="font-semibold not-italic">{amountInWords(totals.total, quote.currency)}</span>
              </p>
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">Cambiar estado</p>
            <Select value={quote.status} onChange={(e) => changeStatus(e.target.value as QuoteStatus)} className="w-full">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            {effective === 'accepted' && (
              <Button onClick={handleCreateInvoice} disabled={hasInvoice} className="mt-3 w-full">
                <Receipt className="h-4 w-4" />
                {hasInvoice ? 'Factura creada' : 'Crear factura'}
              </Button>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => onNavigate({ name: 'edit', id: quote.id })}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button variant="secondary" size="sm" onClick={handleDuplicate}>
                <Copy className="h-3.5 w-3.5" /> Duplicar
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSaveAsTemplate}>
                <BookmarkPlus className="h-3.5 w-3.5" /> Plantilla
              </Button>
              <Button variant="ghost" size="sm" className="!text-rose-600 hover:!bg-rose-50 dark:!text-rose-400 dark:hover:!bg-rose-500/10" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveClient}
              disabled={!quote.client.name.trim() || isInBook}
              className="mt-2 w-full justify-start border border-dashed border-slate-200 !text-slate-500 hover:!bg-indigo-50 hover:!text-indigo-600 dark:border-slate-700 dark:hover:!bg-indigo-500/10 dark:hover:!text-indigo-300"
            >
              <BookUser className="h-3.5 w-3.5" />
              {isInBook ? 'Cliente en la libreta' : 'Guardar cliente en libreta'}
            </Button>
          </Card>

          <Card className="p-4 text-xs text-slate-400">
            <p className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 shrink-0" />
              El PDF usa los colores y datos del negocio que configuraste al momento de crear este
              presupuesto.
            </p>
          </Card>
        </div>
      </div>

      {/* Vista previa */}
      <Modal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          setBlobUrl(null);
        }}
        title={`Vista previa · ${quoteNumberDisplay(quote)}`}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => printQuotePdf(quote)}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            {settings.enableShare && (
              <Button variant="secondary" onClick={handleShare}>
                <Share2 className="h-4 w-4" /> Compartir
              </Button>
            )}
            <Button onClick={() => downloadQuotePdf(quote)}>
              <Download className="h-4 w-4" /> Descargar PDF
            </Button>
          </>
        }
      >
        <div className="h-[70dvh] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
          {blobUrl ? (
            <iframe src={blobUrl} title="Vista previa del PDF" className="h-full w-full" />
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">Generando PDF…</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar presupuesto"
        message={`¿Seguro que querés eliminar ${quoteNumberDisplay(quote)}? Esta acción no se puede deshacer.`}
        onConfirm={() => {
          deleteQuote(quote.id);
          pushToast('success', 'Presupuesto eliminado.');
          onNavigate({ name: 'quotes' });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-200">{value || '—'}</p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between', muted ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300')}>
      <span className="text-[13px]">{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  );
}
