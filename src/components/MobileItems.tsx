import { useState } from 'react';
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from 'lucide-react';
import { lineNet, toNumber } from '../lib/calc';
import { formatMoney } from '../lib/money';
import { uid } from '../lib/id';
import { Button, Input, cn } from './ui';
import ProductSearch from './ProductSearch';
import type { LineItem, ProductEntry } from '../types';
import { emptyItem } from '../types';

interface MobileItemsProps {
  items: LineItem[];
  setItems: React.Dispatch<React.SetStateAction<LineItem[]>>;
  knownProducts: ProductEntry[];
  currency: string;
}

export default function MobileItems({ items, setItems, knownProducts, currency }: MobileItemsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const setItem = (id: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    const newItem = { ...emptyItem(), id: uid() };
    setItems((prev) => [...prev, newItem]);
    setExpandedId(newItem.id);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        // Dejar un ítem vacío en vez de no borrar
        return [{ ...emptyItem(), id: uid() }];
      }
      return prev.filter((it) => it.id !== id);
    });
    setExpandedId(null);
  };

  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const moved = next[idx];
      next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const isExpanded = expandedId === item.id;
        const subtotal = lineNet(item);
        const hasData = item.description.trim() || item.quantity > 0;

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-xl border transition-all',
              isExpanded
                ? 'border-indigo-300 bg-white shadow-md dark:border-indigo-700 dark:bg-slate-900'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
            )}
          >
            {/* Compact view — always visible */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              className="flex w-full items-center gap-2 p-3 text-left"
            >
              {/* Index / reorder */}
              <div className="flex shrink-0 flex-col items-center">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveItem(idx, -1); }}
                  disabled={idx === 0}
                  className="flex h-4 w-4 items-center justify-center rounded text-slate-300 hover:text-indigo-600 disabled:opacity-25"
                  aria-label="Mover arriba"
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <span className="text-[11px] font-bold text-slate-400">{idx + 1}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); moveItem(idx, 1); }}
                  disabled={idx === items.length - 1}
                  className="flex h-4 w-4 items-center justify-center rounded text-slate-300 hover:text-indigo-600 disabled:opacity-25"
                  aria-label="Mover abajo"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {/* Description + quantity x price */}
              <div className="min-w-0 flex-1">
                <p className={cn(
                  'truncate text-sm font-semibold',
                  hasData ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500',
                )}>
                  {item.description || `Concepto ${idx + 1}`}
                </p>
                {hasData && (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {item.quantity || 0} × {formatMoney(item.unitPrice || 0, currency)}
                  </p>
                )}
              </div>

              {/* Subtotal */}
              <span className="shrink-0 text-sm font-extrabold text-slate-800 dark:text-white">
                {hasData ? formatMoney(subtotal, currency) : '—'}
              </span>

              {/* Delete button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                aria-label="Eliminar concepto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              {/* Expand indicator */}
              <ChevronDown className={cn(
                'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                isExpanded && 'rotate-180',
              )} />
            </button>

            {/* Expanded view — editing fields */}
            {isExpanded && (
              <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-3 dark:border-slate-700">
                {/* Description */}
                <div>
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Producto / Servicio</span>
                  <ProductSearch
                    suggestions={knownProducts}
                    currency={currency}
                    value={item.description}
                    onValueChange={(v) => setItem(item.id, { description: v })}
                    onSelect={(p) => setItem(item.id, { description: p.name, unitPrice: p.unitPrice })}
                    placeholder="Escribí o buscá un producto…"
                    className="w-full"
                  />
                </div>

                {/* Quantity + Price row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Cantidad</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setItem(item.id, { quantity: Math.max(0, (item.quantity || 1) - 1) })}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition active:scale-95 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={item.quantity || ''}
                        onChange={(e) => setItem(item.id, { quantity: toNumber(e.target.value, 0) })}
                        className="h-10 flex-1 text-center text-base font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setItem(item.id, { quantity: (item.quantity || 0) + 1 })}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition active:scale-95 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/30"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Precio unitario</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.unitPrice || ''}
                      onChange={(e) => setItem(item.id, { unitPrice: toNumber(e.target.value, 0) })}
                      className="h-10 text-center text-base font-bold"
                    />
                  </div>
                </div>

                {/* Discount + Delete row */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Descuento %</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={item.discountPct || ''}
                      onChange={(e) => setItem(item.id, { discountPct: toNumber(e.target.value, 0) })}
                      className="h-10 text-center text-base"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="h-10 w-10 shrink-0 text-slate-400 hover:text-rose-500"
                    aria-label="Eliminar concepto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add button */}
      <button
        onClick={addItem}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3.5 text-sm font-semibold text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5 dark:hover:text-indigo-400"
      >
        <Plus className="h-4 w-4" /> Agregar concepto
      </button>
    </div>
  );
}
