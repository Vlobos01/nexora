import { useRef, useState } from 'react';
import {
  Building2,
  Coins,
  Download,
  HardDriveDownload,
  HardDriveUpload,
  Hash,
  ImagePlus,
  Leaf,
  Palette,
  Receipt,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { numberDisplay } from '../lib/id';
import { Button, Card, CardHeader, ConfirmDialog, Field, Input, Select, Segmented, Textarea, Toggle, cn } from './ui';
import type { ThemeMode } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { CURRENCIES } from '../lib/money';


const PDF_PRESETS: { primary: string; accent: string; label: string; monochrome?: boolean }[] = [
  { primary: '#4f46e5', accent: '#10b981', label: 'Índigo' },
  { primary: '#0f766e', accent: '#f59e0b', label: 'Esmeralda' },
  { primary: '#be123c', accent: '#f97316', label: 'Borgoña' },
  { primary: '#1d4ed8', accent: '#0ea5e9', label: 'Azul' },
  { primary: '#7c3aed', accent: '#ec4899', label: 'Violeta' },
  { primary: '#334155', accent: '#64748b', label: 'Grafito' },
  { primary: '#0f172a', accent: '#0f172a', label: 'Blanco y negro', monochrome: true },
];

export default function Settings() {
  const {
    settings,
    quotes,
    invoices,
    updateSettings,
    setTheme,
    theme,
    pushToast,
    exportData,
    importData,
    resetAll,
    applyBusinessToAll,
    canInstall,
    installPwa,
    nextNumber,
    nextInvoiceNumber,
  } = useApp();

  const [draft, setDraft] = useState({ ...settings });
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmApplyAll, setConfirmApplyAll] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));

  const handleSave = () => {
    updateSettings({
      ...draft,
      currency: draft.currency,
      defaultIva: Math.max(0, Number(draft.defaultIva) || 0),
      numberingStart: Math.max(1, Math.trunc(Number(draft.numberingStart) || 1)),
      invoiceStart: Math.max(1, Math.trunc(Number(draft.invoiceStart) || 1)),
    });
    pushToast('success', 'Configuración guardada. Se aplicará a los próximos presupuestos.');
  };

  const handleApplyAll = () => {
    setConfirmApplyAll(false);
    const n = applyBusinessToAll(draft);
    if (n === 0) {
      pushToast('info', 'Todavía no hay presupuestos ni facturas para actualizar.');
    } else {
      pushToast(
        'success',
        `Colores y datos del negocio actualizados en ${n} ${n === 1 ? 'documento' : 'documentos'} (presupuestos y facturas).`,
      );
    }
  };

  const handleLogo = (file: File | undefined) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      pushToast('error', 'El archivo debe ser una imagen PNG, JPG o WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = 256;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          const ratio = Math.min(size / img.width, size / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          set({ logo: canvas.toDataURL('image/png') });
          pushToast('success', 'Logo actualizado.');
        } catch {
          pushToast('error', 'No se pudo procesar esa imagen.');
        }
      };
      img.onerror = () => pushToast('error', 'No se pudo leer esa imagen.');
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const onPickImport = (file: File | undefined) => {
    if (!file) return;
    setPendingFile(file);
    setConfirmImport(true);
  };

  const runImport = async () => {
    if (!pendingFile) return;
    const res = await importData(pendingFile);
    if (res.ok) {
      pushToast('success', 'Datos importados correctamente.');
      if (res.data) setDraft({ ...res.data.settings });
    } else {
      pushToast('error', res.error ?? 'No se pudo importar el archivo.');
    }
    setPendingFile(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Configuración
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todo se guarda en este dispositivo. No se envía nada a internet.
        </p>
      </div>

      {/* Datos del negocio */}
      <Card>
        <CardHeader
          title="Datos del negocio"
          subtitle="Se reutilizan automáticamente en cada presupuesto y PDF"
          action={
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Building2 className="h-4.5 w-4.5" />
            </span>
          }
        />
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              {draft.logo ? (
                <img
                  src={draft.logo}
                  alt="Logo del negocio"
                  className="h-16 w-16 rounded-2xl border border-slate-200 object-cover dark:border-slate-700"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 dark:border-slate-700">
                  <ImagePlus className="h-6 w-6" />
                </span>
              )}
              {draft.logo && (
                <button
                  onClick={() => set({ logo: null })}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                  aria-label="Quitar logo"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => logoRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Subir logo
              </Button>
              <p className="mt-1.5 text-xs text-slate-400">PNG, JPG o WebP · se redimensiona solo</p>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleLogo(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {/* Vista previa: cómo se ve el logo en el encabezado del PDF */}
          {draft.logo && (
            <div>
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
                <div
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  style={{ background: draft.pdfColors.monochrome ? '#ffffff' : draft.pdfColors.primary }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img
                      src={draft.logo}
                      alt="Logo del negocio"
                      className="h-10 w-10 shrink-0 rounded-lg object-contain"
                    />
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-extrabold tracking-tight"
                        style={{ color: draft.pdfColors.monochrome ? '#0f172a' : '#ffffff' }}
                      >
                        {draft.name || 'Mi Negocio'}
                      </p>
                      <p
                        className="truncate text-[10px] font-medium"
                        style={{ color: draft.pdfColors.monochrome ? '#64748b' : 'rgba(255,255,255,0.78)' }}
                      >
                        {[draft.cuit ? `CUIT ${draft.cuit}` : '', draft.phone, draft.email]
                          .filter(Boolean)
                          .join(' · ') || 'Tus datos de contacto'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className="text-[11px] font-black uppercase tracking-widest"
                      style={{ color: draft.pdfColors.monochrome ? '#0f172a' : '#ffffff' }}
                    >
                      Presupuesto
                    </p>
                    <p
                      className="text-[10px] font-semibold"
                      style={{ color: draft.pdfColors.monochrome ? '#475569' : 'rgba(255,255,255,0.85)' }}
                    >
                      P-0001 · Fecha
                    </p>
                  </div>
                </div>
                <div
                  className="w-full"
                  style={{ height: 3, background: draft.pdfColors.monochrome ? '#0f172a' : draft.pdfColors.accent }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Así se verá el encabezado del PDF con tu logo. Guardá los cambios para aplicarlo.
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio *">
              <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Mi Negocio" />
            </Field>
            <Field label="CUIT">
              <Input value={draft.cuit} onChange={(e) => set({ cuit: e.target.value })} placeholder="30-12345678-9" />
            </Field>
            <Field label="Teléfono">
              <Input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+54 11 5555-5555" />
            </Field>
            <Field label="Email">
              <Input type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} placeholder="info@negocio.com" />
            </Field>
            <Field label="Dirección" className="sm:col-span-2">
              <Input value={draft.address} onChange={(e) => set({ address: e.target.value })} placeholder="Calle 123, Ciudad" />
            </Field>
            <Field label="Condiciones comerciales" hint="Se incluyen en cada PDF" className="sm:col-span-2">
              <Textarea
                value={draft.commercialConditions}
                onChange={(e) => set({ commercialConditions: e.target.value })}
                className="min-h-[110px]"
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* Presupuestos */}
      <Card>
        <CardHeader
          title="Presupuestos"
          subtitle="Moneda, IVA, numeración y colores del PDF"
          action={
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Coins className="h-4.5 w-4.5" />
            </span>
          }
        />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moneda">
              <Select value={draft.currency} onChange={(e) => set({ currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="IVA predeterminado (%)">
              <Input
                type="number"
                min={0}
                step="any"
                value={draft.defaultIva}
                onChange={(e) => set({ defaultIva: Number(e.target.value) })}
              />
            </Field>
            <Field label="Prefijo de numeración">
              <Input value={draft.numberingPrefix} onChange={(e) => set({ numberingPrefix: e.target.value })} placeholder="P" maxLength={8} />
            </Field>
            <Field label="Número inicial">
              <Input
                type="number"
                min={1}
                value={draft.numberingStart}
                onChange={(e) => set({ numberingStart: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60">
            <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
              <Hash className="h-4 w-4 text-indigo-500" />
              Próximo número: {numberDisplay(draft.numberingPrefix || 'P', nextNumber)}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">
              Los números son consecutivos y nunca se repiten, aunque elimines presupuestos.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-slate-700 dark:text-slate-300">Colores del PDF</p>
            <div className="flex flex-wrap items-center gap-2">
              {PDF_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => set({ pdfColors: { primary: p.primary, accent: p.accent, monochrome: p.monochrome ?? false } })}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    draft.pdfColors.primary === p.primary
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400',
                  )}
                >
                  <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.primary }} />
                  <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.accent }} />
                  {p.label}
                </button>
              ))}
            </div>
            {draft.pdfColors.monochrome && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Leaf className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Modo blanco y negro: se imprime en negro, sin colores.
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Field label="Color principal">
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.pdfColors.primary}
                    onChange={(e) => set({ pdfColors: { ...draft.pdfColors, primary: e.target.value, monochrome: false } })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700"
                    aria-label="Color principal"
                  />
                  <code className="text-xs font-semibold text-slate-500">{draft.pdfColors.primary}</code>
                </span>
              </Field>
              <Field label="Color de acento">
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.pdfColors.accent}
                    onChange={(e) => set({ pdfColors: { ...draft.pdfColors, accent: e.target.value, monochrome: false } })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700"
                    aria-label="Color de acento"
                  />
                  <code className="text-xs font-semibold text-slate-500">{draft.pdfColors.accent}</code>
                </span>
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="secondary" onClick={() => setConfirmApplyAll(true)} className="justify-start">
              <Wand2 className="h-4 w-4 text-indigo-500" /> Aplicar a presupuestos y facturas existentes
            </Button>
            <p className="text-xs text-slate-400">
              Actualiza los PDF ya creados (presupuestos y facturas) con estos colores y los datos del
              negocio (condiciones, CUIT, logo…).
            </p>
          </div>
        </div>
      </Card>

      {/* Facturas */}
      <Card>
        <CardHeader
          title="Facturas"
          subtitle="Numeración propia, independiente de los presupuestos"
          action={
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Receipt className="h-4.5 w-4.5" />
            </span>
          }
        />
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prefijo de numeración">
              <Input value={draft.invoicePrefix} onChange={(e) => set({ invoicePrefix: e.target.value })} placeholder="F" maxLength={8} />
            </Field>
            <Field label="Número inicial">
              <Input
                type="number"
                min={1}
                value={draft.invoiceStart}
                onChange={(e) => set({ invoiceStart: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60">
            <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
              <Hash className="h-4 w-4 text-amber-500" />
              Próximo número: {numberDisplay(draft.invoicePrefix || 'F', nextInvoiceNumber)}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">
              Las facturas se crean desde un presupuesto aceptado (botón «Crear factura»).
            </p>
          </div>
        </div>
      </Card>

      {/* Envíos y compartir */}
      <Card>
        <CardHeader
          title="Envíos y compartir"
          subtitle="Todo desactivado por defecto: activá solo lo que quieras usar"
          action={
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
              <Send className="h-4.5 w-4.5" />
            </span>
          }
        />
        <div className="space-y-2 p-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Enviar por WhatsApp</p>
              <p className="text-xs text-slate-400">Abre WhatsApp con el mensaje del presupuesto armado.</p>
            </div>
            <Toggle checked={draft.enableWhatsapp} onChange={(v) => set({ enableWhatsapp: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Enviar por email</p>
              <p className="text-xs text-slate-400">Abre tu correo con el presupuesto en el asunto y el cuerpo.</p>
            </div>
            <Toggle checked={draft.enableEmail} onChange={(v) => set({ enableEmail: v })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3.5 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Compartir PDF (nativo)</p>
              <p className="text-xs text-slate-400">Usa el menú de compartir del sistema operativo.</p>
            </div>
            <Toggle checked={draft.enableShare} onChange={(v) => set({ enableShare: v })} />
          </div>
          <p className="pt-1 text-xs leading-relaxed text-slate-400">
            Nada se envía automáticamente: los enlaces solo se abren cuando tocás el botón. Hasta que no
            actives una opción acá, el botón «Enviar» no aparece en los presupuestos.
          </p>
        </div>
      </Card>

      {/* Apariencia */}
      <Card>
        <CardHeader
          title="Apariencia"
          subtitle="Modo claro u oscuro"
          action={
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <Palette className="h-4.5 w-4.5" />
            </span>
          }
        />
        <div className="p-5">
          <Segmented<ThemeMode>
            value={theme}
            onChange={(t) => {
              set({ theme: t });
              setTheme(t);
            }}
            options={[
              { value: 'light', label: 'Claro' },
              { value: 'dark', label: 'Oscuro' },
              { value: 'system', label: 'Sistema' },
            ]}
          />
          <p className="mt-2 text-xs text-slate-400">El cambio se aplica al instante.</p>
        </div>
      </Card>

      {/* Datos */}
      <Card>
        <CardHeader
          title="Datos y privacidad"
          subtitle="Tus presupuestos nunca salen de este dispositivo"
          action={
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
          }
        />
        <div className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={exportData} className="justify-start">
              <HardDriveDownload className="h-4 w-4" /> Exportar datos (JSON)
            </Button>
            <Button variant="secondary" onClick={() => importRef.current?.click()} className="justify-start">
              <HardDriveUpload className="h-4 w-4" /> Importar datos
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                onPickImport(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
          <p className="text-xs leading-relaxed text-slate-400">
            Exportá una copia de seguridad en JSON para respaldar o migrar tus presupuestos, plantillas
            y configuración. La importación reemplaza los datos actuales.
          </p>
          {canInstall && (
            <Button onClick={installPwa} className="w-full sm:w-auto">
              <Download className="h-4 w-4" /> Instalar aplicación
            </Button>
          )}
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="ghost" className="!text-rose-600 hover:!bg-rose-50 dark:!text-rose-400 dark:hover:!bg-rose-500/10" onClick={() => setConfirmReset(true)}>
              <Trash2 className="h-4 w-4" /> Restablecer todos los datos
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} size="lg">
          <Save className="h-4.5 w-4.5" /> Guardar cambios
        </Button>
      </div>

      <ConfirmDialog
        open={confirmImport}
        title="Importar datos"
        message="Esta acción reemplazará todos tus presupuestos, facturas, plantillas y configuración actuales por los del archivo. ¿Continuar?"
        confirmLabel="Importar"
        danger={false}
        onConfirm={runImport}
        onCancel={() => {
          setConfirmImport(false);
          setPendingFile(null);
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Restablecer todo"
        message="Se eliminarán todos los presupuestos, facturas, plantillas y configuración. Esta acción no se puede deshacer."
        onConfirm={() => {
          resetAll();
          setDraft({ ...DEFAULT_SETTINGS });
        }}
        onCancel={() => setConfirmReset(false)}
      />
      <ConfirmDialog
        open={confirmApplyAll}
        title="Aplicar a presupuestos y facturas"
        message={`Se actualizarán los colores del PDF y los datos del negocio (nombre, CUIT, condiciones comerciales…) en ${quotes.length + invoices.length} ${quotes.length + invoices.length === 1 ? 'documento' : 'documentos'} (presupuestos y facturas). Los conceptos, clientes y totales no cambian.`}
        confirmLabel="Aplicar"
        danger={false}
        onConfirm={handleApplyAll}
        onCancel={() => setConfirmApplyAll(false)}
      />

    </div>
  );
}
