import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, RefreshCw, X, Check, Users } from 'lucide-react';
import { InstallationBackendEngine } from '../services/backendEngine';
import { formatDateES, formatTimeES, isWorkOrderUnscheduled } from '../utils/formatters';

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

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const WEEKDAY_NAMES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

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

  // Parsear fecha y hora iniciales desde workOrder.scheduled_at
  const initialParts = useMemo(() => {
    if (workOrder.scheduled_at && workOrder.scheduled_at.trim().length > 0) {
      try {
        const d = new Date(workOrder.scheduled_at);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          return {
            date: `${year}-${month}-${day}`,
            hours,
            minutes,
          };
        }
      } catch {
        // Fallback abajo
      }
    }
    // Si no está programado, sugerir próxima hora en punto
    const nextHour = new Date(Date.now() + 3600 * 1000);
    const year = nextHour.getFullYear();
    const month = String(nextHour.getMonth() + 1).padStart(2, '0');
    const day = String(nextHour.getDate()).padStart(2, '0');
    const hours = String(nextHour.getHours()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      hours: hours === '00' ? '09' : hours,
      minutes: '00',
    };
  }, [workOrder.scheduled_at]);

  const [selectedDate, setSelectedDate] = useState(initialParts.date);
  const [selectedHour, setSelectedHour] = useState(initialParts.hours);
  const [selectedMinute, setSelectedMinute] = useState(initialParts.minutes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Navegación del mes en el calendario
  const [viewYear, setViewYear] = useState(() => {
    const parts = initialParts.date.split('-');
    return parseInt(parts[0], 10) || new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const parts = initialParts.date.split('-');
    return (parseInt(parts[1], 10) || 1) - 1;
  });

  // Sincronizar al abrir o cambiar de parte
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialParts.date);
      setSelectedHour(initialParts.hours);
      setSelectedMinute(initialParts.minutes);
      setErrorMessage(null);
      const parts = initialParts.date.split('-');
      setViewYear(parseInt(parts[0], 10) || new Date().getFullYear());
      setViewMonth((parseInt(parts[1], 10) || 1) - 1);
    }
  }, [isOpen, initialParts]);

  // Técnicos actualmente asignados al parte (para mostrar y validar solapamientos sin modificarlos)
  const assignedOperators = useMemo(() => {
    if (!workOrder.id) return [];
    try {
      const allProfiles = backend.getProfiles();
      const asgs = backend.getWorkOrderAssignments(workOrder.id);
      return asgs
        .filter((a) => a.is_active)
        .map((a) => {
          const user = allProfiles.find((u) => u.id === a.operator_id);
          return user ? user.full_name : a.operator_id;
        });
    } catch {
      return [];
    }
  }, [backend, workOrder.id]);

  // Calcular solapamientos de horario en tiempo real al seleccionar día y hora
  const conflicts = useMemo(() => {
    if (!isOpen || !workOrder.id || !selectedDate || !selectedHour) return [];
    try {
      const activeOpIds = backend
        .getWorkOrderAssignments(workOrder.id)
        .filter((a) => a.is_active)
        .map((a) => a.operator_id);
      if (activeOpIds.length === 0) return [];

      const isoTarget = new Date(`${selectedDate}T${selectedHour}:${selectedMinute || '00'}:00`).toISOString();
      return backend.findOperatorScheduleConflicts(isoTarget, activeOpIds, workOrder.id);
    } catch {
      return [];
    }
  }, [backend, isOpen, workOrder.id, selectedDate, selectedHour, selectedMinute]);

  // Cuadrícula de días del mes para el selector visual
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = (firstDay + 6) % 7; // Lunes = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

    // Días del mes previo
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrentMonth: false, dateStr: dStr });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrentMonth: true, dateStr: dStr });
    }

    // Días del mes siguiente
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrentMonth: false, dateStr: dStr });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSetToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    setSelectedDate(dateStr);
    setViewYear(y);
    setViewMonth(now.getMonth());
  };

  // Texto legible del día seleccionado: "Jueves, 29 de octubre de 2026"
  const formattedSelectedDateText = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map((v) => parseInt(v, 10));
      if (!y || !m || !d) return selectedDate;
      const dateObj = new Date(y, m - 1, d);
      const weekday = WEEKDAY_NAMES[dateObj.getDay()];
      const monthName = MONTH_NAMES[m - 1];
      return `${weekday}, ${d} de ${monthName} de ${y}`;
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Manejador del guardado
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedDate || !selectedHour || !selectedMinute) {
      setErrorMessage('Por favor, selecciona tanto el día como la hora.');
      return;
    }

    const targetDate = new Date(`${selectedDate}T${selectedHour}:${selectedMinute}:00`);
    if (isNaN(targetDate.getTime())) {
      setErrorMessage('La fecha u hora seleccionada no es válida.');
      return;
    }

    // Regla: no programar en fecha/hora pasada
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
        // En administración: actualizar scheduled_at e is_unscheduled sin alterar operator_ids
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

  if (!isOpen) return null;

  const quickHours = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
  const minuteSteps = ['00', '15', '30', '45'];

  return (
    <div
      data-testid="modal-schedule-datetime"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain mobile-scroll-container"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 text-xs flex flex-col my-auto transition"
      >
        {/* Cabecera unificada y elegante coherente con la ventana de selección de operarios */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                {isUnscheduled ? 'Programar Cita' : 'Reprogramar Cita'} — {workOrder.code}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Selecciona el día y la hora previstos para la ejecución del trabajo.
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-schedule-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del formulario con desplazamiento interno si la pantalla es reducida */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain mobile-scroll-container">
          {/* Información de contexto: Cita actual y confirmación de que los operarios permanecen intactos */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Cita actual:{' '}
                <strong className="text-slate-900">
                  {workOrder.scheduled_at && !isUnscheduled
                    ? `${formatDateES(workOrder.scheduled_at, timezone)} · ${formatTimeES(workOrder.scheduled_at, timezone)} h`
                    : 'Pendiente de programar'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-blue-900 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/70 w-fit">
              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Técnicos asignados:{' '}
                <strong>{assignedOperators.length > 0 ? assignedOperators.join(', ') : 'Sin asignar'}</strong>
                <span className="text-slate-500 font-normal"> (se conservan sin cambios)</span>
              </span>
            </div>
          </div>

          {/* Avisos de solapamiento horario en tiempo real */}
          {conflicts.length > 0 && (
            <div
              data-testid="alert-schedule-conflict"
              className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-amber-900 text-xs"
            >
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Aviso de solapamiento horario en la cita prevista:</span>
              </div>
              {conflicts.map((c, i) => (
                <p key={i} className="pl-5 text-amber-800 text-[11px]">
                  El operario <strong>{c.operator_name}</strong> ya tiene asignado el parte{' '}
                  <strong>{c.work_order_code}</strong> a esa misma hora ({formatDateES(c.scheduled_at, timezone)} {formatTimeES(c.scheduled_at, timezone)} h - {c.customer_name}).
                </p>
              ))}
              <p className="pl-5 text-[10px] text-amber-700 italic">
                Aviso informativo. Puedes guardar la cita para programar ambos partes al técnico.
              </p>
            </div>
          )}

          {/* Mensaje de error si falla la validación o el guardado */}
          {errorMessage && (
            <div
              data-testid="schedule-modal-error"
              className="p-3 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-semibold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. SELECCIÓN DE DÍA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>1. Seleccionar Día</span>
              </label>
              <button
                type="button"
                onClick={handleSetToday}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Hoy
              </button>
            </div>

            {/* Calendario mensual integrado con colores de Fontanería Roma */}
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
              {/* Cabecera del mes con flechas */}
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200/80">
                <span className="text-xs font-extrabold text-slate-900 capitalize tracking-wide">
                  {MONTH_NAMES[viewMonth]} de {viewYear}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white text-slate-700 font-bold text-base border border-slate-200 shadow-2xs cursor-pointer transition"
                    title="Mes anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white text-slate-700 font-bold text-base border border-slate-200 shadow-2xs cursor-pointer transition"
                    title="Mes siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 mb-1">
                <span>L</span>
                <span>M</span>
                <span>X</span>
                <span>J</span>
                <span>V</span>
                <span>S</span>
                <span>D</span>
              </div>

              {/* Cuadrícula de días */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {calendarCells.map((cell, idx) => {
                  const isSelected = cell.dateStr === selectedDate;
                  const isToday =
                    cell.dateStr ===
                    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                  return (
                    <button
                      key={idx}
                      type="button"
                      data-date={cell.dateStr}
                      onClick={() => {
                        setSelectedDate(cell.dateStr);
                        setErrorMessage(null);
                      }}
                      className={`h-7 sm:h-8 rounded-lg flex items-center justify-center text-xs transition cursor-pointer select-none ${
                        isSelected
                          ? 'bg-blue-600 text-white font-extrabold shadow-sm scale-105 z-10'
                          : isToday
                          ? 'bg-blue-100 text-blue-900 font-bold border border-blue-400 hover:bg-blue-200'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 hover:bg-white hover:border-slate-300 border border-transparent font-medium'
                          : 'text-slate-300 hover:bg-slate-100/50'
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Indicador del día seleccionado */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Día elegido:</span>
                <span className="font-extrabold text-blue-700">{formattedSelectedDateText}</span>
              </div>
            </div>
          </div>

          {/* 2. SELECCIÓN DE HORA */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>2. Seleccionar Hora</span>
            </label>

            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
              {/* Botones de acceso rápido para horas habituales de trabajo */}
              <div className="text-[11px] font-semibold text-slate-600">Franja horaria:</div>
              <div className="flex flex-wrap gap-1.5">
                {quickHours.map((h) => {
                  const isSelected = h === selectedHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setSelectedHour(h);
                        setErrorMessage(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white hover:bg-blue-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {h} h
                    </button>
                  );
                })}
              </div>

              {/* Selectores finos de Hora y Minuto */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Hora exacta</label>
                  <select
                    data-testid="select-schedule-hour"
                    value={selectedHour}
                    onChange={(e) => {
                      setSelectedHour(e.target.value);
                      setErrorMessage(null);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                      <option key={h} value={h}>
                        {h}:00
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Minutos</label>
                  <div className="flex gap-1">
                    {minuteSteps.map((m) => {
                      const isSelected = m === selectedMinute;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setSelectedMinute(m);
                            setErrorMessage(null);
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'
                          }`}
                        >
                          :{m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Indicador de la hora seleccionada */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Hora elegida:</span>
                <span className="font-extrabold text-blue-700">{selectedHour}:{selectedMinute} h</span>
              </div>
            </div>
          </div>

          {/* Resumen final visual de la cita seleccionada */}
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 flex items-center justify-between">
            <span className="text-[11px] font-medium text-blue-800">Cita que se guardará:</span>
            <span className="font-extrabold text-xs text-blue-900 flex items-center gap-1.5">
              <span>{formattedSelectedDateText}</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[11px]">
                {selectedHour}:{selectedMinute} h
              </span>
            </span>
          </div>
        </div>

        {/* Pie con los botones de acción: Guardar y Cancelar */}
        <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            data-testid="btn-cancel-schedule-datetime"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            data-testid="btn-submit-reschedule"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-sm flex items-center gap-2 transition cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{isUnscheduled ? 'Guardar Programación' : 'Guardar Reprogramación'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
