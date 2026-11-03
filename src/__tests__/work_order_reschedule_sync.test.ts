import { describe, it, expect, beforeEach } from 'vitest';
import { InstallationBackendEngine } from '../services/backendEngine';
import { DatabaseState } from '../services/seedData';
import { mergeDatabaseStates } from '../services/supabaseSyncEngine';
import { isWorkOrderUnscheduled, formatWorkOrderScheduled } from '../utils/formatters';

describe('Blindaje contra oscilaciones y reversión de partes programados y sincronización', () => {
  let backend: InstallationBackendEngine;

  beforeEach(() => {
    backend = new InstallationBackendEngine('fontaneria-roma');
  });

  it('un parte provisional sin fecha ni operarios se programa correctamente sin forzar is_unscheduled = true', () => {
    backend.login('jugarbar@gmail.com', 'anromago678*');
    const cust = backend.getCustomers()[0];

    // 1. Crear parte provisional sin fecha ni operario
    const wo = backend.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Reparación de fuga en baño principal',
      scheduled_at: '',
      is_unscheduled: true,
      operator_ids: [],
    } as any);

    expect(wo.is_unscheduled).toBe(true);
    expect(wo.scheduled_at).toBe('');
    expect(isWorkOrderUnscheduled(wo)).toBe(true);
    expect(formatWorkOrderScheduled(wo)).toBe('Pendiente de programar');

    // 2. Administrador programa fecha y hora mediante updateWorkOrderPlanningAndAssignments
    const scheduledDateIso = '2026-11-20T10:30:00.000Z';
    const programmed = backend.updateWorkOrderPlanningAndAssignments(wo.id, {
      scheduled_at: scheduledDateIso,
      is_unscheduled: false,
    });

    // Debe quedar programado con is_unscheduled: false
    expect(programmed.scheduled_at).toBe(scheduledDateIso);
    expect(programmed.is_unscheduled).toBe(false);
    expect(isWorkOrderUnscheduled(programmed)).toBe(false);

    // 3. Administrador le asigna un operario
    const op = backend.getProfiles().find((p) => p.role === 'operario')!;
    const assigned = backend.updateWorkOrderPlanningAndAssignments(wo.id, {
      operator_ids: [op.id],
    });

    expect(assigned.is_unscheduled).toBe(false);
    expect(assigned.scheduled_at).toBe(scheduledDateIso);
    expect(isWorkOrderUnscheduled(assigned)).toBe(false);

    const asgs = backend.getWorkOrderAssignments(wo.id);
    expect(asgs.length).toBe(1);
    expect(asgs[0].operator_id).toBe(op.id);
  });

  it('mergeDatabaseStates no revierte un parte programado en local frente a un estado remoto desactualizado', () => {
    backend.login('jugarbar@gmail.com', 'anromago678*');
    const cust = backend.getCustomers()[0];
    const op = backend.getProfiles().find((p) => p.role === 'operario')!;

    // 1. Crear parte provisional
    const wo = backend.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Avería termo eléctrico',
      scheduled_at: '',
      is_unscheduled: true,
      operator_ids: [],
    } as any);

    // 2. Simular estado remoto en Supabase (cuando aún estaba sin programar, versión 1, fecha antigua)
    const remoteStaleSnapshot: DatabaseState = JSON.parse(JSON.stringify(backend.exportFullSnapshot()));
    const staleWo = remoteStaleSnapshot.work_orders.find((w: any) => w.id === wo.id)!;
    staleWo.updated_at = '2026-11-01T20:00:00.000Z';
    staleWo.version = 1;
    staleWo.is_unscheduled = true;
    staleWo.scheduled_at = '';
    remoteStaleSnapshot.work_order_assignments = remoteStaleSnapshot.work_order_assignments.filter(
      (a: any) => a.work_order_id !== wo.id
    );

    // 3. En local, el administrador programa el parte para el 25/11 y asigna operario (versión 3, fecha reciente)
    backend.updateWorkOrderPlanningAndAssignments(wo.id, {
      scheduled_at: '2026-11-25T09:00:00.000Z',
      is_unscheduled: false,
      operator_ids: [op.id],
    });

    const localFreshSnapshot = backend.exportFullSnapshot();
    const localWo = localFreshSnapshot.work_orders.find((w: any) => w.id === wo.id)!;
    expect(localWo.is_unscheduled).toBe(false);
    expect(localWo.version).toBeGreaterThan(staleWo.version);

    // 4. Se ejecuta mergeDatabaseStates (simulando llegada de sync remoto de Supabase o websocket)
    const merged = mergeDatabaseStates(localFreshSnapshot, remoteStaleSnapshot);

    const mergedWo = merged.work_orders.find((w: any) => w.id === wo.id)!;
    expect(mergedWo.is_unscheduled).toBe(false);
    expect(mergedWo.scheduled_at).toBe('2026-11-25T09:00:00.000Z');
    expect(isWorkOrderUnscheduled(mergedWo)).toBe(false);

    // Las asignaciones locales deben permanecer intactas
    const mergedAsgs = (merged.work_order_assignments || []).filter((a: any) => a.work_order_id === wo.id);
    expect(mergedAsgs.length).toBe(1);
    expect(mergedAsgs[0].operator_id).toBe(op.id);
  });

  it('mergeDatabaseStates protege la versión local si las marcas temporales son iguales (empate)', () => {
    backend.login('jugarbar@gmail.com', 'anromago678*');
    const cust = backend.getCustomers()[0];
    const op = backend.getProfiles().find((p) => p.role === 'operario')!;

    const wo = backend.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Revisión periódica de caldera',
      scheduled_at: '2026-11-28T11:00:00.000Z',
      is_unscheduled: false,
      operator_ids: [op.id],
    } as any);

    const localSnapshot = backend.exportFullSnapshot();
    const remoteSameTimeSnapshot: DatabaseState = JSON.parse(JSON.stringify(localSnapshot));

    // Remoto tiene misma hora pero intenta forzar is_unscheduled: true con misma versión
    const remoteWo = remoteSameTimeSnapshot.work_orders.find((w: any) => w.id === wo.id)!;
    remoteWo.is_unscheduled = true;
    remoteWo.scheduled_at = '';

    const merged = mergeDatabaseStates(localSnapshot, remoteSameTimeSnapshot);
    const mergedWo = merged.work_orders.find((w: any) => w.id === wo.id)!;

    // En caso de empate temporal y versión, local gana y preserva la programación
    expect(mergedWo.is_unscheduled).toBe(false);
    expect(mergedWo.scheduled_at).toBe('2026-11-28T11:00:00.000Z');
  });
});
