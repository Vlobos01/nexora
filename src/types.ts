export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
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
  | { name: 'new'; fromTemplateId?: string }
  | { name: 'edit'; id: string }
  | { name: 'detail'; id: string }
  | { name: 'templates' }
  | { name: 'clients' }
  | { name: 'products' }
  | { name: 'settings' };

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
  theme: 'light',
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
  return { id: '', description: '', quantity: 1, unitPrice: 0, discountPct: 0 };
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
