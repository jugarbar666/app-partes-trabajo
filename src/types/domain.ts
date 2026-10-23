export type UserRole = 'admin' | 'operario';

export type WorkOrderStatus = 'no_iniciado' | 'en_curso' | 'terminado' | 'cerrado';

export type ReviewStatus = 'pendiente' | 'programada' | 'realizada' | 'cancelada';

export type PeriodicityUnit = 'days' | 'months' | 'years' | 'none';

export type ShoppingStatus = 'pending_quantity' | 'pending_purchase' | 'purchased' | 'cancelled';

export type NotificationNoticeType = '1_month_before' | '1_week_before' | 'same_day';

export type NotificationStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'uncertain'
  | 'skipped_recovery'
  | 'cancelled';

export type BackupTriggerType = 'auto_desktop' | 'manual' | 'scheduled';
export type BackupStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface CompanySettings {
  id: 1;
  company_name: string;
  tax_id: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  postal_code?: string;
  city?: string;
  province?: string;
  logo_url?: string | null;
  notification_email: string;
  work_order_prefix: string;
  work_order_next_seq: number;
  timezone: string;
  default_work_start_time?: string;
  default_work_end_time?: string;
  locale: string;
  currency: string;
  date_format: string;
  time_format: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  dni: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  column_preferences: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  tax_id: string;
  contact_name?: string;
  phones: string[];
  emails: string[];
  main_address: string;
  postal_code?: string;
  city?: string;
  province?: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  alias: string;
  address_line: string;
  postal_code: string;
  city: string;
  province: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  tax_id: string;
  phone: string;
  email: string;
  contact_person: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  code: string;
  name: string;
  description: string;
  supplier_id: string | null;
  /** Céntimos de euro (solo visible para Administrador) */
  purchase_price_cents?: number;
  /** Céntimos de euro */
  sale_price_cents: number;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Datos administrativos reservados del parte (NUNCA se incluyen en respuestas para operarios)
 */
export interface WorkOrderAdminData {
  work_order_id: string;
  money_delivered: boolean;
  money_delivered_at: string | null;
  money_delivered_by: string | null;
  invoice_issued: boolean;
  invoice_issued_at: string | null;
  invoice_issued_by: string | null;
  invoice_number: string;
  admin_notes: string;
  updated_at: string;
}

export interface WorkOrderAssignment {
  id: string;
  work_order_id: string;
  operator_id: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by: string;
  unassigned_at: string | null;
  unassigned_by: string | null;
}

export interface WorkEntry {
  id: string;
  work_order_id: string;
  description: string;
  observations: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkSession {
  id: string;
  work_order_id: string;
  operator_id: string;
  started_at: string;
  ended_at: string | null;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkMaterial {
  id: string;
  work_order_id: string;
  article_id: string | null;
  article_name_snapshot: string;
  unit_snapshot: string;
  quantity: number;
  unit_price_cents: number;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkFile {
  id: string;
  work_order_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  caption: string;
  data_url: string;
  signed_url_expires_at: string;
  created_by: string;
  created_at: string;
}

export interface WorkSignature {
  id: string;
  work_order_id: string;
  storage_path: string;
  data_url: string;
  signer_name: string;
  signer_dni: string;
  signed_content_hash: string;
  signed_summary_json: {
    work_order_code: string;
    entries_count: number;
    materials_count: number;
    total_amount_cents: number | null;
  };
  is_valid: boolean;
  invalidated_at: string | null;
  invalidated_reason: string | null;
  created_by: string;
  signed_at: string;
}

export interface WorkOrderEvent {
  id: string;
  work_order_id: string;
  event_type: string;
  from_status: WorkOrderStatus | null;
  to_status: WorkOrderStatus | null;
  reason: string | null;
  actor_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WorkOrder {
  id: string;
  number_seq: number;
  code: string;
  version: number;
  customer_id: string;
  customer_address_id: string | null;
  // Snapshot del cliente y dirección para no mutar históricos
  snapshot_customer_name: string;
  snapshot_customer_tax_id: string;
  snapshot_contact_name: string;
  snapshot_contact_phone: string;
  snapshot_contact_email: string;
  snapshot_address_line: string;
  snapshot_postal_code: string;
  snapshot_city: string;
  snapshot_province: string;
  // Planificación
  planned_work: string;
  scheduled_at: string;
  initial_notes: string;
  origin_review_occurrence_id: string | null;
  // Estado y finalización
  status: WorkOrderStatus;
  total_amount_cents: number | null;
  customer_requests_invoice: boolean | null;
  customer_has_paid: boolean | null;
  final_observations?: string | null;
  content_hash: string;
  // Trazabilidad
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  started_by: string | null;
  finished_at: string | null;
  finished_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
  // Solo presente si el usuario autenticado es Administrador
  admin_data?: WorkOrderAdminData;
}

export interface ReviewType {
  id: string;
  name: string;
  suggested_price_cents: number;
  periodicity_unit: PeriodicityUnit;
  periodicity_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstallationReview {
  id: string;
  customer_id: string;
  customer_address_id: string;
  review_type_id: string;
  origin_work_order_id: string | null;
  last_review_date: string | null;
  next_review_date: string; // YYYY-MM-DD civil date
  status: ReviewStatus;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewOccurrence {
  id: string;
  installation_review_id: string;
  due_date: string; // YYYY-MM-DD civil date
  status: ReviewStatus;
  linked_work_order_id: string | null;
  completed_date: string | null;
  completed_by: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationOutboxItem {
  id: string;
  review_occurrence_id: string;
  installation_review_id: string;
  due_date: string;
  notice_type: NotificationNoticeType;
  recipient_email: string;
  scheduled_date: string;
  dedup_key: string;
  status: NotificationStatus;
  attempts: number;
  sent_at: string | null;
  provider_reference: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingRequest {
  id: string;
  article_id: string;
  supplier_id: string | null;
  /** Solo presente para Administrador */
  purchase_price_cents?: number;
  sale_price_cents: number;
  quantity: number | null;
  status: ShoppingStatus;
  requested_by: string;
  requested_at: string;
  additional_requesters: Array<{ user_id: string; requested_at: string; note?: string }>;
  purchased_by: string | null;
  purchased_at: string | null;
  notes: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  worker_notes_in: string;
  worker_notes_out: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  delete_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceCorrection {
  id: string;
  attendance_session_id: string;
  previous_data: Partial<AttendanceSession>;
  new_data: Partial<AttendanceSession>;
  reason: string;
  corrected_by: string;
  corrected_at: string;
}

export interface BackupJob {
  id: string;
  backup_date_local: string; // YYYY-MM-DD
  trigger_type: BackupTriggerType;
  status: BackupStatus;
  scope: {
    database: boolean;
    storage_files: boolean;
    auth_identities: boolean;
  };
  artifact_path: string | null;
  size_bytes: number | null;
  checksum_sha256: string | null;
  error_message: string | null;
  triggered_by: string;
  started_at: string;
  completed_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  actor_name_snapshot: string;
  server_timestamp: string;
  module: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  changes_json: Record<string, unknown>;
  reason: string | null;
}

export interface ImportJob {
  id: string;
  entity_type: 'customers' | 'articles' | 'reviews' | 'work_orders' | 'attendance';
  file_name: string;
  conflict_policy: 'insert_only' | 'update_existing' | 'reject_duplicates';
  total_rows: number;
  inserted_rows: number;
  updated_rows: number;
  rejected_rows: number;
  errors_json: Array<{ row: number; field: string; message: string }>;
  executed_by: string;
  executed_at: string;
}
