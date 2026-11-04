import { describe, it, expect, beforeEach } from 'vitest';
import { InstallationBackendEngine } from '../services/backendEngine';
import { mergeDatabaseStates } from '../services/supabaseSyncEngine';

describe('Persistencia y sincronización de materiales y aportaciones en partes de trabajo', () => {
  let backendA: InstallationBackendEngine;
  let backendB: InstallationBackendEngine;

  beforeEach(() => {
    backendA = new InstallationBackendEngine('test-device-a');
    backendB = new InstallationBackendEngine('test-device-b');
    backendA.login('jugarbar@gmail.com', 'anromago678*');
    backendB.login('jugarbar@gmail.com', 'anromago678*');
  });

  it('al eliminar un material imputado a un parte, la eliminación persiste y no reaparece al sincronizar con otro dispositivo', () => {
    // 1. Crear cliente, artículo y parte de trabajo
    const cust = backendA.getCustomers()[0];
    const art = backendA.saveArticle({
      name: 'Tubería de cobre 15mm',
      code: 'ART-TUB-01',
      description: 'Tubería de cobre para fontanería',
      supplier_id: null,
      unit: 'm',
      sale_price_cents: 1500,
      is_active: true,
    });
    const op = backendA.getProfiles().find((p) => p.role === 'operario')!;
    const wo = backendA.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Reparación de fontanería general',
      scheduled_at: '2026-11-20T10:00:00.000Z',
      is_unscheduled: false,
      operator_ids: [op.id],
    } as any);

    // 2. Añadir un material al parte
    const initialWoVersion = backendA.getWorkOrderById(wo.id).version;
    const material = backendA.addWorkMaterial({
      work_order_id: wo.id,
      article_id: art.id,
      article_name_snapshot: art.name,
      unit_snapshot: art.unit,
      quantity: 3,
      unit_price_cents: 1500,
      notes: 'Tubería de cobre 15mm',
    });

    // Validar que el material existe y la versión del parte se incrementó
    expect(backendA.getWorkMaterials(wo.id).length).toBe(1);
    expect(backendA.getWorkMaterials(wo.id)[0].id).toBe(material.id);
    expect(backendA.getWorkOrderById(wo.id).version).toBeGreaterThan(initialWoVersion);

    // 3. Sincronizar el estado con el Dispositivo B (ambos dispositivos tienen ahora el material)
    const stateAInitial = backendA.exportFullSnapshot();
    backendB.applyRemoteSyncState(stateAInitial);

    expect(backendB.getWorkMaterials(wo.id).length).toBe(1);
    expect(backendB.getWorkMaterials(wo.id)[0].id).toBe(material.id);

    // 4. En el Dispositivo A, el usuario elimina el material
    const versionBeforeDelete = backendA.getWorkOrderById(wo.id).version;
    backendA.deleteWorkMaterial(material.id);

    // En el Dispositivo A el material ya no existe inmediatamente
    expect(backendA.getWorkMaterials(wo.id).length).toBe(0);
    expect(backendA.getWorkOrderById(wo.id).version).toBeGreaterThan(versionBeforeDelete);

    // 5. Simular sincronización: Dispositivo B (que aún tenía el material en su base local) envía su snapshot
    const stateBBeforeSync = backendB.exportFullSnapshot();
    const stateAAfterDelete = backendA.exportFullSnapshot();

    // En Dispositivo A, se procesa el estado recibido de Dispositivo B mediante mergeDatabaseStates
    const mergedOnDeviceA = mergeDatabaseStates(stateAAfterDelete, stateBBeforeSync);

    // El material ELIMINADO en A NO DEBE REAPARECER (resurrección bloqueada por tombstone)
    expect(mergedOnDeviceA.work_materials.some((m) => m.id === material.id)).toBe(false);
    expect(mergedOnDeviceA.work_materials.filter((m) => m.work_order_id === wo.id).length).toBe(0);

    // 6. En Dispositivo B, se recibe el estado actualizado de Dispositivo A
    const mergedOnDeviceB = mergeDatabaseStates(stateBBeforeSync, stateAAfterDelete);

    // En Dispositivo B el material queda eliminado definitivamente
    expect(mergedOnDeviceB.work_materials.some((m) => m.id === material.id)).toBe(false);
    expect(mergedOnDeviceB.work_materials.filter((m) => m.work_order_id === wo.id).length).toBe(0);
  });

  it('al modificar la cantidad o notas de un material, el cambio prevalece sobre versiones desactualizadas', () => {
    const cust = backendA.getCustomers()[0];
    const art = backendA.saveArticle({
      name: 'Caldera de gas',
      code: 'ART-CAL-01',
      description: 'Caldera estanca',
      supplier_id: null,
      unit: 'ud',
      sale_price_cents: 2000,
      is_active: true,
    });
    const op = backendA.getProfiles().find((p) => p.role === 'operario')!;
    const wo = backendA.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Instalación de caldera',
      scheduled_at: '2026-11-20T12:00:00.000Z',
      is_unscheduled: false,
      operator_ids: [op.id],
    } as any);

    const material = backendA.addWorkMaterial({
      work_order_id: wo.id,
      article_id: art.id,
      article_name_snapshot: art.name,
      unit_snapshot: art.unit,
      quantity: 2,
      unit_price_cents: 2000,
      notes: 'Cantidad inicial estimada',
    });

    // Sincronizar con Dispositivo B
    backendB.applyRemoteSyncState(backendA.exportFullSnapshot());

    // Dispositivo A modifica la cantidad a 7 y actualiza notas
    const updated = backendA.updateWorkMaterial(material.id, {
      quantity: 7,
      notes: 'Cantidad real utilizada en obra',
    });
    expect(updated.quantity).toBe(7);
    expect(updated.version).toBeGreaterThan(1);

    // Fusión de estados
    const stateA = backendA.exportFullSnapshot();
    const stateB = backendB.exportFullSnapshot();

    const merged = mergeDatabaseStates(stateB, stateA);
    const mergedMat = merged.work_materials.find((m) => m.id === material.id);

    expect(mergedMat).toBeDefined();
    expect(mergedMat!.quantity).toBe(7);
    expect(mergedMat!.notes).toBe('Cantidad real utilizada en obra');
  });

  it('al eliminar una aportación o trabajo realizado (work_entry), la eliminación no se revierte en la sincronización', () => {
    const cust = backendA.getCustomers()[0];
    const op = backendA.getProfiles().find((p) => p.role === 'operario')!;
    const wo = backendA.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Reparación desagüe',
      scheduled_at: '2026-11-20T14:00:00.000Z',
      is_unscheduled: false,
      operator_ids: [op.id],
    } as any);

    const entry = backendA.addWorkEntry(wo.id, 'Sustitución de sifón', 'Presentaba atasco severo');
    expect(backendA.getWorkEntries(wo.id).length).toBe(1);

    // Sincronizar a B
    backendB.applyRemoteSyncState(backendA.exportFullSnapshot());
    expect(backendB.getWorkEntries(wo.id).length).toBe(1);

    // Borrar en A
    backendA.deleteWorkEntry(entry.id);
    expect(backendA.getWorkEntries(wo.id).length).toBe(0);

    // Sincronizar B con el estado de A
    const merged = mergeDatabaseStates(backendB.exportFullSnapshot(), backendA.exportFullSnapshot());
    expect(merged.work_entries.some((e) => e.id === entry.id)).toBe(false);
  });

  it('al eliminar una jornada (work_session), la eliminación no se revierte en la sincronización', () => {
    const cust = backendA.getCustomers()[0];
    const op = backendA.getProfiles().find((p) => p.role === 'operario')!;
    const wo = backendA.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Revisión técnica',
      scheduled_at: '2026-11-20T16:00:00.000Z',
      is_unscheduled: false,
      operator_ids: [op.id],
    } as any);

    const session = backendA.addWorkSession({
      work_order_id: wo.id,
      started_at: '2026-11-20T16:00:00.000Z',
      ended_at: '2026-11-20T17:30:00.000Z',
      notes: 'Jornada de tarde',
    });
    expect(backendA.getWorkSessions(wo.id).length).toBe(1);

    // Sincronizar a B
    backendB.applyRemoteSyncState(backendA.exportFullSnapshot());
    expect(backendB.getWorkSessions(wo.id).length).toBe(1);

    // Borrar en A
    backendA.deleteWorkSession(session.id);
    expect(backendA.getWorkSessions(wo.id).length).toBe(0);

    // Sincronizar
    const merged = mergeDatabaseStates(backendB.exportFullSnapshot(), backendA.exportFullSnapshot());
    expect(merged.work_sessions.some((s) => s.id === session.id)).toBe(false);
  });
});
