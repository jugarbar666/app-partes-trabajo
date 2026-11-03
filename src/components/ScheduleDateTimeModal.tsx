import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RefreshCw, X, AlertTriangle } from 'lucide-react';
import { InstallationBackendEngine } from '../services/backendEngine';
import { isWorkOrderUnscheduled, formatDateES, formatTimeES } from '../utils/formatters';

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

const MONTH_SHORT_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sept', 'oct', 'nov', 'dic'
];

interface WheelColumnProps {
  value: number;
  min: number;
  max: number;
  formatter?: (val: number) => string;
  onChange: (val: number) => void;
  testId?: string;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  value,
  min,
  max,
  formatter = (v) => String(v),
  onChange,
  testId,
}) => {
  const range = max - min + 1;

  const getWrapped = (val: number) => {
    let normalized = (val - min) % range;
    if (normalized < 0) normalized += range;
    return min + normalized;
  };

  const prevVal = getWrapped(value - 1);
  const nextVal = getWrapped(value + 1);

  const touchStartY = useRef<number | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      onChange(getWrapped(value - 1));
    } else if (e.deltaY > 0) {
      onChange(getWrapped(value + 1));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = touchStartY.current - e.touches[0].clientY;
    if (diff > 25) {
      onChange(getWrapped(value + 1));
      touchStartY.current = e.touches[0].clientY;
    } else if (diff < -25) {
      onChange(getWrapped(value - 1));
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  return (
    <div
      data-testid={testId}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col items-center justify-center select-none w-20 sm:w-24 py-1 touch-none"
    >
      {/* Valor anterior */}
      <button
        type="button"
        onClick={() => onChange(prevVal)}
        className="h-9 sm:h-11 flex items-center justify-center text-sm sm:text-base font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
        tabIndex={-1}
      >
        {formatter(prevVal)}
      </button>

      {/* Línea horizontal superior del valor seleccionado (Azul Roma) */}
      <div className="w-16 sm:w-20 border-t-2 border-blue-600 my-1" />

      {/* Valor seleccionado central */}
      <div className="h-11 sm:h-13 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-blue-700 tracking-wide">
        {formatter(value)}
      </div>

      {/* Línea horizontal inferior del valor seleccionado (Azul Roma) */}
      <div className="w-16 sm:w-20 border-b-2 border-blue-600 my-1" />

      {/* Valor siguiente */}
      <button
        type="button"
        onClick={() => onChange(nextVal)}
        className="h-9 sm:h-11 flex items-center justify-center text-sm sm:text-base font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
        tabIndex={-1}
      >
        {formatter(nextVal)}
      </button>
    </div>
  );
};

export const ScheduleDateTimeModal: React.FC<ScheduleDateTimeModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  backend,
  onSaved,
  notifySuccess,
  notifyError,
  timezone,
}) => {
  const isUnscheduled = isWorkOrderUnscheduled(workOrder);

  // Parsear fecha y hora iniciales
  const initialValues = useMemo(() => {
    if (workOrder.scheduled_at && workOrder.scheduled_at.trim().length > 0) {
      try {
        const d = new Date(workOrder.scheduled_at);
        if (!isNaN(d.getTime())) {
          return {
            day: d.getDate(),
            month: d.getMonth(),
            year: d.getFullYear(),
            hour: d.getHours(),
            minute: d.getMinutes(),
          };
        }
      } catch {
        // Fallback abajo
      }
    }
    const nextHour = new Date(Date.now() + 3600 * 1000);
    return {
      day: nextHour.getDate(),
      month: nextHour.getMonth(),
      year: nextHour.getFullYear(),
      hour: nextHour.getHours(),
      minute: 0,
    };
  }, [workOrder.scheduled_at]);

  const [day, setDay] = useState(initialValues.day);
  const [month, setMonth] = useState(initialValues.month);
  const [year, setYear] = useState(initialValues.year);
  const [hour, setHour] = useState(initialValues.hour);
  const [minute, setMinute] = useState(initialValues.minute);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar cuando se abra
  useEffect(() => {
    if (isOpen) {
      setDay(initialValues.day);
      setMonth(initialValues.month);
      setYear(initialValues.year);
      setHour(initialValues.hour);
      setMinute(initialValues.minute);
      setErrorMessage(null);
    }
  }, [isOpen, initialValues]);

  // Días máximos del mes seleccionado
  const maxDays = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // Ajustar día si supera el máximo del mes
  useEffect(() => {
    if (day > maxDays) {
      setDay(maxDays);
    }
  }, [maxDays, day]);

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
    if (!isOpen || !workOrder.id) return [];
    try {
      const activeOpIds = backend
        .getWorkOrderAssignments(workOrder.id)
        .filter((a) => a.is_active)
        .map((a) => a.operator_id);
      if (activeOpIds.length === 0) return [];

      const targetDate = new Date(year, month, day, hour, minute);
      return backend.findOperatorScheduleConflicts(targetDate.toISOString(), activeOpIds, workOrder.id);
    } catch {
      return [];
    }
  }, [backend, isOpen, workOrder.id, year, month, day, hour, minute]);

  const handleSave = async () => {
    if (isSubmitting) return;

    const targetDate = new Date(year, month, day, hour, minute);
    if (isNaN(targetDate.getTime())) {
      setErrorMessage('La fecha u hora seleccionada no es válida.');
      return;
    }

    if (targetDate.getTime() < Date.now() - 2 * 60 * 1000) {
      setErrorMessage('No se puede programar un trabajo con fecha u hora anterior a la actual.');
      return;
    }

    const isoTarget = targetDate.toISOString();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
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
      onSaved(isoTarget);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar la programación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      backend.updateWorkOrderPlanningAndAssignments(workOrder.id, {
        scheduled_at: undefined,
        is_unscheduled: true,
      });
      notifySuccess(`Parte ${workOrder.code} marcado como pendiente de programar.`);
      onSaved('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al borrar la fecha programada.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-schedule-datetime"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Contenedor emergente exactamente en el formato de la captura pero con colores azul y blanco de la app */}
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border-2 border-blue-100 flex flex-col space-y-6 text-slate-800 my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Título idéntico a la captura de referencia */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Establecer fecha y hora
            </h2>
            <div className="text-xs font-semibold text-blue-700 mt-0.5">
              Parte {workOrder.code}
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-schedule-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de error si falla la validación */}
        {errorMessage && (
          <div
            data-testid="schedule-modal-error"
            className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SECCIÓN 1: SELECTOR DE DÍA, MES Y AÑO EN RUEDA DE 3 COLUMNAS */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 py-1">
          {/* Columna Día */}
          <WheelColumn
            value={day}
            min={1}
            max={maxDays}
            onChange={setDay}
            testId="wheel-column-day"
          />

          {/* Columna Mes (sept, oct, nov...) */}
          <WheelColumn
            value={month}
            min={0}
            max={11}
            formatter={(m) => MONTH_SHORT_NAMES[m]}
            onChange={setMonth}
            testId="wheel-column-month"
          />

          {/* Columna Año */}
          <WheelColumn
            value={year}
            min={2024}
            max={2035}
            onChange={setYear}
            testId="wheel-column-year"
          />
        </div>

        {/* SECCIÓN 2: SELECTOR DE HORA Y MINUTOS CON SEPARADOR ':' EN EL CENTRO */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 py-1">
          {/* Columna Hora */}
          <WheelColumn
            value={hour}
            min={0}
            max={23}
            formatter={(h) => String(h).padStart(2, '0')}
            onChange={setHour}
            testId="wheel-column-hour"
          />

          {/* Separador de dos puntos ':' idéntico a la captura */}
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 pb-1">:</div>

          {/* Columna Minuto */}
          <WheelColumn
            value={minute}
            min={0}
            max={59}
            formatter={(m) => String(m).padStart(2, '0')}
            onChange={setMinute}
            testId="wheel-column-minute"
          />
        </div>

        {/* Aviso de solapamiento horario si existe */}
        {conflicts.length > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Aviso de solapamiento horario (informativo):</span>
            </div>
            {conflicts.map((c, i) => (
              <p key={i} className="pl-5 text-amber-800">
                <strong>{c.operator_name}</strong> ya tiene asignado el parte <strong>{c.work_order_code}</strong>.
              </p>
            ))}
          </div>
        )}

        {/* Recordatorio discreto de técnicos asignados */}
        {assignedOperators.length > 0 && (
          <div className="text-[11px] text-center text-slate-500">
            Técnicos asignados: <strong className="text-blue-800">{assignedOperators.join(', ')}</strong> (se conservan)
          </div>
        )}

        {/* BOTONES DE ACCIÓN EN EL ORDEN Y POSICIÓN DE LA CAPTURA: Establecer, Cancelar, Borrar */}
        <div className="flex flex-col items-end gap-3 pt-2">
          <button
            type="button"
            data-testid="btn-submit-reschedule"
            disabled={isSubmitting}
            onClick={handleSave}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-sm sm:text-base shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>Establecer</span>
            )}
          </button>

          <button
            type="button"
            data-testid="btn-cancel-schedule-datetime"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-sm sm:text-base font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer pr-1"
          >
            Cancelar
          </button>

          <button
            type="button"
            data-testid="btn-clear-schedule-datetime"
            disabled={isSubmitting}
            onClick={handleClear}
            className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 transition cursor-pointer pr-1"
          >
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
};
