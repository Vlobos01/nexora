export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'partial' | 'paid';
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
  /** Imagen del producto en base64 (opcional). */
  image?: string;
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
  /** Imagen del producto (opcional, para mostrar en la grilla). */
  image?: string;
}

/** Un cobro registrado sobre un presupuesto. */
export interface PaymentEntry {
  id: string;
  amount: number;
  date: string;
}

export interface Quote {
  id: string;
  number: number;
  prefix: string;
  status: QuoteStatus;
  createdAt: string;
  date: string;
  expiryDate: string;
  /** Fecha de vencimiento de pago (para presupuestos aceptados/parciales). */
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
  isTemplate?: boolean;
  templateName?: string;
  /** Monto cobrado (para estados 'paid' equivale al total). */
  paidAmount: number;
  /** Historial de cobros con fecha. */
  payments: PaymentEntry[];
}

export interface AppData {
  settings: AppSettings;
  quotes: Quote[];
  templates: Quote[];
  clients: ClientEntry[];
  products: ProductEntry[];
}

export type View =
  | { name: 'dashboard' }
  | { name: 'quotes'; search?: string }
  | { name: 'new'; fromTemplateId?: string; prefill?: QuoteDraft }
  | { name: 'edit'; id: string }
  | { name: 'detail'; id: string }
  | { name: 'templates' }
  | { name: 'editTemplate'; id: string }
  | { name: 'clients'; openModal?: boolean }
  | { name: 'products'; openModal?: boolean }
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
