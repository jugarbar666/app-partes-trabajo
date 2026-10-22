# Gestión de Partes de Trabajo, Revisiones Periódicas, Lista de Compra y Control Horario

Aplicación web responsive e instalable como **PWA** diseñada para empresas de instalaciones y servicios bajo arquitectura **Single-Tenant por instalación** (una base de código común en GitHub, un sitio **Netlify** independiente por empresa y un proyecto **Supabase** independiente por empresa con PostgreSQL, Auth, RLS y Storage privado).

---

## 1. Requisitos del Sistema e Instalación Local

- **Node.js**: v20+ o v24+
- **npm**: v10+

### Comandos principales

```bash
# 1. Instalar dependencias respetando package-lock.json
npm install

# 2. Copiar archivo de variables de entorno
cp .env.example .env

# 3. Levantar servidor de desarrollo local
npm run dev

# 4. Comprobación estricta de tipos TypeScript
npm run typecheck

# 5. Ejecutar batería de pruebas automatizadas de aceptación (Vitest)
npm test

# 6. Compilar versión de producción para despliegue en Netlify
npm run build
```

---

## 2. Alta Segura del Primer Administrador y Usuarios por Invitación

Existen **exactamente dos roles funcionales**: `admin` (Administrador) y `operario` (Operario). El personal de oficina utiliza el rol que corresponda.

### Procedimiento en una nueva instalación de Supabase:
1. Ejecuta las migraciones SQL en el editor SQL o mediante Supabase CLI:
   - [`supabase/migrations/00001_initial_schema_and_rls.sql`](supabase/migrations/00001_initial_schema_and_rls.sql)
   - [`supabase/migrations/00002_storage_and_cron_setup.sql`](supabase/migrations/00002_storage_and_cron_setup.sql)
2. Desde el panel de **Supabase Auth -> Users**, utiliza **"Invite user"** (o crea el primer usuario administrativo).
3. Inserta su perfil inicial como administrador ejecutando en el SQL Editor (con privilegio de servicio):
   ```sql
   INSERT INTO public.profiles (id, full_name, dni, email, role, is_active)
   VALUES ('UUID_DEL_USUARIO_AUTH', 'Nombre Administrador Inicial', '12345678A', 'admin@empresa.es', 'admin', true);
   ```
4. A partir de ese momento, todas las altas siguientes se realizan por **invitación administrativa** desde el apartado **Datos Maestros y Usuarios -> Usuarios y Roles**.
5. Reglas de seguridad en servidor (`trg_enforce_profile_security`):
   - Ningún usuario puede asignarse ni cambiar su propio rol.
   - El servidor rechaza inactivar o quitar el rol al último administrador activo de la instalación.
   - Al inactivar un usuario, sus sesiones y accesos quedan revocados inmediatamente sin borrar su histórico.

---

## 3. Configuración de Almacenamiento Privado (Storage) y Correo Transaccional

### Storage Privado
- Los buckets `work-files`, `work-signatures` y `company-assets` se crean con `public = false`.
- Las descargas y visualizaciones utilizan **URLs firmadas temporales** (ventana de vigencia documentada de **15 minutos**) y las políticas RLS de `storage.objects` verifican en cada acceso que el usuario esté activo y asignado al parte.

### Avisos Automáticos de Revisiones (`pg_cron` + `pg_net` + Edge Function)
- La función de servidor [`supabase/functions/process-review-notifications/index.ts`](supabase/functions/process-review-notifications/index.ts) procesa la tabla `notification_outbox`.
- Envía avisos al email administrativo configurado en `company_settings`:
  1. **Un mes natural antes** del vencimiento (con ajuste al último día válido del mes, ej. 31 mar -> 28/29 feb).
  2. **Una semana antes** (7 días naturales antes).
  3. **El mismo día** del vencimiento.
- **Secretos protegidos**: `EMAIL_API_KEY`, `CRON_JOB_SECRET` y `SUPABASE_SERVICE_ROLE_KEY` se configuran en **Supabase Vault / Edge Function Secrets**, nunca en variables `VITE_*` ni en la tabla `company_settings`.
- **Alternativa compatible**: Si el plan de Supabase no dispone de `pg_cron`, puedes programar el disparo horario mediante GitHub Actions Scheduled Workflow o Netlify Scheduled Functions invocando el endpoint de la Edge Function con la cabecera `Authorization: Bearer <CRON_JOB_SECRET>`.

---

## 4. Documentación Complementaria del Proyecto

- [`docs/MATRIZ_REQUISITOS_R_D_O.md`](docs/MATRIZ_REQUISITOS_R_D_O.md): Trazabilidad completa de cada requisito **R**, decisiones técnicas **D** aplicadas y mejoras opcionales **O**, junto con la matriz de permisos y el manual por rol.
- [`docs/GUIA_INSTALACION_POR_EMPRESA_Y_BACKUPS.md`](docs/GUIA_INSTALACION_POR_EMPRESA_Y_BACKUPS.md): Guía paso a paso para crear una nueva instalación por empresa (Netlify + Supabase independientes), modalidades de titularidad, procedimiento de actualización del código común y guía operativa de copias de seguridad y restauración.
