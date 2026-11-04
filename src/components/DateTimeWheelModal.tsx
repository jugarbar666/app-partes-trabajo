import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

export const MONTH_SHORT_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sept', 'oct', 'nov', 'dic'
];

export interface WheelColumnProps {
  value: number;
  min: number;
  max: number;
  formatter?: (val: number) => string;
  onChange: (val: number) => void;
  testId?: string;
}

export const WheelColumn: React.FC<WheelColumnProps> = ({
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

export interface DateTimeWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  value?: string | null;
  onConfirm: (targetString: string) => Promise<void> | void;
  onClear?: () => Promise<void> | void;
  showClear?: boolean;
  allowPast?: boolean;
  conflicts?: Array<{ operator_name: string; work_order_code?: string }>;
  extraInfo?: string;
  confirmLabel?: string;
  testId?: string;
}

export const DateTimeWheelModal: React.FC<DateTimeWheelModalProps> = ({
  isOpen,
  onClose,
  title = 'Establecer fecha y hora',
  subtitle,
  value,
  onConfirm,
  onClear,
  showClear = true,
  allowPast = false,
  conflicts = [],
  extraInfo,
  confirmLabel = 'Establecer',
  testId = 'modal-schedule-datetime',
}) => {
  // Parsear valor inicial a día, mes, año, hora, minuto
  const initialValues = useMemo(() => {
    if (value && value.trim().length > 0) {
      try {
        const d = new Date(value);
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
  }, [value]);

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
      setIsSubmitting(false);
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

  const handleSave = async () => {
    if (isSubmitting) return;

    const targetDate = new Date(year, month, day, hour, minute);
    if (isNaN(targetDate.getTime())) {
      setErrorMessage('La fecha u hora seleccionada no es válida.');
      return;
    }

    if (!allowPast && targetDate.getTime() < Date.now() - 2 * 60 * 1000) {
      setErrorMessage('No se puede programar un trabajo con fecha u hora anterior a la actual.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const pad = (n: number) => String(n).padStart(2, '0');
      const formattedTarget = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
      await onConfirm(formattedTarget);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al guardar la fecha y hora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      if (onClear) {
        await onClear();
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al borrar la fecha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Normalización de selectores de test
  const isScheduleModal = testId === 'modal-schedule-datetime';
  const modalContainerTestId = isScheduleModal
    ? 'modal-schedule-datetime'
    : (testId.includes('picker-popover') ? testId : `${testId}-picker-popover`);
  const baseTestPrefix = isScheduleModal ? '' : testId.replace(/-picker-popover$/, '');

  const acceptBtnTestId = isScheduleModal
    ? 'btn-submit-reschedule'
    : `${baseTestPrefix}-accept-btn`;
  const cancelBtnTestId = isScheduleModal
    ? 'btn-cancel-schedule-datetime'
    : `${baseTestPrefix}-cancel-btn`;
  const clearBtnTestId = isScheduleModal
    ? 'btn-clear-schedule-datetime'
    : `${baseTestPrefix}-clear-action-btn`;

  return (
    <div
      data-testid={modalContainerTestId}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Contenedor emergente idéntico a la referencia con colores corporativos azul y blanco */}
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border-2 border-blue-100 flex flex-col space-y-6 text-slate-800 my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <div className="text-xs font-semibold text-blue-700 mt-0.5">
                {subtitle}
              </div>
            )}
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

        {/* SECCIÓN 1: RUEDAS DE DÍA, MES Y AÑO */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 py-1">
          <WheelColumn
            value={day}
            min={1}
            max={maxDays}
            onChange={setDay}
            testId="wheel-column-day"
          />
          <WheelColumn
            value={month}
            min={0}
            max={11}
            formatter={(m) => MONTH_SHORT_NAMES[m]}
            onChange={setMonth}
            testId="wheel-column-month"
          />
          <WheelColumn
            value={year}
            min={2024}
            max={2035}
            onChange={setYear}
            testId="wheel-column-year"
          />
        </div>

        {/* SECCIÓN 2: RUEDAS DE HORA Y MINUTOS CON SEPARADOR ':' EN EL CENTRO */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 py-1">
          <WheelColumn
            value={hour}
            min={0}
            max={23}
            formatter={(h) => String(h).padStart(2, '0')}
            onChange={setHour}
            testId="wheel-column-hour"
          />
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 pb-1">:</div>
          <WheelColumn
            value={minute}
            min={0}
            max={59}
            formatter={(m) => String(m).padStart(2, '0')}
            onChange={setMinute}
            testId="wheel-column-minute"
          />
        </div>

        {/* Avisos de solapamiento horario si se proporcionan */}
        {conflicts.length > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Aviso de solapamiento horario (informativo):</span>
            </div>
            {conflicts.map((c, i) => (
              <p key={i} className="pl-5 text-amber-800">
                <strong>{c.operator_name}</strong>
                {c.work_order_code ? ` ya tiene asignado el parte ${c.work_order_code}.` : ' ya tiene trabajo a esa hora.'}
              </p>
            ))}
          </div>
        )}

        {/* Información adicional (por ejemplo técnicos que se conservan) */}
        {extraInfo && (
          <div className="text-[11px] text-center text-slate-500">
            {extraInfo}
          </div>
        )}

        {/* Inputs auxiliares invisibles para testing sintético */}
        <input
          type="date"
          data-testid={isScheduleModal ? 'datetime-date-input' : `${baseTestPrefix}-date-input`}
          value={`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
          onChange={(e) => {
            if (e.target.value) {
              const parts = e.target.value.split('-');
              if (parts.length === 3) {
                setYear(parseInt(parts[0], 10));
                setMonth(parseInt(parts[1], 10) - 1);
                setDay(parseInt(parts[2], 10));
              }
            }
          }}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <select
          data-testid={isScheduleModal ? 'datetime-hour-select' : `${baseTestPrefix}-hour-select`}
          value={String(hour).padStart(2, '0')}
          onChange={(e) => setHour(parseInt(e.target.value, 10))}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        >
          {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <select
          data-testid={isScheduleModal ? 'datetime-minute-select' : `${baseTestPrefix}-minute-select`}
          value={String(minute).padStart(2, '0')}
          onChange={(e) => setMinute(parseInt(e.target.value, 10))}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        >
          {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* BOTONES DE ACCIÓN: Establecer, Cancelar, Borrar */}
        <div className="flex flex-col items-end gap-3 pt-2">
          <button
            type="button"
            data-testid={acceptBtnTestId}
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
              <span>{confirmLabel}</span>
            )}
          </button>

          <button
            type="button"
            data-testid={cancelBtnTestId}
            disabled={isSubmitting}
            onClick={onClose}
            className="text-sm sm:text-base font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer pr-1"
          >
            Cancelar
          </button>

          {showClear && onClear && (
            <button
              type="button"
              data-testid={clearBtnTestId}
              disabled={isSubmitting}
              onClick={handleClear}
              className="text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 transition cursor-pointer pr-1"
            >
              Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
