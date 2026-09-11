# Guía de despliegue · GitHub → Vercel → Supabase

Checklist paso a paso para poner ISO DMS en producción con planes gratuitos. Para el detalle de cada punto consulta el [README](../README.md).

## 1. Supabase

- [ ] Crear proyecto (Free). Guardar la contraseña de la base de datos.
- [ ] **Project Settings → API**: copiar `Project URL`, `anon public`, `service_role`.
- [ ] **SQL Editor**: ejecutar en orden
  - [ ] `supabase/migrations/001_initial_schema.sql`
  - [ ] `supabase/migrations/002_rls.sql`
  - [ ] `supabase/migrations/003_storage.sql`
  - [ ] `supabase/migrations/004_seed.sql`
- [ ] **Storage**: confirmar que el bucket `documents` existe y es *Private*.
- [ ] **Authentication → Providers → Email**: activo. Desactivar *Allow new users to sign up* (recomendado).
- [ ] **Authentication → URL Configuration**:
  - Site URL: `https://<tu-app>.vercel.app`
  - Redirect URLs: `https://<tu-app>.vercel.app/auth/callback`, `https://*.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
- [ ] (Opcional) **Authentication → Email Templates**: personalizar invitación y recuperación.

## 2. Local

- [ ] `cp .env.example .env.local` y completar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `npm install`
- [ ] `npm run seed:admin -- admin@empresa.com "ContraseñaSegura" "Nombre Apellido"`
- [ ] (Opcional) `npm run seed:demo`
- [ ] `npm run dev` y comprobar login en http://localhost:3000.
- [ ] `npm run check` (typecheck + lint + build) en verde.

## 3. GitHub

- [ ] `git init` (si no existe), `git add .`, `git commit -m "feat: ISO DMS v0.1"`.
- [ ] Crear repositorio y `git push -u origin main`.
- [ ] Verificar que `.env.local` **no** se ha subido (está en `.gitignore`).

## 4. Vercel

- [ ] **Add New → Project → Import Git Repository**.
- [ ] Framework: Next.js (auto). Root directory: `/`.
- [ ] **Environment Variables** (Production + Preview):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL` → `https://<tu-app>.vercel.app`
  - `SUPABASE_SERVICE_ROLE_KEY` (solo si se crearán usuarios desde la app)
- [ ] **Deploy** y abrir la URL.
- [ ] Iniciar sesión con el SUPER_ADMIN, crear un usuario de prueba desde `/admin/users` y confirmar que recibe la invitación.

## 5. Verificación post-despliegue

- [ ] `/login` redirige a `/dashboard` tras autenticarse.
- [ ] Un VISUALIZADOR no ve *Administración* y `/admin` muestra *Acceso denegado*.
- [ ] `GET /api/documents/<id>/download` sin permiso devuelve 403; con permiso descarga y registra `document.downloaded` en `/admin/activity`.
- [ ] Subida de un PDF > límite configurado es rechazada; dentro del límite se sube con barra de progreso.
- [ ] Los archivos del bucket **no** son accesibles por URL pública.

## 6. Operación

- Rotar `service_role` si se sospecha exposición (Supabase → API → *Generate new key*) y actualizar Vercel.
- Copias de seguridad: Supabase Free conserva backups diarios 7 días. Exportar periódicamente con `pg_dump` si se requiere retención mayor.
- Ajustes de la organización (nombre, tamaño máximo, extensiones) en `/admin/settings`.
