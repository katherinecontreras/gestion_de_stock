# Prompts Canva — una página por vez

Colores REALES del PDF (no aproximados):

| Uso | Hex | Dónde se ve |
|---|---|---|
| Navy | `#1D3256` | Encabezados y pies |
| Celeste | `#85A7BE` | Bloques (pág. 2) y aviso del login |
| Gris de hoja | `#DADADA` | Fondo de págs. 4–8 |
| Hueso | `#F5F5F5` | Cuadros 3 y 4 de “qué es” |
| Blanco | `#FFFFFF` | Solo las capturas / tarjetas |

El fondo de las páginas de pasos **no es blanco**. Es **`#DADADA`**. Si Canva pone blanco o un gris más claro, está mal.

Medidas de la hoja: A4 **210 × 297 mm** (en el PDF: 596 × 843 px).

Cómo usarlo: **duplicá la página 6 (login)** o la **5**, borré textos y fotos, y pegá **un prompt entero**. No armes un lienzo blanco.

---

## Página 9 — crear de cero (Dashboard)

```
Editá SOLO la página actual. Documento A4 vertical 210×297 mm. No crees otro archivo. No toques las páginas 1 a 8.

COPIÁ EL FORMATO DE LAS PÁGINAS 5, 6 Y 8 (no inventes otro). Así están armadas:

1) ENCABEZADO
- Rectángulo navy #1D3256 que toca los tres bordes: izquierdo, derecho y SUPERIOR.
- Alto: 30 mm (igual que el encabezado de “¿CÓMO ENTRAR? (LOGIN)”).
- Título UNA línea, blanco #FFFFFF, MAYÚSCULAS, centrado, mismo tamaño que “¿CÓMO ENTRAR? (LOGIN)”:
DASHBOARD
- El título NO va sobre fondo blanco. NO va navy sobre blanco. NO va a la izquierda como un H1 de web.

2) FONDO DEL RESTO DE LA HOJA
- Todo lo que queda debajo del encabezado es #DADADA (el gris medio de las páginas 5, 6, 7 y 8).
- PROHIBIDO: #FFFFFF como fondo de página, #F5F5F5 como fondo de página, #E8EEF2, beige, violeta, lila, #F5F4FD.
- Si el fondo no es exactamente #DADADA, está mal.

3) COLUMNA DE PASOS (izquierda, sobre el gris)
- Empieza 8 mm debajo del encabezado.
- Ocupa el 42% izquierdo de la hoja.
- Números 1, 2 y 3: color #1D3256, grandes como los de la página 6 (login), alineados a la izquierda.
- Texto al lado, #1D3256, oraciones cortas, voseo.
SOLO TRES PASOS (no inventes un 4 vacío):
1  Mes y Año, arriba a la derecha: solo períodos que tienen movimientos.
2  Depósito: “Todos” o uno solo (solo depósitos con movimiento en ese mes).
3  Cuatro números: movimientos del mes · unidades en stock · EPP a recambiar · stock en cero.
Debajo del 3, en texto más chico: Es la primera pantalla al entrar. No se carga ni se edita nada: solo se mira.

4) TARJETA DE CAPTURA (derecha, como el recuadro BLANCO del LOGIN, no como un bloque gris gigante)
- Es un rectángulo BLANCO #FFFFFF apoyado SOBRE el gris #DADADA.
- NO pega contra el borde superior (el encabezado navy queda arriba, separado).
- NO pega contra el borde inferior (el pie navy queda abajo, separado).
- Márgenes: 10 mm a la derecha, 10 mm debajo del encabezado, 14 mm encima del pie.
- Ancho: 52% de la hoja. Alto: el espacio entre encabezado y pie, menos esos márgenes.
- Esquinas: radio chico, como la tarjeta del login (aprox. 8–10 px), NO una pastilla tipo “app icon” con radio enorme.
- Sombra muy suave, como el login.
- ADENTRO: un FRAME de imagen de Canva (marco clicable). Yo voy a hacer clic y subir la captura; tiene que quedar de ese tamaño.
- Rótulo gris centrado dentro del frame, mientras esté vacío: CAPTURA 09 — Dashboard completo
- NUNCA dibujes la interfaz de la plataforma. NUNCA pongas un mockup.

5) FLECHAS
- Negras, finas, como en la página 6.
- Del 1 a la zona SUPERIOR de la tarjeta (filtros mes/año).
- Del 2 a la zona SUPERIOR DERECHA (select depósito).
- Del 3 a la zona alta-media (las 4 tarjetas numéricas).
- No tapen el texto.

6) PIE
- Franja #1D3256 a TODO el ancho, pegada al borde inferior.
- Alto: 18 mm (más chica que el recuadro “IMPORTANTE” de registro; más como una barra).
- Texto blanco, centrado, dos líneas:
El Responsable ve sus depósitos.
Admin y Vista ven toda la empresa.

7) Número de página 9, blanco o navy, esquina inferior derecha, chico.

CHECK FINAL
- Encabezado navy a todo el ancho, título blanco.
- Fondo #DADADA.
- Una tarjeta blanca a la derecha, no un rectángulo gris que ocupe casi toda la hoja.
- Tres pasos, ninguno vacío.
```

---

## Página 10 — Dashboard gráficos

```
Editá SOLO esta página. A4 vertical. No toques las demás.

FORMATO = páginas 5, 6 y 8:
- Encabezado #1D3256 a todo el ancho, 30 mm de alto, pegado arriba.
- Título blanco MAYÚSCULAS centrado: DASHBOARD · GRÁFICOS
- Fondo del resto: #DADADA. Prohibido blanco, violeta, celeste de fondo (el celeste #85A7BE acá NO se usa).
- Pie inferior #1D3256, 14 mm, texto blanco: En Artículos más movidos el eje Y muestra el nombre; el código se ve al pasar el mouse.

PASOS a la izquierda (42% ancho), números #1D3256 grandes como en login:
1  Pasá el mouse por una barra o porción del gráfico.
2  El detalle muestra origen → destino, no solo la cantidad.
3  Si filtrás un depósito y queda vacío, ese depósito no tuvo movimiento ese mes.

DOS TARJETAS BLANCAS #FFFFFF sobre el gris, a la derecha, IGUALES entre sí (como las varias capturas de la página 7, no un solo bloque):
- Ancho 50% de la hoja. Alto 38 mm? NO: alto de cada una ~95 mm. Separación 8 mm.
- Radio de esquina chico. Sombra leve. 10 mm de margen derecho.
- Arriba, FRAME clicable: CAPTURA 10A — Dashboard filtrado a un depósito
- Abajo, FRAME clicable: CAPTURA 10B — Hover origen → destino
Flecha del 3 a 10A. Flecha del 1 y 2 a 10B.
No dibujes la app. No dejes un paso 4 vacío. Número de página 10.
```

---

## Página 11 — Artículos

```
Editá SOLO esta página. A4. Formato de las páginas 5–8.

Encabezado #1D3256, 30 mm, todo el ancho, pegado arriba.
Título blanco MAYÚSCULAS: ARTÍCULOS
Fondo #DADADA. Prohibido fondo blanco.

Izquierda 42%, números grandes #1D3256:
1  Buscá por nombre.
2  Filtrá por familia / grupo.
3  Ver historial → movimientos, stock por depósito y costos.
4  Descargar archivos si necesitás Excel.
Texto chico: Catálogo: código, nombre, familia, grupo, unidad, EPP, costo, estado.

Derecha: UNA tarjeta blanca #FFFFFF sobre el gris (como el login, pero más alta).
Márgenes 10 mm derecha, 10 mm bajo encabezado, 14 mm sobre el pie.
FRAME clicable: CAPTURA 11 — Tabla de artículos
Flecha 1 → buscador (arriba del frame). Flecha 3 → una fila.

Pie #1D3256, 22 mm, todo el ancho, texto blanco:
Solo Administrador carga, edita o elimina. Si ya tiene movimientos, Eliminar lo deja inactivo. El Responsable ve los de sus depósitos. Vista ve todo y no edita.
Página 11.
```

---

## Página 12 — Historial del artículo

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo.
Título blanco: HISTORIAL DEL ARTÍCULO
Fondo #DADADA.

Izquierda:
1  Movimientos: qué se movió, cuándo, depósitos. Si es EPP: empleado y fecha de recambio.
2  Depósitos: stock actual por depósito.
3  Historial de costos: cómo cambió el precio.

Derecha: tarjeta blanca sobre el gris, FRAME: CAPTURA 12 — Historial, pestaña Movimientos
Flecha 1 → pestañas de arriba del frame.

Pie #1D3256, 16 mm: Se abre desde Artículos → Ver historial.
Página 12. No dibujes la app. No uses otro gris que #DADADA.
```

---

## Página 13 — Familias y grupos

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: FAMILIAS Y GRUPOS
Fondo #DADADA.

1  La familia agrupa (ej. EPP). El grupo va debajo (ej. cascos).
2  Vista: Ver grupos (solo lectura) y descargar.
3  Admin: cargar familia, Excel de grupos, editar, eliminar, gestionar artículos del grupo.

Tarjeta blanca derecha, FRAME: CAPTURA 13 — Tabla de familias + Ver grupos

Pie #1D3256, 18 mm, blanco: No se crean familias en el Excel de grupos: se cargan una por una.
Página 13.
```

---

## Página 14 — Proveedores

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: PROVEEDORES
Fondo #DADADA. Sin franja celeste.

1  Admin carga y edita. Vista ve y descarga.
2  El Responsable NO tiene esta pantalla (no está en su menú).
3  Sirven para las entradas y para las devoluciones.

Tarjeta blanca derecha, FRAME: CAPTURA 14 — Tabla de proveedores
Sin pie navy, o uno de 12 mm vacío de texto. Página 14.
```

---

## Página 15 — Depósitos

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: DEPÓSITOS
Fondo #DADADA.

1  Cada depósito: código, nombre, ubicación y responsables.
2  Admin: alta, Excel, asignar responsables. Vista: ver y descargar.
3  Responsable: solo los suyos. Los cambia en perfil → Administrar depósitos (mínimo uno).

Tarjeta blanca derecha, FRAME: CAPTURA 15 — Tabla de depósitos
Página 15.
```

---

## Página 16 — Movimientos

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: MOVIMIENTOS
Fondo #DADADA.

1  Pestaña Movimientos: historial. Ver detalle abre la ficha (Descargar Word).
2  Pestaña Inventario de artículos: stock en estantería.
3  Pestaña Inventario EPP: lo que tiene puesto cada empleado + alerta de recambio.

Tarjeta blanca derecha, FRAME: CAPTURA 16 — Lista con las 3 pestañas
Flechas 1, 2 y 3 hacia las pestañas de ARRIBA del frame.

Pie #1D3256, 18 mm: Nuevo movimiento = Admin y Responsable. Vista no carga.
Página 16.
```

---

## Página 17 — Inventarios

```
Editá SOLO esta página. A4. Formato de la página 7 (varias tarjetas blancas sobre #DADADA), NO un solo recuadro.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: INVENTARIO DE ARTÍCULOS · EPP
Fondo #DADADA.

Izquierda:
1  En Movimientos, abrí Inventario de artículos.
2  Cambiá a Inventario EPP.
3  Si hay alerta de recambio (cada 6 meses), que se vea.

Derecha, DOS tarjetas blancas iguales (como pág. 7):
Arriba FRAME: CAPTURA 17A — Inventario de artículos
Abajo FRAME: CAPTURA 17B — Inventario EPP
Alto de cada una ~100 mm, separación 8 mm, margen derecho 10 mm.
Página 17. No dibujes pantallas.
```

---

## Página 18 — Detalle del movimiento

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: DETALLE DEL MOVIMIENTO
Fondo #DADADA.

1  En la lista, Ver detalle.
2  Revisá tipo, depósitos, remito, artículos.
3  Descargar Word (comprobante).

Tarjeta blanca derecha, FRAME: CAPTURA 18 — Detalle con Descargar Word visible
Flecha 3 → botón Word.
Página 18.
```

---

## Página 19 — Nuevo movimiento (resumen)

```
Editá SOLO esta página. A4.

ARRIBA: encabezado #1D3256, 30 mm, ancho completo, título blanco: NUEVO MOVIMIENTO
FONDO: #DADADA (no blanco).

Debajo del encabezado, texto navy: No se puede saltar un paso vacío. Se puede volver sin perder lo cargado.

CUATRO BLOQUES en damero 2×2, IGUAL que la página 2 (colores reales):
- Arriba izquierda: #85A7BE, número 1 blanco o navy grande, texto: Tipo
- Arriba derecha: #F5F5F5, número 2, texto: Datos
- Abajo izquierda: #F5F5F5, número 3, texto: Artículos
- Abajo derecha: #85A7BE, número 4, texto: Revisar y cargar
Los cuatro bloques juntos ocupan el 55% superior del cuerpo (debajo del encabezado). Como pág. 2, sin logo al centro si no entra.

ABAJO, una tarjeta blanca apaisada (más ancha que alta, alto 70 mm, ancho 170 mm, centrada):
FRAME: CAPTURA 19 — Barra de los 4 pasos
Ese frame NO va de arriba abajo de la hoja.
Página 19.
```

---

## Página 20 — Tipo y datos

```
Editá SOLO esta página. A4. Formato página 7: gris #DADADA + varias tarjetas blancas.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: NUEVO MOVIMIENTO · TIPO Y DATOS
Fondo #DADADA.

Izquierda, texto compacto:
1  Tipo: Entrada · Salida · Transferencia · Entrega EPP.
2  Siempre: nro. de remito + foto(s) del remito.
   Entrada: destino + proveedor.
   Salida: origen, destino, si es devolución.
   Transferencia: origen, destino, motivo opcional.
   Entrega EPP: origen, destino distinto, tipo (Ingreso / Recambio por rotura / Recambio por talle), un empleado.

Dos tarjetas blancas a la derecha:
CAPTURA 20A — Paso 1 (los 4 tipos)
CAPTURA 20B — Paso 2 (Entrada o Entrega EPP)

Pie #1D3256, 18 mm: Un movimiento EPP = un empleado. Si no está, se crea ahí (sin mail).
Página 20.
```

---

## Página 21 — Artículos y revisión

```
Editá SOLO esta página. A4. Formato página 7.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: NUEVO MOVIMIENTO · ARTÍCULOS Y REVISIÓN
Fondo #DADADA.

1  Paso 3: tildá, cantidad obligatoria, observación opcional. Entrada = catálogo. Salida/transferencia = stock del origen. EPP = solo artículos EPP.
2  Paso 4: leé todo. Si está mal, corregí. Recién al final se guarda.

Dos tarjetas blancas:
CAPTURA 21A — Paso 3 (artículos tildados)
CAPTURA 21B — Paso 4 (revisión)
Página 21.
```

---

## Página 22 — Qué hace cada movimiento (sin foto)

```
Editá SOLO esta página. A4. COPIÁ LA PÁGINA 3 (roles), no la 6.

Encabezado #1D3256 a todo el ancho, 44 mm de alto (como “¿QUIÉN USA QUÉ?”), título blanco MAYÚSCULAS:
QUÉ HACE CADA MOVIMIENTO AL STOCK

Cuerpo: filas a TODO el ancho, alternando #85A7BE y #DADADA, como la tabla de roles. SIN recuadro de captura. SIN fondo blanco de hoja.

Fila títulos (gris #DADADA): Tipo | Estantería | Extra
Fila #85A7BE: Entrada | Suma en el destino | —
Fila #DADADA: Salida | Resta en el origen | —
Fila #85A7BE: Transferencia | Resta origen, suma destino | —
Fila #DADADA: Entrega EPP | Resta en el origen | El EPP queda en el empleado, no en la estantería del destino

Abajo, franja #1D3256, ~22 mm: Recambio EPP = fecha del movimiento + 6 meses. Se considera recambiado cuando hay otra Entrega EPP al mismo empleado.
Rombo logo Simetra chico abajo al centro, como pág. 3.
Página 22. Cero frames de imagen.
```

---

## Página 23 — Entregas EPP

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: ENTREGAS EPP
Fondo #DADADA.

1  En el menú, Entregas EPP. Buscá al empleado.
2  Abrí la fila.
3  Ves fecha, tipo, depósitos, remito, quién entregó, recambio.

Tarjeta blanca derecha, FRAME: CAPTURA 23 — Empleado abierto (línea de tiempo)

Pie #1D3256, 16 mm: Admin y Vista: todos. Responsable: los de sus depósitos.
Página 23.
```

---

## Página 24 — Administrar responsables

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: ADMINISTRAR RESPONSABLES
Fondo #DADADA.

1  Se entra por la tuerca (solo Admin y Vista). Ya está en la página 8.
2  El alta NO se hace acá: cada uno se registra solo.
3  Admin edita rol, estado y depósitos, o elimina. Si ya cargó movimientos, no se elimina: queda inactivo. Vista ve y no edita.

Tarjeta blanca derecha, FRAME: CAPTURA 24 — Tabla de responsables
Página 24.
```

---

## Página 25 — Errores frecuentes (sin foto)

```
Editá SOLO esta página. A4. COPIÁ LA PÁGINA 2 (damero), no la 6.

Encabezado #1D3256, 44 mm, ancho completo. Título blanco: ERRORES FRECUENTES
SIN frame de captura. SIN fondo blanco.

Debajo del header hay una franja #DADADA de ~40 mm? En la pág. 2 hay una banda gris con la intro. Acá poné una línea: Se entra con DNI + contraseña, no con el mail.

Luego 7 bloques. Paleta SOLO #85A7BE, #F5F5F5, #DADADA, texto #1D3256, números grandes como pág. 2:
1  Entro con el mail → no. Es DNI + contraseña.   fondo #85A7BE
2  No me llega el código → spam, reenviar o cambiar el mail.   #F5F5F5
3  No veo Familias / Proveedores → sos Responsable. Es normal.   #F5F5F5
4  No puedo cargar movimiento → sos Vista y descarga.   #85A7BE
5  Dashboard vacío al filtrar → otro depósito o “Todos”.   #85A7BE
6  No puedo borrar si hay historial → inactivar.   #F5F5F5
7  EPP a dos personas → dos movimientos.   #DADADA a todo el ancho abajo

Distribución: 2×2, 2×2, y el 7 a lo ancho. Logo rombo al centro si queda hueco, como pág. 2.
Página 25.
```

---

## Página 26 — Cierre

```
Editá SOLO esta página. A4. Formato páginas 5–8.

Encabezado #1D3256, 30 mm, ancho completo. Título blanco: SI ALGO FALLA
Fondo #DADADA.

Texto navy a la izquierda: No recargues mil veces. Anotá qué pantalla, qué botón y el mensaje rojo o verde (toast) y avisá a quien administra la plataforma.

Dos tarjetas blancas más chicas (alto 80 mm cada una):
CAPTURA 26A — Toast verde de guardado OK
CAPTURA 26B — Modal de confirmar eliminar (sin confirmar)

Pie #1D3256, 22 mm, blanco:
Gestión de Stock — Simetra Service S.A.
Diseñado por Katherine Contreras.
Página 26.
```
