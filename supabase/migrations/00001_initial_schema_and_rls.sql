-- =============================================================================
-- MIGRACIÓN 00001: ESQUEMA COMPLETO, RLS, TRIGGERS Y OPERACIONES DE SERVIDOR
-- Aplicación de Gestión de Partes de Trabajo (Single-tenant por instalación)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS DE DOMINIO
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'operario');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE work_order_status AS ENUM ('no_iniciado', 'en_curso', 'terminado', 'cerrado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pendiente', 'programada', 'realizada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE periodicity_unit AS ENUM ('days', 'months', 'years', 'none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE shopping_status AS ENUM ('pending_quantity', 'pending_purchase', 'purchased', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_notice_type AS ENUM ('1_month_before', '1_week_before', 'same_day');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'uncertain', 'skipped_recovery', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE backup_trigger_type AS ENUM ('auto_desktop', 'manual', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE backup_status AS ENUM ('queued', 'running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. TABLA DE CONFIGURACIÓN DE EMPRESA (REGISTRO ÚNICO DE LA INSTALACIÓN)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Instalaciones y Servicios S.L.',
  tax_id TEXT DEFAULT 'B00000000',
  contact_phone TEXT DEFAULT '+34 900 000 000',
  contact_email TEXT DEFAULT 'info@empresa-instalaciones.es',
  address TEXT DEFAULT 'Calle Principal 1, Madrid',
  logo_storage_path TEXT,
  notification_email TEXT NOT NULL DEFAULT 'avisos@empresa-instalaciones.es',
  work_order_prefix TEXT NOT NULL DEFAULT 'PT',
  work_order_next_seq BIGINT NOT NULL DEFAULT 1,
  timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
  locale TEXT NOT NULL DEFAULT 'es-ES',
  currency TEXT NOT NULL DEFAULT 'EUR',
  date_format TEXT NOT NULL DEFAULT 'dd/mm/aaaa',
  time_format TEXT NOT NULL DEFAULT '24h',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

INSERT INTO public.company_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. PERFILES DE USUARIO Y CONTROL DE ROLES E INACTIVACIÓN
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  dni TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'operario',
  is_active BOOLEAN NOT NULL DEFAULT true,
  column_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  invited_by UUID,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Funciones auxiliares de seguridad en servidor
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- Trigger para impedir que un usuario cambie su propio rol o dejar el sistema sin administrador activo
CREATE OR REPLACE FUNCTION public.enforce_profile_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_admins INTEGER;
BEGIN
  -- 1. Un usuario no puede cambiar su propio rol
  IF TG_OP = 'UPDATE' AND OLD.id = auth.uid() AND NEW.role <> OLD.role THEN
    RAISE EXCEPTION 'Un usuario no puede asignarse ni cambiar su propio rol.';
  END IF;

  -- 2. Impedir dejar la instalación sin ningún administrador activo
  IF TG_OP = 'UPDATE' AND (OLD.role = 'admin' AND OLD.is_active = true) AND (NEW.role <> 'admin' OR NEW.is_active = false) THEN
    SELECT COUNT(*) INTO remaining_admins
    FROM public.profiles
    WHERE role = 'admin' AND is_active = true AND id <> OLD.id;

    IF remaining_admins < 1 THEN
      RAISE EXCEPTION 'No se puede inactivar ni cambiar el rol del único administrador activo de la instalación.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Los usuarios no se eliminan físicamente; utiliza inactivación para conservar el histórico.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_security();

-- -----------------------------------------------------------------------------
-- 4. AUDITORÍA INMUTABLE EN SERVIDOR
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_name_snapshot TEXT,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  changes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON public.audit_log(server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);

-- Impedir alteración o borrado de auditoría
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'El registro de auditoría es inmutable y no permite modificaciones ni eliminaciones.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_mutation ON public.audit_log;
CREATE TRIGGER trg_prevent_audit_mutation
BEFORE UPDATE OR DELETE ON public.audit_log
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- -----------------------------------------------------------------------------
-- 5. DATOS MAESTROS (CLIENTES, DOMICILIOS, PROVEEDORES, ARTÍCULOS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tax_id TEXT,
  phones JSONB NOT NULL DEFAULT '[]'::jsonb,
  emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  main_address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  alias TEXT NOT NULL,
  address_line TEXT NOT NULL,
  postal_code TEXT,
  city TEXT NOT NULL,
  province TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (purchase_price_cents >= 0),
  sale_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (sale_price_cents >= 0),
  unit TEXT NOT NULL DEFAULT 'ud',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vista de catálogo de artículos para operarios (sin precio de compra administrativo)
CREATE OR REPLACE VIEW public.articles_operator_catalog AS
SELECT
  id,
  code,
  name,
  description,
  unit,
  sale_price_cents,
  is_active
FROM public.articles
WHERE is_active = true;

-- -----------------------------------------------------------------------------
-- 6. PARTES DE TRABAJO, TABLA RESERVADA ADMIN, ASIGNACIONES Y APORTACIONES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number_seq BIGINT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_address_id UUID REFERENCES public.customer_addresses(id) ON DELETE RESTRICT,
  -- Instantánea (Snapshot) de datos del cliente y dirección del servicio
  snapshot_customer_name TEXT NOT NULL,
  snapshot_customer_tax_id TEXT,
  snapshot_contact_name TEXT,
  snapshot_contact_phone TEXT,
  snapshot_contact_email TEXT,
  snapshot_address_line TEXT NOT NULL,
  snapshot_postal_code TEXT,
  snapshot_city TEXT,
  snapshot_province TEXT,
  -- Planificación
  planned_work TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  initial_notes TEXT,
  origin_review_occurrence_id UUID UNIQUE,
  -- Estado y datos de finalización
  status work_order_status NOT NULL DEFAULT 'no_iniciado',
  total_amount_cents BIGINT CHECK (total_amount_cents IS NULL OR total_amount_cents >= 0),
  customer_requests_invoice BOOLEAN,
  customer_has_paid BOOLEAN,
  content_hash TEXT,
  -- Marcas de transición, archivo y borrado lógico
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  started_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  finished_at TIMESTAMPTZ,
  finished_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  delete_reason TEXT,
  -- Restricciones de integridad de negocio
  CONSTRAINT chk_archived_requires_closed CHECK (archived_at IS NULL OR status = 'cerrado'),
  CONSTRAINT chk_finished_requires_explicit_fields CHECK (
    status IN ('no_iniciado', 'en_curso') OR (
      total_amount_cents IS NOT NULL AND
      total_amount_cents >= 0 AND
      customer_requests_invoice IS NOT NULL AND
      customer_has_paid IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON public.work_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled_at ON public.work_orders(scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status) WHERE deleted_at IS NULL AND archived_at IS NULL;

-- Tabla separada para dinero_entregado y factura_emitida (NUNCA accesible por operarios)
CREATE TABLE IF NOT EXISTS public.work_order_admin (
  work_order_id UUID PRIMARY KEY REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  money_delivered BOOLEAN NOT NULL DEFAULT false,
  money_delivered_at TIMESTAMPTZ,
  money_delivered_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  invoice_issued BOOLEAN NOT NULL DEFAULT false,
  invoice_issued_at TIMESTAMPTZ,
  invoice_issued_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  invoice_number TEXT,
  admin_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  unassigned_at TIMESTAMPTZ,
  unassigned_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  UNIQUE (work_order_id, operator_id)
);

CREATE INDEX IF NOT EXISTS idx_wo_assignments_operator ON public.work_order_assignments(operator_id, is_active);

-- Función para verificar si el usuario actual es operario asignado activo de un parte editable/visible
CREATE OR REPLACE FUNCTION public.can_operator_access_work_order(p_work_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.work_orders wo
    JOIN public.work_order_assignments woa ON woa.work_order_id = wo.id
    WHERE wo.id = p_work_order_id
      AND woa.operator_id = auth.uid()
      AND woa.is_active = true
      AND wo.deleted_at IS NULL
      AND wo.archived_at IS NULL
      AND wo.status IN ('no_iniciado', 'en_curso')
      AND public.is_active_user()
  );
$$;

-- Aportaciones: Trabajos realizados y observaciones
CREATE TABLE IF NOT EXISTS public.work_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  observations TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT
);

-- Aportaciones: Jornadas del parte (independientes del fichaje laboral)
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_work_session_dates CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Aportaciones: Materiales utilizados
CREATE TABLE IF NOT EXISTS public.work_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  article_id UUID REFERENCES public.articles(id) ON DELETE RESTRICT,
  article_name_snapshot TEXT NOT NULL,
  unit_snapshot TEXT NOT NULL DEFAULT 'ud',
  quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
  unit_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  notes TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Archivos y fotografías del parte
CREATE TABLE IF NOT EXISTS public.work_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 15728640),
  caption TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Firmas manuscritas del cliente con control de vigencia ante cambios materiales
CREATE TABLE IF NOT EXISTS public.work_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_dni TEXT,
  signed_content_hash TEXT NOT NULL,
  signed_summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMPTZ,
  invalidated_reason TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historial de eventos del parte
CREATE TABLE IF NOT EXISTS public.work_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  from_status work_order_status,
  to_status work_order_status,
  reason TEXT,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. REVISIONES PERIÓDICAS Y MOTOR DE AVISOS AUTOMÁTICOS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  suggested_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (suggested_price_cents >= 0),
  periodicity_unit periodicity_unit NOT NULL DEFAULT 'months',
  periodicity_value INTEGER NOT NULL DEFAULT 12 CHECK (periodicity_value >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_address_id UUID NOT NULL REFERENCES public.customer_addresses(id) ON DELETE RESTRICT,
  review_type_id UUID NOT NULL REFERENCES public.review_types(id) ON DELETE RESTRICT,
  origin_work_order_id UUID REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  last_review_date DATE,
  next_review_date DATE NOT NULL,
  status review_status NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.review_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_review_id UUID NOT NULL REFERENCES public.installation_reviews(id) ON DELETE RESTRICT,
  due_date DATE NOT NULL,
  status review_status NOT NULL DEFAULT 'pendiente',
  linked_work_order_id UUID REFERENCES public.work_orders(id) ON DELETE RESTRICT,
  completed_date DATE,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_occurrence_id UUID NOT NULL REFERENCES public.review_occurrences(id) ON DELETE RESTRICT,
  due_date DATE NOT NULL,
  notice_type notification_notice_type NOT NULL,
  recipient_email TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  dedup_key TEXT NOT NULL UNIQUE,
  status notification_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  provider_reference TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id UUID NOT NULL REFERENCES public.notification_outbox(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 8. LISTA DE COMPRA DE MATERIALES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shopping_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_price_cents BIGINT NOT NULL DEFAULT 0,
  sale_price_cents BIGINT NOT NULL DEFAULT 0,
  quantity NUMERIC(12, 3) CHECK (quantity IS NULL OR quantity > 0),
  status shopping_status NOT NULL DEFAULT 'pending_quantity',
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  additional_requesters JSONB NOT NULL DEFAULT '[]'::jsonb,
  purchased_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  purchased_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 9. FICHAJE Y CONTROL HORARIO
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out_at TIMESTAMPTZ,
  worker_notes_in TEXT,
  worker_notes_out TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  delete_reason TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_attendance_interval CHECK (clock_out_at IS NULL OR clock_out_at >= clock_in_at)
);

-- Índice único parcial: a lo sumo una entrada abierta por trabajador activo
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_open_attendance_per_user
ON public.attendance_sessions(user_id)
WHERE clock_out_at IS NULL AND is_deleted = false;

CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE RESTRICT,
  previous_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  reason TEXT NOT NULL,
  corrected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 10. COPIAS DE SEGURIDAD E IMPORTACIONES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date_local DATE NOT NULL,
  trigger_type backup_trigger_type NOT NULL,
  status backup_status NOT NULL DEFAULT 'queued',
  scope JSONB NOT NULL DEFAULT '{"database": true, "storage_files": true, "auth_identities": true}'::jsonb,
  artifact_path TEXT,
  size_bytes BIGINT,
  checksum_sha256 TEXT,
  error_message TEXT,
  triggered_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Impide duplicar copias automáticas de escritorio válidas o en curso el mismo día local
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_daily_auto_backup
ON public.backup_jobs(backup_date_local)
WHERE trigger_type = 'auto_desktop' AND status IN ('queued', 'running', 'completed');

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  conflict_policy TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  inserted_rows INTEGER NOT NULL DEFAULT 0,
  updated_rows INTEGER NOT NULL DEFAULT 0,
  rejected_rows INTEGER NOT NULL DEFAULT 0,
  errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  executed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 11. OPERACIONES ATÓMICAS DE NEGOCIO EN SERVIDOR (RPCs)
-- -----------------------------------------------------------------------------

-- Numeración atómica en servidor para alta de partes (evita max+1 en cliente)
CREATE OR REPLACE FUNCTION public.next_work_order_number()
RETURNS TABLE(seq BIGINT, formatted_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_seq BIGINT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo el administrador puede crear partes y generar numeración.';
  END IF;

  UPDATE public.company_settings
  SET work_order_next_seq = work_order_next_seq + 1,
      updated_at = now()
  WHERE id = 1
  RETURNING work_order_prefix, work_order_next_seq - 1 INTO v_prefix, v_seq;

  RETURN QUERY SELECT v_seq, v_prefix || '-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- Trigger que protege la autoría y valida que un operario solo modifique sus propias aportaciones
CREATE OR REPLACE FUNCTION public.enforce_contribution_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      IF NOT public.can_operator_access_work_order(NEW.work_order_id) THEN
        RAISE EXCEPTION 'No tienes permiso ni asignación activa sobre este parte editable.';
      END IF;
      NEW.created_by := auth.uid();
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT public.is_admin() THEN
      IF NOT public.can_operator_access_work_order(OLD.work_order_id) THEN
        RAISE EXCEPTION 'El parte ya no es editable o no estás asignado.';
      END IF;
      IF OLD.created_by <> auth.uid() THEN
        RAISE EXCEPTION 'Un operario solo puede modificar las aportaciones creadas por él mismo.';
      END IF;
      IF NEW.created_by <> OLD.created_by THEN
        RAISE EXCEPTION 'No está permitido alterar el autor de una aportación.';
      END IF;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT public.is_admin() THEN
      IF NOT public.can_operator_access_work_order(OLD.work_order_id) THEN
        RAISE EXCEPTION 'El parte ya no es editable o no estás asignado.';
      END IF;
      IF OLD.created_by <> auth.uid() THEN
        RAISE EXCEPTION 'Un operario solo puede borrar las aportaciones creadas por él mismo.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_work_entries_ownership ON public.work_entries;
CREATE TRIGGER trg_work_entries_ownership
BEFORE INSERT OR UPDATE OR DELETE ON public.work_entries
FOR EACH ROW EXECUTE FUNCTION public.enforce_contribution_ownership();

DROP TRIGGER IF EXISTS trg_work_sessions_ownership ON public.work_sessions;
CREATE TRIGGER trg_work_sessions_ownership
BEFORE INSERT OR UPDATE OR DELETE ON public.work_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_contribution_ownership();

DROP TRIGGER IF EXISTS trg_work_materials_ownership ON public.work_materials;
CREATE TRIGGER trg_work_materials_ownership
BEFORE INSERT OR UPDATE OR DELETE ON public.work_materials
FOR EACH ROW EXECUTE FUNCTION public.enforce_contribution_ownership();

-- Finalización atómica de un parte (valida 0 jornadas abiertas, 3 campos explícitos y retira acceso operativo)
CREATE OR REPLACE FUNCTION public.finalize_work_order(
  p_work_order_id UUID,
  p_total_amount_cents BIGINT,
  p_customer_requests_invoice BOOLEAN,
  p_customer_has_paid BOOLEAN,
  p_expected_version INTEGER
)
RETURNS public.work_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wo public.work_orders;
  v_open_sessions INTEGER;
BEGIN
  IF NOT (public.is_admin() OR public.can_operator_access_work_order(p_work_order_id)) THEN
    RAISE EXCEPTION 'No tienes autorización para finalizar este parte.';
  END IF;

  IF p_total_amount_cents IS NULL OR p_total_amount_cents < 0 THEN
    RAISE EXCEPTION 'Debes indicar un importe válido mayor o igual a cero.';
  END IF;

  IF p_customer_requests_invoice IS NULL OR p_customer_has_paid IS NULL THEN
    RAISE EXCEPTION 'Debes responder explícitamente Sí o No a si solicita factura y si ha pagado.';
  END IF;

  SELECT * INTO v_wo FROM public.work_orders WHERE id = p_work_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parte no encontrado.';
  END IF;

  IF v_wo.status IN ('terminado', 'cerrado') THEN
    RAISE EXCEPTION 'El parte ya ha sido finalizado anteriormente.';
  END IF;

  IF v_wo.version <> p_expected_version THEN
    RAISE EXCEPTION 'Conflicto de concurrencia: el parte fue modificado por otro usuario. Recarga antes de continuar.';
  END IF;

  SELECT COUNT(*) INTO v_open_sessions
  FROM public.work_sessions
  WHERE work_order_id = p_work_order_id AND ended_at IS NULL;

  IF v_open_sessions > 0 THEN
    RAISE EXCEPTION 'Existen % jornada(s) de trabajo abiertas en este parte. Deben cerrarse antes de finalizar.', v_open_sessions;
  END IF;

  UPDATE public.work_orders
  SET status = 'terminado',
      total_amount_cents = p_total_amount_cents,
      customer_requests_invoice = p_customer_requests_invoice,
      customer_has_paid = p_customer_has_paid,
      finished_at = now(),
      finished_by = auth.uid(),
      updated_at = now(),
      version = version + 1
  WHERE id = p_work_order_id
  RETURNING * INTO v_wo;

  INSERT INTO public.work_order_events (work_order_id, event_type, from_status, to_status, actor_id, metadata)
  VALUES (
    p_work_order_id,
    'finalizado',
    'en_curso',
    'terminado',
    auth.uid(),
    jsonb_build_object(
      'total_amount_cents', p_total_amount_cents,
      'customer_requests_invoice', p_customer_requests_invoice,
      'customer_has_paid', p_customer_has_paid
    )
  );

  INSERT INTO public.audit_log (actor_id, module, entity_type, entity_id, operation, changes_json)
  VALUES (
    auth.uid(),
    'partes',
    'work_order',
    p_work_order_id::TEXT,
    'FINALIZAR',
    jsonb_build_object(
      'status', 'terminado',
      'total_amount_cents', p_total_amount_cents,
      'customer_requests_invoice', p_customer_requests_invoice,
      'customer_has_paid', p_customer_has_paid
    )
  );

  RETURN v_wo;
END;
$$;

-- -----------------------------------------------------------------------------
-- 12. POLÍTICAS ROW LEVEL SECURITY (RLS) ESTRICTAS EN TODAS LAS TABLAS
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Políticas de company_settings
CREATE POLICY "Lectura configuración autenticados activos" ON public.company_settings
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "Modificación configuración solo admin" ON public.company_settings
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Políticas de profiles
CREATE POLICY "Lectura perfiles activos" ON public.profiles
  FOR SELECT USING (public.is_active_user());
CREATE POLICY "Gestión perfiles admin" ON public.profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Preferencias propias usuario" ON public.profiles
  FOR UPDATE USING (id = auth.uid() AND public.is_active_user())
  WITH CHECK (id = auth.uid() AND public.is_active_user());

-- Políticas de work_orders (Admin ve todos; Operario solo asignados y en flujo activo no_iniciado/en_curso)
CREATE POLICY "Admin acceso total work_orders" ON public.work_orders
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Operario consulta solo partes asignados activos" ON public.work_orders
  FOR SELECT USING (public.can_operator_access_work_order(id));

-- Políticas de work_order_admin (EXCLUSIVO ADMIN — Operario jamás recibe dinero_entregado ni factura_emitida)
CREATE POLICY "Exclusivo admin datos económicos reservados" ON public.work_order_admin
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Políticas de aportaciones
CREATE POLICY "Admin acceso total work_entries" ON public.work_entries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Operario lee aportaciones de partes asignados" ON public.work_entries
  FOR SELECT USING (public.can_operator_access_work_order(work_order_id));
CREATE POLICY "Operario crea aportaciones propias" ON public.work_entries
  FOR INSERT WITH CHECK (public.can_operator_access_work_order(work_order_id) AND created_by = auth.uid());
CREATE POLICY "Operario modifica solo sus aportaciones" ON public.work_entries
  FOR UPDATE USING (public.can_operator_access_work_order(work_order_id) AND created_by = auth.uid())
  WITH CHECK (public.can_operator_access_work_order(work_order_id) AND created_by = auth.uid());
CREATE POLICY "Operario borra solo sus aportaciones" ON public.work_entries
  FOR DELETE USING (public.can_operator_access_work_order(work_order_id) AND created_by = auth.uid());

-- Políticas de auditoría y backups (Solo Admin)
CREATE POLICY "Lectura auditoría solo admin" ON public.audit_log
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Gestión backups solo admin" ON public.backup_jobs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
