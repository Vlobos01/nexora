import { useMemo, useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FlaskConical,
  Plus,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { quoteTotals } from '../lib/calc';
import { formatDate, getEffectiveStatus } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { quoteNumberDisplay } from '../lib/id';
import { Badge, Button, Card, EmptyState, Input, StatCard, StatusBadge } from './ui';
import type { View } from '../types';

export default function Dashboard({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { quotes, settings } = useApp();
  const [search, setSearch] = useState('');
  const [demoDismissed, setDemoDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('demo-banner-dismissed');
    if (dismissed === 'true') {
      setDemoDismissed(true);
    }
  }, []);

  const stats = useMemo(() => {
    const byStatus = new Map<string, { count: number; total: number }>();
    for (const q of quotes) {
      const eff = getEffectiveStatus(q);
      const entry = byStatus.get(eff) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += quoteTotals(q).total;
      byStatus.set(eff, entry);
    }
    const totalBudgeted = [...byStatus.values()].reduce((s, e) => s + e.total, 0);
    const get = (k: string) => byStatus.get(k) ?? { count: 0, total: 0 };
    return { totalBudgeted, draft: get('draft'), sent: get('sent'), accepted: get('accepted'), rejected: get('rejected'), expired: get('expired') };
  }, [quotes]);

  const chart = useMemo(() => {
    const months: { label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const total = quotes
        .filter((q) => {
          const qd = new Date(`${q.date}T00:00:00`);
          return !Number.isNaN(qd.getTime()) && `${qd.getFullYear()}-${qd.getMonth()}` === key;
        })
        .reduce((s, q) => s + quoteTotals(q).total, 0);
      months.push({ label: d.toLocaleDateString('es-AR', { month: 'short' }), total });
    }
    return months;
  }, [quotes]);

  const recent = useMemo(
    () => [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [quotes],
  );

  const maxBar = Math.max(1, ...chart.map((m) => m.total));
  const hasChartData = chart.some((m) => m.total > 0);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-white shadow-xl shadow-indigo-600/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Dashboard
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-950 shadow-sm">
                <FlaskConical className="h-3.5 w-3.5" /> Demo
              </span>
            </span>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              ¡Hola, {settings.name || 'profesional'}! 👋
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-indigo-100">
              Creá un presupuesto profesional en minutos y enviáselo a tu cliente como PDF. Todo
              funciona sin conexión.
            </p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onNavigate({ name: 'new' })}
            className="shrink-0 border-0 bg-white !text-indigo-700 shadow-lg hover:bg-indigo-50 dark:!bg-slate-900 dark:!text-white dark:hover:!bg-slate-800"
          >
            <Plus className="h-5 w-5" />
            Nuevo presupuesto
          </Button>
        </div>
      </div>

      {/* Aviso demo + datos locales (ocultable) */}
      {!demoDismissed && (
        <div className="animate-fade flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3.5 sm:flex-row sm:items-center dark:border-amber-800/50 dark:bg-amber-500/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <FlaskConical className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold text-amber-900 dark:text-amber-200">
              Versión demo · Tus datos se guardan solo en este dispositivo
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-amber-800/80 dark:text-amber-200/70">
              Esto es una demostración de Nexora: presupuestos, clientes y configuración viven en el{' '}
              <strong>almacenamiento local de tu navegador</strong> y nunca se envían a internet. Si borrás los
              datos del navegador o usás otro dispositivo, no van a estar disponibles. Exportá una copia de
              seguridad desde Configuración para no perderlos.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-center">
            <button
              onClick={() => setDemoDismissed(true)}
              className="rounded-lg bg-amber-500/15 px-3.5 py-1.5 text-xs font-bold text-amber-800 transition hover:bg-amber-500/25 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30"
            >
              Entendido
            </button>
            <button
              onClick={() => {
                localStorage.setItem('demo-banner-dismissed', 'true');
                setDemoDismissed(true);
              }}
              className="rounded-lg bg-amber-600/20 px-3.5 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-600/30 dark:bg-amber-600/20 dark:text-amber-100 dark:hover:bg-amber-600/30"
            >
              No volver a mostrar
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total presupuestado"
          value={formatMoney(stats.totalBudgeted, settings.currency)}
          icon={<TrendingUp className="h-4.5 w-4.5" />}
          tone="indigo"
          sub={`${quotes.length} presup.`}
        />
        <StatCard
          label="Aceptados"
          value={String(stats.accepted.count)}
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          tone="emerald"
          sub={formatMoney(stats.accepted.total, settings.currency)}
        />
        <StatCard
          label="Enviados"
          value={String(stats.sent.count)}
          icon={<Send className="h-4.5 w-4.5" />}
          tone="sky"
        />
        <StatCard
          label="Borradores"
          value={String(stats.draft.count)}
          icon={<Clock className="h-4.5 w-4.5" />}
          tone="slate"
        />
        <StatCard
          label="Rechazados"
          value={String(stats.rejected.count)}
          icon={<XCircle className="h-4.5 w-4.5" />}
          tone="rose"
        />
        <StatCard
          label="Vencidos"
          value={String(stats.expired.count)}
          icon={<Clock className="h-4.5 w-4.5" />}
          tone="amber"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Facturación por mes</h3>
              <p className="text-xs text-slate-400">Últimos 6 meses (fecha de emisión)</p>
            </div>
            <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
          </div>
          {hasChartData ? (
            <div className="flex h-44 items-end gap-2 px-5 py-4">
              {chart.map((m, i) => (
                <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 opacity-0 transition group-hover:opacity-100 dark:text-slate-500">
                    {formatMoney(m.total, settings.currency)}
                  </span>
                  <div className="flex h-28 w-full items-end">
                    <div
                      title={formatMoney(m.total, settings.currency)}
                      className="animate-bar w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-violet-500 transition-all group-hover:brightness-110"
                      style={{ height: `${Math.max(4, (m.total / maxBar) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold capitalize text-slate-400">{m.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              Todavía no hay presupuestos en estos meses. Creá el primero 🚀
            </p>
          )}
        </Card>

        {/* Recientes */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Presupuestos recientes</h3>
              <p className="text-xs text-slate-400">Los últimos que creaste</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate({ name: 'quotes' })}>
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-7 w-7" />}
              title="Sin presupuestos todavía"
              description="Creá tu primer presupuesto y aparecerá acá."
              action={
                <Button onClick={() => onNavigate({ name: 'new' })}>
                  <Plus className="h-4 w-4" /> Crear presupuesto
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recent.map((q) => (
                <li key={q.id}>
                  <button
                    onClick={() => onNavigate({ name: 'detail', id: q.id })}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <FileText className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                          {q.client.name || 'Sin cliente'}
                        </span>
                        <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                          {quoteNumberDisplay(q)}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-slate-400">
                        {q.title || 'Sin título'} · {formatDate(q.date)}
                      </span>
                    </span>
                    <StatusBadge status={q.status} size="sm" />
                    <span className="hidden w-28 text-right text-sm font-extrabold text-slate-800 dark:text-white sm:block">
                      {formatMoney(quoteTotals(q).total, q.currency)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Buscador rápido */}
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  onNavigate({ name: 'quotes', search: search.trim() });
                }
              }}
              placeholder="Buscar por cliente, número o título… (Enter)"
              className="pl-10"
            />
          </div>
          <Button variant="secondary" onClick={() => onNavigate({ name: 'quotes', search: search.trim() })}>
            Buscar
          </Button>
          <div className="flex flex-wrap gap-1.5">
            <Badge color="indigo">Borrador {stats.draft.count}</Badge>
            <Badge color="sky">Enviado {stats.sent.count}</Badge>
            <Badge color="emerald">Aceptado {stats.accepted.count}</Badge>
            <Badge color="rose">Rechazado {stats.rejected.count}</Badge>
            <Badge color="amber">Vencido {stats.expired.count}</Badge>
          </div>
        </div>
      </Card>

    </div>
  );
}
