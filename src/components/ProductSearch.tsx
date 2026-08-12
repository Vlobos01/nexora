import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { ChevronDown, Package } from 'lucide-react';
import type { ProductEntry } from '../types';
import { formatMoney } from '../lib/money';
import { cn, inputClass } from './ui';

/**
 * Combobox de búsqueda de productos/servicios: filtra por nombre, unidad o
 * descripción y al seleccionar completa la descripción y el precio unitario.
 */
export default function ProductSearch({
  suggestions,
  currency,
  value,
  onValueChange,
  onSelect,
  className,
  placeholder = 'Buscar o escribir producto/servicio…',
}: {
  suggestions: ProductEntry[];
  currency: string;
  value: string;
  onValueChange: (v: string) => void;
  onSelect: (product: ProductEntry) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const query = value.trim().toLowerCase();

  const matches = useMemo(() => {
    const list = query
      ? suggestions.filter((p) =>
          `${p.name} ${p.unit} ${p.description}`.toLowerCase().includes(query),
        )
      : suggestions;
    return list.slice(0, 8);
  }, [suggestions, query]);

  // Cerrar al hacer clic/tocar fuera o con Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => setHighlight(0), [query]);

  const select = (p: ProductEntry) => {
    onSelect(p);
    setOpen(false);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && matches.length > 0) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => (h + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const m = matches[highlight];
      if (m) select(m);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <Package className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          open && matches[highlight] ? `${listboxId}-opt-${highlight}` : undefined
        }
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn(inputClass, 'pl-9 pr-8', className)}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="animate-pop absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          {matches.length === 0 ? (
            <li className="flex items-center gap-2 px-3.5 py-3 text-xs text-slate-400">
              <Package className="h-4 w-4 shrink-0" />
              Sin coincidencias. Escribí para cargar un concepto nuevo.
            </li>
          ) : (
            matches.map((p, i) => (
              <li
                key={p.id}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(p)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors',
                  i === highlight && 'bg-indigo-50 dark:bg-slate-700/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    i === highlight
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
                  )}
                >
                  <Package className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {p.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {formatMoney(p.unitPrice, currency)}
                    {p.unit ? ` / ${p.unit}` : ''}
                    {p.description ? ` · ${p.description}` : ''}
                  </span>
                </span>
                {p.name.trim().toLowerCase() === query && (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    Coincide
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
