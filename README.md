# ISO DMS · Sistema de Gestión Documental

Repositorio central de documentación para sistemas de gestión certificables (ISO 27001, ISO 9001 y cualquier otra norma configurable). Control de versiones, permisos por rol aplicados en base de datos (RLS), almacenamiento privado con enlaces firmados y auditoría de cada acción.

Construido con **Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth, PostgreSQL, Storage)**. Preparado para desplegar en **Vercel** y **Supabase** con planes gratuitos.

---

## Índice

1. [Qué es](#1-qué-es)
2. [Stack](#2-stack)
3. [Arquitectura](#3-arquitectura)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Roles y permisos](#5-roles-y-permisos)
6. [Seguridad](#6-seguridad)
7. [Instalación y puesta en marcha](#7-instalación-y-puesta-en-marcha)
8. [Variables de entorno](#8-variables-de-entorno)
9. [Supabase: migraciones, storage, auth y seed](#9-supabase-migraciones-storage-auth-y-seed)
10. [Desarrollo local](#10-desarrollo-local)
11. [Despliegue en Vercel](#11-despliegue-en-vercel)
12. [Funcionalidades](#12-funcionalidades)
13. [Estructura del proyecto](#13-estructura-del-proyecto)
14. [Hoja de ruta](#14-hoja-de-ruta)

---

## 1. Qué es

ISO DMS es la primera versión de un producto de **control documental empresarial**: el lugar único donde una organización publica, versiona, consulta y audita sus políticas, procedimientos, manuales, registros y matrices.

- Los usuarios entran con su cuenta y ven un **dashboard** con métricas reales.
- El **repositorio** permite buscar (full-text en español, sin acentos), filtrar de forma combinada, ordenar, paginar y alternar lista/cuadrícula.
- Cada documento tiene **detalle**, **vista previa** (PDF, imágenes, texto), **historial de versiones** y **actividad**.
- La **subida** se hace directamente desde el navegador al bucket privado, con progreso real, y los metadatos se guardan en PostgreSQL.
- La **descarga** pasa siempre por el servidor: se comprueba el permiso, se genera una Signed URL de 60 s y se registra en auditoría.
- Los **administradores** gestionan usuarios, roles, normas, categorías, subcategorías, etiquetas, tipos y configuración global.

## 2. Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16.3 (App Router, Server Components, Server Actions, `proxy.ts`) |
| Lenguaje | TypeScript 5 (modo `strict`, sin `any`) |
| UI | React 19, Tailwind CSS 4, Lucide Icons, componentes propios (sin librerías de UI) |
| Backend | Supabase: Auth, PostgreSQL 15 (RLS, triggers, RPC), Storage |
| Validación | Zod 4 |
| Fechas | date-fns |
| Cliente Supabase | `@supabase/supabase-js`, `@supabase/ssr` |

## 3. Arquitectura

```
Navegador ──► Next.js (Vercel) ──► Supabase
             │                     ├─ Auth (sesión por cookies, PKCE)
             │  Server Components  ├─ PostgreSQL (RLS + triggers + RPC)
             │  Server Actions     └─ Storage (bucket privado `documents`)
             │  Route Handlers
             └─ Subida directa navegador → Storage (XHR con progreso, JWT del usuario)
```

Principios:

- **Servidor por defecto.** Layouts y páginas son Server Components; los Client Components se limitan a interacción (formularios, filtros, diálogos).
- **Capa de acceso a datos.** `src/lib/services/*` contiene consultas tipadas y reutilizables; los componentes nunca hablan con Supabase directamente. Las mutaciones viven en `src/lib/actions/*` (Server Actions con Zod).
- **Autorización en dos niveles.** La UI oculta lo que el rol no puede hacer; **la base de datos lo impide** mediante Row Level Security y triggers. Llamar a la API directamente sin permisos devuelve `42501`.
- **Sesión.** `src/proxy.ts` refresca el token en cada petición y redirige a `/login` si no hay sesión. `requireUser()` vuelve a comprobar sesión y perfil activo en el servidor.
- **Sin `service_role` en el navegador.** Solo `src/lib/supabase/admin.ts` (marcado `server-only`) la usa, exclusivamente para crear usuarios en Auth tras verificar el permiso del solicitante.

## 4. Modelo de datos

Definido en `supabase/migrations/001_initial_schema.sql`.

| Tabla | Propósito |
| --- | --- |
| `roles`, `permissions`, `role_permissions` | RBAC configurable. Matriz editable desde `/admin/roles`. |
| `profiles` | Perfil 1:1 con `auth.users` (nombre, avatar, rol, activo, último acceso). Creado automáticamente por trigger. |
| `standards` | Normas (ISO 27001, ISO 9001, ISO 14001…). Dinámicas, activables. |
| `categories`, `subcategories` | Jerarquía **Norma → Categoría → Subcategoría**. |
| `document_types` | Política, procedimiento, manual, registro, matriz, plan, informe… |
| `documents` | Metadatos + archivo actual + `search_vector` (tsvector mantenido por triggers). |
| `document_versions` | Histórico inmutable: cada versión conserva su archivo y resumen de cambio. |
| `tags`, `document_tags` | Etiquetado libre. |
| `favorites` | Relación usuario ↔ documento (privada por usuario). |
| `recent_documents` | Últimos documentos vistos por usuario (upsert vía RPC). |
| `audit_logs` | Registro de acciones: login/logout, documentos, descargas, usuarios, roles, taxonomía, ajustes. |
| `app_settings` | Configuración global clave/valor (nombre de la organización, tamaño máximo, extensiones…). |

Funciones relevantes: `has_permission(code)`, `current_permissions()`, `log_audit(...)`, `touch_recent_document(id)`, `get_dashboard_stats()`, `get_taxonomy_counts()`.

Preparado para crecer: `documents` incluye `effective_date` y `review_date`; los ids son UUID; nada impide añadir `requirements`, `evidences`, `audits`, `findings`, `action_plans` con FK a `documents`, `standards` y `profiles`.

## 5. Roles y permisos

| Permiso | SUPER_ADMIN | ADMIN | COLABORADOR | CONSULTOR | VISUALIZADOR |
| --- | :-: | :-: | :-: | :-: | :-: |
| `documents.read` | ✔ | ✔ | ✔ | ✔ | ✔ |
| `documents.download` | ✔ | ✔ | ✔ | ✔ | — |
| `documents.create` | ✔ | ✔ | ✔ | — | — |
| `documents.update` (incluye aprobar y cambiar de estado) | ✔ | ✔ | — | — | — |
| `documents.delete` | ✔ | ✔ | — | — | — |
| `categories.manage` (categorías, subcategorías, tipos, etiquetas) | ✔ | ✔ | — | — | — |
| `audit.read` | ✔ | ✔ | — | — | — |
| `standards.manage` | ✔ | — | — | — | — |
| `users.manage` | ✔ | — | — | — | — |
| `roles.manage` | ✔ | — | — | — | — |
| `settings.manage` | ✔ | — | — | — | — |

COLABORADOR (`006_rol_colaborador.sql`) es el perfil de quien aporta documentación sin decidir sobre ella: sube y consulta, pero no edita, aprueba ni elimina. Aprobar un documento es un cambio de estado y exige `documents.update`.

Reglas adicionales aplicadas por trigger (`protect_profile_fields`):

- Nadie cambia su propio rol ni se desactiva a sí mismo.
- Solo SUPER_ADMIN puede asignar o retirar SUPER_ADMIN, o editar a un SUPER_ADMIN.
- Un usuario solo edita su nombre/avatar; rol y estado requieren `users.manage`.
- La marca `must_change_password` solo la modifica el servidor (service role); un usuario no puede quitársela.

### Gestión de usuarios (`/admin/users`, también en la barra lateral como "Usuarios")

- **Crear** con contraseña asignada (generada o manual) o por **invitación** por email.
- Casilla **"Solicitar cambio de contraseña"**: al iniciar sesión, el usuario es llevado a `/change-password` y no puede usar la aplicación hasta definir una contraseña nueva.
- **Editar** nombre y rol, **activar/desactivar**, **restablecer contraseña** (con opción de exigir cambio) y **eliminar** (los documentos que creó se conservan; la auditoría también). No se puede eliminar al único SUPER_ADMIN activo.
- Crear, eliminar y restablecer contraseñas requieren `SUPABASE_SERVICE_ROLE_KEY` en el servidor.

## 6. Seguridad

- **RLS activado en todas las tablas** (`002_rls.sql`). Toda política se apoya en `has_permission()` y exige perfil activo.
- **Storage privado** (`003_storage.sql`): bucket `documents` no público, límite 25 MB y lista de MIME types; políticas de lectura/escritura basadas en permisos; la carpeta raíz debe ser un UUID de documento.
- **Descargas** solo vía `/api/documents/[id]/download` (permiso + Signed URL de 60 s + auditoría).
- **Vista previa** con Signed URL de 15 min generada en el servidor.
- **Auditoría** automática por triggers (`document.*`, `user.*`, `standard.*`, `category.*`) y explícita vía RPC (`auth.login`, `auth.logout`, `document.downloaded`, `document.version_created`, `user.created`, `role.permissions_updated`, `settings.updated`). Solo se puede insertar mediante funciones `security definer`.
- **Cabeceras** de seguridad en `next.config.ts` (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).
- **Validación** doble: Zod en cliente (antes de subir) y en Server Actions; extensión y tamaño se comprueban también contra `app_settings` en servidor.
- **Usuarios desactivados** pierden acceso de inmediato: `has_permission()` devuelve `false` y el login los rechaza.

## 7. Instalación y puesta en marcha

Requisitos: Node.js ≥ 20.9, npm, una cuenta gratuita en [Supabase](https://supabase.com) y otra en [Vercel](https://vercel.com).

```bash
git clone <tu-repo> iso-dms
cd iso-dms
npm install
cp .env.example .env.local   # y completa los valores (ver §8)
```

Resumen del flujo completo:

1. Crear proyecto en Supabase.
2. Ejecutar las migraciones `001` → `004` en el SQL Editor.
3. Configurar Auth (URL del sitio y redirect URLs).
4. Crear el primer SUPER_ADMIN: `npm run seed:admin -- admin@empresa.com "Password123!" "Nombre"`.
5. (Opcional) documentos demo: `npm run seed:demo`.
6. `npm run dev` → http://localhost:3000.
7. Subir a GitHub y desplegar en Vercel (§11).

## 8. Variables de entorno

Archivo `.env.local` (nunca se versiona). Plantilla en `.env.example`.

| Variable | Ámbito | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Público | URL del proyecto (Project Settings → API). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | Clave `anon`. La seguridad la aplica RLS. |
| `NEXT_PUBLIC_SITE_URL` | Público | URL de la app (`http://localhost:3000` en local). Se usa en los enlaces de recuperación. En Vercel se deduce de `VERCEL_URL` si no se define. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | Necesaria para crear usuarios desde `/admin/users` y para los scripts `seed:*`. Si falta, la app funciona igualmente y la interfaz lo indica. **Nunca** la expongas con prefijo `NEXT_PUBLIC_`. |

## 9. Supabase: migraciones, storage, auth y seed

### 9.1 Crear el proyecto

1. Supabase → **New project** (plan Free). Anota la contraseña de la base de datos.
2. **Project Settings → API**: copia `Project URL`, `anon public` y `service_role` (esta última solo a `.env.local`).

### 9.2 Ejecutar migraciones

Opción A — **SQL Editor** (sin CLI): abre cada archivo y ejecútalo **en orden**:

```
supabase/migrations/001_initial_schema.sql   # extensiones, tablas, índices, triggers, RPC
supabase/migrations/002_rls.sql              # políticas Row Level Security
supabase/migrations/003_storage.sql          # bucket privado `documents` + políticas
supabase/migrations/004_seed.sql             # roles, permisos, normas, categorías, tipos, etiquetas, ajustes
supabase/migrations/005_force_password_change.sql  # cambio de contraseña obligatorio
supabase/migrations/006_rol_colaborador.sql        # rol COLABORADOR (sube documentos, no edita ni aprueba)
```

Todas son idempotentes (`if not exists`, `on conflict`), pueden volver a ejecutarse.

Opción B — **Management API** (sin CLI ni psql), con `SUPABASE_PROJECT_REF` y un `SUPABASE_ACCESS_TOKEN` personal en `.env.local`:

```bash
npm run db:migrate                 # aplica todas en orden
npm run db:migrate -- 005          # solo las que empiezan por 005
npm run auth:configure -- https://tu-app.vercel.app   # Site URL, redirects y signup deshabilitado
```

### 9.3 Storage

`003_storage.sql` crea el bucket `documents` (privado, 25 MB, MIME types permitidos) y sus políticas. Verifica en **Storage** que aparece como *Private*. Si cambias las extensiones permitidas en `/admin/settings`, añade también el MIME type al bucket.

### 9.4 Auth

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (local) o `https://tu-app.vercel.app` (producción).
- **Redirect URLs**: añade `http://localhost:3000/auth/callback` y `https://tu-app.vercel.app/auth/callback` (y `https://*.vercel.app/auth/callback` para previews).

En **Authentication → Providers → Email**: deja activado *Email*. Recomendado **desactivar “Allow new users to sign up”**: el alta la hacen los administradores. Los enlaces de invitación y recuperación llegan a `/auth/callback`, que intercambia el código y redirige a `/reset-password`.

### 9.5 Primer administrador

```bash
npm run seed:admin -- admin@empresa.com "UnaContraseñaSegura" "Nombre Apellido"
```

Crea el usuario en Auth con `app_metadata.role_code = SUPER_ADMIN`; el trigger `handle_new_user` genera el perfil con ese rol. Si el usuario ya existía, solo se le asigna el rol.

Alternativa sin script: crea el usuario en **Authentication → Users → Add user** y ejecuta en SQL:

```sql
update public.profiles
set role_id = (select id from public.roles where code = 'SUPER_ADMIN')
where email = 'admin@empresa.com';
```

### 9.6 Datos de demostración (opcional)

```bash
npm run seed:demo
```

Genera 10 documentos con prefijo `[DEMO]` y **archivos reales** (PDF/TXT/MD generados) en el bucket, repartidos entre las tres normas con distintos estados, versiones y etiquetas. Es idempotente. Elimínalos desde la app cuando ya no los necesites.

## 10. Desarrollo local

```bash
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # build de producción
npm run check      # typecheck + lint + build
```

Flujo de prueba sugerido:

1. Inicia sesión como SUPER_ADMIN → `/dashboard`.
2. `/admin/users` → crea un ADMIN, un CONSULTOR y un VISUALIZADOR (invitación o contraseña temporal).
3. `/documents/new` → sube un PDF; revisa vista previa, versiones, actividad y favoritos.
4. Entra como VISUALIZADOR: no verá “Administración”, “Subir” ni “Descargar”; `/admin` mostrará *Acceso denegado*; `/api/documents/<id>/download` devolverá 403.
5. `/admin/roles` → concede `documents.download` a VISUALIZADOR y comprueba el cambio.

## 11. Despliegue en Vercel

1. **GitHub**: sube el repositorio (`.env.local` está en `.gitignore`).
2. **Vercel → Add New Project → Import** desde GitHub. Framework detectado: Next.js. Sin ajustes de build.
3. **Environment Variables** (Production y Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://tu-app.vercel.app`
   - `SUPABASE_SERVICE_ROLE_KEY` (solo si quieres crear usuarios desde la app)
4. **Deploy**.
5. En Supabase → Auth → URL Configuration añade la URL de producción y `https://tu-app.vercel.app/auth/callback`.
6. Cada `git push` a `main` redespliega; las ramas generan *preview deployments*.

Notas del plan gratuito: Vercel limita el body de las funciones a 4,5 MB, por eso la subida de archivos va **directa del navegador a Supabase Storage**. Supabase Free ofrece 1 GB de Storage y 500 MB de base de datos; el bucket limita cada archivo a 25 MB.

## 12. Funcionalidades

| Área | Detalle |
| --- | --- |
| Autenticación | Login, logout, recuperación de contraseña, invitaciones, sesión por cookies, protección de rutas en proxy y servidor, redirección a `next`. |
| Dashboard | Saludo por franja horaria, bloque "Marco normativo y cumplimiento" con una tarjeta por norma que despliega sus usuarios más implicados y sus últimos documentos, indicadores por estado con porcentaje, documentos recientes y actividad. |
| Repositorio | Búsqueda full-text (`spanish_unaccent`, prefijos), filtros combinables (norma, categoría, subcategoría, tipo, estado, versión, fechas, autor, etiquetas), ordenación, paginación server-side, vista lista/grid, filtros en bottom-sheet en móvil. |
| Documento | Detalle completo, preview (PDF/imagen/texto), descarga auditada, favorito, edición de metadatos, cambio de estado, nueva versión, eliminación con limpieza de Storage. |
| Versionado | Historial inmutable con archivo por versión, resumen de cambio, autor y descarga de versiones anteriores. |
| Recientes / Favoritos | Por usuario; vistos, añadidos y modificados. |
| Normas | Árbol Norma → Categoría → Subcategoría con conteos y enlaces filtrados. |
| Actividad | Timeline paginado con filtros; visibilidad según `audit.read`. |
| Administración | Usuarios (alta, edición, activar/desactivar, rol), matriz de permisos, normas, categorías, etiquetas y tipos, documentos, auditoría, ajustes globales. |
| UI | Sistema de diseño VOZ360: tipografía Archivo (400/600/800) y paleta de marca (`--brand-100` … `--brand-900`) expuesta a Tailwind desde `globals.css`. Estados loading/empty/error/forbidden/not-found, dark mode sin parpadeo, responsive (sidebar → drawer bajo 900 px, normas 3 → 1 columna bajo 1200 px, tablas → cards), toasts, diálogos accesibles. |

## 13. Estructura del proyecto

```
supabase/migrations/        SQL: esquema, RLS, storage, seed
scripts/                    seed-admin.mjs, seed-demo.mjs (service role, solo local)
src/
  proxy.ts                  refresco de sesión y redirecciones (Next 16)
  app/
    (auth)/                 login, forgot-password, reset-password
    (app)/                  layout autenticado: dashboard, documents, recent, favorites,
                            standards, activity, settings, admin/*
    api/documents/[id]/download/route.ts   descarga segura
    auth/callback/route.ts  intercambio de código PKCE / token_hash
  components/
    ui/                     Button, Input, Select, Field, Badge, Card, Table, Tabs, Dialog,
                            Dropdown, Tooltip, Skeleton, Pagination, Avatar, Switch, States…
    layout/                 AppShell, Sidebar, Topbar, UserMenu, GlobalSearch, AdminNav
    dashboard/              StandardsBoard (bloque de normas + panel), ActivityList
    documents/              DocumentCard, DocumentTable, DocumentFilters, DocumentForm,
                            FileDropzone, FilePreview, VersionTimeline, ActivityTimeline…
    admin/                  UsersManager, RolesMatrix, StandardsManager, CategoriesManager…
    providers/              ThemeProvider, ToastProvider
  lib/
    supabase/               client.ts, server.ts, admin.ts (server-only), proxy.ts, database.types.ts
    auth/                   session.ts (getCurrentUser, requireUser…), permissions.ts
    services/               documents, taxonomy, dashboard, users, roles, audit, favorites,
                            recent, tags, settings
    actions/                Server Actions (auth, documents, favorites, users, roles,
                            taxonomy, settings, profile, dashboard)
    validation/             esquemas Zod
    storage/                upload.ts (cliente, XHR con progreso), server.ts (signed URLs)
    constants/              permisos, estados, navegación, auditoría
    utils/                  cn, format, files, search, slug, url, errors, audit-meta
  types/                    tipos de dominio
```

## 14. Hoja de ruta

La arquitectura deja espacio para, sin romper el modelo actual:

- Flujos de aprobación y firmas (estados + `document_versions` + auditoría ya existen).
- Recordatorios y vencimientos (`documents.review_date`).
- Requisitos ISO ↔ documentos ↔ evidencias (matriz de cumplimiento).
- Auditorías internas, hallazgos, no conformidades y planes de acción con responsables.
- Indicadores y reportes.

---

Licencia: uso interno de la organización. Contribuciones mediante pull request con `npm run check` en verde.
