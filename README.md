# Nexora · Generador de presupuestos PWA

Nexora (de *nexo*): une al profesional con su cliente mediante una propuesta. Versión demo:
los datos se guardan **solo en este dispositivo** (IndexedDB) y nunca se envían a internet.

Aplicación web profesional para crear, gestionar y exportar presupuestos en PDF.
**Funciona 100% sin conexión**: todos los datos viven en `IndexedDB`, la base de datos
local del navegador (vía Dexie.js), y nunca se envían a ningún servidor.

🌐 **App publicada**: https://nexora-pied-mu.vercel.app

📖 **¿Cómo se usa?** → [Manual de uso](MANUAL.md)

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Service Worker offline (Workbox via `vite-plugin-pwa`)
- jsPDF + jspdf-autotable para PDFs profesionales
- IndexedDB + Dexie.js para persistencia (presupuestos, plantillas, configuración)

## Comandos

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo
npm run build      # typecheck + build de producción (con PWA)
npm run preview    # probar el build (probá el modo offline acá)
npm test           # tests unitarios (vitest) de cálculo, dinero y fechas
npm run icons      # regenerar íconos PNG de la PWA
```

## Funcionalidades

**Presupuestos**

- Crear presupuestos profesionales con los datos del negocio (se reutilizan automáticamente),
  cliente, fechas, título y observaciones.
- Conceptos dinámicos con cantidad, precio unitario, descuento por ítem, descuento general e IVA
  configurable (0 / 5 / 10,5 / 21 / 27 o personalizado).
- **Numeración consecutiva automática** e independiente para presupuestos (P-0001) y facturas
  (F-0001).
- **Borrador automático**: si salís a mitad de camino, el trabajo se restaura la próxima vez
  (con aviso de cambios sin guardar al cerrar la pestaña).
- **Autocompletado** de clientes y productos mientras escribís, y botón para guardar el cliente en
  la libreta desde el propio formulario.
- **Plantillas** reutilizables (ej. "Desarrollo de Landing Page") y botón "desde plantilla".
- Duplicar, editar, cambiar estado y eliminar.

**PDF profesional**

- Logo, datos del negocio y del cliente, tabla de conceptos, totales, importe en letras,
  observaciones y condiciones comerciales.
- **Colores configurables** y preset **"blanco y negro"** para ahorrar tinta.
- Vista previa, descargar, imprimir, compartir nativo (Web Share), WhatsApp y email.

**Facturas y cobros**

- Crear la factura **con un clic** desde cualquier presupuesto **aceptado**.
- Estados: pendiente / **parcial** / cobrada, con búsqueda y filtros (incluido "Parciales").
- **Cobros parciales con historial**: registrar cobros (parciales o totales) con su fecha, ver el
  historial por factura, corregir errores eliminando un cobro y ver el **saldo pendiente** — desde
  la sección Facturas y desde el detalle del presupuesto.
- Resumen de facturado / cobrado / pendiente.

**Gestión**

- **Dashboard**: total presupuestado, estados, tasa de conversión (aceptados / enviados),
  facturación por mes y búsqueda rápida.
- **Historial**: buscar, filtrar por estado y fecha, ordenar, editar, duplicar, cambiar estado,
  eliminar, volver a descargar el PDF y exportar a CSV/Excel.
- **Clientes**: libreta con buscador, presupuestado por cliente y autocompletado.
- **Productos y servicios**: catálogo con precio unitario, unidad (hora, m², día…), búsqueda,
  facturación por producto y export CSV. Al escribir un concepto se sugieren los guardados (y los
  usados en presupuestos anteriores) completando descripción y precio.
- **Configuración**: negocio + logo, moneda, IVA, numeración, condiciones comerciales, colores del
  PDF, tema claro/oscuro y opciones de envío (WhatsApp / email / compartir nativo, desactivadas por
  defecto). Botón para aplicar los colores y datos actuales a todos los presupuestos existentes.
- **Datos**: exportar copia de seguridad JSON e importar para restaurar.

**PWA**

- Instalable en el dispositivo (íconos, modo standalone y aviso de instalación).
- **100% offline**: todos los datos viven en IndexedDB, la base de datos local del navegador;
  nunca se envían a internet.
- Tema oscuro por defecto (claro/oscuro/sistema).

## Problemas que resuelve

- **Perder tiempo armando propuestas desde cero** → plantillas, autocompletado de clientes y
  productos, y datos del negocio reutilizados automáticamente.
- **Perder el trabajo a mitad de camino** → borrador automático y aviso de cambios sin guardar.
- **Errores de cálculo** → descuentos, IVA, totales e importe en letras calculados al instante.
- **No saber qué propuestas cerraron** → estados por presupuesto y tasa de conversión en el
  dashboard para hacer seguimiento.
- **Olvidar facturar lo aceptado** → la factura se crea en un clic desde el presupuesto.
- **Perder el registro de qué te deben** → facturas con estados y resumen de cobrado/pendiente.
- **Cobros en cuotas o señas** → cobros parciales con historial y saldo pendiente por factura.
- **Numeración inconsistente** → numeración automática e independiente para presupuestos y
  facturas.
- **PDFs que no se ven profesionales** → PDF con logo, colores configurables e importe en letras.
- **Gastar tinta en impresiones** → preset "blanco y negro".
- **Depender de internet o pagar servidores** → PWA 100% offline con base de datos local
  (IndexedDB): gratis, sin backend y sin límite práctico de espacio.
- **Perder los datos al cambiar de dispositivo** → copia de seguridad JSON (exportar/importar).
- **Enviar la propuesta al cliente** → WhatsApp, email o compartir nativo con el PDF listo.

## Verificación offline

1. `npm run build` y `npm run preview`.
2. Abrí la app una vez (esto cachea todos los recursos).
3. Desactivá la conexión: la app sigue funcionando y guardando datos.
4. La barra ámbar "Sin conexión" confirma que estás en modo offline.
