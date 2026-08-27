import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Bot, Send, X, Sparkles, Mic, Loader2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { computeTotals, paymentsTotal } from '../lib/calc';
import { cn } from './ui';
import type { View, QuoteStatus, QuoteDraft } from '../types';
import { emptyItem } from '../types';
import { uid } from '../lib/id';

// ─── Intent Types ────────────────────────────────────────────────────────────

type IntentType =
  | 'navigate'
  | 'create_quote'
  | 'add_client'
  | 'add_product'
  | 'search_quote'
  | 'search_client'
  | 'view_quote_by_client'
  | 'duplicate'
  | 'set_status'
  | 'mark_paid'
  | 'register_payment'
  | 'export_data'
  | 'import_data'
  | 'apply_business'
  | 'delete_quote'
  | 'help'
  | 'status'
  | 'greeting'
  | 'unknown';

interface Intent {
  type: IntentType;
  params: Record<string, string>;
  response: string;
}

// ─── Message Types ───────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

// ─── Intent Parser ───────────────────────────────────────────────────────────

function parseIntent(
  input: string,
  ctx: {
    quotes: { id: string; number: number; title: string; status: string; client: { name: string } }[];
    clients: { id: string; name: string }[];
    quotesCount: number;
    clientsCount: number;
  },
): Intent {
  const text = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .trim();

  // ─── Greeting ───
  if (/^(hola|buenas|hey|hi|hello|buenos dias|buenas tardes|buenas noches|que tal|que onda|que hay)/.test(text)) {
    return {
      type: 'greeting',
      params: {},
      response: `¡Hola! 👋 Soy tu asistente de Nexora. ¿Qué necesitás hoy?`,
    };
  }

  // ─── Help ───
  if (/^(ayuda|help|comandos|opciones|que puedo|que podes|que sabes|como funciona)/.test(text)) {
    return {
      type: 'help',
      params: {},
      response: `🤖 ¡Hola! Soy tu asistente de Nexora. Puedo ayudarte con estas cosas:

📋 **Navegación:**
• "ir a presupuestos" / "ver plantillas" / "configuración"
• "panel" / "inicio" / "dashboard"
• "ver clientes" / "ver productos"

📝 **Crear presupuesto:**
• "crear presupuesto" / "nuevo presupuesto"
• "nuevo para [cliente]"
• "nuevo para Juan con 3 diseño a 100000"
• "crear para García con item desarrollo 50000"

🔍 **Buscar:**
• "buscar [nombre]" / "buscar cliente [nombre]"
• "buscar presupuesto [nombre o número]"

🔄 **Cambiar estado:**
• "marcar enviado" / "aceptar presupuesto 3"
• "rechazar presupuesto 5" / "expirar último"

💰 **Cobros:**
• "registrar cobro de 50000 en presupuesto 3"
• "cobrar último presupuesto"
• "marcar como pagado presupuesto 5"
• "pagar todo el presupuesto 2"

👀 **Ver presupuestos:**
• "ver presupuesto de Juan"
• "presupuestos de García"
• "detalle del presupuesto 3"

➕ **Agregar:**
• "agregar cliente" / "nuevo cliente"
• "agregar producto" / "nuevo producto"

📋 **Acciones rápidas:**
• "duplicar último presupuesto"
• "cuántos presupuestos tengo"
• "resumen" / "estado"
• "exportar datos"

🎤 **Voz:** Tocá el micrófono y hablame directamente

¿Qué necesitás?`,
    };
  }

  // ─── Export ───
  if (/^(exportar|backup|copiar datos|descargar datos|guardar copia)/.test(text)) {
    return {
      type: 'export_data',
      params: {},
      response: '📦 Preparando la exportación de tus datos...',
    };
  }

  // ─── Import ───
  if (/^(importar|restaurar|cargar backup|cargar copia)/.test(text)) {
    return {
      type: 'import_data',
      params: {},
      response: '📥 Para importar datos, andá a Configuración > Importar. Te llevo allá.',
    };
  }

  // ─── Apply Business ───
  if (/^(actualizar negocio|aplicar negocio|sincronizar|aplicar a todos|apply business)/.test(text)) {
    return {
      type: 'apply_business',
      params: {},
      response: '🏢 Te llevo a Configuración para aplicar los datos del negocio a todos los presupuestos.',
    };
  }

  // ─── Mark as Paid (full payment) ───
  if (/^(marcar|poner|marcalo|ponelo)\s+(como\s+)?(pagado|pago|cobrado|saldado)/.test(text) ||
      /^(pagar\s+(todo\s+)?(el\s+)?presupuesto|saldar\s+(el\s+)?presupuesto)/.test(text)) {
    const numMatch = text.match(/(\d+)/);
    const quoteNum = numMatch ? numMatch[1] : '';
    let foundQuote = null;
    if (quoteNum) {
      foundQuote = ctx.quotes.find((q) => q.number === Number(quoteNum));
    } else if (/ultimo|ultima|último|última/.test(text)) {
      foundQuote = ctx.quotes[0];
    }
    if (foundQuote) {
      return {
        type: 'mark_paid',
        params: { quoteId: foundQuote.id, quoteNumber: String(foundQuote.number) },
        response: `✅ Presupuesto **#${foundQuote.number}** (${foundQuote.title || foundQuote.client.name || 'Sin título'}) marcado como **pagado**.`,
      };
    }
    return {
      type: 'navigate',
      params: { view: 'quotes' },
      response: quoteNum
        ? `🔍 No encontré el presupuesto **#${quoteNum}**. Te llevo a la lista.`
        : '📋 ¿Cuál presupuesto querés marcar como pagado? Te llevo a la lista.',
    };
  }

  // ─── Register Payment (partial) ───
  const paymentMatch = text.match(
    /(?:registrar|cargar|cobrar|abonar)\s+(?:un\s+)?(?:pago\s+)?(?:de\s+)?(?:presupuesto\s*)?(\d+)?\s*(?:de\s+|por\s+)?\s*(\d[\d.,]*)?/,
  );
  const isPaymentCommand = /(?:cobro|pago|abono)/.test(text) &&
    !/^(marcar|poner)\s+(como\s+)?(pagado|pago|cobrado)/.test(text) &&
    !/^pagar\s+(todo|el)/.test(text);

  if (paymentMatch || isPaymentCommand) {
    const amount = paymentMatch?.[2]?.replace(/[.,]/g, '') ?? '';
    const quoteNum = paymentMatch?.[1] ?? '';
    let foundQuote = null;
    if (quoteNum) {
      foundQuote = ctx.quotes.find((q) => q.number === Number(quoteNum));
    } else if (/ultimo|ultima|último|última/.test(text)) {
      foundQuote = ctx.quotes[0];
    }
    if (foundQuote) {
      return {
        type: 'navigate',
        params: { view: 'detail', id: foundQuote.id },
        response: amount
          ? `💰 Te llevo al presupuesto **#${foundQuote.number}** para registrar un cobro de **$${Number(amount).toLocaleString('es-AR')}**.`
          : `💰 Te llevo al detalle del presupuesto **#${foundQuote.number}** para registrar un cobro.`,
      };
    }
    return {
      type: 'register_payment',
      params: { amount },
      response: amount
        ? `💰 Te llevo a los presupuestos para registrar un cobro de **$${Number(amount).toLocaleString('es-AR')}**.`
        : '💰 Te llevo a los presupuestos. Elegí el presupuesto y tocá «Registrar cobro» en el menú ⋮',
    };
  }

  // ─── View Quote Detail ───
  if (/^(ver|mostrar|ir\s+a\s+el|abrir)\s+(el\s+)?detalle\s+(del\s+)?presupuesto/.test(text)) {
    const numMatch = text.match(/(\d+)/);
    const quoteNum = numMatch ? numMatch[1] : '';
    if (quoteNum) {
      const found = ctx.quotes.find((q) => q.number === Number(quoteNum));
      if (found) {
        return {
          type: 'navigate',
          params: { view: 'detail', id: found.id },
          response: `🔍 Te llevo al detalle del presupuesto **#${found.number}** (${found.title || found.client.name || 'Sin título'}).`,
        };
      }
      return {
        type: 'navigate',
        params: { view: 'quotes' },
        response: `🔍 No encontré el presupuesto **#${quoteNum}**. Te llevo a la lista.`,
      };
    }
  }

  // ─── Set Status ───
  const statusMap: Record<string, QuoteStatus> = {
    enviado: 'sent',
    aceptado: 'accepted',
    aceptar: 'accepted',
    aceptada: 'accepted',
    rechazado: 'rejected',
    rechazar: 'rejected',
    rechazada: 'rejected',
    expirado: 'expired',
    expirar: 'expired',
    vencido: 'expired',
    vencida: 'expired',
    borrador: 'draft',
  };

  for (const [keyword, status] of Object.entries(statusMap)) {
    if (text.includes(keyword)) {
      // Try to find a quote number
      const numMatch = text.match(/(\d+)/);
      const quoteNum = numMatch ? numMatch[1] : '';

      // Check if there's a matching quote
      let foundQuote = null;
      if (quoteNum) {
        foundQuote = ctx.quotes.find((q) => q.number === Number(quoteNum));
      } else if (/ultimo|ultima|último|última/.test(text)) {
        foundQuote = ctx.quotes[0]; // most recent
      }

      const statusLabels: Record<QuoteStatus, string> = {
        draft: 'borrador',
        sent: 'enviado',
        accepted: 'aceptado',
        rejected: 'rechazado',
        expired: 'expirado',
        partial: 'parcial',
        paid: 'pagado',
      };

      if (foundQuote) {
        return {
          type: 'set_status',
          params: { quoteId: foundQuote.id, status, quoteNumber: String(foundQuote.number) },
          response: `✅ Presupuesto **#${foundQuote.number}** (${foundQuote.title || foundQuote.client.name || 'Sin título'}) marcado como **${statusLabels[status]}**.`,
        };
      }

      // No specific quote found, navigate to list
      return {
        type: 'navigate',
        params: { view: 'quotes' },
        response: quoteNum
          ? `🔍 No encontré el presupuesto **#${quoteNum}**. Te llevo a la lista para que lo busques.`
          : `📋 Te llevo a la lista de presupuestos para que elijas cuál cambiar a **${statusLabels[status]}**.`,
      };
    }
  }

  // ─── Status / Summary ───
  if (/^(resumen|estado|stats|estadisticas|estadísticas|cuantos|cuántos|cuantas|cuántas)/.test(text)) {
    const withClient = ctx.quotes.filter((q) => q.client.name).length;
    const byStatus = ctx.quotes.reduce(
      (acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      type: 'status',
      params: {},
      response: `📊 **Resumen de Nexora:**

📋 Presupuestos: ${ctx.quotesCount}
${Object.entries(byStatus)
  .map(([s, c]) => {
    const labels: Record<string, string> = {
      draft: 'Borradores',
      sent: 'Enviados',
      accepted: 'Aceptados',
      rejected: 'Rechazados',
      expired: 'Vencidos',
    };
    return `   • ${labels[s] || s}: ${c}`;
  })
  .join('\n')}
👤 Clientes: ${ctx.clientsCount}
${withClient > 0 ? `👥 Con cliente asignado: ${withClient}` : ''}

${ctx.quotesCount === 0 ? '💡 ¡Empezá creando tu primer presupuesto con "nuevo presupuesto"!' : '¿Necesitás algo más?'}`,
    };
  }

  // ─── Create Quote ───
  if (
    /^(nuevo|crear|generar|hacer|armar|agregar)\s*(presupuesto|cotizacion|cotización|presup)/.test(text) ||
    /^(presupuesto|cotizacion|cotización)\s*(nuevo|nueva)/.test(text) ||
    text === 'nuevo' ||
    text === 'crear'
  ) {
    // Extract client name
    const clientMatch = text.match(
      /(?:para|con cliente|de|del cliente|para el cliente|para la cliente|de el cliente)\s+(.+?)(?:\s+con\s+|\s+que\s+|$)/,
    );
    const clientName = clientMatch?.[1]?.trim() ?? '';

    // Extract title (optional)
    const titleMatch = text.match(/(?:titulado?|llamado?|título|titulo)\s+["']?(.+?)["']?(?:\s+con\s+|$)/);
    const title = titleMatch?.[1]?.trim() ?? '';

    // Extract items: patterns like "3 diseño a 100000", "5 horas de desarrollo a 50000"
    const items: { description: string; quantity: number; unitPrice: number }[] = [];
    const itemRegex = /(\d+(?:\.\d+)?)\s+(?:de\s+|del\s+|de el\s+)?(.+?)\s+a\s+(\d+(?:[.,]\d+)?)\s*(?:c\/u|cada|por unidad)?/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(text)) !== null) {
      const qty = parseFloat(itemMatch[1]) || 1;
      const desc = itemMatch[2].trim();
      const price = parseFloat(itemMatch[3].replace(/[.,]/g, '')) || 0;
      if (desc && price > 0) {
        items.push({ description: desc, quantity: qty, unitPrice: price });
      }
    }

    // Also try simpler pattern: "diseño 100000" or "diseño a 100000"
    if (items.length === 0) {
      const simpleItemRegex = /(?:con\s+)?(.+?)\s+a\s+(\d+(?:[.,]\d+)?)\s*(?:c\/u|cada|por unidad)?/g;
      while ((itemMatch = simpleItemRegex.exec(text)) !== null) {
        const desc = itemMatch[1].replace(/^(?:con\s+|y\s+|item\s+|concepto\s+)/i, '').trim();
        const price = parseFloat(itemMatch[2].replace(/[.,]/g, '')) || 0;
        if (desc && price > 0 && desc.length > 1) {
          items.push({ description: desc, quantity: 1, unitPrice: price });
        }
      }
    }

    // Build response
    let response = '';
    const params: Record<string, string> = { client: clientName, title };

    if (items.length > 0) {
      params.items = JSON.stringify(items);
      const itemList = items.map((i) => `   • ${i.quantity}x ${i.description} a $${i.unitPrice.toLocaleString('es-AR')}`).join('\n');
      response = `📝 ¡Creando presupuesto${clientName ? ` para **${clientName}**` : ''}!${title ? ` Título: **${title}**` : ''}\n\n📦 Items:\n${itemList}\n\nTe llevo al formulario completado.`;
    } else if (clientName) {
      response = `📝 ¡Creando nuevo presupuesto para **${clientName}**! Te llevo al formulario.`;
    } else {
      response = `📝 ¡Te llevo al formulario de nuevo presupuesto! Ahí podés completar los datos.`;
    }

    return {
      type: 'create_quote',
      params,
      response,
    };
  }

  // ─── Duplicate ───
  if (/duplicar|copiar/.test(text)) {
    const numMatch = text.match(/(\d+)/);
    const quoteNum = numMatch ? numMatch[1] : '';

    if (quoteNum) {
      const found = ctx.quotes.find((q) => q.number === Number(quoteNum));
      if (found) {
        return {
          type: 'duplicate',
          params: { quoteId: found.id },
          response: `📋 Duplicando presupuesto **#${found.number}**...`,
        };
      }
      return {
        type: 'navigate',
        params: { view: 'quotes' },
        response: `🔍 No encontré el presupuesto **#${quoteNum}**. Te llevo a la lista.`,
      };
    }

    // Duplicate the most recent
    if (ctx.quotes.length > 0) {
      const latest = ctx.quotes[0];
      return {
        type: 'duplicate',
        params: { quoteId: latest.id },
        response: `📋 Duplicando presupuesto **#${latest.number}** (${latest.title || latest.client.name || 'Sin título'})...`,
      };
    }

    return {
      type: 'create_quote',
      params: {},
      response: `📝 No hay presupuestos para duplicar. Creá uno nuevo.`,
    };
  }

  // ─── Delete Quote ───
  if (/eliminar|borrar|quitar|suprimir/.test(text)) {
    const numMatch = text.match(/(\d+)/);
    const quoteNum = numMatch ? numMatch[1] : '';

    if (quoteNum) {
      const found = ctx.quotes.find((q) => q.number === Number(quoteNum));
      if (found) {
        return {
          type: 'delete_quote',
          params: { quoteId: found.id, quoteNumber: String(found.number) },
          response: `🗑️ Eliminando presupuesto **#${found.number}**...`,
        };
      }
      return {
        type: 'navigate',
        params: { view: 'quotes' },
        response: `🔍 No encontré el presupuesto **#${quoteNum}**. Te llevo a la lista.`,
      };
    }

    return {
      type: 'navigate',
      params: { view: 'quotes' },
      response: `📋 Te llevo a la lista de presupuestos. Ahí podés eliminar el que necesites haciendo clic en su menú ⋮`,
    };
  }

  // ─── View quotes by client ───
  // Matches: "ver presupuesto de Juan", "presupuestos de García", "quiero ver el presupuesto de López",
  //          "mostrar presupuestos de Pérez", "ver los presupuestos de Carlos"
  const viewByClientMatch = text.match(
    /(?:ver|mostrar|mostrame|mostrá|ver los|ver las|ver un|ver una|quiero ver|necesito ver|andá a ver|busco los?|quiero ver el|quiero ver la)\s+(?:los?\s+|las?\s+|el\s+|la\s+|un\s+|una\s+)?(?:presupuesto|cotizacion|cotización|presup)s?\s+(?:de|del|de el|para|para el|para la|asignado a|hecho a|de el cliente|del cliente)\s+(.+)/,
  );
  if (viewByClientMatch) {
    const clientName = viewByClientMatch[1].trim();
    // Try to find an exact client match first
    const exactClient = ctx.clients.find(
      (c) => c.name.toLowerCase().includes(clientName.toLowerCase()),
    );
    const searchName = exactClient?.name ?? clientName;
    const matchCount = ctx.quotes.filter(
      (q) => q.client.name.toLowerCase().includes(searchName.toLowerCase()),
    ).length;
    if (matchCount === 1) {
      // Only one match — go directly to that quote's detail
      const found = ctx.quotes.find((q) =>
        q.client.name.toLowerCase().includes(searchName.toLowerCase()),
      );
      if (found) {
        return {
          type: 'navigate',
          params: { view: 'detail', id: found.id },
          response: `🔍 Encontré el presupuesto de **${found.client.name}** (${found.title || 'Sin título'}). Te llevo al detalle.`,
        };
      }
    }
    return {
      type: 'search_quote',
      params: { query: searchName },
      response:
        matchCount > 0
          ? `🔍 Encontré **${matchCount}** presupuesto${matchCount > 1 ? 's' : ''} de **${searchName}**. Te llevo a la lista filtrada.`
          : `🔍 No encontré presupuestos de "${clientName}". Te llevo a la lista para que busques manualmente.`,
    };
  }

  // ─── Add Client ───
  if (/^(agregar|crear|nuevo|nueva|añadir|agrega|crea|nuevo)\s+(cliente|clien)/.test(text) ||
      /^(cliente|clien)\s+(nuevo|nueva|nuevo|crear|agregar)/.test(text)) {
    return {
      type: 'add_client',
      params: {},
      response: '👤 Te llevo a la sección de clientes para agregar uno nuevo. El formulario se abrirá automáticamente.',
    };
  }

  // ─── Add Product ───
  if (/^(agregar|crear|nuevo|nueva|añadir|agrega|crea|nuevo)\s+(producto|servicio|product)/.test(text) ||
      /^(producto|servicio|product)\s+(nuevo|nueva|nuevo|crear|agregar)/.test(text)) {
    return {
      type: 'add_product',
      params: {},
      response: '📦 Te llevo a la sección de productos para agregar uno nuevo. El formulario se abrirá automáticamente.',
    };
  }

  // ─── Search ───
  if (/buscar|busca|search|encontrar|encontrá|lookup/.test(text)) {
    // Clean the search query: remove common words
    const searchQuery = text
      .replace(/buscar|busca|search|encontrar|encontrá|lookup/g, '')
      .replace(/presupuesto|presup|cotizacion|cotización|el|la|los|las|del|de|num|numero|número|#|n°/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (/cliente|clien/.test(text)) {
      return {
        type: 'search_client',
        params: { query: searchQuery },
        response: searchQuery
          ? `🔍 Buscando clientes con "${searchQuery}"... Te llevo a la sección.`
          : '🔍 Te llevo a la sección de clientes.',
      };
    }

    // Search for a specific quote by number
    const numMatch = searchQuery.match(/(\d+)/);
    if (numMatch) {
      const found = ctx.quotes.find((q) => q.number === Number(numMatch[1]));
      if (found) {
        return {
          type: 'navigate',
          params: { view: 'detail', id: found.id },
          response: `🔍 Encontré el presupuesto **#${found.number}** (${found.title || found.client.name || 'Sin título'}). Te llevo a su detalle.`,
        };
      }
      // Number not found, search by number as text
      return {
        type: 'search_quote',
        params: { query: numMatch[1] },
        response: `🔍 No encontré un presupuesto con número **#${numMatch[1]}**. Buscando por texto...`,
      };
    }

    return {
      type: 'search_quote',
      params: { query: searchQuery },
      response: searchQuery
        ? `🔍 Buscando presupuestos con "${searchQuery}"...`
        : '🔍 Te llevo a la lista de presupuestos.',
    };
  }

  // ─── Navigate ───
  const navMap: Record<string, View['name']> = {
    presupuesto: 'quotes',
    presupuestos: 'quotes',
    cotizacion: 'quotes',
    cotizaciones: 'quotes',
    plantilla: 'templates',
    plantillas: 'templates',
    template: 'templates',
    cliente: 'clients',
    clientes: 'clients',
    producto: 'products',
    productos: 'products',
    configuracion: 'settings',
    'configuración': 'settings',
    settings: 'settings',
    manual: 'manual',
    ayuda: 'manual',
    inicio: 'dashboard',
    panel: 'dashboard',
    dashboard: 'dashboard',
    principal: 'dashboard',
  };

  const navMatch = text.match(
    /^(?:ir a|ver|abrir|mostrar|mostrame|mostrá|andá a|navegar a|navegá a)\s+(.+)/,
  );
  const target = navMatch ? navMatch[1].trim() : text;

  for (const [keyword, viewName] of Object.entries(navMap)) {
    if (target.includes(keyword)) {
      const labels: Record<string, string> = {
        quotes: 'presupuestos',
        templates: 'plantillas',
        clients: 'clientes',
        products: 'productos',
        settings: 'configuración',
        manual: 'el manual',
        dashboard: 'el panel principal',
      };
      return {
        type: 'navigate',
        params: { view: viewName },
        response: `🚀 Te llevo a **${labels[viewName]}**.`,
      };
    }
  }

  // ─── Unknown ───
  return {
    type: 'unknown',
    params: {},
    response: `🤔 No estoy seguro de qué querés hacer. Probá con:
• "nuevo presupuesto"
• "buscar [nombre]"
• "ir a facturas"
• "marcar enviado"
• "registrar cobro"
• "ayuda" para ver todos los comandos`,
  };
}

// ─── Voice Recognition Hook ──────────────────────────────────────────────────

interface UseVoiceRecognition {
  isSupported: boolean;
  isListening: boolean;
  start: () => void;
  stop: () => void;
}

function useVoiceRecognition(onResult: (text: string) => void): UseVoiceRecognition {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR'; // Spanish (Argentina)
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [isSupported, onResult]);

  const start = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // already started
      }
    }
  }, [isListening]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return { isSupported, isListening, start, stop };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AssistantBot({ onNavigate }: { onNavigate: (v: View) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '👋 ¡Hola! Soy el asistente de Nexora. Decime qué necesitás y lo hago por vos.\n\n🎙️ Podés escribirme o tocá el 🎤 y hablame directamente.\n\n• "nuevo presupuesto"\n• "buscar Juan"\n• "ayuda"',
      timestamp: Date.now(),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    quotes,
    clients,
    setQuoteStatus,
    duplicateQuote,
    deleteQuote,
    registerPayment,
    exportData,
    applyBusinessToAll,
    pushToast,
  } = useApp();

  const ctx = useMemo(
    () => ({
      quotes: quotes.map((q) => ({
        id: q.id,
        number: q.number,
        title: q.title,
        status: q.status,
        client: { name: q.client.name },
      })),
      clients: clients.map((c) => ({ id: c.id, name: c.name })),
      quotesCount: quotes.length,
      clientsCount: clients.length,
    }),
    [quotes, clients],
  );

  const executeIntent = useCallback(
    (intent: Intent) => {
      switch (intent.type) {
        case 'navigate': {
          const viewName = intent.params.view as View['name'];
          if (viewName === 'detail' && intent.params.id) {
            onNavigate({ name: 'detail', id: intent.params.id });
          } else if (viewName === 'quotes' && intent.params.query) {
            onNavigate({ name: 'quotes', search: intent.params.query });
          } else {
            onNavigate({ name: viewName } as View);
          }
          break;
        }
        case 'create_quote': {
          // Build prefill data from params
          const prefill: QuoteDraft | undefined = intent.params.client || intent.params.items ? {
            date: new Date().toISOString().slice(0, 10),
            expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            title: intent.params.title || '',
            observations: '',
            client: {
              name: intent.params.client || '',
              document: '',
              phone: '',
              email: '',
              address: '',
            },
            items: intent.params.items
              ? (JSON.parse(intent.params.items) as { description: string; quantity: number; unitPrice: number }[]).map(
                  (it) => ({
                    id: uid(),
                    description: it.description,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    discountPct: 0,
                  }),
                )
              : [{ ...emptyItem(), id: uid() }],
            discountPct: 0,
            ivaPct: 21,
          } : undefined;
          onNavigate({ name: 'new', prefill });
          break;
        }
        case 'add_client':
          onNavigate({ name: 'clients', openModal: true });
          break;
        case 'add_product':
          onNavigate({ name: 'products', openModal: true });
          break;
        case 'search_quote':
          onNavigate({ name: 'quotes', search: intent.params.query || '' });
          break;
        case 'search_client':
          onNavigate({ name: 'clients' });
          break;
        case 'duplicate': {
          const qId = intent.params.quoteId;
          if (qId) {
            const result = duplicateQuote(qId);
            if (result) {
              pushToast('success', `Presupuesto #${result.number} duplicado.`);
              onNavigate({ name: 'edit', id: result.id });
            } else {
              pushToast('error', 'No se pudo duplicar el presupuesto.');
            }
          } else {
            onNavigate({ name: 'quotes' });
          }
          break;
        }
        case 'set_status': {
          const qId = intent.params.quoteId;
          const status = intent.params.status as QuoteStatus;
          if (qId && status) {
            setQuoteStatus(qId, status);
            pushToast('success', `Estado cambiado a "${status}".`);
          } else {
            onNavigate({ name: 'quotes' });
          }
          break;
        }
        case 'delete_quote': {
          const qId = intent.params.quoteId;
          if (qId) {
            deleteQuote(qId);
            pushToast('success', `Presupuesto #${intent.params.quoteNumber} eliminado.`);
          } else {
            onNavigate({ name: 'quotes' });
          }
          break;
        }
        case 'mark_paid': {
          const qId = intent.params.quoteId;
          if (qId) {
            const q = quotes.find((qq) => qq.id === qId);
            if (q) {
              const total = computeTotals(q.items, q.discountPct, q.ivaPct).total;
              const paid = paymentsTotal(q.payments);
              const remaining = Math.max(0, total - paid);
              if (remaining > 0) {
                registerPayment(qId, remaining);
                pushToast('success', `Presupuesto #${intent.params.quoteNumber} marcado como pagado.`);
              } else {
                pushToast('info', `El presupuesto #${intent.params.quoteNumber} ya está pagado.`);
              }
            }
          } else {
            onNavigate({ name: 'quotes' });
          }
          break;
        }
        case 'register_payment':
          onNavigate({ name: 'quotes' });
          break;
        case 'export_data':
          exportData();
          break;
        case 'import_data':
          onNavigate({ name: 'settings' });
          break;
        case 'apply_business': {
          const count = applyBusinessToAll();
          pushToast('success', `Datos del negocio aplicados a ${count} documentos.`);
          onNavigate({ name: 'settings' });
          break;
        }
        default:
          break;
      }
    },
    [onNavigate, setQuoteStatus, duplicateQuote, deleteQuote, exportData, applyBusinessToAll, pushToast],
  );

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };

    const intent = parseIntent(text, ctx);

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      text: intent.response,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');

    // Execute action after a short delay
    setTimeout(() => executeIntent(intent), 400);
  }, [input, ctx, executeIntent]);

  // Voice recognition
  const handleVoiceResult = useCallback(
    (transcript: string) => {
      setInput(transcript);
      // Auto-send after voice input
      setTimeout(() => {
        const userMsg: ChatMessage = {
          id: `u-voice-${Date.now()}`,
          role: 'user',
          text: `🎙️ "${transcript}"`,
          timestamp: Date.now(),
        };
        const intent = parseIntent(transcript, ctx);
        const assistantMsg: ChatMessage = {
          id: `a-voice-${Date.now()}`,
          role: 'assistant',
          text: intent.response,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setInput('');
        setTimeout(() => executeIntent(intent), 400);
      }, 200);
    },
    [ctx, executeIntent],
  );

  const voice = useVoiceRecognition(handleVoiceResult);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const quickActions = useMemo(
    () => [
      { label: '📝 Nuevo', action: 'nuevo presupuesto' },
      { label: '📋 Lista', action: 'ir a presupuestos' },
      { label: '👤 Clientes', action: 'ver clientes' },
      { label: '📊 Resumen', action: 'resumen' },
      { label: '❓ Ayuda', action: 'ayuda' },
    ],
    [],
  );

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'fixed z-[85] flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all duration-200',
          'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:brightness-110 active:scale-95',
          'bottom-24 right-4 sm:bottom-6 sm:right-6',
        )}
        title="Asistente de Nexora"
        aria-label="Abrir asistente"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            'animate-modal fixed z-[84] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900',
            'bottom-40 right-4 w-[calc(100vw-2rem)] max-w-sm sm:bottom-20 sm:right-6',
            'max-h-[70vh]',
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Asistente Nexora</p>
              <p className="text-[11px] text-indigo-200">
                {voice.isListening ? '🎙️ Escuchando...' : 'Siempre listo para ayudarte'}
              </p>
            </div>
            {voice.isListening && (
              <div className="flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 200 }}>
            {messages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-bl-md',
                  )}
                >
                  <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }} />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions - siempre visible */}
          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
            {quickActions.map((qa) => (
              <button
                key={qa.action}
                onClick={() => {
                  const userMsg: ChatMessage = {
                    id: `u-${Date.now()}`,
                    role: 'user',
                    text: qa.action,
                    timestamp: Date.now(),
                  };
                  const intent = parseIntent(qa.action, ctx);
                  const assistantMsg: ChatMessage = {
                    id: `a-${Date.now()}`,
                    role: 'assistant',
                    text: intent.response,
                    timestamp: Date.now(),
                  };
                  setMessages((prev) => [...prev, userMsg, assistantMsg]);
                  setTimeout(() => executeIntent(intent), 400);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
              >
                {qa.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribí o hablá..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />

            {/* Microphone Button */}
            {voice.isSupported && (
              <button
                onClick={voice.isListening ? voice.stop : voice.start}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                  voice.isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                )}
                title={voice.isListening ? 'Detener micrófono' : 'Hablar'}
                aria-label={voice.isListening ? 'Detener micrófono' : 'Hablar'}
              >
                {voice.isListening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              </button>
            )}

            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Simple markdown formatter (bold + code) ─────────────────────────────────

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-slate-200 px-1 py-0.5 text-[12px] dark:bg-slate-700">$1</code>')
    .replace(/\n/g, '<br />');
}
