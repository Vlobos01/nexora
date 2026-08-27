import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookmarkPlus, BookUser, ChevronDown, ChevronUp, Copy, List, Package, Plus, Save, ShoppingCart, Trash2, User, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { computeTotals, lineNet, toNumber } from '../lib/calc';
import { addDaysISO, formatDate, todayISO } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { numberDisplay, uid } from '../lib/id';
import { Button, Card, CardHeader, Field, Input, Select, Textarea, Toggle, cn } from './ui';
import ClientSearch from './ClientSearch';
import MobileItems from './MobileItems';
import ProductCatalogPicker from './ProductCatalogPicker';
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

/** Borrador automático de presupuestos nuevos (se restaura al volver). */
const DRAFT_KEY = 'nexora:draft-new';

function loadDraft(): QuoteDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuoteDraft;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function blankClient(): ClientInfo {
  return { name: '', document: '', phone: '', email: '', address: '' };
}

export default function QuoteForm({
  onNavigate,
  editing,
  fromTemplate,
  prefill,
}: {
  onNavigate: (v: View) => void;
  editing?: Quote | null;
  fromTemplate?: Quote | null;
  prefill?: QuoteDraft;
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

  // Borrador automático: solo aplica a presupuestos nuevos (sin editar ni usar plantilla)
  const [restoredDraft, setRestoredDraft] = useState<QuoteDraft | null>(() =>
    editing || fromTemplate || prefill ? null : loadDraft(),
  );
  const initial = source ?? prefill ?? restoredDraft;

  const [client, setClient] = useState<ClientInfo>(initial?.client ?? blankClient());
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [expiryDate, setExpiryDate] = useState(initial?.expiryDate ?? addDaysISO(30));
  const [title, setTitle] = useState(initial?.title ?? '');
  const [observations, setObservations] = useState(initial?.observations ?? '');
  const [items, setItems] = useState<LineItem[]>(
    initial?.items.length ? initial.items.map((i) => ({ ...i })) : [{ ...emptyItem(), id: uid() }],
  );
  const [discountPct, setDiscountPct] = useState(initial?.discountPct ?? 0);
  const [ivaPct, setIvaPct] = useState(initial?.ivaPct ?? settings.defaultIva);
  const [asTemplate, setAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState(source?.templateName ?? '');
  const [itemMode, setItemMode] = useState<'manual' | 'catalog'>('manual');

  // ---------- Detección de cambios sin guardar ----------
  const snapshotRef = useRef<string | null>(null);
  if (snapshotRef.current === null) {
    snapshotRef.current = JSON.stringify([client, date, expiryDate, title, observations, items, discountPct, ivaPct]);
  }
  const currentSerialized = JSON.stringify([client, date, expiryDate, title, observations, items, discountPct, ivaPct]);
  const dirty = currentSerialized !== snapshotRef.current;

  // Aviso al cerrar/recargar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Autosave con debounce (solo presupuestos nuevos)
  const autosaveTimer = useRef<number | null>(null);
  const latestDraftRef = useRef({ client, date, expiryDate, title, observations, items, discountPct, ivaPct });
  latestDraftRef.current = { client, date, expiryDate, title, observations, items, discountPct, ivaPct };
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const editingRef = useRef(editing);
  editingRef.current = editing;
  const fromTemplateRef = useRef(fromTemplate);
  fromTemplateRef.current = fromTemplate;
  const savedRef = useRef(false);

  useEffect(() => {
    if (editing || fromTemplate || !dirty) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ client, date, expiryDate, title, observations, items, discountPct, ivaPct }),
        );
      } catch {
        // sin espacio: se ignora, el usuario puede guardar normalmente
      }
    }, 600);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [dirty, client, date, expiryDate, title, observations, items, discountPct, ivaPct, editing, fromTemplate]);

  // Al desmontar (navegación dentro de la app), volcar el borrador pendiente
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      if (editingRef.current || fromTemplateRef.current || savedRef.current || !dirtyRef.current) return;
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(latestDraftRef.current));
      } catch {
        // sin espacio: se ignora
      }
    };
  }, []);

  // ─── Mobile tabs ─────────────────────────────────────────────────────────
  type MobileTab = 'client' | 'items' | 'summary';
  const [mobileTab, setMobileTab] = useState<MobileTab>('client');
  const TAB_ORDER: MobileTab[] = ['client', 'items', 'summary'];
  const TAB_LABELS: Record<MobileTab, { label: string; icon: React.ReactNode }> = {
    client: { label: 'Cliente', icon: <User className="h-4 w-4" /> },
    items: { label: 'Conceptos', icon: <ShoppingCart className="h-4 w-4" /> },
    summary: { label: 'Resumen', icon: <Save className="h-4 w-4" /> },
  };

  // Swipe detection (solo en móvil)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    // Solo procesar swipe horizontal (más horizontal que vertical)
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    const idx = TAB_ORDER.indexOf(mobileTab);
    if (dx < 0 && idx < TAB_ORDER.length - 1) {
      setMobileTab(TAB_ORDER[idx + 1]);
    } else if (dx > 0 && idx > 0) {
      setMobileTab(TAB_ORDER[idx - 1]);
    }
  }, [mobileTab]);

  const discardDraft = () => {
    const blank = { ...emptyItem(), id: uid() };
    setClient(blankClient());
    setDate(todayISO());
    setExpiryDate(addDaysISO(30));
    setTitle('');
    setObservations('');
    setItems([blank]);
    setDiscountPct(0);
    setIvaPct(settings.defaultIva);
    setRestoredDraft(null);
    snapshotRef.current = JSON.stringify([
      blankClient(),
      todayISO(),
      addDaysISO(30),
      '',
      '',
      [blank],
      0,
      settings.defaultIva,
    ]);
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignorar
    }
  };

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
    setItems(tpl.items.map((it) => ({ ...it, id: uid() })));
    pushToast('info', `Conceptos de "${tpl.templateName || tpl.title}" cargados.`);
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

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignorar
    }
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
      clearDraft();
      savedRef.current = true;
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
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {editing ? `Editar ${numberDisplay(editing.prefix, editing.number)}` : 'Nuevo presupuesto'}
            {dirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Sin guardar
              </span>
            )}
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

      {/* Borrador restaurado */}
      {restoredDraft && !editing && !fromTemplate && (
        <div className="animate-fade flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3.5 sm:flex-row sm:items-center dark:border-sky-800/50 dark:bg-sky-500/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold text-sky-900 dark:text-sky-200">
              Restauramos un borrador sin guardar
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-sky-800/80 dark:text-sky-200/70">
              Es el borrador que dejaste a medio completar la última vez. Podés continuar donde
              quedaste o descartarlo.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 self-start sm:self-center">
            <Button variant="secondary" size="sm" onClick={discardDraft}>
              <X className="h-3.5 w-3.5" /> Descartar
            </Button>
          </div>
        </div>
      )}

      {/* Mobile tab bar */}
      <div className="lg:hidden">
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold transition-all',
                mobileTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
              )}
            >
              {TAB_LABELS[tab].icon}
              {TAB_LABELS[tab].label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="flex flex-col gap-5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* En escritorio: grid con columna izquierda + resumen sticky. En móvil: cada sección se muestra/oculta según tab. */}
        <div className="contents lg:grid lg:grid-cols-3 lg:gap-5">
        <div className="space-y-5 lg:col-span-2">
          {/* Cliente */}
          <Card className={cn(mobileTab !== 'client' && 'hidden lg:block')}>
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
          <Card className={cn(mobileTab !== 'client' && 'hidden lg:block')}>
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

        </div>

        {/* Panel resumen */}
        <div className={cn('order-2 lg:order-none lg:sticky lg:top-6 lg:self-start', mobileTab !== 'summary' && 'hidden lg:block')}>
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

        {/* Conceptos: ancho completo */}
        <Card className={cn('order-1 lg:order-none', mobileTab !== 'items' && 'hidden lg:block')}>
        <CardHeader
          title="Productos o servicios"
          subtitle="Cantidad, precio unitario y descuento por concepto"
          action={
            <div className="flex items-center gap-2">
              {templates.length > 0 && (
                <Select
                  className="w-auto"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) applyTemplateItems(e.target.value);
                    e.target.value = '';
                  }}
                  aria-label="Agregar conceptos de plantilla"
                >
                  <option value="">+ Plantilla</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.templateName || t.title}
                    </option>
                  ))}
                </Select>
              )}
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setItemMode('manual')}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition',
                    itemMode === 'manual'
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500',
                  )}
                >
                  <List className="h-3 w-3" /> Manual
                </button>
                <button
                  type="button"
                  onClick={() => setItemMode('catalog')}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition',
                    itemMode === 'catalog'
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500',
                  )}
                >
                  <Package className="h-3 w-3" /> Catálogo
                </button>
              </div>
            </div>
          }
        />
        {/* Mobile: compact items or catalog */}
        <div className="p-5 lg:hidden">
          {itemMode === 'catalog' ? (
            <ProductCatalogPicker
              products={knownProducts}
              currency={settings.currency}
              onAddItem={(item) => setItems((prev) => [...prev, item])}
            />
          ) : (
            <MobileItems
              items={items}
              setItems={setItems}
              knownProducts={knownProducts}
              currency={settings.currency}
            />
          )}
        </div>
        {/* Desktop: table-style items or catalog */}
        <div className={cn('hidden space-y-2 p-5', itemMode === 'manual' ? 'lg:block' : 'lg:hidden')}>
          <div className="grid grid-cols-[36px_1fr_64px_100px_72px_110px_36px] gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
              className="animate-slide-up grid grid-cols-[36px_1fr_64px_100px_72px_110px_36px] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
            >
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Mover arriba"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-indigo-600 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-slate-700/60 dark:hover:text-indigo-300"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-[10px] font-bold text-slate-400">{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  disabled={idx === items.length - 1}
                  aria-label="Mover abajo"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-indigo-600 disabled:pointer-events-none disabled:opacity-25 dark:hover:bg-slate-700/60 dark:hover:text-indigo-300"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0">
                <ProductSearch
                  suggestions={knownProducts}
                  currency={settings.currency}
                  value={item.description}
                  onValueChange={(v) => setItem(item.id, { description: v })}
                  onSelect={(p) => setItem(item.id, { description: p.name, unitPrice: p.unitPrice })}
                  placeholder={`Concepto ${idx + 1}…`}
                  className="w-full"
                />
              </div>
              <Input type="number" min={0} step="any" value={item.quantity || ''} onChange={(e) => setItem(item.id, { quantity: toNumber(e.target.value, 0) })} className="text-right bg-white dark:bg-slate-900" />
              <Input type="number" min={0} step="any" value={item.unitPrice || ''} onChange={(e) => setItem(item.id, { unitPrice: toNumber(e.target.value, 0) })} className="text-right bg-white dark:bg-slate-900" />
              <Input type="number" min={0} max={100} step="any" value={item.discountPct || ''} onChange={(e) => setItem(item.id, { discountPct: toNumber(e.target.value, 0) })} className="text-right bg-white dark:bg-slate-900" />
              <p className="truncate text-right text-sm font-extrabold text-slate-800 dark:text-slate-100">{formatMoney(lineNet(item), settings.currency)}</p>
              <button onClick={() => removeItem(item.id)} disabled={items.length === 1} className="flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-rose-500/10" aria-label="Eliminar concepto">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button onClick={addItem} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5 dark:hover:text-indigo-400">
            <Plus className="h-4 w-4" /> Agregar concepto
          </button>
        </div>
        {/* Desktop: catalog picker */}
        <div className={cn('hidden p-5', itemMode === 'catalog' && 'lg:block')}>
          <ProductCatalogPicker
            products={knownProducts}
            currency={settings.currency}
            onAddItem={(item) => setItems((prev) => [...prev, item])}
          />
        </div>
      </Card>
      </div>
    </div>
  );
}
