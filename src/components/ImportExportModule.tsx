import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InstallationBackendEngine } from '../services/backendEngine';
import {
  downloadImportTemplateExcel,
  executeValidatedImport,
  exportRowsToExcel,
  exportRowsToPDF,
  ImportPreviewResult,
  validateAndPreviewImport,
} from '../utils/exportImportUtils';
import { ScreenHeaderBar, useUIConfirmation } from './CommonUI';
import { formatCentsToEUR, formatDateTimeES } from '../utils/formatters';

const ENTITY_FIELDS: Record<
  'customers' | 'suppliers' | 'articles' | 'reviews' | 'work_orders' | 'attendance',
  Array<{ key: string; label: string; defaultHeader: string }>
> = {
  customers: [
    { key: 'code', label: 'Código Único Cliente *', defaultHeader: 'Codigo_Cliente' },
    { key: 'name', label: 'Nombre o Razón Social *', defaultHeader: 'Nombre_Razon_Social' },
    { key: 'tax_id', label: 'NIF / CIF', defaultHeader: 'NIF_CIF' },
    { key: 'contact_name', label: 'Persona de Contacto', defaultHeader: 'Persona_Contacto' },
    { key: 'phone', label: 'Teléfono', defaultHeader: 'Telefono' },
    { key: 'email', label: 'Email', defaultHeader: 'Email' },
    { key: 'main_address', label: 'Dirección Principal / Domicilio', defaultHeader: 'Direccion_Principal' },
    { key: 'postal_code', label: 'Código Postal', defaultHeader: 'Codigo_Postal' },
    { key: 'city', label: 'Población / Municipio', defaultHeader: 'Poblacion' },
    { key: 'province', label: 'Provincia', defaultHeader: 'Provincia' },
    { key: 'notes', label: 'Observaciones', defaultHeader: 'Observaciones' },
  ],
  suppliers: [
    { key: 'name', label: 'Nombre o Razón Social *', defaultHeader: 'Nombre_Razon_Social' },
    { key: 'tax_id', label: 'NIF / CIF', defaultHeader: 'NIF_CIF' },
    { key: 'contact_person', label: 'Persona de Contacto', defaultHeader: 'Persona_Contacto' },
    { key: 'phone', label: 'Teléfono', defaultHeader: 'Telefono' },
    { key: 'email', label: 'Email', defaultHeader: 'Email' },
    { key: 'address', label: 'Dirección / Domicilio', defaultHeader: 'Direccion' },
    { key: 'postal_code', label: 'Código Postal', defaultHeader: 'Codigo_Postal' },
    { key: 'city', label: 'Población / Municipio', defaultHeader: 'Poblacion' },
    { key: 'province', label: 'Provincia', defaultHeader: 'Provincia' },
    { key: 'notes', label: 'Observaciones / Notas', defaultHeader: 'Notas' },
  ],
  articles: [
    { key: 'code', label: 'Código Único Artículo *', defaultHeader: 'Codigo_Articulo' },
    { key: 'name', label: 'Nombre *', defaultHeader: 'Nombre' },
    { key: 'description', label: 'Descripción', defaultHeader: 'Descripcion' },
    { key: 'purchase_price', label: 'Precio Compra (€) *', defaultHeader: 'Precio_Compra_EUR' },
    { key: 'sale_price', label: 'Precio Venta (€) *', defaultHeader: 'Precio_Venta_EUR' },
    { key: 'unit', label: 'Unidad de Medida', defaultHeader: 'Unidad_Medida' },
  ],
  reviews: [
    { key: 'customer_code', label: 'Código Cliente *', defaultHeader: 'Codigo_Cliente' },
    { key: 'review_type_name', label: 'Nombre Tipo Revisión *', defaultHeader: 'Tipo_Revision' },
    { key: 'last_review_date', label: 'Última Revisión (AAAA-MM-DD)', defaultHeader: 'Ultima_Revision' },
    { key: 'next_review_date', label: 'Próxima Fecha (AAAA-MM-DD) *', defaultHeader: 'Proxima_Fecha' },
    { key: 'notes', label: 'Notas', defaultHeader: 'Notas' },
  ],
  work_orders: [
    { key: 'customer_code', label: 'Código Cliente *', defaultHeader: 'Codigo_Cliente' },
    { key: 'planned_work', label: 'Trabajos a Realizar *', defaultHeader: 'Trabajos_Realizar' },
    { key: 'scheduled_at', label: 'Fecha/Hora Programada ISO *', defaultHeader: 'Fecha_Hora_Programada' },
    { key: 'operator_email', label: 'Email Operario Asignado *', defaultHeader: 'Email_Operario' },
    { key: 'notes', label: 'Observaciones', defaultHeader: 'Observaciones' },
  ],
  attendance: [
    { key: 'worker_email', label: 'Email Trabajador *', defaultHeader: 'Email_Trabajador' },
    { key: 'clock_in_at', label: 'Entrada ISO *', defaultHeader: 'Entrada_ISO' },
    { key: 'clock_out_at', label: 'Salida ISO', defaultHeader: 'Salida_ISO' },
    { key: 'notes', label: 'Observaciones', defaultHeader: 'Observaciones' },
    { key: 'reason', label: 'Motivo Administrativo *', defaultHeader: 'Motivo_Administrativo' },
  ],
};

export const ImportExportModule: React.FC<{
  backend: InstallationBackendEngine;
  onBack: () => void;
  onRefresh: () => void;
}> = ({ backend, onBack, onRefresh }) => {
  const { requestSaveConfirmation, notifyError } = useUIConfirmation();
  const company = backend.getCompanySettings();
  const [entityType, setEntityType] = useState<
    'customers' | 'suppliers' | 'articles' | 'reviews' | 'work_orders' | 'attendance'
  >('customers');
  const [fileName, setFileName] = useState('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [rawRows, setRawRows] = useState<Array<Record<string, unknown>>>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [conflictPolicy, setConflictPolicy] = useState<
    'insert_only' | 'update_existing' | 'reject_duplicates'
  >('reject_duplicates');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [lastExecutionResult, setLastExecutionResult] = useState<{
    inserted: number;
    updated: number;
    rejected: number;
    errors: Array<{ row: number; field: string; message: string }>;
  } | null>(null);

  const initDefaultMapping = (
    type: typeof entityType,
    headers: string[]
  ): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const f of ENTITY_FIELDS[type]) {
      const found = headers.find(
        (h) => h.toLowerCase() === f.defaultHeader.toLowerCase() || h.toLowerCase() === f.key.toLowerCase()
      );
      map[f.key] = found || headers[0] || '';
    }
    return map;
  };

  const loadSheetRows = (wb: XLSX.WorkBook, sheet: string, type: typeof entityType) => {
    const ws = wb.Sheets[sheet];
    if (!ws) return;
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    // Protección estricta contra Prototype Pollution y Formula Injection (OWASP)
    const sanitizedJson = json.map((row) => {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
        clean[k] = typeof v === 'string' && /^[=@+-]/.test(v) ? `'${v}` : v;
      }
      return clean;
    });
    setRawRows(sanitizedJson);
    const headers = sanitizedJson.length > 0 ? Object.keys(sanitizedJson[0]) : [];
    setDetectedHeaders(headers);
    const defaultMap = initDefaultMapping(type, headers);
    setColumnMapping(defaultMap);
    const prev = validateAndPreviewImport({
      backend,
      entityType: type,
      rawRows: sanitizedJson,
      columnMapping: defaultMap,
    });
    setPreview(prev);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      setWorkbookRef(wb);
      setFileName(file.name);
      setSheetNames(wb.SheetNames);
      const firstSheet = wb.SheetNames[0] || '';
      setSelectedSheet(firstSheet);
      loadSheetRows(wb, firstSheet, entityType);
      setLastExecutionResult(null);
    } catch (err: any) {
      notifyError(err?.message || 'No se pudo leer el archivo Excel.');
    }
  };

  const handleLoadSampleRowsForPreview = () => {
    const sampleRows =
      entityType === 'customers'
        ? [
            {
              Codigo_Cliente: 'CLI-0099',
              Nombre_Razon_Social: 'Instalaciones Industriales Norte S.L. [FICTICIO]',
              NIF_CIF: 'B99887766',
              Persona_Contacto: 'Marcos Técnico',
              Telefono: '+34 600 998 877',
              Email: 'info@indnorte-ficticio.es',
              Direccion_Principal: 'Av. Europa 15, Pozuelo',
              Codigo_Postal: '28224',
              Poblacion: 'Pozuelo de Alarcón',
              Provincia: 'Madrid',
              Observaciones: 'Alta validada desde previsualizador Excel',
            },
            {
              Codigo_Cliente: 'CLI-0001',
              Nombre_Razon_Social: 'Comunidad Coincidente Existente',
              NIF_CIF: 'H28990011',
              Persona_Contacto: 'Julián Conserje',
              Telefono: '+34 915 112 233',
              Email: 'administracion@losolivos-ficticio.es',
              Direccion_Principal: 'Av. Castellana 120',
              Codigo_Postal: '28046',
              Poblacion: 'Madrid',
              Provincia: 'Madrid',
              Observaciones: 'Fila coincidente por clave única',
            },
            {
              Codigo_Cliente: '',
              Nombre_Razon_Social: '',
              NIF_CIF: '',
              Telefono: '',
              Email: '',
              Direccion_Principal: '',
              Observaciones: 'Fila con error intencionado de validación',
            },
          ]
        : entityType === 'suppliers'
        ? [
            {
              Nombre_Razon_Social: 'Suministros Térmicos Levante S.L. [FICTICIO]',
              NIF_CIF: 'B12345678',
              Persona_Contacto: 'Carlos Vendedor',
              Telefono: '+34 961 223 344',
              Email: 'pedidos@suministrostermicos-ficticio.es',
              Direccion: 'Polígono Industrial La Florida, Nave 12',
              Codigo_Postal: '46026',
              Poblacion: 'Valencia',
              Provincia: 'Valencia',
              Notas: 'Plazo habitual de entrega 24 horas',
            },
            {
              Nombre_Razon_Social: 'Distribuciones Fontanería Central',
              NIF_CIF: 'A88776655',
              Persona_Contacto: 'Laura Pedidos',
              Telefono: '+34 911 223 344',
              Email: 'ventas@fontcentral-demo.es',
              Direccion: 'Calle del Agua 45',
              Codigo_Postal: '28021',
              Poblacion: 'Madrid',
              Provincia: 'Madrid',
              Notas: 'Proveedor habitual fontanería',
            },
            {
              Nombre_Razon_Social: '',
              NIF_CIF: '',
              Telefono: '',
              Email: '',
              Persona_Contacto: '',
              Direccion: '',
              Codigo_Postal: '',
              Poblacion: '',
              Provincia: '',
              Notas: 'Fila sin nombre para comprobación de error',
            },
          ]
        : [
            {
              Codigo_Articulo: 'MAT-099',
              Nombre: 'Manómetro Glicerina 0-10 Bar',
              Descripcion: 'Rosca 1/4 inferior',
              Precio_Compra_EUR: '9,80',
              Precio_Venta_EUR: '19,50',
              Unidad_Medida: 'ud',
            },
          ];

    setFileName(`muestra_${entityType}.xlsx`);
    setSheetNames(['Hoja1']);
    setSelectedSheet('Hoja1');
    setRawRows(sampleRows);
    const headers = Object.keys(sampleRows[0]);
    setDetectedHeaders(headers);
    const map = initDefaultMapping(entityType, headers);
    setColumnMapping(map);
    setPreview(
      validateAndPreviewImport({
        backend,
        entityType,
        rawRows: sampleRows,
        columnMapping: map,
      })
    );
    setLastExecutionResult(null);
  };

  const handleConfirmImport = () => {
    if (!preview) return;
    requestSaveConfirmation({
      title: `Importación Excel (${entityType})`,
      changes: [
        { label: 'Archivo', value: fileName },
        { label: 'Hoja seleccionada', value: selectedSheet },
        { label: 'Política de coincidencias', value: conflictPolicy },
        { label: 'Filas totales analizadas', value: String(preview.totalRows) },
        { label: 'Altas válidas previstas', value: String(preview.validNewCount) },
        { label: 'Registros coincidentes', value: String(preview.duplicateCount) },
        { label: 'Filas con errores (se rechazarán)', value: String(preview.errorCount) },
      ],
      onConfirm: () => {
        const res = executeValidatedImport({
          backend,
          entityType,
          fileName: fileName || 'importacion.xlsx',
          conflictPolicy,
          preview,
        });
        setLastExecutionResult(res);
        onRefresh();
      },
    });
  };

  const handleDownloadIncidentsReport = () => {
    const errs =
      lastExecutionResult?.errors ||
      preview?.rows.flatMap((r) =>
        r.errors.map((e) => ({ row: r.rowNumber, field: e.field, message: e.message }))
      ) ||
      [];
    exportRowsToExcel({
      fileName: `Informe_Incidencias_Importacion_${entityType}.xlsx`,
      sheetName: 'Incidencias',
      columns: [
        { key: 'row', header: 'Fila Excel' },
        { key: 'field', header: 'Campo' },
        { key: 'message', header: 'Detalle del Error o Coincidencia' },
      ],
      rows: errs,
    });
  };

  const handleDownloadIncidentsReportPDF = () => {
    const errs =
      lastExecutionResult?.errors ||
      preview?.rows.flatMap((r) =>
        r.errors.map((e) => ({ row: r.rowNumber, field: e.field, message: e.message }))
      ) ||
      [];
    exportRowsToPDF({
      fileName: `Informe_Incidencias_Importacion_${entityType}.pdf`,
      title: `Informe Oficial de Incidencias de Importación (${entityType.toUpperCase()})`,
      subtitle: `Filas con errores de validación o duplicados detectados · ${company.company_name}`,
      company,
      columns: [
        { key: 'row', header: 'Fila' },
        { key: 'field', header: 'Campo' },
        { key: 'message', header: 'Detalle del Error' },
      ],
      rows: errs,
      orientation: 'portrait',
    });
  };

  const handleExportMasterCatalog = (target: 'customers' | 'suppliers' | 'articles' | 'work_orders' | 'reviews') => {
    if (target === 'customers') {
      const list = backend.getCustomers(true);
      exportRowsToExcel({
        fileName: 'Exportacion_Clientes.xlsx',
        sheetName: 'Clientes',
        columns: [
          { key: 'code', header: 'Código' },
          { key: 'name', header: 'Nombre / Razón Social' },
          { key: 'tax_id', header: 'NIF / CIF' },
          { key: 'contact_name', header: 'Persona de Contacto' },
          { key: 'phone', header: 'Teléfono' },
          { key: 'email', header: 'Email' },
          { key: 'main_address', header: 'Domicilio / Dirección' },
          { key: 'postal_code', header: 'Código Postal' },
          { key: 'city', header: 'Población' },
          { key: 'province', header: 'Provincia' },
          { key: 'notes', header: 'Observaciones' },
          { key: 'active', header: 'Estado' },
        ],
        rows: list.map((c) => ({
          code: c.code,
          name: c.name,
          tax_id: c.tax_id || '',
          contact_name: c.contact_name || '',
          phone: c.phones.join(', ') || '',
          email: c.emails.join(', ') || '',
          main_address: c.main_address || '',
          postal_code: c.postal_code || '',
          city: c.city || '',
          province: c.province || '',
          notes: c.notes || '',
          active: c.is_active ? 'Activo' : 'Inactivo',
        })),
      });
    } else if (target === 'suppliers') {
      const list = backend.getSuppliers(true);
      exportRowsToExcel({
        fileName: 'Exportacion_Proveedores.xlsx',
        sheetName: 'Proveedores',
        columns: [
          { key: 'name', header: 'Nombre / Razón Social' },
          { key: 'tax_id', header: 'NIF / CIF' },
          { key: 'contact_person', header: 'Persona de Contacto' },
          { key: 'phone', header: 'Teléfono' },
          { key: 'email', header: 'Email' },
          { key: 'address', header: 'Dirección / Domicilio' },
          { key: 'postal_code', header: 'Código Postal' },
          { key: 'city', header: 'Población' },
          { key: 'province', header: 'Provincia' },
          { key: 'notes', header: 'Observaciones / Notas' },
          { key: 'active', header: 'Estado' },
        ],
        rows: list.map((s) => ({
          name: s.name,
          tax_id: s.tax_id || '',
          contact_person: s.contact_person || '',
          phone: s.phone || '',
          email: s.email || '',
          address: s.address || '',
          postal_code: s.postal_code || '',
          city: s.city || '',
          province: s.province || '',
          notes: s.notes || '',
          active: s.is_active ? 'Activo' : 'Inactivo',
        })),
      });
    } else if (target === 'articles') {
      const list = backend.getArticles(true);
      exportRowsToExcel({
        fileName: 'Exportacion_Articulos.xlsx',
        sheetName: 'Articulos',
        columns: [
          { key: 'code', header: 'Código' },
          { key: 'name', header: 'Artículo' },
          { key: 'unit', header: 'Unidad' },
          { key: 'purchase', header: 'Precio Compra' },
          { key: 'sale', header: 'Precio Venta' },
          { key: 'active', header: 'Estado' },
        ],
        rows: list.map((a) => ({
          code: a.code,
          name: a.name,
          unit: a.unit,
          purchase: formatCentsToEUR(a.purchase_price_cents),
          sale: formatCentsToEUR(a.sale_price_cents),
          active: a.is_active ? 'Activo' : 'Inactivo',
        })),
      });
    } else if (target === 'work_orders') {
      const list = backend.getWorkOrders({ includeArchived: true });
      exportRowsToExcel({
        fileName: 'Exportacion_Listado_Partes.xlsx',
        sheetName: 'Partes',
        columns: [
          { key: 'code', header: 'Número Parte' },
          { key: 'customer', header: 'Cliente' },
          { key: 'address', header: 'Dirección Servicio' },
          { key: 'scheduled', header: 'Fecha Programada' },
          { key: 'status', header: 'Estado' },
          { key: 'amount', header: 'Importe' },
        ],
        rows: list.map((w) => ({
          code: w.code,
          customer: w.snapshot_customer_name,
          address: `${w.snapshot_address_line} (${w.snapshot_city})`,
          scheduled: formatDateTimeES(w.scheduled_at),
          status: w.archived_at ? 'Archivado (Cerrado)' : w.status,
          amount: formatCentsToEUR(w.total_amount_cents),
        })),
      });
    } else if (target === 'reviews') {
      const revs = backend.getInstallationReviews();
      const custs = backend.getCustomers(true);
      const types = backend.getReviewTypes(true);
      exportRowsToExcel({
        fileName: 'Exportacion_Revisiones.xlsx',
        sheetName: 'Revisiones',
        columns: [
          { key: 'customer', header: 'Cliente' },
          { key: 'type', header: 'Tipo de Revisión' },
          { key: 'last', header: 'Última Revisión' },
          { key: 'next', header: 'Próxima Fecha' },
          { key: 'status', header: 'Estado' },
        ],
        rows: revs.map((r) => ({
          customer: custs.find((c) => c.id === r.customer_id)?.name || r.customer_id,
          type: types.find((t) => t.id === r.review_type_id)?.name || r.review_type_id,
          last: r.last_review_date || '—',
          next: r.next_review_date,
          status: r.status,
        })),
      });
    }
  };

  const handleExportMasterCatalogPDF = (
    target: 'customers' | 'suppliers' | 'articles' | 'work_orders' | 'reviews'
  ) => {
    const tz = company.timezone || 'Europe/Madrid';
    const nowStr = formatDateTimeES(new Date().toISOString(), tz);

    if (target === 'customers') {
      const list = backend.getCustomers(true);
      exportRowsToPDF({
        fileName: 'Exportacion_Clientes.pdf',
        title: 'Listado Oficial de Clientes',
        subtitle: `Catálogo de clientes registrados · ${company.company_name} · Generado: ${nowStr}`,
        company,
        columns: [
          { key: 'code', header: 'Código' },
          { key: 'name', header: 'Nombre / Razón Social' },
          { key: 'tax_id', header: 'NIF / CIF' },
          { key: 'contact_name', header: 'Contacto' },
          { key: 'phone', header: 'Teléfono' },
          { key: 'email', header: 'Email' },
          { key: 'main_address', header: 'Domicilio' },
          { key: 'postal_code', header: 'C.P.' },
          { key: 'city', header: 'Población' },
          { key: 'province', header: 'Provincia' },
          { key: 'active', header: 'Estado' },
        ],
        rows: list.map((c) => ({
          code: c.code,
          name: c.name,
          tax_id: c.tax_id || '—',
          contact_name: c.contact_name || '—',
          phone: c.phones.join(', ') || '—',
          email: c.emails.join(', ') || '—',
          main_address: c.main_address || '—',
          postal_code: c.postal_code || '—',
          city: c.city || '—',
          province: c.province || '—',
          active: c.is_active ? 'Activo' : 'Inactivo',
        })),
        orientation: 'landscape',
      });
    } else if (target === 'suppliers') {
      const list = backend.getSuppliers(true);
      exportRowsToPDF({
        fileName: 'Exportacion_Proveedores.pdf',
        title: 'Listado Oficial de Proveedores',
        subtitle: `Catálogo de proveedores homologados · ${company.company_name} · Generado: ${nowStr}`,
        company,
        columns: [
          { key: 'name', header: 'Nombre / Razón Social' },
          { key: 'tax_id', header: 'NIF / CIF' },
          { key: 'contact_person', header: 'Contacto' },
          { key: 'phone', header: 'Teléfono' },
          { key: 'email', header: 'Email' },
          { key: 'address', header: 'Dirección' },
          { key: 'postal_code', header: 'C.P.' },
          { key: 'city', header: 'Población' },
          { key: 'province', header: 'Provincia' },
          { key: 'active', header: 'Estado' },
        ],
        rows: list.map((s) => ({
          name: s.name,
          tax_id: s.tax_id || '—',
          contact_person: s.contact_person || '—',
          phone: s.phone || '—',
          email: s.email || '—',
          address: s.address || '—',
          postal_code: s.postal_code || '—',
          city: s.city || '—',
          province: s.province || '—',
          active: s.is_active ? 'Activo' : 'Inactivo',
        })),
        orientation: 'landscape',
      });
    } else if (target === 'articles') {
      const list = backend.getArticles(true);
      exportRowsToPDF({
        fileName: 'Exportacion_Articulos.pdf',
        title: 'Catálogo Oficial de Artículos y Tarifas',
        subtitle: `Tarifas y existencias de materiales · ${company.company_name} · Generado: ${nowStr}`,
        company,
        columns: [
          { key: 'code', header: 'Código' },
          { key: 'name', header: 'Artículo' },
          { key: 'unit', header: 'Unidad' },
          { key: 'purchase', header: 'Precio Compra' },
          { key: 'sale', header: 'Precio Venta' },
          { key: 'active', header: 'Estado' },
        ],
        rows: list.map((a) => ({
          code: a.code,
          name: a.name,
          unit: a.unit,
          purchase: formatCentsToEUR(a.purchase_price_cents),
          sale: formatCentsToEUR(a.sale_price_cents),
          active: a.is_active ? 'Activo' : 'Inactivo',
        })),
        orientation: 'portrait',
      });
    } else if (target === 'work_orders') {
      const list = backend.getWorkOrders({ includeArchived: true });
      exportRowsToPDF({
        fileName: 'Exportacion_Listado_Partes.pdf',
        title: 'Listado General de Partes de Trabajo',
        subtitle: `Registro histórico y operativo de partes · ${company.company_name} · Generado: ${nowStr}`,
        company,
        columns: [
          { key: 'code', header: 'Nº Parte' },
          { key: 'customer', header: 'Cliente' },
          { key: 'planned_work', header: 'Trabajo a Realizar' },
          { key: 'address', header: 'Dirección Servicio' },
          { key: 'scheduled', header: 'Fecha Programada' },
          { key: 'status', header: 'Estado' },
          { key: 'amount', header: 'Importe' },
        ],
        rows: list.map((w) => ({
          code: w.code,
          customer: w.snapshot_customer_name,
          planned_work: w.planned_work || '—',
          address: `${w.snapshot_address_line} (${w.snapshot_city})`,
          scheduled: formatDateTimeES(w.scheduled_at, tz),
          status: w.archived_at ? 'Archivado' : w.status.toUpperCase(),
          amount: formatCentsToEUR(w.total_amount_cents),
        })),
        orientation: 'landscape',
      });
    } else if (target === 'reviews') {
      const revs = backend.getInstallationReviews();
      const custs = backend.getCustomers(true);
      const types = backend.getReviewTypes(true);
      exportRowsToPDF({
        fileName: 'Exportacion_Revisiones.pdf',
        title: 'Listado Oficial de Revisiones Periódicas',
        subtitle: `Calendario de inspecciones de instalaciones · ${company.company_name} · Generado: ${nowStr}`,
        company,
        columns: [
          { key: 'customer', header: 'Cliente' },
          { key: 'type', header: 'Tipo de Revisión' },
          { key: 'last', header: 'Última Revisión' },
          { key: 'next', header: 'Próxima Fecha' },
          { key: 'status', header: 'Estado' },
        ],
        rows: revs.map((r) => ({
          customer: custs.find((c) => c.id === r.customer_id)?.name || r.customer_id,
          type: types.find((t) => t.id === r.review_type_id)?.name || r.review_type_id,
          last: r.last_review_date || '—',
          next: r.next_review_date,
          status: r.status.toUpperCase(),
        })),
        orientation: 'portrait',
      });
    }
  };

  return (
    <div className="space-y-6">
      <ScreenHeaderBar
        title="Importación Excel y Exportación Excel / PDF"
        subtitle="Mapeo de columnas, previsualización, validaciones por fila, claves de coincidencia y protección frente a fórmulas"
        onBack={onBack}
        actions={
          company.logo_url ? (
            <img
              src={company.logo_url}
              alt={company.company_name}
              data-testid="export-company-logo"
              className="h-8 max-w-[130px] object-contain rounded border border-slate-200 bg-white p-0.5"
            />
          ) : undefined
        }
      />

      {/* Aviso explícito de que exportar listados no equivale a una copia de seguridad */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Nota importante sobre copias de seguridad vs. exportaciones:</p>
          <p>
            La exportación de listados a Excel o PDF respeta los filtros, columnas visibles y permisos, y protege las celdas frente a inyección de fórmulas, pero <strong>NO equivale a una copia de seguridad completa</strong> (ya que no incluye objetos binarios de Storage, firmas ni metadatos de identidades Auth). Para copias íntegras utiliza el apartado de <strong>Copias de Seguridad y Restauración</strong>.
          </p>
        </div>
      </div>

      {/* Exportación rápida de catálogos y listados en Excel y PDF */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileDown className="w-5 h-5 text-blue-600" />
            Exportación segura de catálogos y listados ({company.company_name})
          </h2>
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt={company.company_name}
              className="h-7 max-w-[120px] object-contain"
            />
          )}
        </div>

        {/* Sección de exportación a Excel (.xlsx) */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar a Hoja de Cálculo Excel (.xlsx):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleExportMasterCatalog('customers')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Exportar Clientes (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => handleExportMasterCatalog('suppliers')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Exportar Proveedores (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => handleExportMasterCatalog('articles')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Exportar Artículos (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => handleExportMasterCatalog('work_orders')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Exportar Listado de Partes (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => handleExportMasterCatalog('reviews')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Exportar Revisiones Periódicas (.xlsx)
            </button>
          </div>
        </div>

        {/* Sección de exportación a PDF (.pdf) */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Exportar a Documento PDF (.pdf oficial con membrete y logotipo):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="btn-export-customers-pdf"
              onClick={() => handleExportMasterCatalogPDF('customers')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
            >
              Exportar Clientes (.pdf)
            </button>
            <button
              type="button"
              data-testid="btn-export-suppliers-pdf"
              onClick={() => handleExportMasterCatalogPDF('suppliers')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
            >
              Exportar Proveedores (.pdf)
            </button>
            <button
              type="button"
              data-testid="btn-export-articles-pdf"
              onClick={() => handleExportMasterCatalogPDF('articles')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
            >
              Exportar Artículos (.pdf)
            </button>
            <button
              type="button"
              data-testid="btn-export-workorders-pdf"
              onClick={() => handleExportMasterCatalogPDF('work_orders')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
            >
              Exportar Listado de Partes (.pdf)
            </button>
            <button
              type="button"
              data-testid="btn-export-reviews-pdf"
              onClick={() => handleExportMasterCatalogPDF('reviews')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
            >
              Exportar Revisiones Periódicas (.pdf)
            </button>
          </div>
        </div>
      </div>

      {/* Importador con plantilla, mapeo, previsualización y políticas de coincidencia */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Asistente de Importación desde Excel con Validación Previa
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadImportTemplateExcel(entityType)}
              className="px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
            >
              Descargar Plantilla Oficial ({entityType})
            </button>
            <button
              type="button"
              data-testid="btn-load-sample-import"
              onClick={handleLoadSampleRowsForPreview}
              className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-semibold"
            >
              Cargar lote de prueba en previsualizador
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. Entidad a importar
            </label>
            <select
              value={entityType}
              onChange={(e) => {
                const next = e.target.value as typeof entityType;
                setEntityType(next);
                setPreview(null);
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="customers">Clientes</option>
              <option value="suppliers">Proveedores</option>
              <option value="articles">Artículos</option>
              <option value="reviews">Revisiones periódicas</option>
              <option value="work_orders">Partes de trabajo (Flujo Admin)</option>
              <option value="attendance">Fichajes históricos (Flujo Admin con motivo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Política ante registros coincidentes (clave exacta)
            </label>
            <select
              value={conflictPolicy}
              onChange={(e) => setConflictPolicy(e.target.value as typeof conflictPolicy)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="reject_duplicates">Rechazar coincidentes e informar en incidencias</option>
              <option value="insert_only">Solo altas nuevas (omitir coincidentes)</option>
              <option value="update_existing">Actualizar registros coincidentes por clave única</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              3. Seleccionar archivo Excel (.xlsx / .xls)
            </label>
            <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>{fileName || 'Seleccionar archivo Excel...'}</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {sheetNames.length > 1 && workbookRef && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hoja del libro Excel
            </label>
            <select
              value={selectedSheet}
              onChange={(e) => {
                setSelectedSheet(e.target.value);
                loadSheetRows(workbookRef, e.target.value, entityType);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
            >
              {sheetNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mapeo de columnas */}
        {detectedHeaders.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase">
              Mapeo de columnas de la hoja «{selectedSheet}»
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ENTITY_FIELDS[entityType].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {f.label}
                  </label>
                  <select
                    value={columnMapping[f.key] || ''}
                    onChange={(e) => {
                      const nextMap = { ...columnMapping, [f.key]: e.target.value };
                      setColumnMapping(nextMap);
                      setPreview(
                        validateAndPreviewImport({
                          backend,
                          entityType,
                          rawRows,
                          columnMapping: nextMap,
                        })
                      );
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white"
                  >
                    <option value="">-- Sin asignar --</option>
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumen previo y tabla de previsualización por fila */}
        {preview && (
          <div className="space-y-3" data-testid="import-preview-box">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                <div className="text-xs text-slate-500">Filas leídas</div>
                <div className="text-lg font-bold text-slate-900">{preview.totalRows}</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-xs text-emerald-700">Altas nuevas válidas</div>
                <div className="text-lg font-bold text-emerald-900">{preview.validNewCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-xs text-amber-700">Coincidentes por clave</div>
                <div className="text-lg font-bold text-amber-900">{preview.duplicateCount}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="text-xs text-red-700">Filas con errores</div>
                <div className="text-lg font-bold text-red-900">{preview.errorCount}</div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5">Fila</th>
                    <th className="p-2.5">Datos mapeados</th>
                    <th className="p-2.5">Estado de validación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {preview.rows.map((r) => (
                    <tr key={r.rowNumber}>
                      <td className="p-2.5 font-mono font-bold">#{r.rowNumber}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-700">
                        {JSON.stringify(r.mapped)}
                      </td>
                      <td className="p-2.5">
                        {r.errors.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {r.errors.map((e) => `${e.field}: ${e.message}`).join(' | ')}
                          </span>
                        ) : r.isDuplicate ? (
                          <span className="text-amber-700 font-semibold">
                            Coincidencia exacta detectada ({conflictPolicy})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Válido para alta
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadIncidentsReport}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                >
                  Descargar Informe de Incidencias (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadIncidentsReportPDF}
                  className="px-3.5 py-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-800"
                >
                  Descargar Informe de Incidencias (.pdf)
                </button>
              </div>
              <button
                type="button"
                data-testid="btn-execute-import"
                onClick={handleConfirmImport}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
              >
                Confirmar y Ejecutar Importación Auditada
              </button>
            </div>
          </div>
        )}

        {lastExecutionResult && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs text-emerald-950">
            <strong>Resultado de la importación:</strong> Insertados: {lastExecutionResult.inserted} | Actualizados: {lastExecutionResult.updated} | Rechazados: {lastExecutionResult.rejected}
          </div>
        )}
      </div>
    </div>
  );
};
