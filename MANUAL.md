# Nexora · Manual de uso

Guía paso a paso para usar Nexora, el generador de presupuestos que funciona
**100% sin conexión** y guarda tus datos **solo en tu dispositivo** (nada se envía a internet).

---

## 1. ¿Qué es Nexora?

Nexora es una aplicación para profesionales y pequeños negocios que necesitan:

- **Crear presupuestos profesionales** en pocos minutos (con tu logo, tus datos y tus condiciones).
- **Enviarlos al cliente** como PDF (por WhatsApp, email o compartir nativo).
- **Hacer seguimiento**: saber qué propuestas están enviadas, aceptadas, rechazadas o vencidas.
- **Controlar los cobros** de lo aceptado: cuánto te pagaron, cuánto falta y el historial de cada cobro.

No necesitás internet para trabajar ni pagar ningún servidor: toda la información vive en la base de
datos local del navegador (IndexedDB).

---

## 2. Primeros pasos

### Abrir la app
- Abrí la app desde cualquier navegador (celular o computadora) en:

  **https://nexora-pied-mu.vercel.app**

- Funciona igual en el celular y en la PC, y no hace falta instalar nada para empezar.
- La primera pantalla es el **Inicio** (dashboard), con un resumen de tu actividad.

### Instalarla en tu dispositivo (opcional)
Nexora es una PWA: podés instalarla como una app más del celular o la PC.
- **Android/Chrome**: tocá el aviso de instalación o el menú del navegador → *Instalar aplicación*.
- **Configuración → Datos y privacidad → Instalar aplicación** (si el botón aparece, está disponible).

### Navegación
Las secciones son:

| Sección | Para qué sirve |
|---|---|
| **Inicio** | Dashboard: totales, estados, tasa de conversión, facturación por mes |
| **Presupuestos** | Crear, buscar y gestionar tus propuestas |
| **Plantillas** | Guardar y reutilizar presupuestos tipo |
| **Clientes** | Tu libreta de clientes |
| **Productos** | Catálogo de productos/servicios con precios |
| **Manual** | Esta guía, siempre disponible dentro de la app |
| **Configuración** | Datos del negocio, moneda, IVA, numeración, colores, tema, envíos, respaldo |

- En **celular** la barra inferior muestra Inicio, Presupuestos, un botón central **+** para crear un
  presupuesto, Clientes y Productos; el resto de secciones están en el menú (☰).
- En **computadora** el menú lateral muestra todas las secciones.

---

## 3. Configuración inicial (hacela una sola vez)

Entrá a **Configuración** y completá:

1. **Datos del negocio**: nombre, CUIT, teléfono, email, dirección y **condiciones comerciales**
   (ej. "validez 30 días", "anticipo 50%"). Estos datos se reutilizan automáticamente en cada
   presupuesto y PDF. Podés **subir tu logo** (PNG/JPG/WebP; se redimensiona solo y ves una vista
   previa de cómo quedará en el PDF).
2. **Presupuestos**: moneda (ARS, USD, EUR…), **IVA predeterminado** (21% por defecto), prefijo de
   numeración (`P`) y número inicial. Los números son **consecutivos y nunca se repiten**, aunque
   elimines presupuestos.
3. **Colores del PDF**: elegí un preset (Índigo, Esmeralda, Borgoña…) o colores a medida, o el preset
   **"Blanco y negro"** para ahorrar tinta al imprimir.
4. **Envíos y compartir**: activá solo lo que quieras usar (WhatsApp, email, compartir nativo). Están
   **desactivados por defecto**; hasta que no los actives, el botón "Enviar" no aparece.
5. **Apariencia**: modo **Claro**, **Oscuro** (el que viene por defecto) o **Sistema**.
6. Tocá **Guardar cambios**.

> 💡 El botón **"Aplicar a presupuestos existentes"** actualiza los PDF ya creados con los nuevos
> colores y datos del negocio (útil si cambiaste el logo o las condiciones).

---

## 4. Crear un presupuesto (paso a paso)

1. Tocá **+ Nuevo presupuesto** (desde Inicio, la barra inferior o la sección Presupuestos).
2. **Cliente**: escribí el nombre — se autocompleta con tu libreta y con clientes usados antes.
   Completá documento, teléfono, email y dirección si los tenés. Con el botón 📇 podés guardarlo en
   la libreta directamente.
3. **Fechas**: fecha de emisión y de vencimiento (viene con 30 días por defecto).
4. **Título / descripción del trabajo** (ej. "Desarrollo de landing page") y **observaciones**
   (forma de pago, plazos, garantías…). Ambos aparecen en el PDF.
5. **Conceptos** (productos o servicios): escribí la descripción — se sugieren los de tu catálogo y
   completan precio automáticamente. Indicá **cantidad**, **precio unitario** y **descuento %** por
   ítem. Usá "Agregar concepto" para sumar filas y las flechas para reordenar.
6. **Descuento general** e **IVA** (0/5/10,5/21/27 o personalizado) están en el panel Resumen.
7. El **Resumen** calcula todo al instante (subtotal, descuentos, IVA y total).
8. Tocá **Guardar presupuesto**.

Después de guardar, Nexora te lleva al **detalle** del presupuesto, donde podés ver el PDF, cambiar
el estado, registrar cobros, duplicarlo, guardarlo como plantilla o eliminar.

> 💡 **Borrador automático**: si salís a mitad de camino sin guardar, la próxima vez la app te
> ofrece continuar donde quedaste (o descartarlo). También te avisa si cerrás la pestaña con cambios
> sin guardar.

> 🤖 **Asistente**: el botón flotante de chat permite hacer cosas por comando, por ejemplo
> `nuevo presupuesto`, `buscar Juan`, `registrar cobro de 50000 en presupuesto 3` o `ayuda`.

---

## 5. El PDF

Desde el detalle de un presupuesto (o desde el historial):

- **Vista previa**: abrí el PDF para revisarlo antes de enviar.
- **Descargar PDF**: guarda el archivo en tu dispositivo.
- **Imprimir**: imprime directamente.
- **Enviar** (si lo activaste en Configuración): abre **WhatsApp** con el mensaje armado, tu correo
  con el asunto y cuerpo listos, o el **menú de compartir** del sistema para mandarlo por donde
  quieras.

El PDF incluye tu logo, los datos del negocio y del cliente, la tabla de conceptos, los totales, el
**importe en letras**, las observaciones y las condiciones comerciales.

---

## 6. Estados y seguimiento

Cada presupuesto tiene un estado:

- **Borrador** — lo estás armando.
- **Enviado** — se lo mandaste al cliente.
- **Aceptado** — el cliente lo aprobó (acá podés registrar cobros).
- **Rechazado** — no cerró.
- **Vencido** — pasó la fecha de vencimiento sin respuesta (Nexora lo marca solo).

**Cómo cambiar el estado**: en el detalle del presupuesto, desplegá "Cambiar estado", o desde el
menú de 3 puntitos (⋮) en la lista.

El **dashboard** te muestra cuántos presupuestos hay en cada estado, el total presupuestado y tu
**tasa de conversión** (porcentaje de los que salieron de borrador que terminaron aceptados) para
que sepas qué tan bien te está yendo.

---

## 7. Plantillas

Si repetís trabajos parecidos (ej. "Desarrollo de landing page", "Mantenimiento mensual"):

1. Armá un presupuesto completo.
2. Desde el detalle o el formulario, elegí **guardar como plantilla**.
3. La próxima vez, en **Plantillas** tocá la plantilla y se precarga todo: conceptos, precios y
   textos. Solo cambiás el cliente y la fecha.
4. Podés **editar** una plantilla cuando cambien tus precios o textos.

También podés **agregar conceptos desde una plantilla** dentro de un presupuesto en curso
(botón "+ Desde plantilla").

---

## 8. Cobros (señas y pagos en cuotas)

Los cobros se registran **sobre el presupuesto aceptado** (Nexora no emite comprobantes fiscales: es
un control interno de lo que te deben).

### Registrar un cobro
1. Abrí el detalle del presupuesto **aceptado**.
2. Tocá **Registrar cobro**.
3. Ingresá el **monto de este cobro** (se suma a lo ya cobrado). Podés usar los atajos
   **"Saldo completo"** o **"50%"**.
4. Confirmá. El cobro queda registrado con la **fecha de hoy** y el saldo pendiente se actualiza solo.

### Estado del cobro
- **Sin cobros** — no se cobró nada.
- **Parcial** — se cobró parte del total.
- **Cobrado** — se pagó el total.

### Historial y saldo
- En el detalle del presupuesto ves siempre **Cobrado** y **Saldo pendiente**.
- **Ver cobros** muestra cada pago con su monto y fecha.
- Podés **eliminar un cobro** para corregir un error: el saldo y el estado se recalculan solos.

> 💡 Ideal para cobros en cuotas o con seña: registrá cada pago cuando lo recibís y siempre vas a
> saber cuánto te falta cobrar.

---

## 9. Clientes (libreta)

En **Clientes**:
- Agregá clientes con documento, teléfono, email y dirección.
- **Buscá** por nombre, documento, email o teléfono.
- Ves el **total presupuestado por cliente**.
- Al crear un presupuesto, el nombre se **autocompleta** con la libreta.
- Exportá la lista a **CSV** para usarla en Excel.

---

## 10. Productos y servicios (catálogo)

En **Productos**:
- Cargá tus productos/servicios con **precio unitario**, **unidad** (hora, m², día, unidad…) e
  **imagen opcional**.
- **Buscá** por nombre, unidad o descripción.
- Ves la **facturación por producto** y podés exportar a **CSV**.
- Al escribir un concepto en un presupuesto, se **sugieren** los del catálogo (y los usados en
  presupuestos anteriores) y completan descripción y precio automáticamente.

---

## 11. Historial y exportación

En **Presupuestos**:
- **Buscá** por cliente, número o título.
- **Filtrá** por estado y por fecha, y **ordená** la lista.
- Desde el menú ⋮ de cada presupuesto: ver detalle, **editar**, **duplicar**, cambiar estado,
  eliminar, descargar el PDF de nuevo.
- **Exportar CSV**: presupuestos, clientes y productos se exportan a CSV (abre con Excel).

---

## 12. Dashboard (Inicio)

El Inicio te da una foto rápida del negocio:

- **Total presupuestado** y cantidad por estado (borrador / enviado / aceptado / rechazado / vencido).
- **Tasa de conversión**: qué porcentaje de tus propuestas cerrás.
- **Facturación por mes** (últimos 6 meses), con toggle para ver solo lo aceptado.
- **Presupuestos recientes** y búsqueda rápida para saltar a cualquier presupuesto.

---

## 13. Datos y privacidad

- Tus datos viven **solo en este dispositivo** y **nunca se envían a internet**.
- **Exportar datos (JSON)**: genera una copia de seguridad con todo (presupuestos, plantillas,
  clientes, productos y configuración). Guardala en un lugar seguro.
- **Importar datos**: restaura una copia (reemplaza los datos actuales).
- **Restablecer todos los datos**: borra todo (no se puede deshacer).

> ⚠️ Si borrás los datos del navegador, cambiás de dispositivo o usás la app en otro equipo, los
> datos no viajan solos: **exportá una copia** y volvé a importarla en el otro dispositivo.

---

## 14. Funcionamiento sin conexión

- Nexora funciona **sin internet**: abrí la app una vez con conexión (para que se descargue) y
  después podés trabajar donde sea; los datos se guardan igual.
- Si te quedás sin conexión, aparece la barra ámbar **"Sin conexión"**; seguí trabajando normal.
- Al estar instalada como PWA, la abrís desde el ícono como cualquier app.

---

## 15. Preguntas frecuentes

**¿Dónde están mis datos?**
En la base de datos local del navegador (IndexedDB), en este dispositivo. No se envían a ningún
servidor.

**¿Puedo usar Nexora en dos dispositivos?**
No se sincronizan solos. Exportá el JSON en uno e importalo en el otro. (Mantené las copias
actualizadas si trabajás en varios lados.)

**¿Qué pasa si elimino un presupuesto por error?**
Se borra de forma permanente (la app te pide confirmación). Por eso conviene exportar copias de
seguridad de vez en cuando.

**¿Cómo hago para que la numeración empiece de nuevo?**
En Configuración podés cambiar el prefijo y el número inicial. Los números siguientes se generan
solos y no se repiten.

**¿Cómo registro una seña o un pago en cuotas?**
En el detalle del presupuesto aceptado, usá "Registrar cobro" cada vez que recibas un pago: anotá el
monto y quedará en el historial con la fecha; el saldo pendiente se actualiza solo.

**¿Nexora factura ante AFIP?**
No. Nexora arma **presupuestos** y lleva el control de **cobros**; no emite comprobantes fiscales.

**¿El PDF se puede personalizar?**
Sí: colores (presets o a medida), logo, datos del negocio, condiciones comerciales, y modo
"blanco y negro" para ahorrar tinta.

**¿Necesito internet para trabajar?**
No. La app está pensada para funcionar 100% offline. Solo necesitás conexión si querés enviar por
WhatsApp/email (abre la app correspondiente) o la primera vez que la cargás.

---

## 16. Flujo recomendado (resumen)

1. **Configurá** tu negocio una vez (logo, datos, IVA, colores).
2. Armá **plantillas** de tus trabajos más comunes.
3. **Creá el presupuesto** → enviá el **PDF** al cliente.
4. Cuando acepte, marcá el estado como **Aceptado**.
5. **Registrá cada cobro** (total o parcial) y controlá el saldo en el detalle.
6. Exportá una **copia de seguridad** cada tanto.

¡Eso es todo! Nexora se encarga de los números, la numeración y los PDF; vos dedicáte a tu trabajo.
