import { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { quoteTotals } from '../lib/calc';
import { formatMoney } from '../lib/money';
import { exportClientsCsv } from '../lib/csv';
import { Button, Card, ConfirmDialog, Field, Input, Modal, initials } from './ui';
import type { ClientEntry, ClientInfo } from '../types';
import { emptyClient } from '../types';

export default function Clients({ openModal }: { openModal?: boolean }) {
  const { clients, quotes, settings, addClient, updateClient, deleteClient, pushToast } = useApp();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: ClientEntry | null }>({
    open: false,
    editing: null,
  });
  const [form, setForm] = useState<ClientInfo>(emptyClient());
  const [toDelete, setToDelete] = useState<ClientEntry | null>(null);

  // Abrir modal automáticamente si se solicita desde el asistente
  useEffect(() => {
    if (openModal) {
      setForm(emptyClient());
      setModal({ open: true, editing: null });
    }
  }, [openModal]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      `${c.name} ${c.document} ${c.email} ${c.phone}`.toLowerCase().includes(q),
    );
  }, [clients, search]);

  // Presupuestos por cliente (por nombre, como se reutilizan en el formulario)
  const stats = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const q of quotes) {
      const key = q.client.name.trim().toLowerCase();
      if (!key) continue;
      const e = map.get(key) ?? { count: 0, total: 0 };
      e.count += 1;
      e.total += quoteTotals(q).total;
      map.set(key, e);
    }
    return map;
  }, [quotes]);

  const totalBudgeted = filtered.reduce(
    (s, c) => s + (stats.get(c.name.trim().toLowerCase())?.total ?? 0),
    0,
  );
  const totalQuotes = filtered.reduce(
    (s, c) => s + (stats.get(c.name.trim().toLowerCase())?.count ?? 0),
    0,
  );

  const openModalFn = (entry: ClientEntry | null) => {
    setForm(entry ? { ...entry } : emptyClient());
    setModal({ open: true, editing: entry });
  };

  const setField = (patch: Partial<ClientInfo>) => setForm((f) => ({ ...f, ...patch }));

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    exportClientsCsv(filtered);
    pushToast('success', `Se exportaron ${filtered.length} ${filtered.length === 1 ? 'cliente' : 'clientes'} a CSV.`);
  };

  const saveForm = () => {
    if (!form.name.trim()) {
      pushToast('error', 'Ingresá el nombre del cliente.');
      return;
    }
    const newName = form.name.trim();
    if (modal.editing) {
      const collision = clients.find(
        (c) =>
          c.id !== modal.editing!.id &&
          c.name.trim().toLowerCase() === newName.toLowerCase(),
      );
      if (collision) {
        pushToast('error', `Ya existe un cliente llamado "${collision.name}". Usá otro nombre.`);
        return;
      }
      updateClient(modal.editing.id, { ...form, name: newName });
      pushToast('success', 'Cliente actualizado en la libreta.');
    } else {
      const outcome = addClient(form);
      pushToast(
        'success',
        outcome === 'added'
          ? 'Cliente agregado a la libreta.'
          : 'El cliente ya existía: se actualizaron sus datos.',
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
            Clientes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {clients.length} {clients.length === 1 ? 'cliente en la libreta' : 'clientes en la libreta'}
            {clients.length > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {formatMoney(totalBudgeted, settings.currency)}
                </span>
                {' en '}
                {totalQuotes} {totalQuotes === 1 ? 'presupuesto' : 'presupuestos'}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            title="Exportar a CSV/Excel los clientes que estás viendo"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
          </Button>
          <Button onClick={() => openModalFn(null)}>
            <Plus className="h-4 w-4" /> Agregar cliente
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
            placeholder="Buscar por nombre, documento, email o teléfono…"
            className="pl-9"
          />
        </div>
      </Card>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="animate-pop mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-indigo-500/15 text-sky-500 dark:text-sky-400">
              <Users className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {search.trim() ? 'Sin clientes para esa búsqueda' : 'Todavía no hay clientes en la libreta'}
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {search.trim()
                ? 'Probá con otro término.'
                : 'Agregalos acá o tocá “Guardar en libreta” al crear un presupuesto.'}
            </p>
            {!search.trim() && (
              <Button className="mt-5" onClick={() => openModalFn(null)}>
                <Plus className="h-4 w-4" /> Agregar cliente
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((c) => {
              const st = stats.get(c.name.trim().toLowerCase());
              return (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-extrabold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {initials(c.name) || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {[c.document, c.phone, c.email].filter(Boolean).join(' · ') || 'Sin contacto'}
                      {c.address ? ` · ${c.address}` : ''}
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
                      onClick={() => openModalFn(c)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                      aria-label={`Editar ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setToDelete(c)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                      aria-label={`Eliminar ${c.name}`}
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
        Los clientes guardados se sugieren automáticamente al crear un presupuesto.
      </p>

      {/* Modal agregar/editar */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Editar cliente' : 'Nuevo cliente'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, editing: null })}>
              Cancelar
            </Button>
            <Button onClick={saveForm}>
              <Save className="h-4 w-4" />
              {modal.editing ? 'Guardar cambios' : 'Guardar cliente'}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre / razón social *" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setField({ name: e.target.value })}
              placeholder="Ej: Juan Pérez SRL"
            />
          </Field>
          <Field label="DNI / CUIT">
            <Input
              value={form.document}
              onChange={(e) => setField({ document: e.target.value })}
              placeholder="20-12345678-9"
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={form.phone}
              onChange={(e) => setField({ phone: e.target.value })}
              placeholder="+54 11 5555-5555"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField({ email: e.target.value })}
              placeholder="cliente@correo.com"
            />
          </Field>
          <Field label="Dirección">
            <Input
              value={form.address}
              onChange={(e) => setField({ address: e.target.value })}
              placeholder="Calle 123, Ciudad"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar cliente"
        message={`¿Seguro que querés eliminar a ${toDelete?.name} de la libreta? No se modifican los presupuestos ya creados.`}
        onConfirm={() => {
          if (toDelete) {
            deleteClient(toDelete.id);
            pushToast('success', 'Cliente eliminado de la libreta.');
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
