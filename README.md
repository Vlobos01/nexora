# Nexora · Generador de presupuestos PWA

Nexora (de *nexo*): une al profesional con su cliente mediante una propuesta. Versión demo:
los datos se guardan **solo en este dispositivo** (localStorage) y nunca se envían a internet.

Aplicación web profesional para crear, gestionar y exportar presupuestos en PDF.
**Funciona 100% sin conexión**: todos los datos viven en `localStorage` del navegador
y nunca se envían a ningún servidor.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Service Worker offline (Workbox via `vite-plugin-pwa`)
- jsPDF + jspdf-autotable para PDFs profesionales
- LocalStorage para persistencia (presupuestos, plantillas, configuración)

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo
npm run build      # typecheck + build de producción (con PWA)
npm run preview    # probar el build (probá el modo offline acá)
npm run icons      # regenerar íconos PNG de la PWA
```

## Funcionalidades

- **Dashboard**: total presupuestado, estados (borrador/enviado/aceptado/rechazado/vencido),
  facturación por mes, búsqueda rápida.
- **Crear presupuesto**: datos del negocio (reutilizados automáticamente), cliente, fechas,
  conceptos dinámicos con descuento por ítem, descuento general, IVA configurable (0/5/10,5/21/27
  o personalizado), numeración consecutiva automática.
- **PDF profesional**: logo, datos del negocio y cliente, tabla de conceptos, totales, importe en
  letras, observaciones, condiciones comerciales y colores configurables. Botones de vista previa,
  descargar, imprimir y compartir (Web Share API).
- **Historial**: buscar, filtrar por estado y fecha, ordenar, editar, duplicar, cambiar estado,
  eliminar, volver a descargar el PDF y exportar a CSV/Excel (presupuestos y clientes).
- **Plantillas**: guardar presupuestos como plantilla (ej. "Desarrollo de Landing Page") y
  reutilizarlos en un clic.
- **Clientes**: sección dedicada a la libreta, con buscador, presupuestado por cliente y
  autocompletado al crear presupuestos (también con acceso rápido desde el formulario y el detalle).
- **Productos y servicios**: catálogo propio con precio unitario, unidad (hora, m², día…),
  búsqueda, facturación por producto y export CSV. Al escribir un concepto en el formulario se
  sugieren los productos guardados (y los usados en presupuestos anteriores) y completan
  descripción y precio automáticamente.
- **Configuración**: negocio + logo, moneda, IVA, numeración, condiciones, colores del PDF, modo
  claro/oscuro, preset "Blanco y negro" (ahorro de tinta, solo negro), envíos (WhatsApp/email/compartir
  nativo, desactivados por defecto) y botón para aplicar los colores y datos actuales a todos los
  presupuestos existentes.
- **Datos**: exportar copia de seguridad JSON e importar para restaurar.
- **PWA instalable** con íconos, modo standalone y aviso de instalación.

## Verificación offline

1. `npm run build` y `npm run preview`.
2. Abrí la app una vez (esto cachea todos los recursos).
3. Desactivá la conexión: la app sigue funcionando y guardando datos.
4. La barra ámbar "Sin conexión" confirma que estás en modo offline.
