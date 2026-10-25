-- =============================================================================
-- MIGRACIÓN 00003: ESTADO REABIERTO, AUDITORÍA DE REAPERTURAS Y SEGURIDAD RLS
-- Aplicación de Gestión de Partes de Trabajo (Single-tenant por instalación)
-- =============================================================================

-- 1. Añadir el valor 'reabierto' al tipo enumerado work_order_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'work_order_status' AND e.enumlabel = 'reabierto'
  ) THEN
    ALTER TYPE public.work_order_status ADD VALUE 'reabierto' AFTER 'en_curso';
  END IF;
END $$;

-- 2. Añadir columnas de trazabilidad de reapertura en public.work_orders
ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reopen_reason TEXT,
  ADD COLUMN IF NOT EXISTS final_observations TEXT;

-- 3. Actualizar la restricción de integridad para admitir 'reabierto' sin obligar importes
ALTER TABLE public.work_orders
  DROP CONSTRAINT IF EXISTS chk_finished_requires_explicit_fields;

ALTER TABLE public.work_orders
  ADD CONSTRAINT chk_finished_requires_explicit_fields CHECK (
    status IN ('no_iniciado', 'en_curso', 'reabierto') OR (
      total_amount_cents IS NOT NULL AND
      total_amount_cents >= 0 AND
      customer_requests_invoice IS NOT NULL AND
      customer_has_paid IS NOT NULL
    )
  );

-- 4. Actualizar la función de acceso para que operarios asignados puedan leer partes reabiertos
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
      AND wo.status IN ('no_iniciado', 'en_curso', 'reabierto')
      AND public.is_active_user()
  );
$$;

-- 5. Procedimiento almacenado para reapertura de partes con reasignación al operario que lo cerró
CREATE OR REPLACE FUNCTION public.reopen_work_order(
  p_work_order_id UUID,
  p_reason TEXT,
  p_target_status public.work_order_status DEFAULT 'reabierto'
)
RETURNS public.work_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_wo public.work_orders;
  v_prev_status public.work_order_status;
  v_was_archived BOOLEAN;
  v_closing_operator_id UUID;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede reabrir partes de trabajo.';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Es obligatorio indicar el motivo de la reapertura para el registro de auditoría.';
  END IF;

  SELECT * INTO v_wo FROM public.work_orders WHERE id = p_work_order_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parte no encontrado.';
  END IF;

  v_prev_status := v_wo.status;
  v_was_archived := v_wo.archived_at IS NOT NULL;

  -- Determinar el operario que cerró o finalizó el trabajo
  v_closing_operator_id := v_wo.finished_by;
  IF v_closing_operator_id IS NULL THEN
    SELECT actor_id INTO v_closing_operator_id
    FROM public.work_order_events
    WHERE work_order_id = p_work_order_id
      AND event_type IN ('finalizado', 'cerrado')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  IF v_closing_operator_id IS NULL THEN
    SELECT operator_id INTO v_closing_operator_id
    FROM public.work_order_assignments
    WHERE work_order_id = p_work_order_id AND is_active = true
    LIMIT 1;
  END IF;

  -- Actualizar parte
  UPDATE public.work_orders
  SET
    archived_at = NULL,
    archived_by = NULL,
    status = p_target_status,
    finished_at = CASE WHEN p_target_status IN ('en_curso', 'reabierto') THEN NULL ELSE finished_at END,
    finished_by = CASE WHEN p_target_status IN ('en_curso', 'reabierto') THEN NULL ELSE finished_by END,
    closed_at = NULL,
    closed_by = NULL,
    reopened_at = v_now,
    reopened_by = v_admin_id,
    reopen_reason = trim(p_reason),
    updated_at = v_now,
    version = version + 1
  WHERE id = p_work_order_id
  RETURNING * INTO v_wo;

  -- Reasignar al operario que lo cerró
  IF v_closing_operator_id IS NOT NULL THEN
    UPDATE public.work_order_assignments
    SET is_active = false, unassigned_at = v_now, unassigned_by = v_admin_id
    WHERE work_order_id = p_work_order_id AND operator_id <> v_closing_operator_id AND is_active = true;

    INSERT INTO public.work_order_assignments (work_order_id, operator_id, is_active, assigned_at, assigned_by)
    VALUES (p_work_order_id, v_closing_operator_id, true, v_now, v_admin_id)
    ON CONFLICT (work_order_id, operator_id) DO UPDATE
      SET is_active = true, unassigned_at = NULL, unassigned_by = NULL;
  END IF;

  -- Evento de auditoría
  INSERT INTO public.work_order_events (
    work_order_id, event_type, from_status, to_status, reason, actor_id, metadata, created_at
  ) VALUES (
    p_work_order_id, 'reabierto', v_prev_status, p_target_status, trim(p_reason), v_admin_id,
    jsonb_build_object('was_archived', v_was_archived, 'assigned_to_operator_id', v_closing_operator_id), v_now
  );

  RETURN v_wo;
END;
$$;
