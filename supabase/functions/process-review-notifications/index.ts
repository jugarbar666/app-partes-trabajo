/**
 * Supabase Edge Function: process-review-notifications
 * Ejecutada mediante pg_cron + pg_net (o cron de servidor externo).
 * Procesa la cola de notificaciones de revisiones periódicas (1 mes antes, 1 semana antes, mismo día),
 * aplicando deduplicación estricta, recuperación tras interrupción sin ráfagas y envío transaccional.
 */

// Referencia de entorno Deno / Supabase Edge Runtime
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req: Request) => {
  try {
    // 1. Verificar secreto de autorización del trabajo programado
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_JOB_SECRET');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const emailApiKey = Deno.env.get('EMAIL_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM_ADDRESS') || 'avisos@empresa.es';

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 2. Obtener configuración de la empresa (email administrativo y zona horaria)
    const { data: settings, error: settingsErr } = await supabase
      .from('company_settings')
      .select('company_name, notification_email, timezone')
      .eq('id', 1)
      .single();

    if (settingsErr || !settings?.notification_email) {
      return new Response(
        JSON.stringify({ error: 'Falta configuración de email administrativo en company_settings' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fecha civil actual en la zona horaria de la empresa (ej. Europe/Madrid)
    const todayLocal = new Intl.DateTimeFormat('en-CA', {
      timeZone: settings.timezone || 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    // 3. Seleccionar avisos pendientes cuya fecha programada ya se haya alcanzado
    const { data: pendingNotices, error: fetchErr } = await supabase
      .from('notification_outbox')
      .select('*, review_occurrences!inner(id, due_date, status, installation_review_id)')
      .in('status', ['pending', 'failed'])
      .lte('scheduled_date', todayLocal)
      .lt('attempts', 5)
      .order('scheduled_date', { ascending: false });

    if (fetchErr) throw fetchErr;

    // Agrupar por review_occurrence_id para aplicar política de recuperación sin ráfagas:
    // Si varios hitos de una misma ocurrencia vencieron durante una interrupción,
    // enviamos solo el más reciente alcanzado y marcamos los anteriores como 'skipped_recovery'.
    const latestByOccurrence = new Map<string, any>();
    const skippedIds: string[] = [];

    for (const notice of pendingNotices || []) {
      // Si el vencimiento ya fue realizado o cancelado, cancelar el aviso
      if (
        notice.review_occurrences.status === 'realizada' ||
        notice.review_occurrences.status === 'cancelada'
      ) {
        await supabase
          .from('notification_outbox')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', notice.id);
        continue;
      }

      if (!latestByOccurrence.has(notice.review_occurrence_id)) {
        latestByOccurrence.set(notice.review_occurrence_id, notice);
      } else {
        skippedIds.push(notice.id);
      }
    }

    if (skippedIds.length > 0) {
      await supabase
        .from('notification_outbox')
        .update({
          status: 'skipped_recovery',
          last_error: 'Omitido por recuperación tras interrupción para evitar ráfaga de correos',
          updated_at: new Date().toISOString(),
        })
        .in('id', skippedIds);
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const notice of latestByOccurrence.values()) {
      if (!emailApiKey) {
        await supabase
          .from('notification_outbox')
          .update({
            status: 'failed',
            attempts: notice.attempts + 1,
            last_error: 'EMAIL_API_KEY no configurada en el servidor',
            updated_at: new Date().toISOString(),
          })
          .eq('id', notice.id);
        errorCount++;
        continue;
      }

      // Envío con clave de idempotencia del proveedor (Resend compatible)
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${emailApiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': notice.dedup_key,
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [settings.notification_email],
          subject: `[Aviso de Revisión - ${notice.notice_type}] Vencimiento ${notice.due_date}`,
          html: `<p>Empresa: <strong>${settings.company_name}</strong></p>
                 <p>Aviso automático (${notice.notice_type}) para la revisión con vencimiento el <strong>${notice.due_date}</strong>.</p>`,
        }),
      });

      if (response.ok) {
        const resData = await response.json();
        await supabase
          .from('notification_outbox')
          .update({
            status: 'sent',
            attempts: notice.attempts + 1,
            sent_at: new Date().toISOString(),
            provider_reference: resData.id || 'ok',
            updated_at: new Date().toISOString(),
          })
          .eq('id', notice.id);
        sentCount++;
      } else {
        const errText = await response.text();
        await supabase
          .from('notification_outbox')
          .update({
            status: response.status >= 500 ? 'uncertain' : 'failed',
            attempts: notice.attempts + 1,
            last_error: `HTTP ${response.status}: ${errText}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', notice.id);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        processed_date: todayLocal,
        sent: sentCount,
        skipped_recovery: skippedIds.length,
        errors: errorCount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
