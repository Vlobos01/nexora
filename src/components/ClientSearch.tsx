import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Search, UserRound } from 'lucide-react';
import type { ClientInfo } from '../types';
import { cn, initials, inputClass } from './ui';

/**
 * Combobox de búsqueda de clientes: filtra por nombre, documento, email o
 * teléfono y al seleccionar completa todos los datos del cliente.
 */
export default function ClientSearch({
  suggestions,
  name,
  onNameChange,
  onSelect,
  className,
  placeholder = 'Buscar o escribir nombre del cliente…',
}: {
  suggestions: ClientInfo[];
  name: string;
  onNameChange: (name: string) => void;
  onSelect: (client: ClientInfo) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const query = name.trim().toLowerCase();

  const matches = useMemo(() => {
    const list = query
      ? suggestions.filter((c) =>
          `${c.name} ${c.document} ${c.email} ${c.phone}`.toLowerCase().includes(query),
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

  const select = (c: ClientInfo) => {
    onSelect(c);
    setOpen(false);
  };

  // Al salir del campo: si el nombre escrito coincide exactamente con un cliente
  // conocido, se completan sus datos (comportamiento del autocompletado clásico).
  const onBlur = () => {
    if (!query) return;
    const exact = suggestions.find((c) => c.name.trim().toLowerCase() === query);
    if (exact) select(exact);
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
    <div ref={rootRef} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          open && matches[highlight] ? `${listboxId}-opt-${highlight}` : undefined
        }
        value={name}
        onChange={(e) => {
          onNameChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn(inputClass, 'pl-9 pr-8')}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="animate-pop absolute z-50 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          {matches.length === 0 ? (
            <li className="flex items-center gap-2 px-3.5 py-3 text-xs text-slate-400">
              <UserRound className="h-4 w-4 shrink-0" />
              Sin coincidencias. Escribí el nombre para cargar un cliente nuevo.
            </li>
          ) : (
            matches.map((c, i) => (
              <li
                key={`${c.name}-${i}`}
                id={`${listboxId}-opt-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(c)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors',
                  i === highlight && 'bg-indigo-50 dark:bg-slate-700/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold',
                    i === highlight
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
                  )}
                >
                  {initials(c.name) || '?'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {c.name}
                  </span>
                  <span className="block truncate text-xs text-slate-400">
                    {c.document || c.email || c.phone || 'Sin contacto registrado'}
                  </span>
                </span>
                {c.name.trim().toLowerCase() === query && (
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
