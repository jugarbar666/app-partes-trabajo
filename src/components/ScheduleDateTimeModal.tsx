import React, { useMemo } from 'react';
import { InstallationBackendEngine } from '../services/backendEngine';
import { isWorkOrderUnscheduled } from '../utils/formatters';
import { supabaseSyncEngine } from '../services/supabaseSyncEngine';
import { DateTimeWheelModal, WheelColumn, MONTH_SHORT_NAMES } from './DateTimeWheelModal';

export { WheelColumn, MONTH_SHORT_NAMES };

export interface ScheduleDateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: {
    id: string;
    code: string;
    scheduled_at?: string | null;
    is_unscheduled?: boolean;
    customer_name?: string;
  };
  backend: InstallationBackendEngine;
  onSaved: (newScheduledAt: string) => void;
  notifySuccess: (msg: string) => void;
  notifyError: (msg: string) => void;
  timezone?: string;
}

export const ScheduleDateTimeModal: React.FC<ScheduleDateTimeModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  backend,
  onSaved,
  notifySuccess,
  notifyError,
}) => {
  const isUnscheduled = isWorkOrderUnscheduled(workOrder);

  // Técnicos asignados actualmente (para verificar solapamiento sin alterarlos)
  const assignedOperators = useMemo(() => {
    if (!workOrder.id) return [];
    try {
      const allProfiles = backend.getProfiles();
      const asgs = backend.getWorkOrderAssignments(workOrder.id);
      return asgs
        .filter((a) => a.is_active)
        .map((a) => {
          const u = allProfiles.find((p) => p.id === a.operator_id);
          return u ? u.full_name : a.operator_id;
        });
    } catch {
      return [];
    }
  }, [backend, workOrder.id]);

  // Conflictos de solapamiento
  const conflicts = useMemo(() => {
    if (!isOpen || !workOrder.id || !workOrder.scheduled_at) return [];
    try {
      const activeOpIds = backend
        .getWorkOrderAssignments(workOrder.id)
        .filter((a) => a.is_active)
        .map((a) => a.operator_id);
      if (activeOpIds.length === 0) return [];

      return backend.findOperatorScheduleConflicts(workOrder.scheduled_at, activeOpIds, workOrder.id);
    } catch {
      return [];
    }
  }, [backend, isOpen, workOrder.id, workOrder.scheduled_at]);

  const handleConfirm = async (isoTarget: string) => {
    const currentUser = backend.getCurrentUser();
    if (currentUser.role === 'admin') {
      // En administración: actualizar scheduled_at e is_unscheduled sin modificar operator_ids
      backend.updateWorkOrderPlanningAndAssignments(workOrder.id, {
        scheduled_at: isoTarget,
        is_unscheduled: false,
      });
    } else {
      // En perfil operario: reprogramar cita del parte asignado
      backend.rescheduleWorkOrder({
        work_order_id: workOrder.id,
        scheduled_at: isoTarget,
      });
    }

    notifySuccess(
      isUnscheduled
        ? `Parte ${workOrder.code} programado con éxito.`
        : `Parte ${workOrder.code} reprogramado con éxito.`
    );
    supabaseSyncEngine.pushStateToSupabase().catch((e) => {
      console.warn('[ScheduleDateTimeModal] Error sincronizando con Supabase:', e);
    });
    onSaved(isoTarget);
  };

  const handleClear = async () => {
    backend.updateWorkOrderPlanningAndAssignments(workOrder.id, {
      scheduled_at: undefined,
      is_unscheduled: true,
    });
    notifySuccess(`Parte ${workOrder.code} marcado como pendiente de programar.`);
    supabaseSyncEngine.pushStateToSupabase().catch((e) => {
      console.warn('[ScheduleDateTimeModal] Error sincronizando con Supabase:', e);
    });
    onSaved('');
  };

  return (
    <DateTimeWheelModal
      isOpen={isOpen}
      onClose={onClose}
      title="Establecer fecha y hora"
      subtitle={`Parte ${workOrder.code}`}
      value={workOrder.scheduled_at}
      onConfirm={handleConfirm}
      onClear={handleClear}
      showClear={true}
      conflicts={conflicts}
      extraInfo={
        assignedOperators.length > 0
          ? `Técnicos asignados: ${assignedOperators.join(', ')} (se conservan)`
          : undefined
      }
      confirmLabel="Establecer"
      testId="modal-schedule-datetime"
    />
  );
};
