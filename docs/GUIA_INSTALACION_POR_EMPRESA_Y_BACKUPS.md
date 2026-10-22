# Guía de Instalación Independiente por Empresa, Modalidades de Titularidad, Actualizaciones y Backups

---

## 1. Modalidades de Titularidad de la Infraestructura (Sección 2)

Cada empresa cliente dispone siempre de **su propia instalación independiente** (su propio sitio Netlify y su propio proyecto Supabase), sin compartir base de datos, tablas, usuarios, fotografías, firmas ni copias de seguridad con ninguna otra empresa. Existen dos modalidades comerciales/operativas:

| Aspecto | Modalidad A: Cuentas propiedad de la empresa cliente | Modalidad B: Cuentas gestionadas por el proveedor (proyectos separados) |
| :--- | :--- | :--- |
| **Titularidad de cuentas Netlify / Supabase** | La empresa cliente crea su propia organización en Supabase y Netlify y abona directamente los planes. | El proveedor crea un proyecto Supabase aislado y un sitio Netlify aislado por cada cliente dentro de su consola de gestión. |
| **Administración de infraestructura y secretos** | El responsable técnico del cliente o el proveedor mediante acceso delegado. | El proveedor tecnológico administra variables, secretos, dominios y monitorización. |
| **Gestión de Copias de Seguridad (Backups)** | El bucket externo de backups (S3 / Backblaze / R2) pertenece a la empresa cliente. | El proveedor custodia los backups cifrados en buckets separados por instalación con retención acordada. |
| **Actualizaciones del código común** | Se despliegan desde el repositorio común de GitHub mediante rama de release verificada. | El proveedor aplica las migraciones versionadas y despliega la nueva versión tras ejecutar copia previa. |

---

## 2. Procedimiento Paso a Paso para Crear una Nueva Instalación por Empresa

1. **Crear proyecto Supabase independiente**:
   - Crea un nuevo proyecto en Supabase para la nueva empresa (región `eu-central-1` recomendada).
   - Anota `Project URL`, `anon public key`, `service_role secret key` y la cadena de conexión PostgreSQL (`SUPABASE_DB_URL`).
2. **Aplicar migraciones SQL y políticas RLS**:
   - Ejecuta [`supabase/migrations/00001_initial_schema_and_rls.sql`](../supabase/migrations/00001_initial_schema_and_rls.sql).
   - Ejecuta [`supabase/migrations/00002_storage_and_cron_setup.sql`](../supabase/migrations/00002_storage_and_cron_setup.sql).
3. **Desplegar Edge Function de avisos y configurar secretos**:
   ```bash
   supabase functions deploy process-review-notifications --project-ref <PROJECT_REF_EMPRESA>
   supabase secrets set CRON_JOB_SECRET="<SECRETO>" EMAIL_API_KEY="<API_KEY>" EMAIL_FROM_ADDRESS="avisos@empresa.es" --project-ref <PROJECT_REF_EMPRESA>
   ```
4. **Crear sitio Netlify independiente**:
   - Conecta el repositorio común de GitHub a un **nuevo sitio de Netlify** exclusivo para esta empresa.
   - Comando de compilación: `npm run build` | Directorio de publicación: `dist`.
   - Configura las variables de entorno públicas en Netlify:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_ENABLE_LOCAL_ENGINE="false"`
     - `VITE_INSTALLATION_SLUG="nombre-empresa-sl"`
   - Asigna el subdominio o dominio personalizado de la empresa (ej. `partes.empresa-cliente.es`).
5. **Dar de alta el primer Administrador y parametrizar `company_settings`**:
   - Crea el primer administrador siguiendo el procedimiento del `README.md`, inicia sesión y configura en **Auditoría, Copias y Config. -> Configuración de Empresa** el nombre, NIF, logotipo, prefijo de numeración, zona horaria y el email administrativo que recibirá los avisos de revisiones.

---

## 3. Procedimiento de Migración y Actualización del Código Común (Con Copia Previa)

Antes de actualizar cualquier instalación en producción a una nueva versión del repositorio común:

1. **Ejecutar copia de seguridad íntegra previa (Punto de recuperación)**:
   ```bash
   npx tsx scripts/backup-runner.ts
   ```
   Verifica que se ha generado `manifest.json` con su hash `SHA-256` y que `backup_jobs` figura en estado `completed`.
2. **Probar las nuevas migraciones SQL en un entorno aislado (Staging)**:
   - Aplica las migraciones nuevas (`0000X_...sql`) primero sobre un proyecto de preproducción.
3. **Aplicar migraciones y desplegar frontend en Netlify**:
   - Ejecuta las migraciones pendientes en el proyecto Supabase de la empresa y lanza el despliegue en Netlify.
   - El Service Worker (`public/sw.js`) actualizará los activos estáticos sin borrar ni interrumpir los formularios abiertos de los operarios.

---

## 4. Guía Completa de Copias de Seguridad (Backups) y Restauración

### Alcance, Exclusiones y Destino
- **Por qué no basta el backup nativo de base de datos de Supabase**: Los volcados de PostgreSQL de Supabase **no incluyen los archivos binarios de Storage** (`work-files` con fotografías ni `work-signatures` con las firmas manuscritas de los clientes).
- **Alcance de nuestra solución (`scripts/backup-runner.ts`)**:
  1. Volcado completo de esquemas y tablas de PostgreSQL (`pg_dump --format=custom`).
  2. Descarga íntegra de todos los objetos privados de los buckets `work-files`, `work-signatures` y `company-assets`.
  3. Exportación de metadatos de identidades de `auth.users` (`auth_identities_metadata.json`).
  4. Manifiesto `manifest.json` con suma de verificación criptográfica `SHA-256`.
- **Destino y Retención**: Los paquetes generados no deben almacenarse únicamente en el mismo servidor de origen; se envían cifrados (AES-256) al bucket externo configurado en `BACKUP_STORAGE_BUCKET` con retención recomendada de 30 copias diarias y 12 mensuales.

### Disparador Diario en Primera Apertura de Escritorio
- Cuando un usuario autenticado abre la aplicación en contexto de escritorio, se invoca `triggerDailyDesktopAutoBackupIfNeeded`.
- Gracias al índice único parcial `idx_unique_daily_auto_backup (backup_date_local) WHERE trigger_type = 'auto_desktop' AND status IN ('queued', 'running', 'completed')`, si dos ordenadores de oficina abren la aplicación a la vez, se genera **un único trabajo diario válido**.
- Si un intento falla (`status = 'failed'`), el índice permite reintentar ese mismo día.
- Si no hay conexión de red en el momento de abrir, no se marca como realizada y se reintenta al recuperar conexión.

### Procedimiento de Restauración Verificada (`scripts/restore-runner.ts`)
Nunca restaures directamente encima de producción sin autorización expresa y punto de recuperación previo.
```bash
# Restauración en entorno aislado o de recuperación verificando SHA-256:
RESTORE_BACKUP_DIR="./backups/backup-2026-10-21" \
TARGET_SUPABASE_DB_URL="postgresql://..." \
TARGET_SUPABASE_URL="https://entorno-aislado.supabase.co" \
TARGET_SUPABASE_SERVICE_ROLE_KEY="..." \
CONFIRM_RESTORE_AUTHORIZATION="AUTORIZO_RESTAURACION_VERIFICADA" \
npx tsx scripts/restore-runner.ts
```
