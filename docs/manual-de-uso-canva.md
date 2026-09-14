# Manual de uso — Gestión de Stock (Simetra)

Usá este archivo como **guion de Canva**: una página (o dos) por bloque.
Al final está el **listado de capturas** para sacar con los datos de prueba.

- **Entrada a la plataforma:** https://gestion-de-stock-woad.vercel.app
- **Registro:** https://gestion-de-stock-woad.vercel.app/autentication/registro
- **Login:** https://gestion-de-stock-woad.vercel.app/autentication/login

Colores de la app (para Canva): fondo `#F5F4FD`, violeta `#251D33`, texto `#0F172A`, blanco `#FFFFFF`.
Tipografía: Poppins. Logo: `public/logo.png`.

Formato sugerido: **Documento A4 vertical**. Título grande + 3–6 pasos numerados + 1 captura por página.
Exportar: **Compartir → Descargar → PDF**.

---

## Página 1 — Portada

**Título:** Manual de uso  
**Subtítulo:** Gestión de Stock — Simetra Service SA  
**Texto:** Cómo registrarse, entrar y usar cada pantalla.  
**Pie:** Versión actual de la plataforma (datos de prueba).

Captura: logo + pantalla de login (sin contraseña visible).

---

## Página 2 — ¿Qué es y para qué sirve?

Gestión de Stock es el registro de **artículos**, **depósitos**, **proveedores** y **movimientos**.

Sirve para:

1. Saber **qué hay** y **en qué depósito**.
2. Cargar **entradas, salidas, transferencias** y **entregas de EPP**.
3. Ver **quién recibió EPP** y **cuándo hay que recambiarlo** (cada 6 meses).
4. Descargar **Excel** o el **Word del movimiento** cuando hace falta.

No es un chat ni un mail: es la herramienta de inventario del día a día.

---

## Página 3 — Quién usa qué (roles)

| Rol | Qué puede hacer | Qué no puede hacer |
|---|---|---|
| **Administrador** | Ver todo. Cargar, editar, dar de baja. Cargar movimientos. | No se elige al registrarse. Lo asigna otro admin. |
| **Responsable de depósito** | Ver y mover **solo sus depósitos**. Cargar movimientos y Entrega EPP. | No ve Familias ni Proveedores. No usa la tuerca. |
| **Vista y descarga** | Ver **todo** igual que el admin. Descargar. | No crea, no edita, no elimina, no carga movimientos. |
| **Empleado** | Recibe EPP. | **No entra** a la plataforma. Se carga solo al entregar EPP. |

Regla de oro: **se entra con DNI + contraseña**, no con el mail.

---

## Página 4 — Cómo registrarse (paso a paso)

Captura: pantalla de registro.

1. Abrí el link de registro.
2. Completá **nombre, apellido, email, DNI**.
3. Elegí el rol: **Responsable de depósito** o **Vista y descarga**.
4. Escribí la **contraseña dos veces**.
5. Si sos **Responsable**, marcá **al menos un depósito** de la tabla (podés buscar).
6. Guardá.

Después te llega un **código de 6 dígitos al mail**.

---

## Página 5 — Código de ingreso

Captura: los 6 casilleros del código.

1. Abrí el mail de Gestión de Stock.
2. Escribí el código de **6 dígitos** (un número por casillero).
3. Enviá.

Si no llegó:

- **Volver a enviar** (mismo mail).
- **Cambiar mail** si te equivocaste, guardá, y se reenvía.

Cuando el código está bien, vas al **login con el DNI ya puesto**. Solo falta la contraseña.

---

## Página 6 — Cómo entrar (login)

Captura: login.

1. Entrá a https://gestion-de-stock-woad.vercel.app
2. DNI + contraseña.
3. Si no tenés usuario: **Registrarme**.
4. Si olvidaste la clave: **Recuperar contraseña** (en esta misma pantalla).

Si tu usuario está **inactivo**, no vas a poder entrar aunque la clave sea correcta. Pedile al administrador que te reactive.

---

## Página 7 — Recuperar contraseña

1. En el login, **Recuperar contraseña**.
2. Te llega un mail.
3. Abrí el link y cargá la **nueva contraseña dos veces**.
4. Volvé al login con DNI + la nueva clave.

El administrador **no** te resetea la clave desde la tabla de responsables.

---

## Página 8 — Cómo moverse (menú)

Captura: navbar + sidebar (admin o vista) y, en otra foto, sidebar de responsable.

Arriba:

- **Logo / “Gestión de Stock”** → Dashboard.
- **Campana** → avisos.
- **Tuerca** (solo Admin y Vista) → responsables e historial de notificaciones.
- **Perfil** → datos. El Responsable también **Administrar depósitos**.
- **Cerrar sesión**.

A la izquierda, menú:

- Todos: **Dashboard, Artículos, Depósitos, Movimientos, Entregas EPP**.
- Admin y Vista también: **Familias, Proveedores**.

Verde arriba al centro = salió bien. Rojo = salió mal. Si vas a eliminar, siempre hay un **modal de confirmación**.

---

## Página 9 — Dashboard

Captura: tablero con los datos de prueba + selects de mes, año y depósito.

Es la **primera pantalla** al entrar. **No se carga ni se edita nada acá.** Solo se mira.

Arriba a la derecha:

1. **Mes** y **Año**: solo períodos que tienen movimientos.
2. **Depósito**: “Todos” o uno solo (solo depósitos con movimiento en ese mes).

Cuatro números:

- Movimientos del mes
- Unidades en stock
- EPP a recambiar
- Stock en cero

Abajo, gráficos. **Pasá el mouse** para ver origen → destino, no solo la cantidad.

El Responsable ve **sus depósitos**. Admin y Vista ven **toda la empresa**.

---

## Página 10 — Artículos

Captura: tabla de artículos.

Qué es: el catálogo (código, nombre, familia, grupo, unidad, EPP, costo, estado).

Cómo se usa:

1. Buscá por nombre.
2. Filtrá por familia / grupo.
3. **Ver historial** → movimientos, stock por depósito y costos de ese artículo.
4. **Descargar archivos** si necesitás Excel.

Solo **Administrador**:

- Cargar artículo
- Carga masiva (Excel)
- Editar / Eliminar

Si el artículo ya tiene movimientos, **Eliminar** no lo borra: lo deja **inactivo**.

El **Responsable** solo ve artículos de **sus depósitos**. **Vista** ve todo y no edita.

---

## Página 11 — Historial del artículo

Captura: las 3 pestañas.

1. **Movimientos** (la de entrada): qué se movió, cuándo, depósitos. Si es EPP, el empleado y la fecha de recambio.
2. **Depósitos**: stock actual por depósito.
3. **Historial de costos**: cómo cambió el precio.

---

## Página 12 — Familias y grupos

Captura: tabla de familias + botón Ver grupos / Gestionar.

La familia agrupa (ej. EPP, herramientas). El **grupo** va debajo (ej. cascos, guantes).

- **Vista:** Ver grupos (solo lectura) y descargar.
- **Admin:** cargar familia, carga masiva de grupos, editar, eliminar, gestionar artículos del grupo.

No se crean familias en el Excel de grupos: las familias se cargan **una por una**.

---

## Página 13 — Proveedores

Captura: tabla de proveedores.

Quién los usa: **Admin** (carga/edita) y **Vista** (ve y descarga). El Responsable **no** tiene esta pantalla.

Sirven para las **entradas** (de quién vino el material) y para **devoluciones**.

---

## Página 14 — Depósitos

Captura: tabla de depósitos.

Cada depósito tiene código, nombre, ubicación y responsables.

- **Admin:** alta, Excel, asignar responsables.
- **Vista:** ver y descargar.
- **Responsable:** solo **los suyos**. Puede cambiarlos desde el **perfil → Administrar depósitos** (mínimo uno).

---

## Página 15 — Movimientos (el corazón)

Captura: tabla de movimientos + pestañas Inventario artículos / Inventario EPP.

Acá se ve **todo lo que se movió**.

Tres pestañas:

1. **Movimientos** — historial.
2. **Inventario de artículos** — stock en estantería.
3. **Inventario EPP** — lo que tiene puesto cada empleado + alerta de recambio.

**Ver detalle** abre la ficha. Ahí está **Descargar Word** (comprobante).

**Nuevo movimiento** (Admin y Responsable). Vista **no** carga.

---

## Página 16 — Nuevo movimiento: los 4 pasos

Captura: barra de pasos.

No podés saltar un paso vacío. Podés **volver** sin perder lo cargado.

**Paso 1 — Tipo**

- Entrada
- Salida
- Transferencia
- Entrega EPP

**Paso 2 — Datos**

Siempre: **nro. de remito** + **foto(s) del remito** (puede haber más de una hoja).

- **Entrada:** depósito destino + proveedor.
- **Salida:** origen, destino, si es devolución (y proveedor si sí).
- **Transferencia:** origen, destino, motivo (opcional).
- **Entrega EPP:** origen, destino (distinto), tipo (Ingreso / Recambio por rotura / Recambio por talle), empleado.

**Empleado:** buscá por nombre, apellido o DNI. Si no está, lo creás ahí (sin mail). Un movimiento = **un** empleado.

**Paso 3 — Artículos**

Tildá, poné **cantidad** (obligatoria) y observación (opcional).  
Entrada: todo el catálogo. Salida/transferencia: stock del origen. EPP: solo artículos EPP.

**Paso 4 — Revisar y cargar**

Leé todo. Si está mal, corregí acá. Recién al final se guarda.

---

## Página 17 — Qué hace cada movimiento al stock

| Tipo | Estantería | Extra |
|---|---|---|
| Entrada | Suma en el **destino** | — |
| Salida | Resta en el **origen** | — |
| Transferencia | Resta origen, suma destino | — |
| Entrega EPP | Resta en el **origen** | El EPP queda en el **empleado**, no en la estantería del destino |

Recambio EPP: **fecha del movimiento + 6 meses**, automático.  
Se considera recambiado cuando hay **otra Entrega EPP al mismo empleado**.

---

## Página 18 — Entregas EPP

Captura: lista de empleados + acordeón abierto (línea de tiempo).

Menú: **Entregas EPP**.

1. Buscá al empleado.
2. Abrí la fila.
3. Ves todas las entregas: fecha, tipo, depósitos, remito, quién entregó, recambio.

Admin y Vista: todos. Responsable: los de **sus depósitos**.

---

## Página 19 — Campana y tuerca

Captura: campana abierta + menú tuerca.

**Campana (todos):** avisos (movimientos, altas, recambio EPP, etc.).

**Tuerca (solo Admin y Vista):**

- Administrar responsables
- Historial de notificaciones

El **Responsable no tiene tuerca**.

---

## Página 20 — Administrar responsables (Admin)

Captura: tabla de responsables.

El alta **no** se hace acá: cada uno se **registra solo**.

El Admin puede **editar** (rol, estado, depósitos) o **eliminar**.  
Si esa persona ya cargó movimientos, **no se elimina**: se pasa a **inactivo** y no entra más.

Vista ve la tabla y no edita.

---

## Página 21 — Errores frecuentes

1. Entro con el **mail** → no. Es **DNI + contraseña**.
2. No me llega el código → spam, reenviar, o cambiar el mail.
3. No veo Familias / Proveedores → sos **Responsable**. Es normal.
4. No puedo cargar movimiento → sos **Vista y descarga**.
5. El Dashboard está vacío al filtrar un depósito → elegí uno que tenga movimientos ese mes, o “Todos”.
6. No puedo borrar un artículo/depósito/persona → ya tiene historial: **inactivar**.
7. Entrega EPP a dos personas → son **dos movimientos**.

---

## Página 22 — Contacto / cierre

Si algo falla: no recargues mil veces. Anotá **qué pantalla**, **qué botón** y **el mensaje rojo** (toast) y avisá a quien administra la plataforma.

---

# Listado de capturas (en este orden)

Entrá como **Administrador** con los datos de prueba. Ocultá contraseñas y mails personales si hace falta.

1. Login (completa, sin clave escrita).
2. Registro (formulario).
3. Código de 6 dígitos (si no tenés uno activo, recuadrá esa zona en un registro de prueba).
4. Dashboard completo (mes con movimientos, Todos los depósitos).
5. Dashboard filtrado a **un** depósito.
6. Hover de un gráfico (origen → destino).
7. Sidebar Admin / Vista (se ven Familias y Proveedores).
8. Sidebar Responsable (sin Familias ni Proveedores).
9. Artículos (tabla).
10. Historial de un artículo (pestaña movimientos).
11. Familias.
12. Detalle de una familia (grupos).
13. Proveedores.
14. Depósitos.
15. Movimientos (lista).
16. Inventario de artículos.
17. Inventario EPP (si hay alerta, mejor).
18. Detalle de un movimiento (con Descargar Word visible).
19. Nuevo movimiento — paso 1 (tipos).
20. Nuevo movimiento — paso 2 (un ejemplo de Entrada y uno de Entrega EPP).
21. Nuevo movimiento — paso 3 (artículos tildados).
22. Nuevo movimiento — paso 4 (revisión).
23. Entregas EPP (empleado abierto).
24. Campana.
25. Tuerca + responsables.
26. Toast verde de “guardado OK”.
27. Modal de confirmar eliminar (sin confirmar de verdad).

---

# Cómo armarlo en Canva (10 minutos de método)

1. Canva → **Crear un diseño** → **Documento A4**.
2. Página 1: fondo violeta `#251D33`, logo, título blanco.
3. Resto: fondo `#F5F4FD`, título `#251D33`, cuerpo gris oscuro.
4. En cada página: **título + pasos 1. 2. 3. + captura**.
5. Recuadrá en la captura el botón que hay que tocar (Canva → Elementos → formas, borde naranja).
6. Abajo a la derecha: número de página.
7. **Descargar PDF** (estándar o imprimir). Ese PDF es el adjunto del mail.
