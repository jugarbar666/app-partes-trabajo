import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Article,
  AttendanceSession,
  CompanySettings,
  Customer,
  InstallationReview,
  ReviewType,
  UserProfile,
  WorkEntry,
  WorkMaterial,
  WorkOrder,
  WorkSession,
  WorkSignature,
} from '../types/domain';
import {
  calculateDuration,
  formatCentsToEUR,
  formatDateES,
  formatDateTimeES,
  formatTimeES,
  getWeekdayNameES,
  parseEurosToCents,
  sanitizeSpreadsheetCell,
} from './formatters';
import { InstallationBackendEngine } from '../services/backendEngine';

// =============================================================================
// 1. EXPORTACIÓN SEGURA A EXCEL (.xlsx) RESPETANDO COLUMNAS, FILTROS Y PERMISOS
// =============================================================================
export function exportRowsToExcel(params: {
  fileName: string;
  sheetName: string;
  columns: Array<{ key: string; header: string }>;
  rows: Array<Record<string, unknown>>;
}): void {
  const sanitizedData = params.rows.map((row) => {
    const out: Record<string, string | number | boolean> = {};
    for (const col of params.columns) {
      out[col.header] = sanitizeSpreadsheetCell(row[col.key]);
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sanitizedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, params.sheetName.slice(0, 31));
  XLSX.writeFile(workbook, params.fileName.endsWith('.xlsx') ? params.fileName : `${params.fileName}.xlsx`);
}

// =============================================================================
// 1.1. EXPORTACIÓN SEGURA A PDF (.pdf) CON LOGO, CABECERA Y FORMATO OFICIAL
// =============================================================================
export function exportRowsToPDF(params: {
  fileName: string;
  title: string;
  subtitle?: string;
  company: CompanySettings;
  columns: Array<{ key: string; header: string }>;
  rows: Array<Record<string, unknown>>;
  orientation?: 'portrait' | 'landscape';
}): void {
  const orientation = params.orientation || (params.columns.length > 5 ? 'landscape' : 'portrait');
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;

  // Título principal
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(params.title, 14, 15, { maxWidth: params.company.logo_url ? pageWidth - 70 : pageWidth - 28 });

  if (params.subtitle) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(params.subtitle, 14, 21, { maxWidth: params.company.logo_url ? pageWidth - 70 : pageWidth - 28 });
  }

  tryAddCompanyLogo(doc, params.company.logo_url, pageWidth - 55, 8, 40, 16);

  autoTable(doc, {
    startY: params.subtitle ? 26 : 22,
    head: [params.columns.map((c) => c.header)],
    body: params.rows.map((r) =>
      params.columns.map((c) => (r[c.key] !== undefined && r[c.key] !== null ? String(r[c.key]) : '—'))
    ),
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 15 },
  });

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(130);
    doc.text(
      `${params.company.company_name} · ${params.title} — Página ${p} de ${totalPages}`,
      14,
      pageHeight - 8
    );
  }

  doc.save(params.fileName.endsWith('.pdf') ? params.fileName : `${params.fileName}.pdf`);
}

/**
 * Descarga una plantilla Excel oficial para importación de la entidad seleccionada
 */
export function downloadImportTemplateExcel(
  entityType: 'customers' | 'suppliers' | 'articles' | 'reviews' | 'work_orders' | 'attendance'
): void {
  const templates: Record<
    typeof entityType,
    { sheet: string; sample: Array<Record<string, string | number>> }
  > = {
    customers: {
      sheet: 'Plantilla_Clientes',
      sample: [
        {
          Codigo_Cliente: 'CLI-0100',
          Nombre_Razon_Social: 'Comunidad Ejemplo S.L.',
          NIF_CIF: 'B12345678',
          Persona_Contacto: 'Antonio Gómez (Administrador)',
          Telefono: '+34 600 123 456',
          Email: 'contacto@ejemplo.es',
          Direccion_Principal: 'Calle Mayor 10, Portal 2',
          Codigo_Postal: '13001',
          Poblacion: 'Ciudad Real',
          Provincia: 'Ciudad Real',
          Observaciones: 'Cliente de plantilla',
        },
      ],
    },
    suppliers: {
      sheet: 'Plantilla_Proveedores',
      sample: [
        {
          Nombre_Razon_Social: 'Suministros Térmicos Levante S.L. [FICTICIO]',
          NIF_CIF: 'B12345678',
          Persona_Contacto: 'Carlos Vendedor',
          Telefono: '+34 961 223 344',
          Email: 'pedidos@suministrostermicos-ficticio.es',
          Direccion: 'Polígono Industrial La Florida, Nave 12',
          Codigo_Postal: '13005',
          Poblacion: 'Ciudad Real',
          Provincia: 'Ciudad Real',
          Notas: 'Plazo de entrega habitual 24 horas',
        },
      ],
    },
    articles: {
      sheet: 'Plantilla_Articulos',
      sample: [
        {
          Codigo_Articulo: 'MAT-0100',
          Nombre: 'Válvula Termostática 1/2"',
          Descripcion: 'Válvula cromada radiador',
          Precio_Compra_EUR: '12,50',
          Precio_Venta_EUR: '24,00',
          Unidad_Medida: 'ud',
        },
      ],
    },
    reviews: {
      sheet: 'Plantilla_Revisiones',
      sample: [
        {
          Codigo_Cliente: 'CLI-0001',
          Tipo_Revision: 'Revisión Anual RITE Sala de Calderas Comunitaria',
          Ultima_Revision: '2025-11-15',
          Proxima_Fecha: '2026-11-15',
          Estado: 'pendiente',
          Notas: 'Revisión programada desde Excel',
        },
      ],
    },
    work_orders: {
      sheet: 'Plantilla_Partes',
      sample: [
        {
          Codigo_Cliente: 'CLI-0001',
          Trabajos_Realizar: 'Mantenimiento preventivo quemador',
          Fecha_Hora_Programada: '2026-11-05T09:00:00.000Z',
          Email_Operario: 'carlos@climalux-demo.es',
          Observaciones: 'Importado por administración',
        },
      ],
    },
    attendance: {
      sheet: 'Plantilla_Fichajes',
      sample: [
        {
          Email_Trabajador: 'carlos@climalux-demo.es',
          Entrada_ISO: '2026-10-15T06:00:00.000Z',
          Salida_ISO: '2026-10-15T14:00:00.000Z',
          Observaciones: 'Carga histórica autorizada',
          Motivo_Administrativo: 'Importación inicial de registro horario',
        },
      ],
    },
  };

  const conf = templates[entityType];
  const ws = XLSX.utils.json_to_sheet(conf.sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, conf.sheet);
  XLSX.writeFile(wb, `${conf.sheet}.xlsx`);
}

// =============================================================================
// 2. PREVISUALIZACIÓN, VALIDACIÓN Y EJECUCIÓN DE IMPORTACIÓN EXCEL
// =============================================================================
export interface ImportPreviewRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  mapped: Record<string, string>;
  isDuplicate: boolean;
  existingId?: string;
  errors: Array<{ field: string; message: string }>;
}

export interface ImportPreviewResult {
  totalRows: number;
  validNewCount: number;
  duplicateCount: number;
  errorCount: number;
  rows: ImportPreviewRow[];
}

export function validateAndPreviewImport(params: {
  backend: InstallationBackendEngine;
  entityType: 'customers' | 'suppliers' | 'articles' | 'reviews' | 'work_orders' | 'attendance';
  rawRows: Array<Record<string, unknown>>;
  columnMapping: Record<string, string>;
}): ImportPreviewResult {
  const customers = params.backend.getCustomers(true);
  const articles = params.backend.getArticles(true);
  const reviewTypes = params.backend.getReviewTypes(true);
  const profiles = params.backend.getProfiles();
  const reviews = params.backend.getInstallationReviews();

  const previewRows: ImportPreviewRow[] = [];
  let validNewCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  params.rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2; // Cabecera en fila 1
    const mapped: Record<string, string> = {};
    for (const [targetField, sourceColumn] of Object.entries(params.columnMapping)) {
      const val = sourceColumn ? raw[sourceColumn] : '';
      mapped[targetField] = val !== undefined && val !== null ? String(val).trim() : '';
    }

    const errors: Array<{ field: string; message: string }> = [];
    let isDuplicate = false;
    let existingId: string | undefined;

    if (params.entityType === 'customers') {
      if (!mapped.code) errors.push({ field: 'code', message: 'Código de cliente obligatorio' });
      if (!mapped.name) errors.push({ field: 'name', message: 'Nombre o razón social obligatorio' });

      // Clave exacta de coincidencia: código único o NIF exacto (nunca aproximación de nombre)
      const match = customers.find(
        (c) =>
          (mapped.code && c.code.toUpperCase() === mapped.code.toUpperCase()) ||
          (mapped.tax_id && c.tax_id && c.tax_id.toUpperCase() === mapped.tax_id.toUpperCase())
      );
      if (match) {
        isDuplicate = true;
        existingId = match.id;
      }
    } else if (params.entityType === 'suppliers') {
      const suppliers = params.backend.getSuppliers(true);
      if (!mapped.name) errors.push({ field: 'name', message: 'Nombre o razón social del proveedor obligatorio' });
      const cleanNif = (mapped.tax_id || '').trim().toUpperCase();
      const cleanName = (mapped.name || '').trim().toLowerCase();
      const match = suppliers.find(
        (s) =>
          (cleanNif && s.tax_id && s.tax_id.trim().toUpperCase() === cleanNif) ||
          (cleanName && s.name.trim().toLowerCase() === cleanName)
      );
      if (match) {
        isDuplicate = true;
        existingId = match.id;
      }
    } else if (params.entityType === 'articles') {
      if (!mapped.code) errors.push({ field: 'code', message: 'Código único de artículo obligatorio' });
      if (!mapped.name) errors.push({ field: 'name', message: 'Nombre del artículo obligatorio' });
      const saleCents = parseEurosToCents(mapped.sale_price || '0');
      const buyCents = parseEurosToCents(mapped.purchase_price || '0');
      if (saleCents === null) errors.push({ field: 'sale_price', message: 'Precio de venta inválido' });
      if (buyCents === null) errors.push({ field: 'purchase_price', message: 'Precio de compra inválido' });

      const match = articles.find(
        (a) => mapped.code && a.code.toUpperCase() === mapped.code.toUpperCase()
      );
      if (match) {
        isDuplicate = true;
        existingId = match.id;
      }
    } else if (params.entityType === 'reviews') {
      const cust = customers.find((c) => c.code.toUpperCase() === (mapped.customer_code || '').toUpperCase());
      const rType = reviewTypes.find((rt) => rt.name.toLowerCase() === (mapped.review_type_name || '').toLowerCase());
      if (!cust) errors.push({ field: 'customer_code', message: `No existe cliente con código ${mapped.customer_code}` });
      if (!rType) errors.push({ field: 'review_type_name', message: `No existe el tipo de revisión '${mapped.review_type_name}'` });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(mapped.next_review_date || '')) {
        errors.push({ field: 'next_review_date', message: 'Próxima fecha debe tener formato AAAA-MM-DD' });
      }
      if (cust && rType) {
        const match = reviews.find((r) => r.customer_id === cust.id && r.review_type_id === rType.id);
        if (match) {
          isDuplicate = true;
          existingId = match.id;
        }
      }
    } else if (params.entityType === 'work_orders') {
      const cust = customers.find((c) => c.code.toUpperCase() === (mapped.customer_code || '').toUpperCase());
      const oper = profiles.find((p) => p.email.toLowerCase() === (mapped.operator_email || '').toLowerCase());
      if (!cust) errors.push({ field: 'customer_code', message: `Cliente no encontrado (${mapped.customer_code})` });
      if (!oper) errors.push({ field: 'operator_email', message: `Operario no encontrado (${mapped.operator_email})` });
      if (!mapped.planned_work) errors.push({ field: 'planned_work', message: 'Trabajos a realizar obligatorio' });
      if (!mapped.scheduled_at || Number.isNaN(new Date(mapped.scheduled_at).getTime())) {
        errors.push({ field: 'scheduled_at', message: 'Fecha programada ISO inválida' });
      }
    } else if (params.entityType === 'attendance') {
      const worker = profiles.find((p) => p.email.toLowerCase() === (mapped.worker_email || '').toLowerCase());
      if (!worker) errors.push({ field: 'worker_email', message: `Trabajador no encontrado (${mapped.worker_email})` });
      if (!mapped.clock_in_at || Number.isNaN(new Date(mapped.clock_in_at).getTime())) {
        errors.push({ field: 'clock_in_at', message: 'Fecha/hora de entrada inválida' });
      }
      if (!mapped.reason) {
        errors.push({ field: 'reason', message: 'El motivo administrativo de importación es obligatorio' });
      }
    }

    if (errors.length > 0) {
      errorCount++;
    } else if (isDuplicate) {
      duplicateCount++;
    } else {
      validNewCount++;
    }

    previewRows.push({
      rowNumber,
      raw,
      mapped,
      isDuplicate,
      existingId,
      errors,
    });
  });

  return {
    totalRows: previewRows.length,
    validNewCount,
    duplicateCount,
    errorCount,
    rows: previewRows,
  };
}

export function executeValidatedImport(params: {
  backend: InstallationBackendEngine;
  entityType: 'customers' | 'suppliers' | 'articles' | 'reviews' | 'work_orders' | 'attendance';
  fileName: string;
  conflictPolicy: 'insert_only' | 'update_existing' | 'reject_duplicates';
  preview: ImportPreviewResult;
}): {
  inserted: number;
  updated: number;
  rejected: number;
  errors: Array<{ row: number; field: string; message: string }>;
} {
  let inserted = 0;
  let updated = 0;
  let rejected = 0;
  const allErrors: Array<{ row: number; field: string; message: string }> = [];

  const customers = params.backend.getCustomers(true);
  const addresses = params.backend.getCustomerAddresses(undefined, true);
  const reviewTypes = params.backend.getReviewTypes(true);
  const profiles = params.backend.getProfiles();

  for (const row of params.preview.rows) {
    if (row.errors.length > 0) {
      rejected++;
      for (const e of row.errors) {
        allErrors.push({ row: row.rowNumber, field: e.field, message: e.message });
      }
      continue;
    }

    if (row.isDuplicate) {
      if (params.conflictPolicy === 'reject_duplicates' || params.conflictPolicy === 'insert_only') {
        rejected++;
        allErrors.push({
          row: row.rowNumber,
          field: 'clave_unica',
          message: `Registro coincidente omitido según política (${params.conflictPolicy})`,
        });
        continue;
      }
    }

    try {
      if (params.entityType === 'customers') {
        params.backend.saveCustomer({
          id: row.isDuplicate ? row.existingId : undefined,
          code: row.mapped.code,
          name: row.mapped.name,
          tax_id: row.mapped.tax_id || '',
          contact_name: row.mapped.contact_name || '',
          phones: row.mapped.phone ? [row.mapped.phone] : [],
          emails: row.mapped.email ? [row.mapped.email] : [],
          main_address: row.mapped.main_address || '',
          postal_code: row.mapped.postal_code || '',
          city: row.mapped.city || '',
          province: row.mapped.province || '',
          notes: row.mapped.notes || '',
          is_active: true,
        });
        if (row.isDuplicate) updated++;
        else inserted++;
      } else if (params.entityType === 'suppliers') {
        params.backend.saveSupplier({
          id: row.isDuplicate ? row.existingId : undefined,
          name: row.mapped.name,
          tax_id: row.mapped.tax_id || '',
          contact_person: row.mapped.contact_person || '',
          phone: row.mapped.phone || '',
          email: row.mapped.email || '',
          address: row.mapped.address || '',
          postal_code: row.mapped.postal_code || '',
          city: row.mapped.city || '',
          province: row.mapped.province || '',
          notes: row.mapped.notes || '',
          is_active: true,
        });
        if (row.isDuplicate) updated++;
        else inserted++;
      } else if (params.entityType === 'articles') {
        params.backend.saveArticle({
          id: row.isDuplicate ? row.existingId : undefined,
          code: row.mapped.code,
          name: row.mapped.name,
          description: row.mapped.description || '',
          supplier_id: null,
          purchase_price_cents: parseEurosToCents(row.mapped.purchase_price || '0') || 0,
          sale_price_cents: parseEurosToCents(row.mapped.sale_price || '0') || 0,
          unit: row.mapped.unit || 'ud',
          is_active: true,
        });
        if (row.isDuplicate) updated++;
        else inserted++;
      } else if (params.entityType === 'reviews') {
        const cust = customers.find(
          (c) => c.code.toUpperCase() === row.mapped.customer_code.toUpperCase()
        )!;
        const addr =
          addresses.find((a) => a.customer_id === cust.id) ||
          params.backend.saveCustomerAddress({
            customer_id: cust.id,
            alias: 'Instalación Principal',
            address_line: cust.main_address || 'Dirección Cliente',
            postal_code: '',
            city: 'Ciudad Real',
            province: 'Ciudad Real',
            contact_name: cust.name,
            contact_phone: cust.phones[0] || '',
            contact_email: cust.emails[0] || '',
            notes: '',
            is_active: true,
          });
        const rType = reviewTypes.find(
          (rt) => rt.name.toLowerCase() === row.mapped.review_type_name.toLowerCase()
        )!;
        params.backend.saveInstallationReview({
          id: row.isDuplicate ? row.existingId : undefined,
          customer_id: cust.id,
          customer_address_id: addr.id,
          review_type_id: rType.id,
          origin_work_order_id: null,
          last_review_date: row.mapped.last_review_date || null,
          next_review_date: row.mapped.next_review_date,
          status: 'pendiente',
          notes: row.mapped.notes || '',
        });
        if (row.isDuplicate) updated++;
        else inserted++;
      } else if (params.entityType === 'work_orders') {
        const cust = customers.find(
          (c) => c.code.toUpperCase() === row.mapped.customer_code.toUpperCase()
        )!;
        const oper = profiles.find(
          (p) => p.email.toLowerCase() === row.mapped.operator_email.toLowerCase()
        )!;
        params.backend.createWorkOrder({
          customer_id: cust.id,
          customer_address_id: null,
          snapshot_customer_name: cust.name,
          snapshot_customer_tax_id: cust.tax_id,
          snapshot_contact_name: cust.name,
          snapshot_contact_phone: cust.phones[0] || '',
          snapshot_contact_email: cust.emails[0] || '',
          snapshot_address_line: cust.main_address || 'Dirección principal',
          snapshot_postal_code: '',
          snapshot_city: 'Ciudad Real',
          snapshot_province: 'Ciudad Real',
          planned_work: row.mapped.planned_work,
          scheduled_at: row.mapped.scheduled_at,
          initial_notes: row.mapped.notes || '',
          operator_ids: [oper.id],
        });
        inserted++;
      } else if (params.entityType === 'attendance') {
        const worker = profiles.find(
          (p) => p.email.toLowerCase() === row.mapped.worker_email.toLowerCase()
        )!;
        params.backend.adminCreateOrCorrectAttendance({
          user_id: worker.id,
          clock_in_at: row.mapped.clock_in_at,
          clock_out_at: row.mapped.clock_out_at || null,
          worker_notes_in: row.mapped.notes || '',
          worker_notes_out: '',
          reason: row.mapped.reason,
        });
        inserted++;
      }
    } catch (err: any) {
      rejected++;
      allErrors.push({
        row: row.rowNumber,
        field: 'general',
        message: err?.message || 'Error al persistir fila',
      });
    }
  }

  params.backend.recordImportJob({
    entity_type: params.entityType,
    file_name: params.fileName,
    conflict_policy: params.conflictPolicy,
    total_rows: params.preview.totalRows,
    inserted_rows: inserted,
    updated_rows: updated,
    rejected_rows: rejected,
    errors_json: allErrors,
  });

  return { inserted, updated, rejected, errors: allErrors };
}

// =============================================================================
// 3. GENERACIÓN DE INFORMES PDF DE CONTROL HORARIO / FICHAJE (REGLA 13 Y ESCENARIO 12)
// Incluye todas las columnas, agrupación por trabajador, paginación y los DOS BLOQUES
// de firma manuscrita (Trabajador y Representante de la Empresa con nombre y DNI)
// =============================================================================
export interface AttendanceReportData {
  company: CompanySettings;
  periodLabel: string;
  workers: Array<{
    worker: UserProfile;
    sessions: AttendanceSession[];
  }>;
}

function tryAddCompanyLogo(
  doc: jsPDF,
  logoUrl?: string | null,
  x = 150,
  y = 8,
  w = 45,
  h = 18
): void {
  if (!logoUrl) return;
  try {
    const isPng = logoUrl.includes('image/png');
    const isJpg = logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg');
    const format = isPng ? 'PNG' : isJpg ? 'JPEG' : undefined;
    doc.addImage(logoUrl, format as any, x, y, w, h, undefined, 'FAST');
  } catch {
    try {
      doc.addImage(logoUrl, 'PNG', x, y, w, h, undefined, 'FAST');
    } catch {
      // Ignorar de forma segura si el formato es incompatible
    }
  }
}

export function generateAttendanceReportPDF(
  data: AttendanceReportData,
  saveFile = true
): { doc: jsPDF; textSummary: string } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const timezone = data.company.timezone || 'Europe/Madrid';
  const summaryLines: string[] = [];

  data.workers.forEach((group, workerIdx) => {
    if (workerIdx > 0) {
      doc.addPage();
    }

    // Cabecera de empresa y trabajador
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(data.company.company_name, 14, 16, {
      maxWidth: data.company.logo_url ? 130 : 180,
    });

    tryAddCompanyLogo(doc, data.company.logo_url, 150, 8, 45, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `CIF/NIF: ${data.company.tax_id}  |  Periodo del informe: ${data.periodLabel}`,
      14,
      22
    );
    doc.text(
      `Trabajador/a: ${group.worker.full_name}  |  DNI/NIE: ${group.worker.dni || '—'}  |  Email: ${group.worker.email}`,
      14,
      27
    );

    let totalMinutesWorker = 0;

    const tableBody = group.sessions.map((s) => {
      const dur = calculateDuration(s.clock_in_at, s.clock_out_at);
      totalMinutesWorker += dur.minutes;
      const obs = [s.worker_notes_in, s.worker_notes_out].filter(Boolean).join(' / ') || '—';
      return [
        formatDateES(s.clock_in_at, timezone),
        getWeekdayNameES(s.clock_in_at, timezone),
        formatTimeES(s.clock_in_at, timezone),
        s.clock_out_at ? formatTimeES(s.clock_out_at, timezone) : 'En curso',
        dur.formatted,
        obs,
      ];
    });

    const totalHours = Math.floor(totalMinutesWorker / 60);
    const totalRemMins = totalMinutesWorker % 60;
    const totalFormatted = `${totalHours}h ${String(totalRemMins).padStart(2, '0')}m`;

    autoTable(doc, {
      startY: 32,
      head: [
        [
          'Fecha',
          'Día de la semana',
          'Hora de entrada',
          'Hora de salida',
          'Horas trabajadas',
          'Observaciones del trabajador',
        ],
      ],
      body:
        tableBody.length > 0
          ? tableBody
          : [['—', '—', '—', '—', '0h 00m', 'Sin fichajes registrados en el periodo']],
      foot: [['TOTAL PERIODO', '', '', '', totalFormatted, '']],
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 26 },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 24 },
        5: { cellWidth: 66 },
      },
      margin: { left: 14, right: 14, bottom: 25 },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 120;
    let signatureStartY = finalY + 12;

    // Si los dos bloques de firma (58 mm de alto) no caben en la página actual, saltar de página para evitar cortes
    if (signatureStartY + 58 > 278) {
      doc.addPage();
      signatureStartY = 25;
    }

    // Bloque 1: Firma del trabajador, nombre y DNI manuscritos
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    doc.rect(14, signatureStartY, 86, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1. CONFORME EL TRABAJADOR / A', 18, signatureStartY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Firma manuscrita:', 18, signatureStartY + 13);
    doc.text('Nombre manuscrito: ___________________________', 18, signatureStartY + 39);
    doc.text('DNI / NIE manuscrito: ________________________', 18, signatureStartY + 47);

    // Bloque 2: Firma del representante de la empresa, nombre y DNI manuscritos
    doc.rect(110, signatureStartY, 86, 52);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('2. POR LA EMPRESA (REPRESENTANTE)', 114, signatureStartY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Firma manuscrita y sello:', 114, signatureStartY + 13);
    doc.text('Nombre manuscrito: ___________________________', 114, signatureStartY + 39);
    doc.text('DNI / NIE manuscrito: ________________________', 114, signatureStartY + 47);

    summaryLines.push(
      `EMPRESA: ${data.company.company_name} | PERIODO: ${data.periodLabel} | TRABAJADOR: ${group.worker.full_name} (${group.worker.dni}) | TOTAL: ${totalFormatted} | COLUMNAS: Fecha, Día de la semana, Hora de entrada, Hora de salida, Horas trabajadas, Observaciones del trabajador | BLOQUES PIE: [Firma del trabajador, nombre y DNI manuscritos] + [Firma del representante de la empresa, nombre y DNI manuscritos]`
    );
  });

  // Paginación en todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Registro de Control Horario — ${data.company.company_name} — Página ${p} de ${totalPages}`,
      14,
      290
    );
  }

  if (saveFile) {
    doc.save(`Informe_Control_Horario_${data.periodLabel.replace(/\s+/g, '_')}.pdf`);
  }

  return { doc, textSummary: summaryLines.join('\n') };
}

// =============================================================================
// 4. PDF DE DETALLE DE UN PARTE DE TRABAJO (SIN DATOS RESERVADOS PARA CLIENTE/OPERARIO)
// =============================================================================
export function generateWorkOrderDetailPDF(params: {
  company: CompanySettings;
  workOrder: WorkOrder;
  entries: WorkEntry[];
  sessions: WorkSession[];
  materials: WorkMaterial[];
  signature: WorkSignature | null;
  includeAdminReserved?: boolean;
  saveFile?: boolean;
}): { doc: jsPDF; textSummary: string } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const wo = params.workOrder;
  const tz = params.company.timezone || 'Europe/Madrid';

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(`${params.company.company_name} — PARTE DE TRABAJO ${wo.code}`, 14, 15, {
    maxWidth: params.company.logo_url ? 130 : 180,
  });

  tryAddCompanyLogo(doc, params.company.logo_url, 150, 8, 45, 18);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const companyFullAddr = [
    params.company.address,
    [params.company.postal_code, params.company.city].filter(Boolean).join(' '),
    params.company.province ? `(${params.company.province})` : '',
  ]
    .filter(Boolean)
    .join(', ');
  doc.text(
    `Empresa: ${params.company.tax_id}  |  ${companyFullAddr}  |  Tel: ${params.company.contact_phone}`,
    14,
    20
  );

  doc.setFontSize(9);
  doc.text(`Estado: ${wo.status.toUpperCase()}  |  Fecha programada: ${formatDateTimeES(wo.scheduled_at, tz)}`, 14, 25);
  doc.text(`Cliente: ${wo.snapshot_customer_name} (${wo.snapshot_customer_tax_id || 'Sin NIF'})`, 14, 29);
  doc.text(
    `Dirección del servicio: ${wo.snapshot_address_line}, ${wo.snapshot_postal_code} ${wo.snapshot_city} (${wo.snapshot_province})`,
    14,
    35
  );
  doc.text(`Contacto: ${wo.snapshot_contact_name} | Tel: ${wo.snapshot_contact_phone} | Email: ${wo.snapshot_contact_email}`, 14, 41);
  doc.text(`Trabajo solicitado: ${wo.planned_work}`, 14, 48, { maxWidth: 180 });

  autoTable(doc, {
    startY: 56,
    head: [['Trabajos realizados', 'Observaciones de la intervención', 'Fecha']],
    body:
      params.entries.length > 0
        ? params.entries.map((e) => [e.description, e.observations || '—', formatDateTimeES(e.created_at, tz)])
        : [['Sin trabajos registrados', '—', '—']],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  const yAfterEntries = ((doc as any).lastAutoTable?.finalY || 75) + 6;
  autoTable(doc, {
    startY: yAfterEntries,
    head: [['Materiales utilizados', 'Cantidad', 'Unidad', 'Precio unitario']],
    body:
      params.materials.length > 0
        ? params.materials.map((m) => [
            m.article_name_snapshot,
            String(m.quantity),
            m.unit_snapshot,
            formatCentsToEUR(m.unit_price_cents),
          ])
        : [['Sin materiales imputados', '—', '—', '—']],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138] },
  });

  const yAfterMats = ((doc as any).lastAutoTable?.finalY || 110) + 8;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Importe del trabajo: ${formatCentsToEUR(wo.total_amount_cents)}   |   Solicita factura: ${
      wo.customer_requests_invoice === null ? 'Pendiente' : wo.customer_requests_invoice ? 'SÍ' : 'NO'
    }   |   Cliente ha pagado: ${
      wo.customer_has_paid === null ? 'Pendiente' : wo.customer_has_paid ? 'SÍ' : 'NO'
    }`,
    14,
    yAfterMats
  );

  let nextY = yAfterMats + 8;
  // NUNCA incluir dinero_entregado ni factura_emitida en documentos para operarios o clientes
  if (params.includeAdminReserved && wo.admin_data) {
    doc.setFont('helvetica', 'normal');
    doc.text(
      `[USO INTERNO ADMIN] Dinero entregado: ${wo.admin_data.money_delivered ? 'SÍ' : 'NO'} | Factura emitida: ${
        wo.admin_data.invoice_issued ? 'SÍ' : 'NO'
      }`,
      14,
      nextY
    );
    nextY += 8;
  }

  if (params.signature && params.signature.is_valid) {
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Firma manuscrita de conformidad del cliente: ${params.signature.signer_name} (${params.signature.signer_dni || '—'})`,
      14,
      nextY
    );
    try {
      if (params.signature.data_url.startsWith('data:image/png')) {
        doc.addImage(params.signature.data_url, 'PNG', 14, nextY + 3, 50, 25);
      }
    } catch {
      // ignore image decode error in headless test
    }
  }

  if (params.saveFile !== false) {
    doc.save(`Parte_${wo.code}.pdf`);
  }

  return {
    doc,
    textSummary: `PARTE ${wo.code} | CLIENTE: ${wo.snapshot_customer_name} | IMPORTE: ${formatCentsToEUR(wo.total_amount_cents)}`,
  };
}
