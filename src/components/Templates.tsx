import { useState } from 'react';
import { ArrowRight, LayoutTemplate, Layers, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { quoteTotals } from '../lib/calc';
import { formatMoney } from '../lib/money';
import { Button, Card, ConfirmDialog, EmptyState } from './ui';
import type { Quote, View } from '../types';

export default function Templates({ onNavigate }: { onNavigate: (v: View) => void }) {
  const { templates, deleteTemplate, pushToast } = useApp();
  const [toDelete, setToDelete] = useState<Quote | null>(null);

  const useTemplate = (tpl: Quote) => {
    onNavigate({ name: 'new', fromTemplateId: tpl.id });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Plantillas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reutilizá presupuestos habituales con sus servicios y precios.
          </p>
        </div>
        <Button onClick={() => onNavigate({ name: 'new' })}>
          <Plus className="h-4 w-4" /> Crear presupuesto y guardarlo como plantilla
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<LayoutTemplate className="h-7 w-7" />}
            title="Todavía no hay plantillas"
            description='Creá un presupuesto y activá la opción "Guardar también como plantilla", o guardá uno existente desde su detalle.'
            action={
              <Button onClick={() => onNavigate({ name: 'new' })}>
                <Plus className="h-4 w-4" /> Nuevo presupuesto
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => {
            const totals = quoteTotals(tpl);
            return (
              <Card
                key={tpl.id}
                className="group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-white">
                      {tpl.templateName || tpl.title || 'Plantilla'}
                    </p>
                    <p className="mt-0.5 text-xs text-indigo-200">
                      {tpl.title || 'Presupuesto tipo'} · {tpl.items.length} conceptos
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                    <LayoutTemplate className="h-4.5 w-4.5" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Incluye
                  </p>
                  <ul className="mt-2 flex-1 space-y-1.5">
                    {tpl.items.slice(0, 4).map((it) => (
                      <li key={it.id} className="flex items-start gap-2 text-[13px] text-slate-600 dark:text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                        <span className="line-clamp-1">{it.description}</span>
                      </li>
                    ))}
                    {tpl.items.length > 4 && (
                      <li className="pl-3.5 text-xs font-semibold text-slate-400">
                        +{tpl.items.length - 4} conceptos más
                      </li>
                    )}
                  </ul>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
                    <div>
                      <p className="text-[11px] text-slate-400">Total estimado</p>
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                        {formatMoney(totals.total, tpl.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setToDelete(tpl)}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                        aria-label="Eliminar plantilla"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Button size="sm" onClick={() => useTemplate(tpl)}>
                        <Layers className="h-3.5 w-3.5" /> Usar
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar plantilla"
        message={`¿Seguro que querés eliminar la plantilla "${toDelete?.templateName || toDelete?.title}"? No se eliminan los presupuestos creados con ella.`}
        onConfirm={() => {
          if (toDelete) {
            deleteTemplate(toDelete.id);
            pushToast('success', 'Plantilla eliminada.');
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
