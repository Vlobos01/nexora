import { useMemo, useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { toNumber } from '../lib/calc';
import { formatMoney } from '../lib/money';
import { uid } from '../lib/id';
import { Button, Input, Modal } from './ui';
import type { LineItem, ProductEntry } from '../types';
import { emptyItem } from '../types';

interface Props {
  products: ProductEntry[];
  currency: string;
  onAddItem: (item: LineItem) => void;
}

export default function ProductCatalogPicker({ products, currency, onAddItem }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProductEntry | null>(null);
  const [qty, setQty] = useState<number | ''>(1);
  const [price, setPrice] = useState(0);
  const [discount, setDiscount] = useState<number | ''>(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q),
    );
  }, [products, search]);

  const openModal = (product: ProductEntry) => {
    setSelected(product);
    setQty('');
    setPrice(product.unitPrice);
    setDiscount('');
  };

  const handleConfirm = () => {
    if (!selected) return;
    const item: LineItem = {
      ...emptyItem(),
      id: uid(),
      description: selected.name,
      quantity: Math.max(1, toNumber(qty, 1)),
      unitPrice: Math.max(0, toNumber(price, selected.unitPrice)),
      discountPct: Math.min(100, Math.max(0, toNumber(discount, 0))),
      image: selected.image,
    };
    onAddItem(item);
    setSelected(null);
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
        <Package className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-semibold text-slate-400">No hay productos cargados</p>
        <p className="mt-1 text-xs text-slate-400">Agregá productos desde la sección Productos</p>
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
        />
      </div>

      {/* Product grid */}
      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-400">No se encontraron productos</p>
        )}
        {filtered.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => openModal(product)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600 dark:hover:bg-indigo-500/5"
          >
            {/* Image or icon */}
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Package className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {product.name}
              </p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                {product.unit || 'unidad'}
                {product.description ? ` · ${product.description}` : ''}
              </p>
            </div>

            {/* Price + add icon */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                {formatMoney(product.unitPrice, currency)}
              </span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Plus className="h-3 w-3" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Quick-add modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSelected(null)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-4">
            {/* Product info */}
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              {selected.image ? (
                <img src={selected.image} alt={selected.name} className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                  <Package className="h-6 w-6 text-slate-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selected.name}</p>
                {selected.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selected.description}</p>
                )}
                <p className="text-xs text-slate-400">{selected.unit || 'unidad'}</p>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Cantidad
              </label>
              <Input
                type="number"
                min={1}
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value === '' ? '' : toNumber(e.target.value, 1))}
                className="h-11 text-center text-lg font-bold"
              />
            </div>

            {/* Price */}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Precio unitario
              </label>
              <Input
                type="number"
                min={0}
                step="any"
                value={price}
                onChange={(e) => setPrice(toNumber(e.target.value, 0))}
                className="h-11 text-center text-lg font-bold"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Descuento %
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : toNumber(e.target.value, 0))}
                className="h-11 text-center text-lg"
              />
            </div>

            {/* Subtotal preview */}
            <div className="rounded-xl bg-indigo-50 p-3 text-center dark:bg-indigo-500/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Subtotal</p>
              <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {formatMoney(
                  (qty || 0) * (price || 0) * (1 - (discount || 0) / 100),
                  currency,
                )}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
