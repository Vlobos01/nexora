export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type InvoiceStatus = 'pending' | 'partial' | 'paid';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface PdfColors {
  primary: string;
  accent: string;
  /** Modo blanco y negro: el PDF se genera sin rellenos de color (ahorro de tinta). */
  monochrome?: boolean;
}

export interface BusinessInfo {
  name: string;
  logo: string | null;
  cuit: string;
  phone: string;
  email: string;
  address: string;
  commercialConditions: string;
}

export interface AppSettings extends BusinessInfo {
  currency: string;
  defaultIva: number;
  numberingPrefix: string;
  numberingStart: number;
  numberingLast: number;
  /** Numeración de facturas (independiente de la de presupuestos). */
  invoicePrefix: string;
  invoiceStart: number;
  invoiceLast: number;
  pdfColors: PdfColors;
  theme: ThemeMode;
  /** Opciones de envío: desactivadas por defecto, se activan en Configuración. */
  enableWhatsapp: boolean;
  enableEmail: boolean;
  enableShare: boolean;
}

export interface ClientInfo {
  name: string;
  document: string;
  phone: string;
  email: string;
  address: string;
}

export interface ClientEntry extends ClientInfo {
  id: string;
}

export interface ProductInfo {
  name: string;
  unitPrice: number;
  unit: string;
  description: string;
}

export interface ProductEntry extends ProductInfo {
  id: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
}

export interface Quote {
  id: string;
  number: number;
  prefix: string;
  status: QuoteStatus;
  createdAt: string;
  date: string;
  expiryDate: string;
  title: string;
  observations: string;
  client: ClientInfo;
  items: LineItem[];
  discountPct: number;
  ivaPct: number;
  currency: string;
  business: BusinessInfo;
  pdfColors: PdfColors;
  isTemplate?: boolean;
  templateName?: string;
}

/** Un cobro registrado sobre una factura. */
export interface PaymentEntry {
  id: string;
  amount: number;
  date: string;
}

/** Factura emitida a partir de un presupuesto aceptado. */
export interface Invoice {
  id: string;
  number: number;
  prefix: string;
  /** Presupuesto de origen. */
  quoteId: string;
  quoteNumber: number;
  quotePrefix: string;
  createdAt: string;
  date: string;
  dueDate: string;
  title: string;
  observations: string;
  client: ClientInfo;
  items: LineItem[];
  discountPct: number;
  ivaPct: number;
  currency: string;
  business: BusinessInfo;
  pdfColors: PdfColors;
  status: InvoiceStatus;
  /** Monto cobrado (para estado 'paid' equivale al total). */
  paidAmount: number;
  /** Historial de cobros con fecha. */
  payments: PaymentEntry[];
}

export interface AppData {
  settings: AppSettings;
  quotes: Quote[];
  templates: Quote[];
  invoices: Invoice[];
  clients: ClientEntry[];
  products: ProductEntry[];
}

export type View =
  | { name: 'dashboard' }
  | { name: 'quotes'; search?: string }
  | { name: 'invoices' }
  | { name: 'new'; fromTemplateId?: string }
  | { name: 'edit'; id: string }
  | { name: 'detail'; id: string }
  | { name: 'templates' }
  | { name: 'clients' }
  | { name: 'products' }
  | { name: 'settings' }
  | { name: 'manual' };

export const DEFAULT_PDF_COLORS: PdfColors = { primary: '#4f46e5', accent: '#10b981' };

export const DEFAULT_SETTINGS: AppSettings = {
  name: 'Mi Negocio',
  logo: null,
  cuit: '',
  phone: '',
  email: '',
  address: '',
  commercialConditions:
    '• Los precios no incluyen IVA.\n• El presupuesto tiene una validez de 30 días.\n• Se requiere un anticipo del 50% para iniciar los trabajos.\n• El saldo se abona a la entrega.',
  currency: 'ARS',
  defaultIva: 21,
  numberingPrefix: 'P',
  numberingStart: 1,
  numberingLast: 0,
  invoicePrefix: 'F',
  invoiceStart: 1,
  invoiceLast: 0,
  pdfColors: DEFAULT_PDF_COLORS,
  theme: 'dark',
  enableWhatsapp: false,
  enableEmail: false,
  enableShare: false,
};

export function emptyClient(): ClientInfo {
  return { name: '', document: '', phone: '', email: '', address: '' };
}

export function emptyProduct(): ProductInfo {
  return { name: '', unitPrice: 0, unit: '', description: '' };
}

export function emptyItem(): LineItem {
  return { id: '', description: '', quantity: 0, unitPrice: 0, discountPct: 0 };
}

export interface QuoteDraft {
  date: string;
  expiryDate: string;
  title: string;
  observations: string;
  client: ClientInfo;
  items: LineItem[];
  discountPct: number;
  ivaPct: number;
}
