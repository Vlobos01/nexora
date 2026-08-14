import { useState } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Layout } from './components/Layout';
import Dashboard from './components/Dashboard';
import QuoteList from './components/QuoteList';
import QuoteForm from './components/QuoteForm';
import QuoteDetail from './components/QuoteDetail';
import Invoices from './components/Invoices';
import Templates from './components/Templates';
import Clients from './components/Clients';
import Products from './components/Products';
import Settings from './components/Settings';
import { EmptyState, Button } from './components/ui';
import { FileQuestion } from 'lucide-react';
import type { View } from './types';

function Router() {
  const [view, setView] = useState<View>({ name: 'dashboard' });
  const { quotes, templates } = useApp();

  const navigate = (v: View) => {
    setView(v);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const render = () => {
    switch (view.name) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'quotes':
        return <QuoteList key={view.search ?? ''} onNavigate={navigate} initialSearch={view.search ?? ''} />;
      case 'invoices':
        return <Invoices onNavigate={navigate} />;
      case 'new': {
        const fromTemplate = view.fromTemplateId
          ? templates.find((t) => t.id === view.fromTemplateId) ?? null
          : null;
        return <QuoteForm key={`new-${view.fromTemplateId ?? 'blank'}`} onNavigate={navigate} fromTemplate={fromTemplate} />;
      }
      case 'edit': {
        const quote = quotes.find((q) => q.id === view.id);
        if (!quote) return <NotFound onNavigate={navigate} />;
        return <QuoteForm key={`edit-${view.id}`} onNavigate={navigate} editing={quote} />;
      }
      case 'detail': {
        const quote = quotes.find((q) => q.id === view.id);
        if (!quote) return <NotFound onNavigate={navigate} />;
        return <QuoteDetail quote={quote} onNavigate={navigate} />;
      }
      case 'templates':
        return <Templates onNavigate={navigate} />;
      case 'clients':
        return <Clients />;
      case 'products':
        return <Products />;
      case 'settings':
        return <Settings />;
      default:
        return <NotFound onNavigate={navigate} />;
    }
  };

  return (
    <Layout view={view} onNavigate={navigate}>
      <div key={view.name + (view.name === 'detail' || view.name === 'edit' ? `-${view.id}` : '')} className="animate-fade">
        {render()}
      </div>
    </Layout>
  );
}

function NotFound({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <EmptyState
      icon={<FileQuestion className="h-7 w-7" />}
      title="No encontramos ese presupuesto"
      description="Puede que se haya eliminado. Volvé al listado para ver los que tenés."
      action={<Button onClick={() => onNavigate({ name: 'quotes' })}>Ver presupuestos</Button>}
    />
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
