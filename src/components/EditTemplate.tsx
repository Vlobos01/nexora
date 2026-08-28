import { useMemo, useState } from 'react';
import { List, Package, Plus, Save, ShoppingCart, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { computeTotals, lineNet, toNumber } from '../lib/calc';
import { formatMoney } from '../lib/money';
import { uid } from '../lib/id';
import { Button, Card, CardHeader, Field, Input, Textarea, cn } from './ui';
import MobileItems from './MobileItems';
import ProductCatalogPicker from './ProductCatalogPicker';
import ProductSearch from './ProductSearch';
import type { LineItem, Quote, View } from '../types';
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

export default function EditTemplate({
  template,
  onNavigate,
}: {
  template: Quote;
  onNavigate: (v: View) => void;
}) {
  const {
    settings,
    knownProducts,
    updateTemplate,
    pushToast,
  } = useApp();

  const [templateName, setTemplateName] = useState(template.templateName ?? template.title ?? '');
  const [title, setTitle] = useState(template.title ?? '');
  const [observations, setObservations] = useState(template.observations ?? '');
  const [items, setItems] = useState<LineItem[]>(
    template.items.length ? template.items.map((i) => ({ ...i })) : [{ ...emptyItem(), id: uid() }],
  );
  const [discountPct, setDiscountPct] = useState(template.discountPct ?? 0);
  const [ivaPct, setIvaPct] = useState(template.ivaPct ?? settings.defaultIva);
  const [itemMode, setItemMode] = useState<'manual' | 'catalog'>('manual');

  // Mobile tabs
  type MobileTab = 'items' | 'summary';
  const [mobileTab, setMobileTab] = useState<MobileTab>('items');
  const TAB_ORDER: MobileTab[] = ['items', 'summary'];
  const TAB_LABELS: Record<MobileTab, { label: string; icon: React.ReactNode }> = {
    items: { label: 'Conceptos', icon: <ShoppingCart className="h-4 w-4" /> },
    summary: { label: 'Resumen', icon: <Save className="h-4 w-4" /> },
  };

  const totals = useMemo(() => computeTotals(items, discountPct, ivaPct), [items, discountPct, ivaPct]);

  const setItem = (id: string, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem(), id: uid() }]);
  };

  const addCatalogItem = (item: LineItem) => {
    setItems((prev) => {
      if (prev.length === 1 && !prev[0].description.trim() && prev[0].quantity === 0 && prev[0].unitPrice === 0) {
        return [item];
      }
      return [...prev, item];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      if (prev.length === 1) {
        return [{ ...emptyItem(), id: uid() }];
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const handleSave = () => {
    const validItems = items.filter((i) => i.description.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      pushToast('error', 'Agregá al menos un concepto con descripción y cantidad.');
      return;
    }

    updateTemplate(template.id, {
      templateName: templateName.trim() || title.trim() || 'Plantilla sin nombre',
      title: title.trim(),
      observations: observations.trim(),
      items: validItems.map((i) => ({
        ...i,
        quantity: Math.max(0, toNumber(i.quantity, 1)),
        unitPrice: Math.max(0, toNumber(i.unitPrice, 0)),
        discountPct: Math.min(100, Math.max(0, toNumber(i.discountPct, 0))),
      })),
      discountPct: Math.min(100, Math.max(0, toNumber(discountPct, 0))),
      ivaPct: Math.max(0, toNumber(ivaPct, 0)),
    });
    pushToast('success', 'Plantilla actualizada.');
    onNavigate({ name: 'templates' });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Editar plantilla
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            {templateName || 'Sin nombre'}
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Editá el nombre, los conceptos, descuentos e IVA de la plantilla.
        </p>
      </div>

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

      <div className="flex flex-col gap-5">
        {/* Template name + Quote info */}
        <Card className={cn(mobileTab !== 'items' && 'hidden lg:block')}>
          <CardHeader title="Datos de la plantilla" subtitle="Nombre, descripción e información general" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Nombre de la plantilla *" className="sm:col-span-2">
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Ej: Desarrollo de Landing Page" />
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
        <Card className={cn('order-1 lg:order-none', mobileTab !== 'items' && 'hidden lg:block')}>
          <CardHeader
            title="Productos o servicios"
            subtitle="Cantidad, precio unitario y descuento por concepto"
          />
          {/* Mode toggle */}
          <div className="flex justify-center border-b border-slate-100 px-5 py-2.5 dark:border-slate-800">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setItemMode('manual')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold transition',
                  itemMode === 'manual'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500',
                )}
              >
                <Package className="h-3 w-3" /> Carrito
              </button>
              <button
                type="button"
                onClick={() => setItemMode('catalog')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold transition',
                  itemMode === 'catalog'
                    ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-500',
                )}
              >
                <List className="h-3 w-3" /> Catálogo
              </button>
            </div>
          </div>
          {/* Mobile: compact items or catalog */}
          <div className="p-5 lg:hidden">
            {itemMode === 'catalog' ? (
              <ProductCatalogPicker
                products={knownProducts}
                currency={settings.currency}
                onAddItem={addCatalogItem}
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
          {/* Desktop: table-style items */}
          <div className={cn('hidden space-y-2 p-5', itemMode === 'manual' ? 'lg:block' : 'lg:hidden')}>
            <div className="grid grid-cols-[44px_1fr_64px_100px_72px_110px_36px] gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                className="animate-slide-up grid grid-cols-[44px_1fr_64px_100px_72px_110px_36px] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-400 dark:bg-slate-800">
                      {idx + 1}
                    </span>
                  )}
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
                <button onClick={() => removeItem(item.id)} className="flex h-9 w-9 items-center justify-center justify-self-end rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10" aria-label="Eliminar concepto">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="mt-2 flex gap-2">
              <button onClick={addItem} className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5 dark:hover:text-indigo-400">
                <Plus className="h-4 w-4" /> Agregar concepto
              </button>
              {items.length > 1 || items[0].description.trim() ? (
                <button onClick={() => setItems([{ ...emptyItem(), id: uid() }])} className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-400 transition hover:border-rose-400 hover:bg-rose-50/50 hover:text-rose-500 dark:border-rose-800 dark:text-rose-500 dark:hover:border-rose-600 dark:hover:bg-rose-500/5">
                  <Trash2 className="h-4 w-4" /> Vaciar
                </button>
              ) : null}
            </div>
          </div>           {/* Desktop: catalog picker */}
          <div className={cn('hidden p-5', itemMode === 'catalog' && 'lg:block')}>
            <ProductCatalogPicker
              products={knownProducts}
              currency={settings.currency}
              onAddItem={addCatalogItem}
            />
          </div>
        </Card>

        {/* Resumen */}
        <div className={cn(mobileTab !== 'summary' && 'hidden lg:block')}>
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
                  Guardar plantilla
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
