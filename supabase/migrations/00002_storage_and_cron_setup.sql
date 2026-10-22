-- =============================================================================
-- MIGRACIÓN 00002: STORAGE PRIVADO, URLs FIRMADAS Y TAREAS PROGRAMADAS (CRON)
-- =============================================================================

-- 1. Creación de buckets privados para fotografías, firmas y logotipos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('work-files', 'work-files', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('work-signatures', 'work-signatures', false, 5242880, ARRAY['image/png', 'image/svg+xml']),
  ('company-assets', 'company-assets', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Storage: acceso solo a usuarios autenticados activos y asignados al parte
CREATE POLICY "Acceso lectura fotos parte autorizados"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('work-files', 'work-signatures')
  AND (
    public.is_admin()
    OR public.can_operator_access_work_order((storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "Subida fotos y firmas parte autorizados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('work-files', 'work-signatures')
  AND (
    public.is_admin()
    OR public.can_operator_access_work_order((storage.foldername(name))[1]::uuid)
  )
);

-- 3. Programación con pg_cron y pg_net para la Edge Function de Avisos de Revisiones
-- Ejecuta cada hora en punto para evaluar la cola según la zona horaria de la empresa
-- Requiere extensiones pg_cron y pg_net habilitadas en el proyecto Supabase
/*
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'process-review-notifications-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-review-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_job_secret')
    ),
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
*/
