import { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  ListFilter,
  Pencil,
  Plus,
  Send,
  Trash2,
  TrendingUp,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { computeTotals, paymentsTotal, quoteTotals } from '../lib/calc';
import { formatDate, getEffectiveStatus, isOverdue } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { quoteNumberDisplay } from '../lib/id';
import { downloadQuotePdf } from '../lib/pdf';
import { RegisterPaymentModal } from './PaymentModals';
import { exportQuotesCsv } from '../lib/csv';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Menu, Select, StatusBadge, cn } from './ui';
import ClientSearch from './ClientSearch';
import type { Quote, QuoteStatus, View } from '../types';

type StatusFilter = 'all' | QuoteStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: 'Borradores' },
  { value: 'sent', label: 'Enviados' },
  { value: 'accepted', label: 'Aceptados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'expired', label: 'Vencidos' },
];

type SortKey = 'date_desc' | 'date_asc' | 'total_desc' | 'number_desc';

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador' },
  { value: 'sent', label: 'Enviado' },
  { value: 'accepted', label: 'Aceptado' },
  { value: 'rejected', label: 'Rechazado' },
];

export default function QuoteList({
  onNavigate,
  initialSearch = '',
}: {
  onNavigate: (v: View) => void;
  initialSearch?: string;
}) {
  const {
    quotes,
    settings,
    knownClients,
    setQuoteStatus,
    duplicateQuote,
    deleteQuote,
    registerPayment,
    pushToast,
  } = useApp();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [toDelete, setToDelete] = useState<Quote | null>(null);
  const [toPay, setToPay] = useState<Quote | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = quotes.filter((item) => {
      const eff = getEffectiveStatus(item);
      if (status !== 'all' && eff !== status) return false;
      if (q) {
        // Busca por cliente, número, documento o título en un único campo
        const hay = `${item.client.name} ${quoteNumberDisplay(item)} ${item.title} ${item.client.document}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (from && item.date < from) return false;
      if (to && item.date > to) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'date_asc':
          return a.date.localeCompare(b.date);
        case 'total_desc':
          return quoteTotals(b).total - quoteTotals(a).total;
        case 'number_desc':
          return b.number - a.number;
        default:
          return b.date.localeCompare(a.date);
      }
    });
    return list;
  }, [quotes, search, status, from, to, sort]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, q) => s + quoteTotals(q).total, 0),
    [filtered],
  );

  const filteredPaid = useMemo(
    () => filtered.reduce((s, q) => s + (q.paidAmount || 0), 0),
    [filtered],
  );

  const filteredPending = useMemo(
    () => {
      return filtered.reduce((s, q) => {
        const total = quoteTotals(q).total;
        const paid = q.paidAmount || 0;
        return s + Math.max(0, total - paid);
      }, 0);
    },
    [filtered],
  );

  const hasFilters = search.trim() !== '' || status !== 'all' || from || to;

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    exportQuotesCsv(filtered);
    pushToast('success', `Se exportaron ${filtered.length} ${filtered.length === 1 ? 'presupuesto' : 'presupuestos'} a CSV.`);
  };

  const rowActions = (q: Quote) => {
    const markStatus = (s: QuoteStatus) => {
      setQuoteStatus(q.id, s);
      pushToast('success', `Presupuesto ${quoteNumberDisplay(q)} marcado como ${STATUS_OPTIONS.find((o) => o.value === s)?.label.toLowerCase() ?? s}.`);
    };
    const eff = getEffectiveStatus(q);
    const total = computeTotals(q.items, q.discountPct, q.ivaPct).total;
    const paid = paymentsTotal(q.payments);
    const remaining = Math.max(0, total - paid);
    const canPay = (eff === 'accepted' || eff === 'partial') && remaining > 0;

    const markAsPaid = () => {
      if (remaining > 0) {
        registerPayment(q.id, remaining);
        pushToast('success', `Presupuesto ${quoteNumberDisplay(q)} marcado como pagado.`);
      }
    };

    return (
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
          { label: 'Ver detalle', icon: <Eye className="h-4 w-4" />, onClick: () => onNavigate({ name: 'detail', id: q.id }) },
          { label: 'Editar', icon: <Pencil className="h-4 w-4" />, onClick: () => onNavigate({ name: 'edit', id: q.id }) },
          { label: 'Duplicar', icon: <Copy className="h-4 w-4" />, onClick: () => duplicateQuote(q.id) },
          { label: 'Descargar PDF', icon: <Download className="h-4 w-4" />, onClick: () => downloadQuotePdf(q) },
          ...(canPay
            ? [
                { label: '---' },
                { label: `Registrar cobro (${formatMoney(remaining, q.currency)} pendiente)`, icon: <Wallet className="h-4 w-4" />, onClick: () => setToPay(q) },
                { label: 'Marcar como pagado', icon: <CheckCircle2 className="h-4 w-4" />, onClick: markAsPaid },
              ]
            : []),
          { label: '---' },
          { label: 'Marcar como Borrador', icon: <Clock className="h-4 w-4" />, onClick: () => markStatus('draft') },
          { label: 'Marcar como Enviado', icon: <Send className="h-4 w-4" />, onClick: () => markStatus('sent') },
          { label: 'Marcar como Aceptado', icon: <Check className="h-4 w-4" />, onClick: () => markStatus('accepted') },
          { label: 'Marcar como Rechazado', icon: <XCircle className="h-4 w-4" />, onClick: () => markStatus('rejected') },
          { label: '---' },
          { label: 'Eliminar', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: () => setToDelete(q) },
        ]}
      />
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Presupuestos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            title="Exportar a CSV/Excel los presupuestos que estás viendo (según filtros)"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={() => onNavigate({ name: 'new' })}>
            <Plus className="h-4 w-4" /> Nuevo presupuesto
          </Button>
        </div>
      </div>

      {/* Banner resumen */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</p>
              <p className="text-lg font-extrabold text-slate-900 dark:text-white">
                {formatMoney(filteredTotal, settings.currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Cobrado</p>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatMoney(filteredPaid, settings.currency)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pendiente</p>
              <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                {formatMoney(filteredPending, settings.currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <ClientSearch
              suggestions={knownClients}
              name={search}
              onNameChange={setSearch}
              onSelect={(c) => setSearch(c.name)}
              placeholder="Buscar por cliente, número, documento o título…"
              className="w-full"
            />
            {search.trim() !== '' && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-slate-200 p-0.5 text-slate-600 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="w-auto min-w-[180px]">
              <option value="date_desc">Fecha ↓ más reciente</option>
              <option value="date_asc">Fecha ↑ más antigua</option>
              <option value="total_desc">Total ↓ mayor</option>
              <option value="number_desc">Número ↓</option>
            </Select>
            <div className="flex items-center gap-1.5">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" aria-label="Desde" />
              <span className="text-xs text-slate-400">→</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" aria-label="Hasta" />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatus('all');
                  setFrom('');
                  setTo('');
                }}
              >
                <X className="h-3.5 w-3.5" /> Limpiar
              </Button>
            )}
          </div>
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
            icon={hasFilters ? <ListFilter className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
            title={hasFilters ? 'Sin resultados para esos filtros' : 'Todavía no hay presupuestos'}
            description={
              hasFilters
                ? 'Probá cambiar la búsqueda o los filtros.'
                : 'Creá tu primer presupuesto: se guardará automáticamente en este dispositivo.'
            }
            action={
              !hasFilters ? (
                <Button onClick={() => onNavigate({ name: 'new' })}>
                  <Plus className="h-4 w-4" /> Crear presupuesto
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
                  <th className="px-5 py-3">Presupuesto</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Vence</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-3 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((q) => {
                  const eff = getEffectiveStatus(q);
                  return (
                    <tr
                      key={q.id}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => onNavigate({ name: 'detail', id: q.id })}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{quoteNumberDisplay(q)}</p>
                        <p className="text-xs text-slate-400">{q.title || 'Sin título'}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-700 dark:text-slate-200">{q.client.name || '—'}</p>
                        {q.client.document && <p className="text-xs text-slate-400">{q.client.document}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">{formatDate(q.date)}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn('text-slate-500 dark:text-slate-400', eff === 'expired' && 'font-bold text-amber-600 dark:text-amber-400')}>
                          {formatDate(q.expiryDate)}
                          {isOverdue(q.expiryDate) && q.status !== 'rejected' && ' ⚠'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={eff} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-800 dark:text-white">
                        {formatMoney(quoteTotals(q).total, q.currency)}
                      </td>
                      <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(q)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Cards móvil */}
          <div className="space-y-3 md:hidden">
            {filtered.map((q) => {
              const eff = getEffectiveStatus(q);
              return (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-slate-800 dark:text-white">
                          {quoteNumberDisplay(q)}
                        </p>
                        <StatusBadge status={eff} size="sm" />
                      </div>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {q.client.name || 'Sin cliente'}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {formatDate(q.date)} · Vence {formatDate(q.expiryDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                        {formatMoney(quoteTotals(q).total, q.currency)}
                      </p>
                      <span onClick={(e) => e.stopPropagation()}>{rowActions(q)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge color="indigo">{q.title || 'Sin título'}</Badge>
                    {q.client.document && <Badge color="slate">{q.client.document}</Badge>}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar presupuesto"
        message={`¿Seguro que querés eliminar el presupuesto ${toDelete ? quoteNumberDisplay(toDelete) : ''} de ${toDelete?.client.name || 'sin cliente'}? Esta acción no se puede deshacer.`}
        onConfirm={() => {
          if (toDelete) {
            deleteQuote(toDelete.id);
            pushToast('success', 'Presupuesto eliminado.');
          }
        }}
        onCancel={() => setToDelete(null)}
      />

      {toPay && (
        <RegisterPaymentModal quote={toPay} open={!!toPay} onClose={() => setToPay(null)} />
      )}
    </div>
  );
}
