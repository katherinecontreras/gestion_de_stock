# Plataforma de Gestión de Stock — Simetra Service SA

Sistema interno para registrar artículos, proveedores y depósitos, asignar responsables y controlar movimientos de stock (entrada, salida y transferencia) entre depósitos.

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
└── README.md
```

Rutas de la aplicación:

- `/autentication/login`, `/autentication/registro`, `/autentication/recuperar`
- `/responsables` — administración de responsables (solo Administrador)
- `/articulos` y `/articulos/:id` — catálogo e historial
- `/familias` y `/familias/:id` — familias, grupos y asignación de artículos
- `/proveedores`
- `/depositos`
- `/movimientos`, `/movimientos/nuevo`, `/movimientos/:id`
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
cp .env.local.example .env.local
```

5. Completá los tres valores en `.env.local`.

`SUPABASE_SERVICE_ROLE_KEY` omite RLS. Usala únicamente en scripts de servidor como `npm run seed:admin`. No la expongas en el cliente.

## 3. Ejecutar el esquema SQL

1. En Supabase, abrí **SQL Editor**.
2. Pegá y ejecutá el contenido de `supabase/schema.sql`.
3. El script crea tablas, enums, índices, RLS, triggers de notificaciones, actualización automática de inventario y RPCs transaccionales.

También crea el bucket de Storage `remitos` para las imágenes de remito.

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

1. **Framework Preset:** Vite
2. **Build Command:** `npm run build`
3. **Output Directory:** `dist`
4. En **Settings → Environment Variables**, cargá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`SUPABASE_SERVICE_ROLE_KEY` no hace falta en Vercel si solo corre el cliente.

Un push a la rama de producción dispara el deploy automático.

## Convenciones de datos

- Identificadores de negocio en `snake_case` (PostgreSQL).
- Borrado lógico (`estado = inactivo`) en maestros: proveedores, responsables, depósitos, artículos, familias y grupos.
- Contraseñas solo en **Supabase Auth**; `responsables` se vincula con `auth_user_id`.
- El login de la app usa DNI: se resuelve el email con `rpc_email_por_dni` y luego `signInWithPassword`.
- Los movimientos se persisten con `rpc_crear_movimiento` para que el encabezado y el detalle entren en la misma transacción.

## Roles

| Rol | Alcance |
| --- | --- |
| Administrador | ABM completo, invitaciones, historial global y notificaciones |
| Responsable_Deposito | Artículos y movimientos de sus depósitos; puede cargar movimientos |
| Vista_Consulta | Solo lectura (reservado para asignaciones futuras) |

Las políticas RLS del esquema restringen al responsable de depósito a filas de sus depósitos.

## Estado de esta fase

Fase 1: arquitectura Vite + React, conexión a Supabase y esquema inicial. Las pantallas funcionales se implementan a continuación, módulo por módulo.
