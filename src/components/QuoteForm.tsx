import { useMemo, useState } from 'react';
import { BookmarkPlus, BookUser, ChevronDown, ChevronUp, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { computeTotals, lineNet, toNumber } from '../lib/calc';
import { addDaysISO, formatDate, todayISO } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { numberDisplay, uid } from '../lib/id';
import { Button, Card, CardHeader, Field, Input, Select, Textarea, Toggle, cn } from './ui';
import ClientSearch from './ClientSearch';
import ProductSearch from './ProductSearch';
import type { ClientInfo, LineItem, Quote, QuoteDraft, View } from '../types';
import { emptyItem } from '../types';

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between', muted ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300')}>
      <span className="text-[13px] font-medium">{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  );
}

const IVA_PRESETS = [0, 5, 10.5, 21, 27];

export default function QuoteForm({
  onNavigate,
  editing,
  fromTemplate,
}: {
  onNavigate: (v: View) => void;
  editing?: Quote | null;
  fromTemplate?: Quote | null;
}) {
  const {
    settings,
    knownClients,
    knownProducts,
    clients,
    addClient,
    saveQuote,
    updateQuote,
    saveTemplate,
    templates,
    pushToast,
    nextNumber,
  } = useApp();

  const source = editing ?? fromTemplate;

  const [client, setClient] = useState<ClientInfo>(source?.client ?? { name: '', document: '', phone: '', email: '', address: '' });
  const [date, setDate] = useState(source?.date ?? todayISO());
  const [expiryDate, setExpiryDate] = useState(source?.expiryDate ?? addDaysISO(30));
  const [title, setTitle] = useState(source?.title ?? '');
  const [observations, setObservations] = useState(source?.observations ?? '');
  const [items, setItems] = useState<LineItem[]>(
    source?.items.length ? source.items.map((i) => ({ ...i })) : [{ ...emptyItem(), id: uid() }],
  );
  const [discountPct, setDiscountPct] = useState(source?.discountPct ?? 0);
  const [ivaPct, setIvaPct] = useState(source?.ivaPct ?? settings.defaultIva);
  const [asTemplate, setAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState(source?.templateName ?? '');

  const totals = useMemo(() => computeTotals(items, discountPct, ivaPct), [items, discountPct, ivaPct]);

  const setItem = (id: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem(), id: uid() }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
  };

  const moveItem = (index: number, delta: number) => {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const applyTemplateItems = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setItems((prev) => [...prev, ...tpl.items.map((it) => ({ ...it, id: uid() }))]);
    pushToast('info', `Conceptos de "${tpl.templateName || tpl.title}" agregados.`);
  };

  const isClientInBook =
    client.name.trim() !== '' &&
    clients.some((c) => c.name.trim().toLowerCase() === client.name.trim().toLowerCase());

  const handleSaveClient = () => {
    if (!client.name.trim()) return;
    const outcome = addClient({ ...client, name: client.name.trim() });
    pushToast(
      'success',
      outcome === 'added'
        ? 'Cliente guardado en la libreta.'
        : 'El cliente ya estaba en la libreta: se actualizaron sus datos.',
    );
  };

  const handleSave = () => {
    if (!client.name.trim()) {
      pushToast('error', 'Ingresá el nombre del cliente.');
      return;
    }
    const validItems = items.filter((i) => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      pushToast('error', 'Agregá al menos un concepto con descripción y cantidad.');
      return;
    }

    const draft: QuoteDraft = {
      date,
      expiryDate,
      title: title.trim(),
      observations: observations.trim(),
      client: { ...client, name: client.name.trim() },
      items: validItems.map((i) => ({
        ...i,
        quantity: Math.max(0, toNumber(i.quantity, 1)),
        unitPrice: Math.max(0, toNumber(i.unitPrice, 0)),
        discountPct: Math.min(100, Math.max(0, toNumber(i.discountPct, 0))),
      })),
      discountPct: Math.min(100, Math.max(0, toNumber(discountPct, 0))),
      ivaPct: Math.max(0, toNumber(ivaPct, 0)),
    };

    let savedId: string;
    if (editing) {
      updateQuote(editing.id, { ...draft });
      savedId = editing.id;
      pushToast('success', `Presupuesto ${numberDisplay(editing.prefix, editing.number)} actualizado.`);
    } else {
      if (asTemplate) {
        saveTemplate(draft, templateName);
        pushToast('success', 'Plantilla guardada. Podés usarla en la sección Plantillas.');
        onNavigate({ name: 'templates' });
        return;
      }
      const q = saveQuote(draft);
      savedId = q.id;
      pushToast('success', `Presupuesto ${numberDisplay(q.prefix, q.number)} creado.`);
    }
    onNavigate({ name: 'detail', id: savedId });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {editing ? `Editar ${numberDisplay(editing.prefix, editing.number)}` : 'Nuevo presupuesto'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {editing ? (
              <>Cliente: {editing.client.name || '—'}</>
            ) : (
              <>
                Próximo número:{' '}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {numberDisplay(settings.numberingPrefix, nextNumber)}
                </span>{' '}
                · fecha {formatDate(todayISO())}
              </>
            )}
          </p>
        </div>
        {fromTemplate && !editing && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <Copy className="h-3.5 w-3.5" /> Desde plantilla: {fromTemplate.templateName || fromTemplate.title}
          </span>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Cliente */}
          <Card>
            <CardHeader title="Datos del cliente" subtitle="Se reutilizan automáticamente si ya los usaste" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Nombre / razón social *" className="sm:col-span-2">
                <div className="flex gap-2">
                  <ClientSearch
                    suggestions={knownClients}
                    name={client.name}
                    onNameChange={(name) => setClient({ ...client, name })}
                    onSelect={(c) => setClient({ ...c })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant={isClientInBook ? 'subtle' : 'secondary'}
                    onClick={handleSaveClient}
                    disabled={!client.name.trim()}
                    aria-label={
                      isClientInBook ? 'Cliente guardado en la libreta' : 'Guardar cliente en la libreta'
                    }
                    title={
                      isClientInBook ? 'Cliente guardado en la libreta' : 'Guardar cliente en la libreta'
                    }
                    className="shrink-0 px-3"
                  >
                    {isClientInBook ? (
                      <BookUser className="h-4 w-4" />
                    ) : (
                      <BookmarkPlus className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isClientInBook ? 'En libreta' : 'Libreta'}
                    </span>
                  </Button>
                </div>
              </Field>
              <Field label="DNI / CUIT">
                <Input value={client.document} onChange={(e) => setClient({ ...client, document: e.target.value })} placeholder="20-12345678-9" />
              </Field>
              <Field label="Teléfono">
                <Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} placeholder="+54 11 5555-5555" />
              </Field>
              <Field label="Email">
                <Input type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} placeholder="cliente@correo.com" />
              </Field>
              <Field label="Dirección">
                <Input value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} placeholder="Calle 123, Ciudad" />
              </Field>
            </div>
          </Card>

          {/* Información */}
          <Card>
            <CardHeader title="Información del presupuesto" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Fecha de emisión">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Fecha de vencimiento">
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </Field>
              <Field label="Título / descripción del trabajo" className="sm:col-span-2">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Desarrollo de landing page" />
              </Field>
              <Field label="Observaciones" hint="Aparecerán en el PDF" className="sm:col-span-2">
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Forma de pago, plazos de entrega, garantías…"
                />
              </Field>
            </div>
          </Card>

          {/* Conceptos */}
          <Card>
            <CardHeader
              title="Productos o servicios"
              subtitle="Cantidad, precio unitario y descuento por concepto"
              action={
                templates.length > 0 ? (
                  <Select
                    className="w-auto"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) applyTemplateItems(e.target.value);
                      e.target.value = '';
                    }}
                    aria-label="Agregar conceptos de plantilla"
                  >
                    <option value="">+ Desde plantilla</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.templateName || t.title}
                      </option>
                    ))}
                  </Select>
                ) : undefined
              }
            />
            <div className="space-y-2 p-5">
              <div className="hidden grid-cols-[36px_1fr_70px_110px_80px_110px_36px] gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:grid">
                <span />
                <span>Descripción</span>
                <span className="text-right">Cant.</span>
                <span className="text-right">Precio unit.</span>
                <span className="text-right">Desc. %</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="animate-slide-up grid gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40 sm:grid-cols-[36px_1fr_70px_110px_80px_110px_36px]"
                >
                  {/* Reordenar */}
                  <div className="flex items-center justify-center gap-1 sm:flex-col sm:gap-0">
                    <button
                      type="button"
                      onClick={() => moveItem(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Mover ${item.description || `concepto ${idx + 1}`} arriba`}
                      title="Mover arriba"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-indigo-600 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-slate-700/60 dark:hover:text-indigo-300"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="hidden text-[10px] font-bold text-slate-400 sm:block">{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => moveItem(idx, 1)}
                      disabled={idx === items.length - 1}
                      aria-label={`Mover ${item.description || `concepto ${idx + 1}`} abajo`}
                      title="Mover abajo"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-indigo-600 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-slate-700/60 dark:hover:text-indigo-300"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="sm:flex sm:items-center sm:gap-1">
                    <span className="mb-0.5 block text-[10px] font-bold text-slate-400 sm:hidden">Descripción</span>
                    <ProductSearch
                      suggestions={knownProducts}
                      currency={settings.currency}
                      value={item.description}
                      onValueChange={(v) => setItem(item.id, { description: v })}
                      onSelect={(p) =>
                        setItem(item.id, { description: p.name, unitPrice: p.unitPrice })
                      }
                      placeholder={`Concepto ${idx + 1}…`}
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <span className="mb-0.5 block text-[10px] font-bold text-slate-400 sm:hidden">Cantidad</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.quantity}
                      onChange={(e) => setItem(item.id, { quantity: toNumber(e.target.value, 0) })}
                      className="text-right bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <span className="mb-0.5 block text-[10px] font-bold text-slate-400 sm:hidden">Precio unit.</span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) => setItem(item.id, { unitPrice: toNumber(e.target.value, 0) })}
                      className="text-right bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <span className="mb-0.5 block text-[10px] font-bold text-slate-400 sm:hidden">Descuento %</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="any"
                      value={item.discountPct}
                      onChange={(e) => setItem(item.id, { discountPct: toNumber(e.target.value, 0) })}
                      className="text-right bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex items-center justify-end sm:block">
                    <span className="mb-0.5 block text-[10px] font-bold text-slate-400 sm:hidden">Subtotal</span>
                    <p className="truncate py-2 text-right text-sm font-extrabold text-slate-800 dark:text-slate-100">
                      {formatMoney(lineNet(item), settings.currency)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="flex h-9 w-9 items-center justify-center self-center justify-self-end rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-rose-500/10 sm:justify-self-auto"
                    aria-label="Eliminar concepto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={addItem}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5 dark:hover:text-indigo-400"
              >
                <Plus className="h-4 w-4" /> Agregar concepto
              </button>
            </div>
          </Card>
        </div>

        {/* Panel resumen */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Resumen</p>
              <p className="text-2xl font-extrabold text-white">
                {formatMoney(totals.total, settings.currency)}
              </p>
            </div>
            <div className="space-y-2.5 p-5 text-sm">
              <SummaryRow label="Subtotal" value={formatMoney(totals.net, settings.currency)} />
              {totals.itemDiscount > 0 && (
                <SummaryRow label="Descuentos por ítem" value={`-${formatMoney(totals.itemDiscount, settings.currency)}`} muted />
              )}
              <div>
                <div className="mb-1 flex items-center justify-between text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>Descuento general</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(toNumber(e.target.value, 0))}
                    className="h-8 w-20 text-right"
                  />
                </div>
                {totals.globalDiscount > 0 && (
                  <p className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    -{formatMoney(totals.globalDiscount, settings.currency)}
                  </p>
                )}
              </div>
              <div className="border-t border-slate-100 pt-2.5 dark:border-slate-800">
                <div className="mb-2 flex items-center justify-between text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>IVA</span>
                  <div className="flex items-center gap-1">
                    {IVA_PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setIvaPct(p)}
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[11px] font-bold transition',
                          ivaPct === p
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400',
                        )}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={ivaPct}
                    onChange={(e) => setIvaPct(toNumber(e.target.value, 0))}
                    className="h-8 flex-1 text-right"
                  />
                  <span className="text-xs font-bold text-slate-400">{formatMoney(totals.iva, settings.currency)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800/60">
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">TOTAL</span>
                <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formatMoney(totals.total, settings.currency)}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <Button onClick={handleSave} className="w-full" size="lg">
                  <Save className="h-4.5 w-4.5" />
                  {editing ? 'Guardar cambios' : 'Guardar presupuesto'}
                </Button>
                {!editing && (
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <Toggle checked={asTemplate} onChange={setAsTemplate} label="Guardar también como plantilla" />
                    {asTemplate && (
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Nombre de la plantilla…"
                        className="mt-2.5"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
