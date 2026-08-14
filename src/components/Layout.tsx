import { type ReactNode, useEffect, useState } from 'react';
import {
  BookUser,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Menu as MenuIcon,
  Moon,
  Package,
  Plus,
  Receipt,
  Settings as SettingsIcon,
  Sun,
  WifiOff,
  X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { cn } from './ui';
import type { View } from '../types';

const NAV: { key: View['name']; label: string; icon: ReactNode }[] = [
  { key: 'dashboard', label: 'Inicio', icon: <LayoutDashboard className="h-5 w-5" /> },
  { key: 'quotes', label: 'Presupuestos', icon: <FileText className="h-5 w-5" /> },
  { key: 'invoices', label: 'Facturas', icon: <Receipt className="h-5 w-5" /> },
  { key: 'templates', label: 'Plantillas', icon: <LayoutTemplate className="h-5 w-5" /> },
  { key: 'clients', label: 'Clientes', icon: <BookUser className="h-5 w-5" /> },
  { key: 'products', label: 'Productos', icon: <Package className="h-5 w-5" /> },
  { key: 'settings', label: 'Configuración', icon: <SettingsIcon className="h-5 w-5" /> },
];

// En la barra inferior móvil caben 4 módulos + el botón central "+"
// Configuración, Productos y Clientes quedan en el menú lateral/drawer (uso ocasional)
const BOTTOM_NAV = NAV.filter(
  (i) => i.key !== 'settings' && i.key !== 'products' && i.key !== 'clients',
);

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 font-black text-white shadow-md shadow-indigo-600/30',
        size === 'md' ? 'h-9 w-9 text-base' : 'h-7 w-7 text-xs',
      )}
    >
      N
    </span>
  );
}

function OfflineBar() {
  const { online, storageWarning } = useApp();
  if (online && !storageWarning) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-500/95 px-4 py-2 text-center text-xs font-semibold text-amber-950">
      {!online && (
        <span className="inline-flex items-center gap-1.5">
          <WifiOff className="h-3.5 w-3.5" />
          Sin conexión — podés seguir trabajando. Los datos se guardan en este dispositivo.
        </span>
      )}
      {!online && storageWarning && <span className="opacity-60">·</span>}
      {storageWarning && (
        <span>⚠ No hay espacio de almacenamiento disponible. Liberá espacio o eliminá presupuestos viejos.</span>
      )}
    </div>
  );
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useApp();
  const isDark = theme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');
  return (
    <button
      onClick={toggle}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={cn(
        'flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
        compact ? 'h-9 w-9' : 'h-9 w-9',
      )}
    >
      {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}

function SidebarContent({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const { online, canInstall, installPwa, settings } = useApp();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white">
            Nexora
          </p>
          <p className="text-[11px] font-medium text-slate-400">El nexo entre vos y tus clientes</p>
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={() => onNavigate({ name: 'new' })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:shadow-indigo-600/40 hover:brightness-110 active:scale-[0.98]"
        >
          <Plus className="h-4.5 w-4.5" />
          Nuevo presupuesto
        </button>
      </div>

      <nav className="mt-5 flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = view.name === item.key || (item.key === 'quotes' && view.name === 'detail');
          return (
            <button
              key={item.key}
              onClick={() => onNavigate({ name: item.key } as View)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all',
                active
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
              )}
            >
              <span className={cn(active && 'text-indigo-600 dark:text-indigo-400')}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 px-4 pb-5">
        {canInstall && (
          <button
            onClick={installPwa}
            className="w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          >
            📲 Instalar aplicación
          </button>
        )}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800">
          <span
            className={cn(
              'flex items-center gap-2 text-xs font-semibold',
              online ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-amber-500')} />
            {online ? 'En línea' : 'Sin conexión'}
          </span>
          <ThemeToggle />
        </div>
        <p className="px-1 text-[11px] text-slate-400 dark:text-slate-500">
          {settings.name} · Todo se guarda localmente
        </p>
      </div>
    </div>
  );
}

export function Layout({
  view,
  onNavigate,
  children,
}: {
  view: View;
  onNavigate: (v: View) => void;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { online } = useApp();

  useEffect(() => {
    setDrawerOpen(false);
  }, [view]);

  const go = (v: View) => {
    onNavigate(v);
    setDrawerOpen(false);
  };

  const navItemActive = (key: string) =>
    view.name === key || (key === 'quotes' && (view.name === 'detail' || view.name === 'edit' || view.name === 'new'));


  return (
    <div className="min-h-dvh">
      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:block">
        <SidebarContent view={view} onNavigate={go} />
      </aside>

      {/* Drawer móvil */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="animate-fade absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="animate-slide-up absolute inset-y-0 left-0 w-72 bg-white shadow-2xl dark:bg-slate-900">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent view={view} onNavigate={go} />
          </aside>
        </div>
      )}

      {/* Topbar móvil */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Abrir menú"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <BrandMark size="sm" />
          <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
            Nexora
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="flex h-8 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <WifiOff className="h-3.5 w-3.5" /> Offline
            </span>
          )}
          <ThemeToggle compact />
        </div>
      </header>

      {/* Contenido */}
      <main className="lg:pl-64">
        <OfflineBar />
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          {children}
        </div>
      </main>

      {/* Bottom nav móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
        <div className="grid grid-cols-5">
          {BOTTOM_NAV.slice(0, 2).map((item) => (
            <NavItem key={item.key} active={navItemActive(item.key)} onClick={() => go({ name: item.key } as View)} label={item.label} icon={item.icon} />
          ))}
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => go({ name: 'new' })}
              aria-label="Nuevo presupuesto"
              className="animate-pop absolute -top-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/40 transition-transform active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          {BOTTOM_NAV.slice(2).map((item) => (
            <NavItem key={item.key} active={navItemActive(item.key)} onClick={() => go({ name: item.key } as View)} label={item.label} icon={item.icon} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
