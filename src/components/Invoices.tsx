import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Printer,
  Receipt,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { invoiceTotals } from '../lib/calc';
import { formatDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { downloadInvoicePdf, printInvoicePdf, invoicePdfBlobUrl, invoiceNumberDisplay } from '../lib/pdf';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Menu, Modal, cn } from './ui';
import type { Invoice, InvoiceStatus, View } from '../types';

type StatusFilter = 'all' | InvoiceStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'paid', label: 'Cobradas' },
];

const STATUS_META: Record<InvoiceStatus, { label: string; badge: string; dot: string }> = {
  pending: {
    label: 'Pendiente',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  partial: {
    label: 'Parcial',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  paid: {
    label: 'Cobrada',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
};

export function InvoiceStatusBadge({ status, size = 'md' }: { status: InvoiceStatus; size?: 'sm' | 'md' }) {
  const s = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        s.badge,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

export default function Invoices({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { invoices, setInvoiceStatus, deleteInvoice, pushToast, settings } = useApp();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [preview, setPreview] = useState<Invoice | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices
      .filter((inv) => {
        if (status !== 'all' && inv.status !== status) return false;
        if (!q) return true;
        const hay = `${inv.client.name} ${invoiceNumberDisplay(inv)} ${inv.title}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.number - a.number);
  }, [invoices, search, status]);

  const summary = useMemo(() => {
    let facturado = 0;
    let cobrado = 0;
    for (const inv of invoices) {
      facturado += invoiceTotals(inv).total;
      cobrado += inv.paidAmount;
    }
    return { facturado, cobrado, pendiente: facturado - cobrado };
  }, [invoices]);

  const openPreview = (inv: Invoice) => {
    setBlobUrl(invoicePdfBlobUrl(inv));
    setPreview(inv);
  };

  const closePreview = () => {
    setPreview(null);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(null);
  };

  const mark = (inv: Invoice, s: InvoiceStatus) => {
    setInvoiceStatus(inv.id, s);
    pushToast('success', `Factura ${invoiceNumberDisplay(inv)} marcada como ${STATUS_META[s].label.toLowerCase()}.`);
  };

  const rowActions = (inv: Invoice) => (
    <Menu
      trigger={
        <button
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label="Acciones"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <circle cx="5" cy="12" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="19" cy="12" r="1.7" />
          </svg>
        </button>
      }
      items={[
        { label: 'Vista previa', icon: <Eye className="h-4 w-4" />, onClick: () => openPreview(inv) },
        { label: 'Descargar PDF', icon: <Download className="h-4 w-4" />, onClick: () => downloadInvoicePdf(inv) },
        { label: '---' },
        ...(inv.status !== 'paid'
          ? [{ label: 'Marcar como cobrada', icon: <Check className="h-4 w-4" />, onClick: () => mark(inv, 'paid') }]
          : [{ label: 'Marcar como pendiente', icon: <Clock className="h-4 w-4" />, onClick: () => mark(inv, 'pending') }]),
        { label: '---' },
        { label: 'Eliminar', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setToDelete(inv) },
      ]}
    />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Facturas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Se crean a partir de un presupuesto aceptado · {filtered.length}{' '}
            {filtered.length === 1 ? 'factura' : 'facturas'}
          </p>
        </div>
        <Button variant="secondary" onClick={() => onNavigate({ name: 'quotes' })}>
          Ver presupuestos <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <Receipt className="h-3.5 w-3.5" /> Facturado
          </p>
          <p className="mt-1.5 truncate text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            {formatMoney(summary.facturado, settings.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Cobrado
          </p>
          <p className="mt-1.5 truncate text-lg font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatMoney(summary.cobrado, settings.currency)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <Wallet className="h-3.5 w-3.5" /> Pendiente
          </p>
          <p className="mt-1.5 truncate text-lg font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
            {formatMoney(summary.pendiente, settings.currency)}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="space-y-3 p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, número o título…"
            className="pl-10"
          />
          {search.trim() !== '' && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-200 p-0.5 text-slate-600 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatus(f.value)}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition-all',
                status === f.value
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Contenido */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt className="h-7 w-7" />}
            title={invoices.length === 0 ? 'Todavía no hay facturas' : 'Sin resultados para esos filtros'}
            description={
              invoices.length === 0
                ? 'Las facturas se crean desde un presupuesto aceptado. Aceptá un presupuesto y vas a poder facturarlo con un clic.'
                : 'Probá cambiar la búsqueda o el filtro.'
            }
            action={
              invoices.length === 0 ? (
                <Button onClick={() => onNavigate({ name: 'quotes' })}>
                  Ir a presupuestos <ArrowRight className="h-4 w-4" />
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          {/* Tabla escritorio */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-5 py-3">Factura</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Emitida</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Cobrado</th>
                  <th className="px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((inv) => {
                  const total = invoiceTotals(inv).total;
                  return (
                    <tr key={inv.id} className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-3.5" onClick={() => openPreview(inv)}>
                        <p className="font-bold text-slate-800 dark:text-slate-100">{invoiceNumberDisplay(inv)}</p>
                        <p className="text-xs text-slate-400">
                          {inv.title || 'Sin título'} · de {inv.quotePrefix}-{String(inv.quoteNumber).padStart(4, '0')}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700 dark:text-slate-200" onClick={() => openPreview(inv)}>
                        {inv.client.name || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{formatDate(inv.date)}</td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{formatDate(inv.dueDate)}</td>
                      <td className="px-4 py-3.5">
                        <InvoiceStatusBadge status={inv.status} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-800 dark:text-white">
                        {formatMoney(total, inv.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(inv.paidAmount, inv.currency)}
                      </td>
                      <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(inv)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Cards móvil */}
          <div className="space-y-3 md:hidden">
            {filtered.map((inv) => {
              const total = invoiceTotals(inv).total;
              return (
                <Card key={inv.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-slate-800 dark:text-white">
                          {invoiceNumberDisplay(inv)}
                        </p>
                        <InvoiceStatusBadge status={inv.status} size="sm" />
                      </div>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {inv.client.name || 'Sin cliente'}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {formatDate(inv.date)} · Vence {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                        {formatMoney(total, inv.currency)}
                      </p>
                      <span onClick={(e) => e.stopPropagation()}>{rowActions(inv)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {inv.title && <Badge color="indigo">{inv.title}</Badge>}
                    <Badge color={inv.status === 'paid' ? 'emerald' : 'amber'}>
                      {inv.status === 'paid'
                        ? `Cobrado ${formatMoney(inv.paidAmount, inv.currency)}`
                        : `Pendiente ${formatMoney(total, inv.currency)}`}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Vista previa */}
      <Modal
        open={!!preview}
        onClose={closePreview}
        title={`Vista previa · ${preview ? invoiceNumberDisplay(preview) : ''}`}
        wide
        footer={
          preview ? (
            <>
              <Button variant="secondary" onClick={() => printInvoicePdf(preview)}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button onClick={() => downloadInvoicePdf(preview)}>
                <Download className="h-4 w-4" /> Descargar PDF
              </Button>
            </>
          ) : undefined
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
        open={!!toDelete}
        title="Eliminar factura"
        message={`¿Seguro que querés eliminar la factura ${toDelete ? invoiceNumberDisplay(toDelete) : ''} de ${toDelete?.client.name || 'sin cliente'}? Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (toDelete) {
            deleteInvoice(toDelete.id);
            pushToast('success', 'Factura eliminada.');
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
