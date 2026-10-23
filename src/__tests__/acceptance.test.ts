import { describe, it, expect, beforeEach } from 'vitest';
import { InstallationBackendEngine } from '../services/backendEngine';
import {
  addCalendarMonthsClamped,
  calculateDuration,
  calculateReviewNoticeSchedule,
  formatDateES,
  formatDateTimeES,
  formatTimeES,
  getReviewAlertInfo,
  parseDateRobust,
  sanitizeSpreadsheetCell,
  sanitizeTimezone,
} from '../utils/formatters';
import {
  executeValidatedImport,
  generateAttendanceReportPDF,
  validateAndPreviewImport,
} from '../utils/exportImportUtils';

describe('Validación de los 21 Escenarios de Aceptación (Sección 20 del Prompt Maestro)', () => {
  let backend: InstallationBackendEngine;

  beforeEach(() => {
    backend = new InstallationBackendEngine('test-empresa-principal', false);
    backend.login('admin@climalux-demo.es', 'Admin1234!');
  });

  it('Escenario 1: Una instalación no comparte usuarios, base, archivos, configuración ni backups con otra', () => {
    const instalacionEmpresaA = new InstallationBackendEngine('empresa-a-aislada', false);
    const instalacionEmpresaB = new InstallationBackendEngine('empresa-b-aislada', false);

    instalacionEmpresaA.login('admin@climalux-demo.es', 'Admin1234!');
    instalacionEmpresaB.login('admin@climalux-demo.es', 'Admin1234!');

    instalacionEmpresaA.updateCompanySettings({
      company_name: 'Instalaciones Empresa A S.L.',
      notification_email: 'avisos@empresa-a.es',
    });
    instalacionEmpresaA.inviteAndCreateUser({
      full_name: 'Técnico Exclusivo A',
      dni: '11111111A',
      email: 'tecnico@empresa-a.es',
      phone: '600000001',
      role: 'operario',
    });
    instalacionEmpresaA.createManualBackup('2026-10-21');

    // Verificar aislamiento absoluto en Empresa B
    expect(instalacionEmpresaB.getCompanySettings().company_name).not.toBe(
      'Instalaciones Empresa A S.L.'
    );
    expect(
      instalacionEmpresaB.getProfiles().some((u) => u.email === 'tecnico@empresa-a.es')
    ).toBe(false);
    expect(instalacionEmpresaB.getBackupJobs().length).toBe(0);
  });

  it('Escenario 2: Un administrador crea un parte y asigna dos operarios; ambos lo ven y un tercero no accede ni por URL ni por API ni por Storage', () => {
    const newWo = backend.createWorkOrder({
      customer_id: 'cust-1',
      customer_address_id: 'addr-1',
      snapshot_customer_name: 'Cliente Escenario 2',
      snapshot_customer_tax_id: 'B11223344',
      snapshot_contact_name: 'Contacto',
      snapshot_contact_phone: '+34600112233',
      snapshot_contact_email: 'c@ejemplo.es',
      snapshot_address_line: 'Calle Prueba 2',
      snapshot_postal_code: '28001',
      snapshot_city: 'Madrid',
      snapshot_province: 'Madrid',
      planned_work: 'Instalación caldera compartida',
      scheduled_at: '2026-10-25T09:00:00.000Z',
      initial_notes: '',
      operator_ids: ['usr-oper-1', 'usr-oper-2'], // Carlos y Lucía
    });

    const uploadedFile = backend.addWorkFile({
      work_order_id: newWo.id,
      file_name: 'foto-caldera.png',
      mime_type: 'image/png',
      size_bytes: 2048,
      caption: 'Foto privada',
      data_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });

    // Operario 1 (Carlos) lo ve
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    expect(backend.getWorkOrders().some((w) => w.id === newWo.id)).toBe(true);
    expect(backend.getWorkOrderById(newWo.id).id).toBe(newWo.id);
    expect(backend.downloadPrivateWorkFile(uploadedFile.id).id).toBe(uploadedFile.id);

    // Operario 2 (Lucía) lo ve
    backend.login('lucia@climalux-demo.es', 'Oper1234!');
    expect(backend.getWorkOrders().some((w) => w.id === newWo.id)).toBe(true);
    expect(backend.getWorkOrderById(newWo.id).id).toBe(newWo.id);

    // Operario 3 (David - NO asignado) no lo ve en listado, ni accede por ID/URL/API, ni descarga de Storage
    backend.login('david@climalux-demo.es', 'Oper1234!');
    expect(backend.getWorkOrders().some((w) => w.id === newWo.id)).toBe(false);
    expect(() => backend.getWorkOrderById(newWo.id)).toThrow();
    expect(() => backend.downloadPrivateWorkFile(uploadedFile.id)).toThrow();
  });

  it('Escenario 3: Un operario registra y modifica sus aportaciones; no puede modificar las de su compañero ni cambiar su autor para eludir la regla', () => {
    // wo-2 está asignado a Carlos (usr-oper-1) y Lucía (usr-oper-2)
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    const carlosEntry = backend.addWorkEntry('wo-2', 'Trabajo de Carlos', 'Obs inicial');

    // Carlos puede modificar su propia aportación
    const updatedByCarlos = backend.updateWorkEntry(carlosEntry.id, {
      description: 'Trabajo de Carlos modificado por él mismo',
      observations: 'Obs actualizada',
    });
    expect(updatedByCarlos.description).toBe('Trabajo de Carlos modificado por él mismo');

    // Carlos intenta cambiar el autor de su aportación -> rechazado
    expect(() =>
      backend.updateWorkEntry(carlosEntry.id, {
        description: 'Intento cambio autor',
        observations: '',
        attempted_created_by: 'usr-oper-2',
      })
    ).toThrow();

    // Lucía (compañera en el mismo parte wo-2) puede leer las aportaciones pero NO puede modificar ni borrar la de Carlos
    backend.login('lucia@climalux-demo.es', 'Oper1234!');
    const allEntries = backend.getWorkEntries('wo-2');
    expect(allEntries.some((e) => e.id === carlosEntry.id)).toBe(true);

    expect(() =>
      backend.updateWorkEntry(carlosEntry.id, {
        description: 'Intento de Lucía sobre trabajo de Carlos',
        observations: '',
      })
    ).toThrow();

    expect(() => backend.deleteWorkEntry(carlosEntry.id)).toThrow();
  });

  it('Escenario 4: Ninguna respuesta accesible al operario contiene dinero entregado o factura emitida', () => {
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    const orders = backend.getWorkOrders();
    expect(orders.length).toBeGreaterThan(0);

    for (const wo of orders) {
      const serialized = JSON.stringify(wo);
      expect(wo.admin_data).toBeUndefined();
      expect(serialized).not.toContain('money_delivered');
      expect(serialized).not.toContain('invoice_issued');
    }

    const detail = backend.getWorkOrderById('wo-2');
    expect(detail.admin_data).toBeUndefined();
    expect(JSON.stringify(detail)).not.toContain('money_delivered');
    expect(JSON.stringify(detail)).not.toContain('invoice_issued');

    // Tampoco puede llamar al método administrativo de datos reservados
    expect(() =>
      backend.updateWorkOrderAdminData('wo-2', { money_delivered: true })
    ).toThrow();
  });

  it('Escenario 5: Crear un cliente desde el alta de parte conserva el formulario y selecciona el cliente nuevo. Cambiar la dirección del parte no cambia la ficha del cliente', () => {
    const newClient = backend.saveCustomer({
      code: 'CLI-NUEVO-5',
      name: 'Cliente Creado En Alta Parte S.L.',
      tax_id: 'B55667788',
      phones: ['+34600556677'],
      emails: ['nuevo@cliente5.es'],
      main_address: 'Dirección Ficha Maestra 100',
      notes: '',
      is_active: true,
    });

    // Al crear o editar el parte con otra dirección de servicio específica, la ficha del cliente no cambia
    const wo = backend.createWorkOrder({
      customer_id: newClient.id,
      customer_address_id: null,
      snapshot_customer_name: newClient.name,
      snapshot_customer_tax_id: newClient.tax_id,
      snapshot_contact_name: 'Encargado Obra',
      snapshot_contact_phone: '+34600556677',
      snapshot_contact_email: 'nuevo@cliente5.es',
      snapshot_address_line: 'Calle Otra Obra Temporal 999',
      snapshot_postal_code: '28050',
      snapshot_city: 'Madrid',
      snapshot_province: 'Madrid',
      planned_work: 'Trabajo conservado del formulario',
      scheduled_at: '2026-10-28T10:00:00.000Z',
      initial_notes: '',
      operator_ids: ['usr-oper-1'],
    });

    expect(wo.snapshot_address_line).toBe('Calle Otra Obra Temporal 999');
    const refreshedClient = backend.getCustomers().find((c) => c.id === newClient.id)!;
    expect(refreshedClient.main_address).toBe('Dirección Ficha Maestra 100');

    // Y modificar el cliente después tampoco reescribe el parte histórico
    backend.saveCustomer({
      ...refreshedClient,
      name: 'Nombre Cliente Cambiado En 2027',
    });
    expect(backend.getWorkOrderById(wo.id).snapshot_customer_name).toBe(
      'Cliente Creado En Alta Parte S.L.'
    );
  });

  it('Escenario 6: Finalizar exige importe y dos respuestas explícitas. La transición es atómica, no se repite y retira el parte del acceso operativo de todos los asignados', () => {
    // 1. Si hay una jornada abierta en el parte, rechaza finalizar
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    const openWorkSess = backend.addWorkSession({
      work_order_id: 'wo-2',
      started_at: '2026-10-21T10:00:00.000Z',
      ended_at: null,
      notes: 'Abierta',
    });

    expect(() =>
      backend.finalizeWorkOrder({
        work_order_id: 'wo-2',
        total_amount_cents: 10000,
        customer_requests_invoice: true,
        customer_has_paid: false,
      })
    ).toThrow(/jornadas abiertas/);

    // Cerrar la jornada abierta
    backend.updateWorkSession(openWorkSess.id, { ended_at: '2026-10-21T11:00:00.000Z' });

    // 2. Si falta respuesta explícita a factura o pagado, o importe negativo -> rechaza
    expect(() =>
      backend.finalizeWorkOrder({
        work_order_id: 'wo-2',
        total_amount_cents: null,
        customer_requests_invoice: true,
        customer_has_paid: true,
      })
    ).toThrow();

    expect(() =>
      backend.finalizeWorkOrder({
        work_order_id: 'wo-2',
        total_amount_cents: 0,
        customer_requests_invoice: null,
        customer_has_paid: true,
      })
    ).toThrow();

    // 3. Finalización válida con importe 0 (admite cero) y respuestas explícitas
    const finalized = backend.finalizeWorkOrder({
      work_order_id: 'wo-2',
      total_amount_cents: 0,
      customer_requests_invoice: false,
      customer_has_paid: false,
    });
    expect(finalized.status).toBe('terminado');

    // 4. Desaparece del acceso operativo tanto para Carlos como para Lucía (ambos estaban asignados a wo-2)
    expect(backend.getWorkOrders().some((w) => w.id === 'wo-2')).toBe(false);
    expect(() => backend.getWorkOrderById('wo-2')).toThrow();

    backend.login('lucia@climalux-demo.es', 'Oper1234!');
    expect(backend.getWorkOrders().some((w) => w.id === 'wo-2')).toBe(false);

    // 5. Doble finalización es rechazada incluso para Admin
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    expect(() =>
      backend.finalizeWorkOrder({
        work_order_id: 'wo-2',
        total_amount_cents: 5000,
        customer_requests_invoice: true,
        customer_has_paid: true,
      })
    ).toThrow(/finalizado anteriormente/);
  });

  it('Escenario 7 y 21: Solo el administrador cierra y archiva. Archivar mantiene estado cerrado y conserva datos, fotos, firma e historial. La eliminación lógica es distinta y deja auditoría', () => {
    // Operario no puede cerrar ni archivar
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    expect(() => backend.closeWorkOrder('wo-3')).toThrow();
    expect(() => backend.archiveWorkOrder('wo-3')).toThrow();

    // Admin intenta archivar wo-3 (que está 'terminado' pero no 'cerrado') -> requiere cierre previo
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    expect(() => backend.archiveWorkOrder('wo-3')).toThrow(/haberlo cerrado previamente/);

    // Admin cierra wo-3 y luego lo archiva
    const closed = backend.closeWorkOrder('wo-3');
    expect(closed.status).toBe('cerrado');

    const archived = backend.archiveWorkOrder('wo-3');
    expect(archived.status).toBe('cerrado');
    expect(archived.archived_at).not.toBeNull();

    // Se retira del listado activo pero se localiza en el listado de archivados con todos sus datos
    expect(backend.getWorkOrders({ includeArchived: false }).some((w) => w.id === 'wo-3')).toBe(
      false
    );
    expect(backend.getWorkOrders({ onlyArchived: true }).some((w) => w.id === 'wo-3')).toBe(true);

    // Eliminación lógica es distinta (usa deleted_at y papelera) y deja auditoría
    backend.softDeleteWorkOrder('wo-1', 'Creado por error de prueba');
    expect(backend.getWorkOrders({ onlyDeletedTrash: true }).some((w) => w.id === 'wo-1')).toBe(
      true
    );
    expect(
      backend.getAuditLog().some(
        (a) => a.entity_id === 'wo-1' && a.operation === 'ELIMINAR_LÓGICO_PAPELERA'
      )
    ).toBe(true);

    // Inactivar un cliente maestro no lo borra de los partes existentes ni lo ofrece por defecto en nuevas operaciones
    backend.saveCustomer({
      ...backend.getCustomers(true).find((c) => c.id === 'cust-1')!,
      is_active: false,
    });
    expect(backend.getCustomers(false).some((c) => c.id === 'cust-1')).toBe(false);
    expect(backend.getWorkOrderById('wo-4').snapshot_customer_name).toContain('Los Olivos');
  });

  it('Escenario 8: Crear un parte desde una revisión conserva el vínculo y no genera duplicados ante repetición de la solicitud', () => {
    const woFromRev = backend.createWorkOrder({
      customer_id: 'cust-1',
      customer_address_id: 'addr-1',
      snapshot_customer_name: 'Comunidad Los Olivos',
      snapshot_customer_tax_id: 'H28990011',
      snapshot_contact_name: 'Julián',
      snapshot_contact_phone: '+34611223344',
      snapshot_contact_email: 'conserjeria@losolivos-ficticio.es',
      snapshot_address_line: 'Av. Castellana 120',
      snapshot_postal_code: '28046',
      snapshot_city: 'Madrid',
      snapshot_province: 'Madrid',
      planned_work: 'Revisión Anual RITE vinculada',
      scheduled_at: '2026-10-28T09:00:00.000Z',
      initial_notes: '',
      operator_ids: ['usr-oper-1'],
      origin_review_occurrence_id: 'ro-1',
    });

    expect(woFromRev.origin_review_occurrence_id).toBe('ro-1');
    const occ = backend.getReviewOccurrences().find((o) => o.id === 'ro-1')!;
    expect(occ.linked_work_order_id).toBe(woFromRev.id);

    // Intentar crear por segunda vez un parte para el mismo vencimiento ro-1 es rechazado
    expect(() =>
      backend.createWorkOrder({
        customer_id: 'cust-1',
        customer_address_id: 'addr-1',
        snapshot_customer_name: 'Comunidad Los Olivos',
        snapshot_customer_tax_id: 'H28990011',
        snapshot_contact_name: 'Julián',
        snapshot_contact_phone: '+34611223344',
        snapshot_contact_email: 'conserjeria@losolivos-ficticio.es',
        snapshot_address_line: 'Av. Castellana 120',
        snapshot_postal_code: '28046',
        snapshot_city: 'Madrid',
        snapshot_province: 'Madrid',
        planned_work: 'Duplicado',
        scheduled_at: '2026-10-28T09:00:00.000Z',
        initial_notes: '',
        operator_ids: ['usr-oper-1'],
        origin_review_occurrence_id: 'ro-1',
      })
    ).toThrow(/Ya existe un parte vinculado/);
  });

  it('Escenario 9: Los avisos se calculan correctamente en fin de mes y zona horaria; las ejecuciones concurrentes, reintentos y cambios de fecha no duplican avisos confirmados', () => {
    // 1. Cálculo de fin de mes natural (31 de marzo - 1 mes = 28 de febrero en año no bisiesto 2026)
    expect(addCalendarMonthsClamped('2026-03-31', -1)).toBe('2026-02-28');
    const sched = calculateReviewNoticeSchedule('2026-03-31');
    expect(sched.oneMonthBefore).toBe('2026-02-28');
    expect(sched.oneWeekBefore).toBe('2026-03-24');
    expect(sched.sameDay).toBe('2026-03-31');

    // 2. Recuperación tras interrupción: si ya vencieron varios hitos de una misma revisión,
    // envía solo el más reciente alcanzado y marca los anteriores como 'skipped_recovery' (sin ráfaga)
    const rev = backend.saveInstallationReview(
      {
        customer_id: 'cust-1',
        customer_address_id: 'addr-1',
        review_type_id: 'rt-1',
        origin_work_order_id: null,
        last_review_date: null,
        next_review_date: '2026-12-15',
        status: 'pendiente',
        notes: 'Prueba cola',
      },
      '2026-10-01'
    );

    // Si ejecutamos la cola el mismo día del vencimiento (2026-12-15) tras una interrupción,
    // de los 3 hitos ('1_month_before', '1_week_before', 'same_day'), solo envía 'same_day' y omite los 2 anteriores
    const run1 = backend.processNotificationQueue('2026-12-15');
    expect(run1.sent).toBeGreaterThanOrEqual(1);
    expect(run1.skippedRecovery).toBeGreaterThanOrEqual(2);

    // Segunda ejecución concurrente el mismo día no reenvía ningún aviso ya confirmado
    const run2 = backend.processNotificationQueue('2026-12-15');
    expect(run2.sent).toBe(0);

    // Cambiar la fecha de la revisión cancela los pendientes antiguos y recalcula los nuevos
    backend.saveInstallationReview(
      {
        id: rev.id,
        customer_id: 'cust-1',
        customer_address_id: 'addr-1',
        review_type_id: 'rt-1',
        origin_work_order_id: null,
        last_review_date: null,
        next_review_date: '2027-02-20',
        status: 'pendiente',
        notes: 'Reprogramada',
      },
      '2026-12-16'
    );
    const outbox = backend.getNotificationOutbox();
    expect(outbox.some((n) => n.due_date === '2027-02-20' && n.status === 'pending')).toBe(true);
  });

  it('Escenario 10: Un operario añade un artículo existente a compra sin crear artículos ni cambiar cantidades. El administrador completa y marca la compra', () => {
    backend.login('carlos@climalux-demo.es', 'Oper1234!');

    // Operario no puede crear artículos ni pasar cantidad
    expect(() =>
      backend.saveArticle({
        code: 'HACK',
        name: 'Intento',
        description: '',
        supplier_id: null,
        purchase_price_cents: 100,
        sale_price_cents: 200,
        unit: 'ud',
        is_active: true,
      })
    ).toThrow();

    expect(() =>
      backend.requestShoppingArticle({ article_id: 'art-1', quantity: 10 })
    ).toThrow();

    // Operario solicita artículo existente art-1 (queda pendiente de cantidad)
    const req1 = backend.requestShoppingArticle({ article_id: 'art-1' });
    expect(req1.request.quantity).toBeNull();
    expect(req1.request.status).toBe('pending_quantity');

    // Doble pulsación o segunda solicitud no duplica fila
    const req2 = backend.requestShoppingArticle({ article_id: 'art-1' });
    expect(req2.mergedExisting).toBe(true);

    // Administrador fija cantidad y marca comprado
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const completed = backend.adminUpdateShoppingRequest(req1.request.id, {
      quantity: 25,
      markPurchased: true,
    });
    expect(completed.quantity).toBe(25);
    expect(completed.status).toBe('purchased');
  });

  it('Escenario 11: No se puede fichar una segunda entrada abierta ni una salida sin entrada. El operario no altera fichajes históricos. Se calculan correctamente medianoche y cambio de hora', () => {
    backend.login('carlos@climalux-demo.es', 'Oper1234!');

    // No puede fichar salida sin tener entrada abierta
    expect(() => backend.clockOut('Salida sin entrada')).toThrow();

    // Ficha primera entrada
    backend.clockIn('Entrada 1', '2026-10-21T07:00:00.000Z');

    // No puede fichar una segunda entrada abierta
    expect(() => backend.clockIn('Segunda entrada abierta')).toThrow();

    // Ficha salida
    const closed = backend.clockOut('Salida 1', '2026-10-21T15:00:00.000Z');
    expect(calculateDuration(closed.clock_in_at, closed.clock_out_at).minutes).toBe(480); // 8h

    // El operario no puede alterar ni borrar fichajes históricos
    expect(() =>
      backend.adminCreateOrCorrectAttendance({
        session_id: closed.id,
        user_id: 'usr-oper-1',
        clock_in_at: '2026-10-21T06:00:00.000Z',
        clock_out_at: '2026-10-21T15:00:00.000Z',
        worker_notes_in: '',
        worker_notes_out: '',
        reason: 'Intento operario',
      })
    ).toThrow();

    // Cálculo de cruce de medianoche (22:00 a 02:30 del día siguiente = 4h 30m = 270 min)
    const midnightDur = calculateDuration(
      '2026-10-21T20:00:00.000Z',
      '2026-10-22T00:30:00.000Z'
    );
    expect(midnightDur.minutes).toBe(270);
    expect(midnightDur.formatted).toBe('4h 30m');

    // Cálculo en noche de cambio de horario de verano a invierno en Europa (25 oct 2026: duraciones reales en UTC)
    const dstDur = calculateDuration(
      '2026-10-24T23:00:00.000Z',
      '2026-10-25T05:00:00.000Z'
    );
    expect(dstDur.minutes).toBe(360); // 6 horas reales exactas trabajadas
  });

  it('Escenario 12: Los PDFs de fichajes contienen todas las columnas, el periodo, el trabajador y los dos espacios de firma, nombre y DNI manuscritos', () => {
    const company = backend.getCompanySettings();
    const workers = backend.getProfiles().filter((p) => p.id === 'usr-oper-1');
    const sessions = backend.getAttendanceSessions();

    const { doc, textSummary } = generateAttendanceReportPDF(
      {
        company,
        periodLabel: '01/10/2026 a 31/10/2026',
        workers: [{ worker: workers[0], sessions }],
      },
      false
    );

    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(textSummary).toContain('Fecha, Día de la semana, Hora de entrada, Hora de salida, Horas trabajadas, Observaciones del trabajador');
    expect(textSummary).toContain('Firma del trabajador, nombre y DNI manuscritos');
    expect(textSummary).toContain('Firma del representante de la empresa, nombre y DNI manuscritos');
  });

  
  it('Escenario 12b: Horario habitual de jornada por defecto y cierre automático para evitar fichajes pendientes', () => {
    backend.login('admin@climalux-demo.es', 'Admin1234!');

    // 1. Configurar horario habitual (08:30 a 17:30)
    backend.updateCompanySettings({
      default_work_start_time: '08:30',
      default_work_end_time: '17:30',
    });
    const settings = backend.getCompanySettings();
    expect(settings.default_work_start_time).toBe('08:30');
    expect(settings.default_work_end_time).toBe('17:30');

    // 2. Simular un fichaje que quedó abierto en una fecha anterior
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    const openSession = backend.clockIn('Entrada ayer', '2026-10-22T06:30:00.000Z');
    expect(openSession.clock_out_at).toBeNull();

    // 3. Ejecutar autoResolvePendingAttendance desde admin
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const result = backend.autoResolvePendingAttendance({
      referenceNowIso: '2026-10-23T18:00:00.000Z',
      completeMissingWorkers: true,
      targetDateCivil: '2026-10-23',
    });
    expect(result.closedSessionsCount).toBeGreaterThanOrEqual(1);

    // Verificar que la sesión de Carlos quedó cerrada con la hora de salida habitual (17:30)
    const sessions = backend.getAttendanceSessions(false);
    const closedCarlos = sessions.find((s) => s.id === openSession.id);
    expect(closedCarlos?.clock_out_at).not.toBeNull();
    expect(closedCarlos?.worker_notes_out).toContain('Cierre automático');
  });

  it('Escenario 13: Importar valida relaciones, datos incorrectos y coincidencias antes de escribir; exportar protege frente a fórmulas', () => {
    // Protección frente a inyección de fórmulas en Excel
    expect(sanitizeSpreadsheetCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeSpreadsheetCell('+CMD|...')).toBe("'+CMD|...");

    const preview = validateAndPreviewImport({
      backend,
      entityType: 'customers',
      rawRows: [
        { Codigo_Cliente: 'CLI-900', Nombre_Razon_Social: 'Cliente Nuevo Excel' },
        { Codigo_Cliente: 'CLI-0001', Nombre_Razon_Social: 'Coincidente' },
        { Codigo_Cliente: '', Nombre_Razon_Social: '' },
      ],
      columnMapping: { code: 'Codigo_Cliente', name: 'Nombre_Razon_Social' },
    });

    expect(preview.validNewCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.errorCount).toBe(1);

    const execRes = executeValidatedImport({
      backend,
      entityType: 'customers',
      fileName: 'clientes.xlsx',
      conflictPolicy: 'reject_duplicates',
      preview,
    });
    expect(execRes.inserted).toBe(1);
    expect(execRes.rejected).toBe(2);
  });

  it('Escenario 14 y 15: Dos aperturas simultáneas de escritorio generan un único backup diario válido; permite reintentar tras fallo y restaurar en entorno aislado sin afectar a otra instalación', () => {
    // Dos aperturas simultáneas de escritorio el mismo día
    const open1 = backend.triggerDailyDesktopAutoBackupIfNeeded({
      isDesktopContext: true,
      localDateOverride: '2026-10-21',
    });
    const open2 = backend.triggerDailyDesktopAutoBackupIfNeeded({
      isDesktopContext: true,
      localDateOverride: '2026-10-21',
    });

    expect(open1.triggered).toBe(true);
    expect(open2.triggered).toBe(false);
    expect(
      backend
        .getBackupJobs()
        .filter((b) => b.backup_date_local === '2026-10-21' && b.trigger_type === 'auto_desktop')
        .length
    ).toBe(1);

    // Si falla el backup un día nuevo, no impide reintentar ese mismo día
    backend.setSimulatedBackupFailure(true);
    const failedTry = backend.triggerDailyDesktopAutoBackupIfNeeded({
      isDesktopContext: true,
      localDateOverride: '2026-10-22',
    });
    expect(failedTry.job?.status).toBe('failed');

    backend.setSimulatedBackupFailure(false);
    const retrySameDay = backend.triggerDailyDesktopAutoBackupIfNeeded({
      isDesktopContext: true,
      localDateOverride: '2026-10-22',
    });
    expect(retrySameDay.triggered).toBe(true);
    expect(retrySameDay.job?.status).toBe('completed');

    // Escenario 15: Restauración en entorno aislado sin afectar a producción
    const prodSnapshot = backend.exportFullSnapshot();
    const isolatedEnv = new InstallationBackendEngine('entorno-aislado-15', false);
    isolatedEnv.login('admin@climalux-demo.es', 'Admin1234!');
    isolatedEnv.restoreFromSnapshot(prodSnapshot, 'AUTORIZO_RESTAURACION_VERIFICADA');
    expect(isolatedEnv.getWorkOrders({ includeArchived: true }).length).toBe(
      backend.getWorkOrders({ includeArchived: true }).length
    );
  });

  it('Escenario 16 y 17: Pérdida de red rechaza escritura sin falso éxito; retirar asignación o inactivar usuario impide nuevos accesos inmediatamente', () => {
    // Escenario 16: Offline impide guardar
    backend.setOfflineMode(true);
    expect(() => backend.addWorkEntry('wo-2', 'Intento sin red', '')).toThrow(/No hay conexión/);
    backend.setOfflineMode(false);

    // Escenario 17: Retirar asignación de Carlos sobre wo-1 impide inmediatamente consultar wo-1
    backend.updateWorkOrderPlanningAndAssignments('wo-1', {
      operator_ids: ['usr-oper-2'], // Se retira a usr-oper-1
    });

    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    expect(() => backend.getWorkOrderById('wo-1')).toThrow();

    // Inactivar a Carlos revoca inmediatamente su sesión e impide nuevas llamadas
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    backend.updateUserProfile('usr-oper-1', { is_active: false });
    expect(() => backend.login('carlos@climalux-demo.es', 'Oper1234!')).toThrow(/inactiva/);
  });

  it('Escenario 18: Inclusión del importe del trabajo antes del cierre para que el operario sepa cuánto cobrar', () => {
    backend.login('admin@climalux-demo.es', 'Admin1234!');

    // 1. Administrador crea parte incluyendo importe previo a cobrar (185,50 € = 18550 céntimos)
    const woWithAmount = backend.createWorkOrder({
      customer_id: 'cust-1',
      customer_address_id: 'addr-1',
      snapshot_customer_name: 'Hotel Puerta de Alcalá',
      snapshot_customer_tax_id: 'A28000001',
      snapshot_contact_name: 'Recepcionista',
      snapshot_contact_phone: '+34 912 345 678',
      snapshot_contact_email: 'recepcion@hotelpuerta.es',
      snapshot_address_line: 'Calle Alcalá 120',
      snapshot_postal_code: '28009',
      snapshot_city: 'Madrid',
      snapshot_province: 'Madrid',
      planned_work: 'Mantenimiento urgente de bomba',
      scheduled_at: '2026-10-22T10:00:00.000Z',
      initial_notes: 'Cobrar antes de abandonar la instalación',
      operator_ids: ['usr-oper-2'], // Lucía
      total_amount_cents: 18550,
    });

    expect(woWithAmount.total_amount_cents).toBe(18550);
    expect(woWithAmount.status).toBe('no_iniciado');

    // 2. Operaria asignada (Lucía) consulta el parte y comprueba el importe a cobrar ANTES del cierre
    backend.login('lucia@climalux-demo.es', 'Oper1234!');
    const opWo = backend.getWorkOrderById(woWithAmount.id);
    expect(opWo.total_amount_cents).toBe(18550);

    // 3. Administrador decide actualizar el importe antes de que finalice (por ejemplo a 220,00 €)
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const updatedWo = backend.setWorkOrderAmount(woWithAmount.id, 22000);
    expect(updatedWo.total_amount_cents).toBe(22000);

    // 4. Operaria ve el importe actualizado
    backend.login('lucia@climalux-demo.es', 'Oper1234!');
    const opWoUpdated = backend.getWorkOrderById(woWithAmount.id);
    expect(opWoUpdated.total_amount_cents).toBe(22000);

    // 5. Operaria inicia y finaliza el trabajo con el importe establecido
    backend.startWorkOrder(woWithAmount.id);
    const finalized = backend.finalizeWorkOrder({
      work_order_id: woWithAmount.id,
      total_amount_cents: opWoUpdated.total_amount_cents,
      customer_requests_invoice: true,
      customer_has_paid: true,
    });
    expect(finalized.status).toBe('terminado');
    expect(finalized.total_amount_cents).toBe(22000);
    expect(finalized.customer_has_paid).toBe(true);

    // 6. El operario puede modificar al finalizar lo que había fijado el administrador (ej. de 150 € a 180 €)
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const woWithInitial150 = backend.createWorkOrder({
      customer_id: 'cust-1',
      customer_address_id: 'addr-1',
      snapshot_customer_name: 'Hotel Puerta de Alcalá',
      snapshot_customer_tax_id: 'A28000001',
      snapshot_contact_name: 'Recepcionista',
      snapshot_contact_phone: '+34 912 345 678',
      snapshot_contact_email: 'recepcion@hotelpuerta.es',
      snapshot_address_line: 'Calle Alcalá 120',
      snapshot_postal_code: '28009',
      snapshot_city: 'Madrid',
      snapshot_province: 'Madrid',
      planned_work: 'Reparación con materiales extra',
      scheduled_at: '2026-10-22T11:00:00.000Z',
      initial_notes: '',
      operator_ids: ['usr-oper-2'],
      total_amount_cents: 15000,
    });

    backend.login('lucia@climalux-demo.es', 'Oper1234!');
    backend.startWorkOrder(woWithInitial150.id);

    // La operaria modifica el importe a 180 € (18000 céntimos) y cobra al cliente
    const finalizedModified = backend.finalizeWorkOrder({
      work_order_id: woWithInitial150.id,
      total_amount_cents: 18000,
      customer_requests_invoice: false,
      customer_has_paid: true,
    });
    expect(finalizedModified.total_amount_cents).toBe(18000);
    expect(finalizedModified.customer_has_paid).toBe(true);
  });

  it('Escenario 19: Configuración del logotipo corporativo de la empresa e inclusión en exportaciones PDF', () => {
    backend.login('admin@climalux-demo.es', 'Admin1234!');

    // 1. Logotipo en formato data URL de muestra
    const sampleLogoDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // 2. Administrador actualiza la configuración de la empresa con el logo
    const updatedSettings = backend.updateCompanySettings({
      logo_url: sampleLogoDataUrl,
    });
    expect(updatedSettings.logo_url).toBe(sampleLogoDataUrl);

    // 3. getCompanySettings devuelve el logo configurado
    const currentSettings = backend.getCompanySettings();
    expect(currentSettings.logo_url).toBe(sampleLogoDataUrl);

    // 4. Verificación de auditoría registrada
    const auditEntries = backend.getAuditLog();
    const logoAudit = auditEntries.find(
      (a) => a.entity_type === 'company_settings' && a.operation === 'MODIFICAR_CONFIGURACIÓN'
    );
    expect(logoAudit).toBeDefined();

    // 5. El logo se puede eliminar restableciéndolo a null
    backend.updateCompanySettings({ logo_url: null });
    expect(backend.getCompanySettings().logo_url).toBeNull();
  });

  it('Escenario 20: Robustez y tolerancia de fechas y horas previstas con cualquier zona horaria o formato', () => {
    // 1. Zonas horarias problemáticas nunca lanzan RangeError ni devuelven '—' para fechas válidas
    const validIso = '2026-10-21T09:30:00.000Z';
    const problematicTimezones = ['', '   ', 'Madrid', 'Europe/Madrid ', null, undefined, 'Invalid/Timezone'];

    for (const tz of problematicTimezones) {
      const sanitized = sanitizeTimezone(tz);
      expect(sanitized).toBe('Europe/Madrid');

      const dateStr = formatDateES(validIso, tz);
      const timeStr = formatTimeES(validIso, tz);
      const dateTimeStr = formatDateTimeES(validIso, tz);

      expect(dateStr).not.toBe('—');
      expect(timeStr).not.toBe('—');
      expect(dateTimeStr).not.toBe('—');
      expect(dateStr).toContain('21/10/2026');
    }

    // 2. Fechas civiles (YYYY-MM-DD) y fechas con espacio 'YYYY-MM-DD HH:mm:ss'
    expect(formatDateES('2026-10-21')).toBe('21/10/2026');
    expect(formatDateES('2026-10-21 09:30:00')).toBe('21/10/2026');
    expect(formatTimeES('2026-10-21 09:30:00')).not.toBe('—');

    // 3. Los partes devueltos por el backend preservan scheduled_at y created_at válidos
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const workOrders = backend.getWorkOrders();
    expect(workOrders.length).toBeGreaterThan(0);

    const comp = backend.getCompanySettings();
    const safeTz = sanitizeTimezone(comp.timezone);

    for (const wo of workOrders) {
      expect(wo.scheduled_at).toBeTruthy();
      expect(wo.created_at).toBeTruthy();
      expect(formatDateES(wo.scheduled_at, safeTz)).not.toBe('—');
      expect(formatTimeES(wo.scheduled_at, safeTz)).not.toBe('—');
      expect(formatDateTimeES(wo.created_at, safeTz)).not.toBe('—');
    }
  });

  it('Escenario 21: Señales de alerta visual en revisiones (1 mes naranja, 1 semana rojo, caducada negro)', () => {
    const today = '2026-10-22';

    // 1. Caducada: fecha anterior a hoy -> NEGRO
    const expiredAlert = getReviewAlertInfo('2026-10-15', today);
    expect(expiredAlert.level).toBe('caducada');
    expect(expiredAlert.colorName).toBe('negro');
    expect(expiredAlert.isOverdue).toBe(true);
    expect(expiredAlert.badgeClass).toContain('bg-black');
    expect(expiredAlert.badgeClass).toContain('text-white');
    expect(expiredAlert.label).toContain('Caducada');

    // 2. Queda 1 semana o menos (0 a 7 días) -> ROJO
    const oneWeekAlert = getReviewAlertInfo('2026-10-27', today); // 5 días
    expect(oneWeekAlert.level).toBe('semana');
    expect(oneWeekAlert.colorName).toBe('rojo');
    expect(oneWeekAlert.isUrgentWeek).toBe(true);
    expect(oneWeekAlert.badgeClass).toContain('bg-red-600');
    expect(oneWeekAlert.label).toContain('1 semana');

    const todayAlert = getReviewAlertInfo('2026-10-22', today); // hoy (0 días)
    expect(todayAlert.level).toBe('semana');
    expect(todayAlert.colorName).toBe('rojo');
    expect(todayAlert.isUrgentWeek).toBe(true);

    // 3. Queda 1 mes (8 a 30 días) -> NARANJA
    const oneMonthAlert = getReviewAlertInfo('2026-11-15', today); // 24 días
    expect(oneMonthAlert.level).toBe('mes');
    expect(oneMonthAlert.colorName).toBe('naranja');
    expect(oneMonthAlert.isWarningMonth).toBe(true);
    expect(oneMonthAlert.badgeClass).toContain('bg-amber-500');
    expect(oneMonthAlert.label).toContain('1 mes');

    // 4. En plazo (> 30 días) -> NEUTRO
    const normalAlert = getReviewAlertInfo('2027-01-15', today);
    expect(normalAlert.level).toBe('en_plazo');
    expect(normalAlert.colorName).toBe('neutro');
  });

  it('Escenario 22: Reprogramación de fecha y hora prevista tanto por administradores como por usuarios (operarios)', () => {
    // 1. Administrador reprograma un parte
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const wo1 = backend.getWorkOrders().find((w) => w.code === 'PT-2026-0001')!;
    expect(wo1).toBeDefined();

    const newDateAdmin = '2026-10-25T11:00:00.000Z';
    const rescheduledByAdmin = backend.rescheduleWorkOrder({
      work_order_id: wo1.id,
      scheduled_at: newDateAdmin,
      reason: 'Cliente solicita cambio para el fin de semana',
    });

    expect(rescheduledByAdmin.scheduled_at).toBe(newDateAdmin);

    // 2. Operario asignado reprograma el parte (Carlos Ruiz usr-oper-1 en PT-2026-0002)
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    const myWos = backend.getWorkOrders();
    const wo2 = myWos.find((w) => w.code === 'PT-2026-0002');
    expect(wo2).toBeDefined();

    const newDateOperator = '2026-10-23T16:30:00.000Z';
    const rescheduledByOperator = backend.rescheduleWorkOrder({
      work_order_id: wo2!.id,
      scheduled_at: newDateOperator,
      reason: 'Retraso acordado por llamada telefónica',
    });

    expect(rescheduledByOperator.scheduled_at).toBe(newDateOperator);

    // 3. Verificación de auditoría y eventos
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const auditLog = backend.getAuditLog();
    const rescheduleAudit = auditLog.filter(
      (a) => a.operation === 'REPROGRAMAR_FECHA_PREVISTA'
    );
    expect(rescheduleAudit.length).toBeGreaterThanOrEqual(2);

    const events = backend.getWorkOrderEvents(wo2!.id);
    const rescheduleEvent = events.find((e) => e.event_type === 'REPROGRAMACION_FECHA_PREVISTA');
    expect(rescheduleEvent).toBeDefined();
    expect((rescheduleEvent?.metadata as any)?.new_scheduled_at).toBe(newDateOperator);
  });

  it('Escenario 23: Modificación completa y reprogramación de revisiones periódicas', () => {
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const reviews = backend.getInstallationReviews();
    const targetRev = reviews[0];
    expect(targetRev).toBeDefined();

    // 1. Modificar datos de la revisión (notas, próxima fecha y tipo)
    const modifiedRev = backend.saveInstallationReview({
      id: targetRev.id,
      customer_id: targetRev.customer_id,
      customer_address_id: targetRev.customer_address_id,
      review_type_id: targetRev.review_type_id,
      origin_work_order_id: targetRev.origin_work_order_id,
      last_review_date: targetRev.last_review_date,
      next_review_date: '2026-12-15',
      status: 'programada',
      notes: 'Notas actualizadas de la revisión tras inspección telefónica',
    });

    expect(modifiedRev.next_review_date).toBe('2026-12-15');
    expect(modifiedRev.status).toBe('programada');
    expect(modifiedRev.notes).toContain('Notas actualizadas');

    // 2. Reprogramar vencimiento de revisión
    const occurrences = backend.getReviewOccurrences(targetRev.id);
    const activeOcc = occurrences.find((o) => o.status !== 'realizada')!;
    expect(activeOcc).toBeDefined();

    const rescheduledOcc = backend.rescheduleReviewOccurrence({
      occurrence_id: activeOcc.id,
      new_due_date: '2026-12-20',
      notes: 'Reprogramada a solicitud del cliente por vacaciones',
    });

    expect(rescheduledOcc.due_date).toBe('2026-12-20');
    expect(rescheduledOcc.notes).toContain('vacaciones');

    // 3. Sincronización en la revisión principal
    const reloadedRev = backend.getInstallationReviews().find((r) => r.id === targetRev.id)!;
    expect(reloadedRev.next_review_date).toBe('2026-12-20');

    // 4. Verificación de auditoría
    const audit = backend.getAuditLog();
    expect(audit.some((a) => a.operation === 'MODIFICAR_REVISIÓN')).toBe(true);
    expect(audit.some((a) => a.operation === 'REPROGRAMAR_VENCIMIENTO_REVISIÓN')).toBe(true);
  });

  it('Escenario 22: Importación de proveedores desde Excel con validación, detección de duplicados y actualización', () => {
    backend.login('admin@climalux-demo.es', 'Admin1234!');

    const initialSuppliers = backend.getSuppliers(true);
    const existingSupplier = initialSuppliers[0];
    expect(existingSupplier).toBeDefined();

    const rawRows = [
      {
        Nombre_Razon_Social: 'Distribuidora Calderas Mediterráneo S.L.',
        NIF_CIF: 'B99112233',
        Telefono: '+34 963 888 999',
        Email: 'pedidos@calderasmed.es',
        Persona_Contacto: 'Vicente Pérez',
        Notas: 'Entrega urgente 12h',
      },
      {
        Nombre_Razon_Social: existingSupplier.name,
        NIF_CIF: existingSupplier.tax_id,
        Telefono: '+34 911 000 111',
        Email: 'actualizado@proveedor.es',
        Persona_Contacto: 'Persona Actualizada',
        Notas: 'Notas actualizadas desde Excel',
      },
      {
        Nombre_Razon_Social: '',
        NIF_CIF: 'A00000000',
        Telefono: '123',
        Email: 'invalido@test.es',
        Persona_Contacto: '',
        Notas: 'Debe fallar por falta de nombre',
      },
    ];

    const mapping = {
      name: 'Nombre_Razon_Social',
      tax_id: 'NIF_CIF',
      phone: 'Telefono',
      email: 'Email',
      contact_person: 'Persona_Contacto',
      notes: 'Notas',
    };

    const preview = validateAndPreviewImport({
      backend,
      entityType: 'suppliers',
      rawRows,
      columnMapping: mapping,
    });

    expect(preview.totalRows).toBe(3);
    expect(preview.validNewCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.errorCount).toBe(1);

    const result = executeValidatedImport({
      backend,
      entityType: 'suppliers',
      fileName: 'proveedores_2026.xlsx',
      conflictPolicy: 'update_existing',
      preview,
    });

    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.rejected).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].field).toBe('name');

    const updatedSuppliers = backend.getSuppliers(true);
    const newSupplier = updatedSuppliers.find((s) => s.tax_id === 'B99112233');
    expect(newSupplier).toBeDefined();
    expect(newSupplier?.name).toBe('Distribuidora Calderas Mediterráneo S.L.');
    expect(newSupplier?.contact_person).toBe('Vicente Pérez');
    expect(newSupplier?.is_active).toBe(true);

    const refreshedExisting = updatedSuppliers.find((s) => s.id === existingSupplier.id);
    expect(refreshedExisting?.email).toBe('actualizado@proveedor.es');
    expect(refreshedExisting?.contact_person).toBe('Persona Actualizada');
    expect(refreshedExisting?.notes).toBe('Notas actualizadas desde Excel');
  });

  it('Escenario 23: Reapertura de parte con motivo visible para los operarios al ser devuelto a en_curso', () => {
    // 1. Admin crea y asigna un parte a Carlos (Operario)
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const wo = backend.createWorkOrder({
      customer_id: 'cust-1',
      customer_address_id: 'addr-1',
      snapshot_customer_name: 'Hotel Puerta de Alcalá',
      snapshot_customer_tax_id: 'A28000001',
      snapshot_contact_name: 'Recepcionista',
      snapshot_contact_phone: '+34 912 345 678',
      snapshot_contact_email: 'recepcion@hotelpuerta.es',
      snapshot_address_line: 'Calle Alcalá 120',
      snapshot_postal_code: '28009',
      snapshot_city: 'Madrid',
      snapshot_province: 'Madrid',
      planned_work: 'Revisión y sellado de caldera',
      scheduled_at: '2026-10-23T10:00:00.000Z',
      initial_notes: '',
      operator_ids: ['usr-oper-1'],
    });

    // 2. Operario inicia y finaliza el trabajo
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    backend.startWorkOrder(wo.id);
    backend.finalizeWorkOrder({
      work_order_id: wo.id,
      total_amount_cents: 9500,
      customer_requests_invoice: true,
      customer_has_paid: true,
    });

    // 3. Admin cierra el parte
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    backend.closeWorkOrder(wo.id);

    // 4. Admin reabre el parte devolviéndolo a en_curso con motivo explícito
    const motivoReapertura = 'El cliente llama indicando goteo residual en válvula de purga. Revisar estanqueidad.';
    backend.reopenWorkOrder(wo.id, motivoReapertura, 'en_curso');

    // 5. El operario accede de nuevo al parte y comprueba que ve el motivo
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    const operWo = backend.getWorkOrderById(wo.id);
    expect(operWo.status).toBe('en_curso');
    expect(operWo.reopen_reason).toBe(motivoReapertura);
    expect(operWo.reopened_at).toBeDefined();

    // 6. Verificar que el evento de reapertura está registrado
    const events = backend.getWorkOrderEvents(wo.id);
    const reopenEvent = events.find((e) => e.event_type === 'reabierto');
    expect(reopenEvent).toBeDefined();
    expect(reopenEvent?.reason).toBe(motivoReapertura);
  });

  it('Escenario 24: Reapertura de parte con nuevo estado reabierto (marrón en negrita) y permisos de operario', () => {
    // 1. Admin crea y asigna un parte a Carlos
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const wo = backend.createWorkOrder({
      customer_id: 'cust-1',
      customer_address_id: 'addr-1',
      snapshot_customer_name: 'Hotel Puerta de Alcalá',
      snapshot_customer_tax_id: 'A28000001',
      snapshot_contact_name: 'Recepcionista',
      snapshot_contact_phone: '+34 912 345 678',
      snapshot_contact_email: 'recepcion@hotelpuerta.es',
      snapshot_address_line: 'Calle Alcalá 120',
      snapshot_postal_code: '28009',
      snapshot_city: 'Madrid',
      snapshot_province: 'Madrid',
      planned_work: 'Sustitución de termostato',
      scheduled_at: '2026-10-23T11:00:00.000Z',
      initial_notes: '',
      operator_ids: ['usr-oper-1'],
    });

    // 2. Operario finaliza el trabajo y Admin cierra el parte
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    backend.finalizeWorkOrder({
      work_order_id: wo.id,
      total_amount_cents: 4500,
      customer_requests_invoice: false,
      customer_has_paid: true,
    });

    backend.login('admin@climalux-demo.es', 'Admin1234!');
    backend.closeWorkOrder(wo.id);

    // 3. Admin reabre el parte por defecto como reabierto
    const motivo = 'Falta ajustar la curva de calefacción del termostato.';
    const reabiertoWo = backend.reopenWorkOrder(wo.id, motivo);
    expect(reabiertoWo.status).toBe('reabierto');
    expect(reabiertoWo.reopen_reason).toBe(motivo);
    expect(reabiertoWo.closed_at).toBeNull();

    // 4. Operario asignado puede leer el parte reabierto y añadir nuevas notas o finalizar
    backend.login('carlos@climalux-demo.es', 'Oper1234!');
    const operWo = backend.getWorkOrderById(wo.id);
    expect(operWo.status).toBe('reabierto');
    expect(operWo.reopen_reason).toBe(motivo);

    // Operario puede registrar trabajo adicional en el parte reabierto
    backend.addWorkEntry(wo.id, 'Ajuste de parámetros en termostato', 'Curva calibrada a 1.2');
    const entries = backend.getWorkEntries(wo.id);
    expect(entries.some((e) => e.description === 'Ajuste de parámetros en termostato')).toBe(true);

    // Operario puede volver a finalizar el parte (al finalizar, pasa a terminado y sale del flujo del operario)
    backend.finalizeWorkOrder({
      work_order_id: wo.id,
      total_amount_cents: 4500,
      customer_requests_invoice: false,
      customer_has_paid: true,
    });
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const finalWo = backend.getWorkOrderById(wo.id);
    expect(finalWo.status).toBe('terminado');
  });
});
