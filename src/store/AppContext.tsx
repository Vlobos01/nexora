import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type {
  AppData,
  AppSettings,
  ClientEntry,
  ClientInfo,
  Invoice,
  InvoiceStatus,
  ProductEntry,
  ProductInfo,
  Quote,
  QuoteDraft,
  QuoteStatus,
  ThemeMode,
} from '../types';
import { DEFAULT_SETTINGS, emptyClient } from '../types';
import { uid } from '../lib/id';
import { useIndexedDB } from '../lib/storage';
import { addDaysISO, getEffectiveStatus, todayISO } from '../lib/dates';
import { computeTotals, invoiceStatusFromPaid, paymentsTotal } from '../lib/calc';
import { cn } from '../components/ui';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface AppContextValue {
  settings: AppSettings;
  quotes: Quote[];
  templates: Quote[];
  invoices: Invoice[];
  clients: ClientEntry[];
  products: ProductEntry[];
  theme: ThemeMode;
  online: boolean;
  canInstall: boolean;
  storageWarning: boolean;
  nextNumber: number;
  nextInvoiceNumber: number;
  installPwa: () => void;
  setTheme: (t: ThemeMode) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  saveQuote: (draft: QuoteDraft, opts?: { asTemplate?: boolean; templateName?: string }) => Quote;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  setQuoteStatus: (id: string, status: QuoteStatus) => void;
  duplicateQuote: (id: string) => Quote | null;
  deleteQuote: (id: string) => void;
  saveTemplate: (draft: QuoteDraft, templateName: string) => void;
  deleteTemplate: (id: string) => void;
  createInvoiceFromQuote: (quote: Quote) => Invoice | null;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  /** Registra un cobro (parcial o total) con su fecha y actualiza el estado. */
  registerPayment: (id: string, amount: number) => void;
  /** Elimina un cobro del historial y recalcula el estado de la factura. */
  removePayment: (id: string, paymentId: string) => void;
  deleteInvoice: (id: string) => void;
  addClient: (client: ClientInfo) => 'added' | 'updated';
  updateClient: (id: string, patch: Partial<ClientInfo>) => void;
  deleteClient: (id: string) => void;
  addProduct: (product: ProductInfo) => 'added' | 'updated';
  updateProduct: (id: string, patch: Partial<ProductInfo>) => void;
  deleteProduct: (id: string) => void;
  knownProducts: ProductEntry[];
  importData: (file: File) => Promise<{ ok: boolean; error?: string; data?: AppData }>;
  exportData: () => void;
  resetAll: () => void;
  applyBusinessToAll: (source?: Partial<AppSettings>) => number;
  effectiveStatus: (q: Quote) => QuoteStatus;
  knownClients: ClientInfo[];
  pushToast: (type: ToastType, message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function seedTemplate(): Quote {
  const business = {
    name: DEFAULT_SETTINGS.name,
    logo: DEFAULT_SETTINGS.logo,
    cuit: DEFAULT_SETTINGS.cuit,
    phone: DEFAULT_SETTINGS.phone,
    email: DEFAULT_SETTINGS.email,
    address: DEFAULT_SETTINGS.address,
    commercialConditions: DEFAULT_SETTINGS.commercialConditions,
  };
  return {
    id: uid(),
    number: 0,
    prefix: DEFAULT_SETTINGS.numberingPrefix,
    status: 'draft',
    createdAt: new Date().toISOString(),
    date: todayISO(),
    expiryDate: addDaysISO(30),
    title: 'Desarrollo de Landing Page',
    observations: 'Entrega estimada: 10 días hábiles.\nIncluye 2 rondas de revisiones.',
    client: emptyClient(),
    items: [
      { id: uid(), description: 'Diseño UI/UX de landing page (hasta 4 secciones)', quantity: 1, unitPrice: 180000, discountPct: 0 },
      { id: uid(), description: 'Maquetado responsive HTML + CSS', quantity: 1, unitPrice: 120000, discountPct: 0 },
      { id: uid(), description: 'Formulario de contacto con validación', quantity: 1, unitPrice: 60000, discountPct: 0 },
      { id: uid(), description: 'Optimización SEO básica (meta tags, Open Graph, sitemap)', quantity: 1, unitPrice: 30000, discountPct: 0 },
      { id: uid(), description: 'Testeo en dispositivos y ajustes finales', quantity: 1, unitPrice: 25000, discountPct: 0 },
    ],
    discountPct: 0,
    ivaPct: 21,
    currency: 'ARS',
    business,
    pdfColors: DEFAULT_SETTINGS.pdfColors,
    isTemplate: true,
    templateName: 'Desarrollo de Landing Page',
  };
}

function initialData(): AppData {
  return {
    settings: { ...DEFAULT_SETTINGS },
    quotes: [],
    templates: [seedTemplate()],
    invoices: [],
    clients: [],
    products: [],
  };
}

export function normalizeData(raw: unknown): AppData {
  const fallback = initialData();
  if (!raw || typeof raw !== 'object') return fallback;
  const d = raw as Partial<AppData>;
  const settings: AppSettings = { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) };
  const quotes = Array.isArray(d.quotes) ? d.quotes : [];
  const templates = Array.isArray(d.templates) ? d.templates : [];
  const ensurePrefix = (q: Quote) => ({ ...q, prefix: q.prefix || settings.numberingPrefix });
  const normalizedQuotes = quotes.map(ensurePrefix);
  const normalizedTemplates = templates.map(ensurePrefix);
  const maxNumber = Math.max(0, ...normalizedQuotes.map((q) => q.number || 0));
  if (settings.numberingLast < maxNumber) settings.numberingLast = maxNumber;

  // Facturas: se garantiza el prefijo, el historial de cobros y la coherencia
  // entre `payments` y `paidAmount` (migración desde versiones sin historial).
  const invoices = Array.isArray(d.invoices) ? d.invoices : [];
  const normalizedInvoices = invoices.map((inv) => {
    const payments = Array.isArray(inv.payments)
      ? inv.payments
          .filter((p) => p && Number.isFinite(Number(p.amount)))
          .map((p) => ({
            id: String(p.id ?? '').trim() || uid(),
            amount: Number(p.amount) || 0,
            date: String(p.date ?? inv.date ?? ''),
          }))
      : [];
    const paid = Number(inv.paidAmount) || 0;
    // Migración: si había un monto cobrado sin historial, se crea una entrada
    const withHistory =
      payments.length === 0 && paid > 0
        ? [{ id: uid(), amount: paid, date: inv.date || todayISO() }]
        : payments;
    return {
      ...inv,
      prefix: inv.prefix || settings.invoicePrefix,
      payments: withHistory,
      paidAmount: paymentsTotal(withHistory),
    };
  });
  const maxInvoiceNumber = Math.max(0, ...normalizedInvoices.map((i) => i.number || 0));
  if (settings.invoiceLast < maxInvoiceNumber) settings.invoiceLast = maxInvoiceNumber;

  // Catálogo de productos/servicios: se deduplica por nombre, se garantiza el id
  const normalizedProducts: ProductEntry[] = [];
  const seenProductNames = new Set<string>();
  for (const p of Array.isArray(d.products) ? d.products : []) {
    if (!p || typeof p !== 'object') continue;
    const name = String(p.name ?? '').trim();
    if (!name || seenProductNames.has(name.toLowerCase())) continue;
    seenProductNames.add(name.toLowerCase());
    normalizedProducts.push({
      id: String(p.id ?? '').trim() || uid(),
      name,
      unitPrice: Number(p.unitPrice) || 0,
      unit: String(p.unit ?? ''),
      description: String(p.description ?? ''),
    });
  }

  // Libreta de clientes: se deduplica por nombre e id, y se garantiza el id
  const normalizedClients: ClientEntry[] = [];
  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  for (const c of Array.isArray(d.clients) ? d.clients : []) {
    if (!c || typeof c !== 'object') continue;
    const name = String(c.name ?? '').trim();
    const key = name.toLowerCase();
    if (!name || seenNames.has(key)) continue;
    const id = String(c.id ?? '').trim() || uid();
    if (seenIds.has(id)) continue;
    seenNames.add(key);
    seenIds.add(id);
    normalizedClients.push({
      id,
      name,
      document: String(c.document ?? ''),
      phone: String(c.phone ?? ''),
      email: String(c.email ?? ''),
      address: String(c.address ?? ''),
    });
  }

  return {
    settings,
    quotes: normalizedQuotes,
    templates: normalizedTemplates,
    invoices: normalizedInvoices,
    clients: normalizedClients,
    products: normalizedProducts,
  };
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
  expired: 'Vencido',
};

export { STATUS_LABELS };

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, dataHandlers, dataQuotaError, dataReady] = useIndexedDB<AppData>(
    'presupuestos:v1',
    initialData,
    normalizeData,
  );
  const [theme, themeHandlers, , themeReady] = useIndexedDB<ThemeMode>(
    'presupuestos:theme',
    'dark',
  );
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [online, setOnline] = useState<boolean>(() => navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  const { settings, quotes, templates, invoices, clients, products } = data;

  // ---------- Tema ----------
  useEffect(() => {
    // Se aplica recién cuando el tema se cargó, para no parpadear con el default.
    if (!themeReady) return;
    const root = document.documentElement;
    const apply = () => {
      const dark =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme, themeReady]);

  // ---------- Conectividad ----------
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // ---------- Instalación PWA ----------
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      pushToast('success', 'Nexora quedó instalado en tu dispositivo.');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---------- Derivados ----------
  const nextNumber = useMemo(
    () => Math.max(settings.numberingStart, settings.numberingLast + 1),
    [settings.numberingStart, settings.numberingLast],
  );

  const nextInvoiceNumber = useMemo(
    () => Math.max(settings.invoiceStart, settings.invoiceLast + 1),
    [settings.invoiceStart, settings.invoiceLast],
  );

  const knownClients = useMemo(() => {
    // La libreta tiene prioridad; se completan con clientes usados en presupuestos
    const map = new Map<string, ClientInfo>();
    for (const c of clients) {
      if (c.name) map.set(c.name.trim().toLowerCase(), c);
    }
    for (const q of quotes) {
      if (q.client.name) {
        const key = q.client.name.trim().toLowerCase();
        if (!map.has(key)) map.set(key, q.client);
      }
    }
    return [...map.values()].slice(0, 15);
  }, [clients, quotes]);

  const knownProducts = useMemo(() => {
    // El catálogo tiene prioridad; se completan con conceptos usados en presupuestos
    const map = new Map<string, ProductEntry>();
    for (const p of products) {
      if (p.name) map.set(p.name.trim().toLowerCase(), p);
    }
    for (const q of quotes) {
      for (const it of q.items) {
        const name = it.description.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            name,
            unitPrice: it.unitPrice,
            unit: '',
            description: '',
          });
        }
      }
    }
    return [...map.values()].slice(0, 50);
  }, [products, quotes]);

  // ---------- Acciones ----------
  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      dataHandlers.setValue((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    },
    [dataHandlers],
  );

  const setTheme = useCallback(
    (t: ThemeMode) => themeHandlers.setValue(t),
    [themeHandlers],
  );

  const saveQuote = useCallback(
    (draft: QuoteDraft, opts?: { asTemplate?: boolean; templateName?: string }): Quote => {
      const quote: Quote = {
        id: uid(),
        number: nextNumber,
        prefix: settings.numberingPrefix,
        status: 'draft',
        createdAt: new Date().toISOString(),
        ...draft,
        items: draft.items.map((it) => ({
          ...it,
          quantity: Math.max(0, Number(it.quantity) || 0),
          unitPrice: Math.max(0, Number(it.unitPrice) || 0),
        })),
        currency: settings.currency,
        business: {
          name: settings.name,
          logo: settings.logo,
          cuit: settings.cuit,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          commercialConditions: settings.commercialConditions,
        },
        pdfColors: { ...settings.pdfColors },
      };

      if (opts?.asTemplate) {
        dataHandlers.setValue((d) => ({
          ...d,
          templates: [
            {
              ...quote,
              number: 0,
              isTemplate: true,
              templateName: opts.templateName?.trim() || draft.title || 'Plantilla sin nombre',
            },
            ...d.templates,
          ],
        }));
      } else {
        dataHandlers.setValue((d) => ({
          ...d,
          quotes: [quote, ...d.quotes],
          settings: { ...d.settings, numberingLast: quote.number },
        }));
      }
      return quote;
    },
    [dataHandlers, nextNumber, settings],
  );

  const updateQuote = useCallback(
    (id: string, patch: Partial<Quote>) => {
      dataHandlers.setValue((d) => ({
        ...d,
        quotes: d.quotes.map((q) => (q.id === id ? { ...q, ...patch, id: q.id } : q)),
      }));
    },
    [dataHandlers],
  );

  const setQuoteStatus = useCallback(
    (id: string, status: QuoteStatus) => {
      dataHandlers.setValue((d) => ({
        ...d,
        quotes: d.quotes.map((q) => (q.id === id ? { ...q, status } : q)),
      }));
    },
    [dataHandlers],
  );

  const duplicateQuote = useCallback(
    (id: string): Quote | null => {
      const src = quotes.find((q) => q.id === id);
      if (!src) return null;
      const copy: Quote = {
        ...src,
        id: uid(),
        number: nextNumber,
        status: 'draft',
        createdAt: new Date().toISOString(),
        items: src.items.map((it) => ({ ...it, id: uid() })),
      };
      dataHandlers.setValue((d) => ({
        ...d,
        quotes: [copy, ...d.quotes],
        settings: { ...d.settings, numberingLast: copy.number },
      }));
      return copy;
    },
    [quotes, nextNumber, dataHandlers],
  );

  const deleteQuote = useCallback(
    (id: string) => {
      dataHandlers.setValue((d) => ({ ...d, quotes: d.quotes.filter((q) => q.id !== id) }));
    },
    [dataHandlers],
  );

  const saveTemplate = useCallback(
    (draft: QuoteDraft, templateName: string) => {
      const tpl: Quote = {
        id: uid(),
        number: 0,
        prefix: settings.numberingPrefix,
        status: 'draft',
        createdAt: new Date().toISOString(),
        ...draft,
        currency: settings.currency,
        business: {
          name: settings.name,
          logo: settings.logo,
          cuit: settings.cuit,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          commercialConditions: settings.commercialConditions,
        },
        pdfColors: { ...settings.pdfColors },
        isTemplate: true,
        templateName: templateName.trim() || draft.title || 'Plantilla sin nombre',
      };
      dataHandlers.setValue((d) => ({ ...d, templates: [tpl, ...d.templates] }));
    },
    [dataHandlers, settings],
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      dataHandlers.setValue((d) => ({ ...d, templates: d.templates.filter((t) => t.id !== id) }));
    },
    [dataHandlers],
  );

  // ---------- Facturas ----------
  const createInvoiceFromQuote = useCallback(
    (quote: Quote): Invoice | null => {
      const exists = invoices.some((i) => i.quoteId === quote.id);
      if (exists) return null;
      const invoice: Invoice = {
        id: uid(),
        number: nextInvoiceNumber,
        prefix: settings.invoicePrefix,
        quoteId: quote.id,
        quoteNumber: quote.number,
        quotePrefix: quote.prefix,
        createdAt: new Date().toISOString(),
        date: todayISO(),
        dueDate: addDaysISO(30),
        title: quote.title,
        observations: quote.observations,
        client: { ...quote.client },
        items: quote.items.map((it) => ({ ...it, id: uid() })),
        discountPct: quote.discountPct,
        ivaPct: quote.ivaPct,
        currency: quote.currency,
        business: { ...quote.business },
        pdfColors: { ...quote.pdfColors },
        status: 'pending',
        paidAmount: 0,
        payments: [],
      };
      dataHandlers.setValue((d) => ({
        ...d,
        invoices: [invoice, ...d.invoices],
        settings: { ...d.settings, invoiceLast: invoice.number },
      }));
      return invoice;
    },
    [invoices, nextInvoiceNumber, settings, dataHandlers],
  );

  const setInvoiceStatus = useCallback(
    (id: string, status: InvoiceStatus) => {
      dataHandlers.setValue((d) => ({
        ...d,
        invoices: d.invoices.map((inv) => {
          if (inv.id !== id) return inv;
          const total = computeTotals(inv.items, inv.discountPct, inv.ivaPct).total;
          if (status === 'paid') {
            // Marcar como cobrada: se agrega el saldo restante al historial
            const current = paymentsTotal(inv.payments);
            const remaining = Math.max(0, total - current);
            const payments =
              remaining > 0
                ? [...inv.payments, { id: uid(), amount: remaining, date: todayISO() }]
                : inv.payments;
            return { ...inv, payments, paidAmount: total, status: 'paid' };
          }
          // Pendiente (o parcial por menú): se restablece sin cobros
          return { ...inv, payments: [], paidAmount: 0, status: 'pending' };
        }),
      }));
    },
    [dataHandlers],
  );

  const deleteInvoice = useCallback(
    (id: string) => {
      dataHandlers.setValue((d) => ({ ...d, invoices: d.invoices.filter((i) => i.id !== id) }));
    },
    [dataHandlers],
  );

  const registerPayment = useCallback(
    (id: string, amount: number) => {
      if (amount <= 0) return;
      dataHandlers.setValue((d) => ({
        ...d,
        invoices: d.invoices.map((inv) => {
          if (inv.id !== id) return inv;
          const total = computeTotals(inv.items, inv.discountPct, inv.ivaPct).total;
          const current = paymentsTotal(inv.payments);
          const toAdd = Math.min(amount, Math.max(0, total - current));
          if (toAdd <= 0) return inv;
          const payments = [...inv.payments, { id: uid(), amount: toAdd, date: todayISO() }];
          const paidAmount = current + toAdd;
          return {
            ...inv,
            payments,
            paidAmount,
            status: invoiceStatusFromPaid(total, paidAmount),
          };
        }),
      }));
    },
    [dataHandlers],
  );

  const removePayment = useCallback(
    (id: string, paymentId: string) => {
      dataHandlers.setValue((d) => ({
        ...d,
        invoices: d.invoices.map((inv) => {
          if (inv.id !== id) return inv;
          const payments = inv.payments.filter((p) => p.id !== paymentId);
          const paidAmount = paymentsTotal(payments);
          const total = computeTotals(inv.items, inv.discountPct, inv.ivaPct).total;
          return {
            ...inv,
            payments,
            paidAmount,
            status: invoiceStatusFromPaid(total, paidAmount),
          };
        }),
      }));
    },
    [dataHandlers],
  );

  // ---------- Libreta de clientes ----------
  const addClient = useCallback(
    (client: ClientInfo): 'added' | 'updated' => {
      const name = client.name.trim();
      if (!name) return 'added';
      // La existencia se evalúa con el estado actual del render (determinístico);
      // el upsert dentro del updater usa el estado fresco `d`.
      const exists = clients.some(
        (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
      );
      const id = uid();
      dataHandlers.setValue((d) => {
        const existing = d.clients.find(
          (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
        );
        if (existing) {
          return {
            ...d,
            clients: d.clients.map((c) =>
              c.id === existing.id ? { ...c, ...client, name } : c,
            ),
          };
        }
        return { ...d, clients: [{ ...client, name, id }, ...d.clients] };
      });
      return exists ? 'updated' : 'added';
    },
    [dataHandlers, clients],
  );

  const updateClient = useCallback(
    (id: string, patch: Partial<ClientInfo>) => {
      dataHandlers.setValue((d) => ({
        ...d,
        clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    [dataHandlers],
  );

  const deleteClient = useCallback(
    (id: string) => {
      dataHandlers.setValue((d) => ({
        ...d,
        clients: d.clients.filter((c) => c.id !== id),
      }));
    },
    [dataHandlers],
  );

  // ---------- Catálogo de productos/servicios ----------
  const addProduct = useCallback(
    (product: ProductInfo): 'added' | 'updated' => {
      const name = product.name.trim();
      if (!name) return 'added';
      const exists = products.some(
        (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
      );
      const id = uid();
      dataHandlers.setValue((d) => {
        const existing = d.products.find(
          (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
        );
        if (existing) {
          return {
            ...d,
            products: d.products.map((p) =>
              p.id === existing.id ? { ...p, ...product, name } : p,
            ),
          };
        }
        return { ...d, products: [{ ...product, name, id }, ...d.products] };
      });
      return exists ? 'updated' : 'added';
    },
    [dataHandlers, products],
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<ProductInfo>) => {
      dataHandlers.setValue((d) => ({
        ...d,
        products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
    },
    [dataHandlers],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      dataHandlers.setValue((d) => ({
        ...d,
        products: d.products.filter((p) => p.id !== id),
      }));
    },
    [dataHandlers],
  );

  const exportData = useCallback(() => {
    const payload = {
      app: 'nexora',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { settings, quotes, templates, invoices, clients, products },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexora-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('success', 'Copia de seguridad exportada correctamente.');
  }, [settings, quotes, templates, invoices, clients, products, pushToast]);

  const importData = useCallback(
    async (file: File): Promise<{ ok: boolean; error?: string; data?: AppData }> => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as {
          app?: string;
          data?: AppData;
        };
        const payload = (parsed?.data ?? parsed) as unknown as AppData;
        if (!payload || typeof payload !== 'object' || !Array.isArray(payload.quotes)) {
          return { ok: false, error: 'El archivo no es una copia de seguridad válida de Nexora.' };
        }
        const normalized = normalizeData(payload);
        dataHandlers.setValue(normalized);
        return { ok: true, data: normalized };
      } catch {
        return { ok: false, error: 'No se pudo leer el archivo. Asegurate de elegir un JSON de respaldo.' };
      }
    },
    [dataHandlers],
  );

  const resetAll = useCallback(() => {
    dataHandlers.reset();
    pushToast('info', 'Se restablecieron todos los datos.');
  }, [dataHandlers, pushToast]);

  const applyBusinessToAll = useCallback((source?: Partial<AppSettings>): number => {
    const quoteCount = quotes.length;
    const invoiceCount = invoices.length;
    if (quoteCount === 0 && invoiceCount === 0) return 0;
    // Si se pasa un origen (el formulario de Configuración), se usan esos valores;
    // si no, los de la configuración guardada.
    const s = { ...settings, ...(source ?? {}) };
    const business = {
      name: s.name,
      logo: s.logo,
      cuit: s.cuit,
      phone: s.phone,
      email: s.email,
      address: s.address,
      commercialConditions: s.commercialConditions,
    };
    const pdfColors = { ...s.pdfColors };
    // Se aplica a presupuestos Y facturas: ambos comparten colores y datos del negocio
    dataHandlers.setValue((d) => ({
      ...d,
      quotes: d.quotes.map((q) => ({ ...q, business, pdfColors: { ...pdfColors } })),
      invoices: d.invoices.map((inv) => ({ ...inv, business, pdfColors: { ...pdfColors } })),
    }));
    return quoteCount + invoiceCount;
  }, [dataHandlers, quotes, invoices, settings]);

  const installPwa = useCallback(async () => {
    if (!deferredPrompt) return;
    const ev = deferredPrompt as Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
    try {
      await ev.prompt();
      await ev.userChoice;
    } catch {
      // el usuario canceló
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // ---------- Hidratación ----------
  const ready = dataReady && themeReady;
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Cargando…</p>
        </div>
      </div>
    );
  }

  const value: AppContextValue = {
    settings,
    quotes,
    templates,
    invoices,
    clients,
    products,
    theme,
    online,
    canInstall: !!deferredPrompt && !installed,
    storageWarning: dataQuotaError,
    nextNumber,
    nextInvoiceNumber,
    installPwa,
    setTheme,
    updateSettings,
    saveQuote,
    updateQuote,
    setQuoteStatus,
    duplicateQuote,
    deleteQuote,
    saveTemplate,
    deleteTemplate,
    createInvoiceFromQuote,
    setInvoiceStatus,
    registerPayment,
    removePayment,
    deleteInvoice,
    addClient,
    updateClient,
    deleteClient,
    addProduct,
    updateProduct,
    deleteProduct,
    knownProducts,
    importData,
    exportData,
    resetAll,
    applyBusinessToAll,
    effectiveStatus: getEffectiveStatus,
    knownClients,
    pushToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'animate-toast pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur',
              t.type === 'success' &&
                'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/90 dark:text-emerald-100',
              t.type === 'error' &&
                'border-rose-200 bg-rose-50/95 text-rose-900 dark:border-rose-900 dark:bg-rose-950/90 dark:text-rose-100',
              t.type === 'info' &&
                'border-slate-200 bg-white/95 text-slate-800 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100',
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
            {t.type === 'error' && <XCircle className="h-5 w-5 shrink-0 text-rose-500" />}
            {t.type === 'info' && <Info className="h-5 w-5 shrink-0 text-sky-500" />}
            <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="rounded-md p-1 text-current/60 transition hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
