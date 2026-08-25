# Plataforma de Gestión de Stock — Simetra Service SA

Sistema interno para registrar artículos, proveedores y depósitos, asignar responsables y controlar movimientos de stock (entrada, salida y transferencia) entre depósitos.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Frontend / App Router | Next.js 15, React 19, TypeScript |
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
│   ├── app/                    # Rutas y Páginas de la aplicación (App Router)
│   │   ├── autentication/      # Grupo de rutas de autenticación
│   │   │   ├── login/          # Página de Login
│   │   │   ├── registro/       # Página de Registro / Alta contraseña
│   │   │   └── recuperar/      # Página de Recuperación de contraseña
│   │   ├── pages/              # Grupo de rutas protegidas del sistema
│   │   │   ├── responsables/   # Administración de responsables
│   │   │   ├── articulos/      # Gestión de artículos y carga masiva
│   │   │   │   └── [id]/       # Historial individual del artículo
│   │   │   ├── familias/       # Gestión de Familias y Grupos
│   │   │   │   └── [id]/       # Detalle y gestión de grupos/artículos
│   │   │   ├── proveedores/    # Gestión de Proveedores
│   │   │   ├── depositos/      # Gestión de Depósitos
│   │   │   ├── movimientos/    # Vista de movimientos y detalle
│   │   │   │   ├── nuevo/      # Paso a paso de nuevo movimiento
│   │   │   │   └── [id]/       # Detalle de un movimiento
│   │   │   └── notificaciones/ # Historial completo de notificaciones
│   │   ├── layouts/            # Layout global
│   │   │   ├── Navbar/         # Navbar responsive (PC / laptop / teléfono)
│   │   │   ├── ToastProvider/  # Toast adaptable de confirmación o notificación
│   │   │   ├── Sidebar/        # Navegación responsive
│   │   │   ├── Footer/         # Derechos reservados y dedicatoria
│   │   │   └── Layout.tsx      # Integra Navbar, Toast, Sidebar y Footer
│   │   └── page.tsx            # Redirección automática según sesión (Login o Inicio)
│   ├── components/             # Componentes reutilizables modularizados
│   │   ├── ui/                 # Componentes genéricos UI (Botones, Inputs, Tablas, Badges)
│   │   ├── modals/             # Modales globales (Formulario de carga, Confirmaciones, Toast)
│   │   ├── layout/             # Componentes de estructura (Campana y placeholders)
│   │   └── modules/            # Componentes específicos por módulo
│   ├── lib/
│   │   ├── supabase/           # Cliente de Supabase (browserClient, serverClient)
│   │   └── emailjs/            # Configuración y helpers para EmailJS
│   ├── services/               # Capa de consumo de datos y llamadas a base de datos
│   ├── hooks/                  # Custom Hooks (useAuth, useNotification)
│   ├── types/                  # Definiciones de TypeScript e Interfaces de la Base de Datos
│   └── utils/                  # Formatters de fecha, validadores, rutas
├── supabase/
│   └── schema.sql              # Script SQL con esquemas, RLS, Triggers y RPCs
├── .env.local.example
└── README.md
```

Rutas de la aplicación:

- `/autentication/login`, `/autentication/registro`, `/autentication/recuperar`
- `/pages/responsables` — administración de responsables (solo Administrador)
- `/pages/articulos` y `/pages/articulos/[id]` — catálogo e historial
- `/pages/familias` y `/pages/familias/[id]` — familias, grupos y asignación de artículos
- `/pages/proveedores`
- `/pages/depositos`
- `/pages/movimientos`, `/pages/movimientos/nuevo`, `/pages/movimientos/[id]`
- `/pages/notificaciones` — historial completo

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

`SUPABASE_SERVICE_ROLE_KEY` omite RLS. Usala únicamente en Server Actions, Route Handlers o jobs de servidor.

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
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | ESLint (Next.js) |

## 5. Despliegue en Vercel

El repositorio ya está vinculado a GitHub y a Vercel. Al pasar de Create React App a Next.js, verificá en el proyecto de Vercel:

1. **Framework Preset:** Next.js
2. **Build Command:** `next build` (o el default de Next)
3. **Output:** dejar el default de Next.js (no usar la carpeta `build` de CRA)
4. En **Settings → Environment Variables**, cargá las mismas claves que en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marcada como Server / no exponer al client bundle)

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

Fase 1: arquitectura, tipado, conexión a Supabase y esquema inicial. Las pantallas funcionales se implementan a continuación, módulo por módulo.
