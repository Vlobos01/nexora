import { useMemo, useState } from 'react';
import { FileSpreadsheet, Package, Pencil, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { lineNet } from '../lib/calc';
import { formatMoney } from '../lib/money';
import { exportProductsCsv } from '../lib/csv';
import { Button, Card, ConfirmDialog, Field, Input, Modal } from './ui';
import type { ProductEntry, ProductInfo } from '../types';
import { emptyProduct } from '../types';

export default function Products() {
  const { products, quotes, settings, addProduct, updateProduct, deleteProduct, pushToast } =
    useApp();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: ProductEntry | null }>({
    open: false,
    editing: null,
  });
  const [form, setForm] = useState<ProductInfo>(emptyProduct());
  const [toDelete, setToDelete] = useState<ProductEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name} ${p.unit} ${p.description}`.toLowerCase().includes(q),
    );
  }, [products, search]);

  // Uso de cada producto en presupuestos (por descripción del concepto, como se reutilizan)
  const stats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const q of quotes) {
      const seen = new Set<string>();
      for (const it of q.items) {
        const key = it.description.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const e = map.get(key) ?? { count: 0, total: 0 };
        e.count += 1;
        e.total += lineNet(it);
        map.set(key, e);
      }
    }
    return map;
  }, [quotes]);

  const totalRevenue = filtered.reduce(
    (s, p) => s + (stats.get(p.name.trim().toLowerCase())?.total ?? 0),
    0,
  );

  const openModal = (entry: ProductEntry | null) => {
    setForm(entry ? { ...entry } : emptyProduct());
    setModal({ open: true, editing: entry });
  };

  const setField = (patch: Partial<ProductInfo>) => setForm((f) => ({ ...f, ...patch }));

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    exportProductsCsv(filtered);
    pushToast(
      'success',
      `Se exportaron ${filtered.length} ${filtered.length === 1 ? 'producto' : 'productos'} a CSV.`,
    );
  };

  const saveForm = () => {
    if (!form.name.trim()) {
      pushToast('error', 'Ingresá el nombre del producto o servicio.');
      return;
    }
    const newName = form.name.trim();
    if (modal.editing) {
      const collision = products.find(
        (p) => p.id !== modal.editing!.id && p.name.trim().toLowerCase() === newName.toLowerCase(),
      );
      if (collision) {
        pushToast('error', `Ya existe un producto llamado "${collision.name}". Usá otro nombre.`);
        return;
      }
      updateProduct(modal.editing.id, { ...form, name: newName });
      pushToast('success', 'Producto actualizado en el catálogo.');
    } else {
      const outcome = addProduct(form);
      pushToast(
        'success',
        outcome === 'added'
          ? 'Producto agregado al catálogo.'
          : 'El producto ya existía: se actualizaron sus datos.',
      );
    }
    setModal({ open: false, editing: null });
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Productos y servicios
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {products.length}{' '}
            {products.length === 1 ? 'producto en el catálogo' : 'productos en el catálogo'}
            {products.length > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatMoney(totalRevenue, settings.currency)}
                </span>
                {' facturados en presupuestos'}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            title="Exportar a CSV/Excel los productos que estás viendo"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={() => openModal(null)}>
            <Plus className="h-4 w-4" /> Agregar producto
          </Button>
        </div>
      </div>

      {/* Buscador */}
      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, unidad o descripción…"
            className="pl-9"
          />
        </div>
      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="animate-pop mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-500 dark:text-emerald-400">
              <Package className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {search.trim() ? 'Sin productos para esa búsqueda' : 'Todavía no hay productos en el catálogo'}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {search.trim()
                ? 'Probá con otro término.'
                : 'Agregá tus productos y servicios con su precio para reutilizarlos al crear presupuestos.'}
            </p>
            {!search.trim() && (
              <Button className="mt-5" onClick={() => openModal(null)}>
                <Plus className="h-4 w-4" /> Agregar producto
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((p) => {
              const st = stats.get(p.name.trim().toLowerCase());
              return (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Package className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                      {p.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {p.unit
                        ? `${formatMoney(p.unitPrice, settings.currency)} / ${p.unit}`
                        : formatMoney(p.unitPrice, settings.currency)}
                      {p.description ? ` · ${p.description}` : ''}
                    </p>
                  </div>
                  {st && (
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                        {formatMoney(st.total, settings.currency)}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400">
                        {st.count} {st.count === 1 ? 'presupuesto' : 'presupuestos'}
                      </p>
                    </div>
                  )}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openModal(p)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                      aria-label={`Editar ${p.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(p)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      aria-label={`Eliminar ${p.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <p className="text-xs text-slate-400">
        Los productos guardados se sugieren automáticamente al cargar conceptos en un presupuesto.
      </p>

      {/* Modal agregar/editar */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Editar producto' : 'Nuevo producto'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, editing: null })}>
              Cancelar
            </Button>
            <Button onClick={saveForm}>
              <Save className="h-4 w-4" />
              {modal.editing ? 'Guardar cambios' : 'Guardar producto'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setField({ name: e.target.value })}
              placeholder="Ej: Diseño UI/UX de landing page"
            />
          </Field>
          <Field label="Precio unitario *">
            <Input
              type="number"
              min={0}
              step="any"
              value={form.unitPrice}
              onChange={(e) => setField({ unitPrice: Number(e.target.value) || 0 })}
              placeholder="0"
            />
          </Field>
          <Field label="Unidad" hint="Opcional: hora, m², día, unidad…">
            <Input
              value={form.unit}
              onChange={(e) => setField({ unit: e.target.value })}
              placeholder="Ej: hora"
            />
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Input
              value={form.description}
              onChange={(e) => setField({ description: e.target.value })}
              placeholder="Detalle breve que verás al buscarlo…"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar producto"
        message={`¿Seguro que querés eliminar ${toDelete?.name} del catálogo? No se modifican los presupuestos ya creados.`}
        onConfirm={() => {
          if (toDelete) {
            deleteProduct(toDelete.id);
            pushToast('success', 'Producto eliminado del catálogo.');
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
