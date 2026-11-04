import { WorkOrder, WorkOrderAssignment } from '../types/domain';

/**
 * Función de búsqueda universal para partes de trabajo.
 * Busca coincidencias en CUALQUIER campo del parte:
 * - Código de parte (PT-XXXX-XXXX)
 * - Datos de cliente (nombre, NIF/CIF, contacto, teléfono, email)
 * - Dirección del servicio (calle, código postal, localidad, provincia)
 * - Trabajos y notas (trabajo a realizar, notas iniciales, observaciones finales, motivo reapertura)
 * - Operarios asignados
 * - Estado y fechas (planificación, alta, cierre, archivo)
 * - Importes
 *
 * Normaliza acentos, mayúsculas/minúsculas y soporta búsqueda multi-término (todas las palabras deben coincidir).
 */
export function matchesWorkOrderQuery(
  wo: WorkOrder,
  query: string,
  assignments: WorkOrderAssignment[] = [],
  getUserName?: (id: string) => string
): boolean {
  if (!query || !query.trim()) return true;

  const normalize = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const cleanQuery = normalize(query);
  if (!cleanQuery) return true;

  const tokens = cleanQuery.split(/\s+/).filter(Boolean);

  const ops = getUserName
    ? assignments
        .filter((a) => a.work_order_id === wo.id && a.is_active)
        .map((a) => getUserName(a.operator_id))
        .join(' ')
    : '';

  const amountStr =
    wo.total_amount_cents !== null && wo.total_amount_cents !== undefined
      ? `${(wo.total_amount_cents / 100).toFixed(2)} ${wo.total_amount_cents}`
      : '';

  const searchableText = normalize(
    [
      wo.code,
      wo.snapshot_customer_name,
      wo.snapshot_customer_tax_id || '',
      wo.snapshot_contact_name || '',
      wo.snapshot_contact_phone || '',
      wo.snapshot_contact_email || '',
      wo.snapshot_address_line || '',
      wo.snapshot_postal_code || '',
      wo.snapshot_city || '',
      wo.snapshot_province || '',
      wo.planned_work || '',
      wo.initial_notes || '',
      wo.final_observations || '',
      wo.reopen_reason || '',
      wo.status || '',
      wo.scheduled_at || '',
      wo.created_at || '',
      wo.started_at || '',
      wo.finished_at || '',
      wo.closed_at || '',
      wo.archived_at || '',
      ops,
      amountStr,
    ].join(' ')
  );

  return tokens.every((token) => searchableText.includes(token));
}
