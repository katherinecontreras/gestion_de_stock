# Plataforma de Gestión de Stock — Simetra Service SA

Sistema interno para registrar artículos, proveedores y depósitos, asignar responsables y controlar movimientos de stock (entrada, salida, transferencia y **entrega de EPP** a un empleado).

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend | Vite, React 19, JavaScript |
| Estilos | Tailwind CSS |
| Animaciones | Motion (`motion/react`) |
| Backend / Auth / Storage | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Correos transaccionales | EmailJS |
| Hosting / CI/CD | Vercel |

## Estructura del proyecto

```text
gestion-stock/
├── public/                     # Archivos estáticos públicos (logos, favicon, etc.)
├── src/
│   ├── App.jsx                 # Rutas de React Router
│   ├── main.jsx                # Entrada de Vite
│   ├── app/
│   │   ├── autentication/      # Login, registro y recuperación
│   │   └── layouts/            # Navbar, Sidebar, Footer, toasts
│   ├── app-spa/                # Pantallas del área logueada
│   ├── components/             # UI, modales y módulos
│   ├── lib/                    # Supabase (browser) y EmailJS
│   ├── services/               # Llamadas a la base
│   ├── hooks/                  # useAuth, notificaciones, perfil
│   └── utils/                  # Formato, validadores, rutas, Excel
├── supabase/
│   └── schema.sql
├── .env.local.example
├── .env.production
└── README.md
```

Rutas de la aplicación:

- `/autentication/login`, `/autentication/registro`, `/autentication/recuperar`
- `/responsables` — administración de responsables (solo Administrador edita)
- `/articulos` y `/articulos/:id` — catálogo e historial (incluye entregas EPP)
- `/familias` y `/familias/:id` — familias, grupos y asignación de artículos
- `/proveedores`
- `/depositos`
- `/movimientos`, `/movimientos/nuevo`, `/movimientos/:id` — listado, alta (entrada, salida, transferencia, entrega EPP) y dos vistas de inventario (artículos y EPP)
- `/entregas` — historial de entregas EPP por empleado (acordeón + línea de tiempo)
- `/notificaciones` — historial completo

## Requisitos previos

- Node.js 20 o superior
- npm
- Un proyecto de Supabase dedicado llamado **gestion_de_stock** (no reutilizar bases de otros sistemas de Simetra)
- Cuenta de Vercel vinculada al repositorio de GitHub

## 1. Instalar dependencias

```bash
npm install
```

## 2. Conectar variables de entorno con Supabase

1. En el Dashboard de Supabase, abrí el proyecto `gestion_de_stock`.
2. Andá a **Project Settings → API**.
3. Copiá:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; no la subas a Git ni la uses en el cliente)
4. En la raíz del repo:

```bash
cp .env.local.example .env
```

5. Completá los valores en `.env` (local, no se sube a Git).

`SUPABASE_SERVICE_ROLE_KEY` omite RLS. Usala únicamente en scripts de servidor como `npm run seed:admin`. No la expongas en el cliente.

## 3. Ejecutar el esquema SQL

1. En Supabase, abrí **SQL Editor**.
2. Pegá y ejecutá el contenido de `supabase/schema.sql`.
3. El script crea tablas, enums, índices, RLS, triggers de notificaciones, actualización de inventario (artículos y EPP) y RPCs transaccionales.

También crea el bucket de Storage `remitos` para las imágenes de remito (una o más hojas).

## 4. Desarrollo local

```bash
npm run dev
```

La app queda en [http://localhost:3000](http://localhost:3000). Sin sesión, redirige a `/autentication/login`.

Scripts:

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Vite en http://localhost:3000 |
| `npm run build` | Build de producción |
| `npm run preview` | Sirve el build |
| `npm run seed:admin` | Alta del primer administrador |

## 5. Despliegue en Vercel

El `.env` local **no** viaja al deploy. El build de producción lee `.env.production` (claves públicas del cliente: Supabase anon, EmailJS y la URL de Vercel). `SUPABASE_SERVICE_ROLE_KEY` no va en Vercel.

1. **Framework Preset:** Vite
2. **Build Command:** `npm run build`
3. **Output Directory:** `dist`

Los enlaces de los mails (recuperar contraseña) siempre usan `NEXT_PUBLIC_APP_URL` (`https://gestion-de-stock-woad.vercel.app`), nunca localhost.

Un push a la rama de producción dispara el deploy automático.

## Convenciones de datos

- Identificadores de negocio en `snake_case` (PostgreSQL).
- Borrado lógico (`estado = inactivo`) en maestros con historial: proveedores, responsables, depósitos, artículos.
- Contraseñas solo en **Supabase Auth**. `responsables.auth_user_id` queda vacío en el rol **Empleado** (tiene mail, no entra a la plataforma).
- No se usan `registrado`, `invitado_en` ni `registrado_en`. Alcanzan `created_at` y `updated_at`.
- El login usa DNI: se resuelve el email con `rpc_email_por_dni` y luego `signInWithPassword`. El Empleado no se ofrece en el registro.
- Los movimientos se persisten con `rpc_crear_movimiento` (encabezado + detalle en la misma transacción).
- **Entrega EPP:** un movimiento = un empleado, N artículos `is_epp`. Resta stock solo en el origen. El inventario EPP (`inventario_epp_personal`) guarda lo que usa cada empleado; en un recambio se resta la última entrega, se borran artículos que ya no van y se suman los nuevos.
- `fecha_recambio` = fecha del movimiento + 30 días. Al vencer: notificación `Alerta_Recambio_EPP` y mail al empleado y al responsable que cargó la entrega.
- `fotos_remito` es un array: el remito puede tener varias hojas.

## Roles

| Rol | Alcance |
| --- | --- |
| Administrador | ABM completo e historial global. En responsables solo ve, edita y elimina (no crea ni invita). El primero se carga por seed. |
| Responsable_Deposito | Artículos y movimientos de sus depósitos; puede cargar movimientos, incluida Entrega EPP |
| Vista_Descarga | Ve y descarga todo (incluye historial de entregas); no escribe |
| Empleado | Recibe EPP. No inicia sesión. Se busca por nombre (o se crea) al cargar una Entrega EPP |

Las políticas RLS restringen al responsable de depósito a filas de sus depósitos.

## Estado de esta fase

Pantallas de autenticación, familias, proveedores, depósitos y notificaciones en curso. Siguiente módulo: artículos + Entrega EPP (SQL, inventario EPP, historial de entregas y alerta de recambio).
