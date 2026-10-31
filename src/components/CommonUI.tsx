import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Phone,
  MessageCircle,
  Mail,
  Columns,
  ArrowLeft,
  X,
  ChevronDown,
  Calendar,
  Check,
} from 'lucide-react';
import {
  normalizePhoneLinks,
  normalizeEmailLink,
  formatPhoneWithPrefix34,
  cleanLocalPhone,
  parsePhoneAndPrefix,
  COUNTRY_PHONE_PREFIXES,
  translateErrorMessageToSpanish,
} from '../utils/formatters';
import { WorkOrderStatus } from '../types/domain';

// =============================================================================
// 1. CONTEXTO Y COMPONENTES DE CONFIRMACIONES OBLIGATORIAS DEL PDF (REGLA 5)
// - Antes de guardar/modificar: ventana con resumen de cambios (confirmar/cancelar)
// - Después de persistencia correcta: confirmación con FONDO VERDE
// - Antes de borrar: confirmación con FONDO ROJO identificando registro y consecuencia
// =============================================================================

export interface SaveSummaryItem {
  label: string;
  value: string;
}

interface SaveConfirmModalState {
  title: string;
  changes: SaveSummaryItem[];
  warnings?: string[];
  onConfirm: () => Promise<void> | void;
}

interface DeleteConfirmModalState {
  recordName: string;
  consequence: string;
  requireReason?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
}

interface FeedbackBannerState {
  type: 'success_green' | 'error_red' | 'info';
  message: string;
}

interface UIConfirmationContextValue {
  requestSaveConfirmation: (params: SaveConfirmModalState) => void;
  requestDeleteConfirmation: (params: DeleteConfirmModalState) => void;
  notifySuccessGreen: (message: string) => void;
  notifyError: (message: string) => void;
}

const UIConfirmationContext = createContext<UIConfirmationContextValue | null>(null);

export function useUIConfirmation(): UIConfirmationContextValue {
  const ctx = useContext(UIConfirmationContext);
  if (!ctx) throw new Error('useUIConfirmation debe usarse dentro de UIConfirmationProvider');
  return ctx;
}

export const UIConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [saveModal, setSaveModal] = useState<SaveConfirmModalState | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteConfirmModalState | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [banner, setBanner] = useState<FeedbackBannerState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const notifySuccessGreen = useCallback((message: string) => {
    setBanner({ type: 'success_green', message });
  }, []);

  const notifyError = useCallback((message: string) => {
    setBanner({ type: 'error_red', message: translateErrorMessageToSpanish(message) });
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  const requestSaveConfirmation = useCallback((params: SaveConfirmModalState) => {
    setSaveModal(params);
  }, []);

  const requestDeleteConfirmation = useCallback((params: DeleteConfirmModalState) => {
    setDeleteReason('');
    setDeleteModal(params);
  }, []);

  const handleExecuteSave = async () => {
    if (!saveModal) return;
    setIsProcessing(true);
    try {
      await saveModal.onConfirm();
      setSaveModal(null);
      // Confirmación con fondo verde SOLO tras persistencia correcta en servidor
      notifySuccessGreen('Datos guardados correctamente en el servidor.');
    } catch (err: any) {
      // No muestra éxito si falla; preserva datos del formulario tras un error
      setSaveModal(null);
      notifyError(err?.message || 'Error al guardar en el servidor. Los datos del formulario se han conservado.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.requireReason && !deleteReason.trim()) {
      notifyError('Por favor, indica el motivo antes de confirmar la eliminación.');
      return;
    }
    setIsProcessing(true);
    try {
      await deleteModal.onConfirm(deleteReason.trim());
      setDeleteModal(null);
      notifySuccessGreen(`Registro «${deleteModal.recordName}» eliminado correctamente.`);
    } catch (err: any) {
      setDeleteModal(null);
      notifyError(err?.message || 'No se pudo completar la operación.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <UIConfirmationContext.Provider
      value={{
        requestSaveConfirmation,
        requestDeleteConfirmation,
        notifySuccessGreen,
        notifyError,
      }}
    >
      {children}

      {/* Notificación flotante post-persistencia (Fondo verde en éxito, rojo en fallo) */}
      {banner && (
        <div
          role="status"
          aria-live="polite"
          data-testid={banner.type === 'success_green' ? 'toast-success-green' : 'toast-error-red'}
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-white max-w-md ${
            banner.type === 'success_green'
              ? 'bg-emerald-600 border-emerald-500'
              : 'bg-red-600 border-red-500'
          }`}
        >
          {banner.type === 'success_green' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{banner.message}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="ml-auto p-1 hover:bg-black/20 rounded"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Ventana modal con resumen de cambios antes de guardar o modificar */}
      {saveModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain mobile-scroll-container"
          data-testid="modal-save-summary"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center gap-2.5 shrink-0">
              <FileCheck2 className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-base">
                Confirmar cambios antes de guardar: {saveModal.title}
              </h3>
            </div>
            <div className="p-5 space-y-3 flex-1 overflow-y-auto overscroll-contain mobile-scroll-container">
              {saveModal.warnings && saveModal.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-amber-900 text-xs" data-testid="modal-save-warnings">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Aviso informativo (se permite el guardado):</span>
                  </div>
                  {saveModal.warnings.map((w, i) => (
                    <p key={i} className="pl-5 font-semibold text-amber-800">
                      {w}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-600">
                Revisa el resumen de datos que se van a guardar en el servidor:
              </p>
              <dl className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                {saveModal.changes.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex justify-between gap-4">
                    <dt className="font-medium text-slate-600">{item.label}:</dt>
                    <dd className="text-slate-900 font-semibold text-right break-all">
                      {item.value || '—'}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setSaveModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                data-testid="btn-confirm-save-summary"
                onClick={handleExecuteSave}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs"
              >
                {isProcessing ? 'Guardando...' : 'Confirmar y Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Confirmación con FONDO ROJO antes de borrar, identificando registro y consecuencia */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain mobile-scroll-container"
          data-testid="modal-delete-red"
        >
          <div className="bg-red-700 text-white rounded-2xl shadow-2xl border-2 border-red-400 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-5 space-y-3 flex-1 overflow-y-auto overscroll-contain mobile-scroll-container">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-red-900/60">
                  <AlertTriangle className="w-6 h-6 text-red-200" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Confirmación de Eliminación</h3>
                  <p className="text-xs text-red-100">Acción protegida con fondo rojo para administradores</p>
                </div>
              </div>

              <div className="bg-red-950/60 border border-red-300/60 rounded-xl p-3.5 space-y-1.5 text-xs text-red-100">
                <div className="font-bold text-sm text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Aviso Importante: Influencia en Acciones y Listados</span>
                </div>
                <p>
                  Eliminar este elemento <strong>puede influir en alguna acción o listado del sistema</strong> (partes de trabajo, albaranes, mantenimientos o compras).
                </p>
                <p>
                  Si este elemento aparece en algún parte de trabajo u otro registro, en el campo en el que se haya borrado figurará como <strong>«[Elemento] borrado»</strong> (p. ej. «Cliente borrado», «Artículo borrado»).
                </p>
              </div>

              <div className="bg-red-900/50 border border-red-400/40 rounded-xl p-3.5 space-y-1.5 text-sm">
                <p>
                  <span className="font-semibold text-red-200">Registro a eliminar:</span>{' '}
                  <strong className="underline">{deleteModal.recordName}</strong>
                </p>
                <p>
                  <span className="font-semibold text-red-200">Consecuencia:</span>{' '}
                  {deleteModal.consequence}
                </p>
              </div>

              {deleteModal.requireReason && (
                <div>
                  <label className="block text-xs font-semibold text-red-100 mb-1">
                    Motivo obligatorio para el registro de auditoría *
                  </label>
                  <input
                    type="text"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Indica el motivo de la eliminación..."
                    className="w-full px-3 py-2 rounded-lg bg-white text-slate-900 text-sm focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="bg-red-900/70 px-6 py-3.5 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                data-testid="btn-confirm-delete-red"
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-lg bg-white text-red-800 hover:bg-red-50 text-sm font-bold shadow-sm"
              >
                {isProcessing ? 'Procesando...' : 'Confirmar Borrado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UIConfirmationContext.Provider>
  );
};

// =============================================================================
// 2. ETIQUETAS DE ESTADO DE PARTE CON LOS COLORES E ICONOS OBLIGATORIOS (REGLA 8)
// - Trabajo no iniciado: Azul
// - Trabajo en curso: Naranja
// - Trabajo terminado: Verde
// - Cerrado: Rojo / Gris oscuro
// - Archivado: Negro
// =============================================================================
export const WorkOrderStatusBadge: React.FC<{
  status: WorkOrderStatus;
  archivedAt?: string | null;
  deletedAt?: string | null;
  compact?: boolean;
  reopenedAt?: string | null;
  reopenReason?: string | null;
  closedAt?: string | null;
}> = ({ status, archivedAt, compact, reopenedAt, reopenReason, closedAt }) => {
  if (archivedAt) {
    return (
      <span
        className={`inline-flex items-center justify-center text-center whitespace-nowrap rounded-full font-bold bg-slate-950 text-white border border-slate-800 ${
          compact ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-3 py-1 text-xs gap-1.5'
        }`}
      >
        ■ {compact ? 'Archivado' : 'Archivado (Cerrado)'}
      </span>
    );
  }

  // Regla usuario: cuando se haya abierto de nuevo que no ponga cerrado que ponga reabierto
  // y el color que sea marrón y con las letras en negrita
  const isReopened =
    status === 'reabierto' ||
    Boolean(reopenedAt && (!closedAt || reopenedAt > closedAt));

  if (isReopened) {
    return (
      <span
        title={reopenReason ? `Motivo de reapertura: ${reopenReason}` : 'Parte reabierto'}
        className={`inline-flex items-center justify-center text-center whitespace-nowrap rounded-full font-bold bg-[#78350f] text-white shadow-2xs ${
          compact ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-3 py-1 text-xs gap-1.5'
        }`}
      >
        🔄 {compact ? 'Reabierto' : 'Parte reabierto'}
      </span>
    );
  }

  switch (status) {
    case 'no_iniciado':
      return (
        <span
          className={`inline-flex items-center justify-center text-center whitespace-nowrap rounded-full font-bold bg-blue-600 text-white shadow-2xs ${
            compact ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-3 py-1 text-xs gap-1.5'
          }`}
        >
          ○ {compact ? 'No iniciado' : 'Trabajo no iniciado'}
        </span>
      );
    case 'en_curso':
      return (
        <span
          className={`inline-flex items-center justify-center text-center whitespace-nowrap rounded-full font-bold bg-amber-500 text-slate-950 shadow-2xs ${
            compact ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-3 py-1 text-xs gap-1.5'
          }`}
        >
          ◐ {compact ? 'En curso' : 'Trabajo en curso'}
        </span>
      );
    case 'terminado':
      return (
        <span
          className={`inline-flex items-center justify-center text-center whitespace-nowrap rounded-full font-bold bg-emerald-600 text-white shadow-2xs ${
            compact ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-3 py-1 text-xs gap-1.5'
          }`}
        >
          ✓ {compact ? 'Terminado' : 'Trabajo terminado'}
        </span>
      );
    case 'cerrado':
      return (
        <span
          className={`inline-flex items-center justify-center text-center whitespace-nowrap rounded-full font-bold bg-red-700 text-white shadow-2xs ${
            compact ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-3 py-1 text-xs gap-1.5'
          }`}
        >
          🔒 {compact ? 'Cerrado' : 'Parte cerrado'}
        </span>
      );
  }
};

// =============================================================================
// 3. ENLACES INTERACTIVOS DE TELÉFONO (LLAMAR + WHATSAPP) Y EMAIL (REGLA 5)
// =============================================================================
export const PhoneActionLinks: React.FC<{ phone: string | null | undefined }> = ({ phone }) => {
  const info = normalizePhoneLinks(phone);
  if (!info.display) return <span className="text-slate-400">—</span>;
  if (!info.valid) return <span>{info.display}</span>;

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="font-medium text-slate-800">{info.display}</span>
      <a
        href={info.telHref}
        title={`Llamar a ${info.display}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold"
      >
        <Phone className="w-3 h-3" /> Llamar
      </a>
      <a
        href={info.whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        title={`Abrir WhatsApp con ${info.display}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold"
      >
        <MessageCircle className="w-3 h-3" /> WhatsApp
      </a>
    </span>
  );
};

/**
 * Campo de entrada de teléfono con selector de prefijo internacional (+34 predeterminado).
 * Permite seleccionar prefijos de otros países desde un desplegable o introducir directamente el número.
 */
export const PhoneInputField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  'data-testid'?: string;
}> = ({
  value,
  onChange,
  placeholder = '600 11 22 33',
  required = false,
  className = '',
  id,
  name,
  'data-testid': testId,
}) => {
  const parsed = parsePhoneAndPrefix(value, '+34');
  const [currentPrefix, setCurrentPrefix] = useState<string>(parsed.prefix || '+34');

  // Si el valor externo cambia y contiene un prefijo internacional diferente, sincronizar el selector
  useEffect(() => {
    if (parsed.prefix && parsed.prefix !== currentPrefix) {
      setCurrentPrefix(parsed.prefix);
    }
  }, [parsed.prefix]);

  const selectedCountry = COUNTRY_PHONE_PREFIXES.find((cp) => cp.code === currentPrefix);
  const displayFlag = selectedCountry?.flag || '🌐';

  return (
    <div className="flex rounded-lg shadow-2xs w-full focus-within:ring-2 focus-within:ring-blue-500">
      {/* Selector de prefijo con insignia cerrada mostrando SOLO bandera y prefijo (sin nombre de país) */}
      <div className="relative inline-flex items-center shrink-0 group">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 group-hover:bg-slate-200 text-slate-800 font-extrabold text-xs select-none transition h-full">
          <span>{displayFlag}</span>
          <span>{currentPrefix}</span>
          <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-0.5" />
        </div>

        {/* Select nativo superpuesto transparente: al hacer clic se abre el menú nativo mostrando los países */}
        <select
          aria-label="Prefijo internacional"
          value={currentPrefix}
          onChange={(e) => {
            const newPrefix = e.target.value;
            setCurrentPrefix(newPrefix);
            if (parsed.localNumber.trim()) {
              onChange(`${newPrefix} ${parsed.localNumber.trim()}`);
            }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        >
          {!COUNTRY_PHONE_PREFIXES.some((cp) => cp.code === currentPrefix) && (
            <option value={currentPrefix}>🌐 {currentPrefix}</option>
          )}
          {COUNTRY_PHONE_PREFIXES.map((cp) => (
            <option key={cp.code} value={cp.code}>
              {cp.flag} {cp.code} · {cp.country}
            </option>
          ))}
        </select>
      </div>

      <input
        id={id}
        name={name}
        type="tel"
        required={required}
        data-testid={testId}
        value={parsed.localNumber}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw.trim()) {
            onChange('');
            return;
          }
          if (raw.trim().startsWith('+')) {
            const pasted = parsePhoneAndPrefix(raw.trim(), currentPrefix);
            setCurrentPrefix(pasted.prefix);
            onChange(pasted.localNumber ? `${pasted.prefix} ${pasted.localNumber}` : '');
            return;
          }
          const cleaned = raw.replace(/[^\d\s\-\.]/g, '');
          onChange(cleaned ? `${currentPrefix} ${cleaned}` : '');
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-1.5 rounded-r-lg border border-slate-300 text-sm bg-white focus:outline-none ${className}`}
      />
    </div>
  );
};

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

/**
 * Desplegable interactivo con filtro en tiempo real.
 * Al empezar a escribir en el campo, filtra las opciones por cualquier parte del texto
 * ignorando mayúsculas, minúsculas y tildes.
 */
export const SearchableSelect: React.FC<{
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyOptionLabel?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  'data-testid'?: string;
}> = ({
  options,
  value,
  onChange,
  placeholder = 'Escribe para buscar...',
  emptyOptionLabel,
  disabled = false,
  required = false,
  className = '',
  id,
  name,
  'data-testid': testId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Normalizador para búsqueda insensible a acentos y mayúsculas
  const normalize = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  // Filtrado de opciones en tiempo real por cualquier parte del texto
  const filteredOptions = options.filter((o) => {
    if (!searchTerm.trim()) return true;
    const term = normalize(searchTerm);
    return normalize(o.label).includes(term) || (o.sublabel && normalize(o.sublabel).includes(term));
  });

  // Cierre al hacer clic fuera del componente
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Select nativo oculto accesible para tests automatizados y formularios */}
      <select
        id={id}
        name={name}
        data-testid={testId}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="">{emptyOptionLabel || placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Campo interactivo */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            if (inputRef.current) inputRef.current.focus();
          }
        }}
        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border bg-white text-sm transition cursor-pointer ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
            : 'border-slate-300 hover:border-slate-400 shadow-2xs'
        }`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={isOpen ? searchTerm : selectedOption ? selectedOption.label : ''}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsOpen(false);
                setSearchTerm('');
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredOptions.length > 0) {
                  handleSelectOption(filteredOptions[0].value);
                }
              }
            }}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm truncate"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-slate-100 hover:text-slate-600 transition"
              title="Borrar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
          />
        </div>
      </div>

      {/* Lista desplegable filtrada en tiempo real */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl py-1 text-sm divide-y divide-slate-50">
          {emptyOptionLabel && (
            <div
              onClick={() => handleSelectOption('')}
              className={`px-3 py-2 cursor-pointer transition text-xs font-semibold ${
                !value
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {emptyOptionLabel}
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-slate-500 italic">
              No se encontraron coincidencias para "{searchTerm}"
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelectOption(opt.value)}
                  className={`px-3 py-2.5 cursor-pointer transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'hover:bg-blue-50/70 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div
                        className={`text-[11px] truncate ${
                          isSelected ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {opt.sublabel}
                      </div>
                    )}
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export const EmailActionLink: React.FC<{ email: string | null | undefined }> = ({ email }) => {
  const info = normalizeEmailLink(email);
  if (!info.display) return <span className="text-slate-400">—</span>;
  if (!info.valid) return <span>{info.display}</span>;

  return (
    <a
      href={info.mailtoHref}
      title={`Escribir correo a ${info.display}`}
      className="inline-flex items-center gap-1.5 text-blue-700 hover:underline font-medium text-sm"
    >
      <Mail className="w-3.5 h-3.5 shrink-0" />
      <span>{info.display}</span>
    </a>
  );
};

// =============================================================================
// 4. BARRA DE CABECERA DE PANTALLA CON BOTÓN «VOLVER», BÚSQUEDA Y SELECTOR DE COLUMNAS
// =============================================================================
export const ScreenHeaderBar: React.FC<{
  title: string;
  subtitle?: string;
  onBack: () => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  availableColumns?: Array<{ key: string; label: string }>;
  visibleColumns?: string[];
  onToggleColumn?: (key: string) => void;
  actions?: React.ReactNode;
}> = ({
  title,
  subtitle,
  onBack,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Buscar en este apartado...',
  availableColumns,
  visibleColumns,
  onToggleColumn,
  actions,
}) => {
  const [colMenuOpen, setColMenuOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableColumns && visibleColumns && onToggleColumn && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setColMenuOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
              >
                <Columns className="w-4 h-4" /> Campos visibles ({visibleColumns.length})
              </button>
              {colMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-30 space-y-1">
                  <div className="text-xs font-semibold text-slate-500 px-2 py-1">
                    Preferencias de columnas
                  </div>
                  {availableColumns.map((col) => {
                    const checked = visibleColumns.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleColumn(col.key)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {actions}
        </div>
      </div>

      {onSearchChange && (
        <div className="relative">
          <input
            type="search"
            value={searchTerm || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
};

/**
 * Componente Selector de Fecha y Hora con botón explícito de "Aceptar"
 * para evitar tener que hacer clic fuera del desplegable para cerrar la selección.
 */
export const DateTimePickerField: React.FC<{
  value: string; // ISO o 'YYYY-MM-DDTHH:mm'
  onChange: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  testId?: string;
}> = ({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder = 'DD/MM/AAAA HH:mm',
  testId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parsear valor inicial a fecha ('YYYY-MM-DD') y hora ('HH:mm')
  const parseVal = (valStr: string) => {
    if (!valStr) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      return { date: `${year}-${month}-${day}`, time: `${h}:${m}` };
    }
    const clean = valStr.includes('Z') ? valStr.slice(0, 16) : valStr;
    const parts = clean.split('T');
    const date = parts[0] || new Date().toISOString().slice(0, 10);
    const time = (parts[1] || '09:00').slice(0, 5);
    return { date, time };
  };

  const currentParsed = parseVal(value);
  const [tempDate, setTempDate] = useState(currentParsed.date);
  const [tempTime, setTempTime] = useState(currentParsed.time);

  // Parse tempDate into year, month (0-11), day
  const [tYear, tMonth] = useMemo(() => {
    const parts = tempDate.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = (parseInt(parts[1], 10) || 1) - 1;
    return [y, m];
  }, [tempDate]);

  const [viewYear, setViewYear] = useState(tYear);
  const [viewMonth, setViewMonth] = useState(tMonth);

  // Sincronizar temp con value cuando value cambie externamente
  useEffect(() => {
    const p = parseVal(value);
    setTempDate(p.date);
    setTempTime(p.time);
    const parts = p.date.split('-');
    setViewYear(parseInt(parts[0], 10) || new Date().getFullYear());
    setViewMonth((parseInt(parts[1], 10) || 1) - 1);
  }, [value]);

  // Cierre al hacer clic fuera del componente
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Cuando se abre el desplegable
  const handleOpen = () => {
    if (disabled) return;
    const p = parseVal(value);
    setTempDate(p.date);
    setTempTime(p.time);
    const parts = p.date.split('-');
    setViewYear(parseInt(parts[0], 10) || new Date().getFullYear());
    setViewMonth((parseInt(parts[1], 10) || 1) - 1);
    setIsOpen(true);
  };

  // Al pulsar Aceptar: confirma y cierra
  const handleAccept = () => {
    const combined = `${tempDate}T${tempTime || '09:00'}`;
    onChange(combined);
    setIsOpen(false);
  };

  const handleCancel = () => {
    const p = parseVal(value);
    setTempDate(p.date);
    setTempTime(p.time);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    setTempDate(dateStr);
    setViewYear(y);
    setViewMonth(now.getMonth());
  };

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Celdas de la cuadrícula mensual del calendario
  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const startOffset = (firstDay + 6) % 7; // Lunes = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

    // Días del mes anterior
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

    // Días del mes siguiente para completar cuadrícula
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrentMonth: false, dateStr: dStr });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const [currentHour, currentMin] = useMemo(() => {
    const parts = (tempTime || '09:00').split(':');
    return [parts[0] || '09', parts[1] || '00'];
  }, [tempTime]);

  // Formato para mostrar en el campo: "23/10/2026 14:05"
  const formattedDisplay = useMemo(() => {
    if (!value) return '';
    try {
      const p = parseVal(value);
      const [year, month, day] = p.date.split('-');
      if (!year || !month || !day) return value;
      return `${day}/${month}/${year} ${p.time}`;
    } catch {
      return value;
    }
  }, [value]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Botón / Input disparador que muestra la selección como en la interfaz del usuario */}
      <div
        role="button"
        tabIndex={0}
        data-testid={testId}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        className={`w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between text-sm transition cursor-pointer select-none ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-white hover:border-blue-500 border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500'
        }`}
      >
        <span className={formattedDisplay ? 'font-semibold text-slate-900' : 'text-slate-400'}>
          {formattedDisplay || placeholder}
        </span>
        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
      </div>

      {/* Input oculto nativo para asegurar compatibilidad de forms HTML */}
      <input
        type="hidden"
        value={value ? `${parseVal(value).date}T${parseVal(value).time}` : ''}
        required={required}
      />

      {/* Popover flotante con Calendario, Columnas Horas/Minutos y Botón Aceptar */}
      {isOpen && (
        <div
          data-testid={testId ? `${testId}-picker-popover` : 'datetime-picker-popover'}
          className="absolute left-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-300 p-3 z-50 animate-in fade-in zoom-in-95 duration-100 select-none max-w-[95vw]"
          style={{ width: '350px' }}
        >
          {/* Fila principal: Calendario a la izquierda, Horas y Minutos a la derecha */}
          <div className="flex gap-2.5 pb-2.5 border-b border-slate-200">
            {/* Calendario mensual (Izquierda) */}
            <div className="flex-1 min-w-[200px]">
              {/* Cabecera del mes y flechas */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 capitalize">
                  {monthNames[viewMonth]} de {viewYear}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600 font-bold text-sm cursor-pointer"
                    title="Mes anterior"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="h-6 w-6 rounded flex items-center justify-center hover:bg-slate-100 text-slate-600 font-bold text-sm cursor-pointer"
                    title="Mes siguiente"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-1">
                <span>L</span>
                <span>M</span>
                <span>X</span>
                <span>J</span>
                <span>V</span>
                <span>S</span>
                <span>D</span>
              </div>

              {/* Celdas de días */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {calendarCells.map((cell, idx) => {
                  const isSelected = cell.dateStr === tempDate;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTempDate(cell.dateStr)}
                      className={`h-6 w-6 mx-auto rounded flex items-center justify-center text-[11px] transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold shadow'
                          : cell.isCurrentMonth
                          ? 'text-slate-800 hover:bg-blue-50 hover:text-blue-600 font-medium'
                          : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Separador vertical */}
            <div className="w-px bg-slate-200 self-stretch" />

            {/* Columnas de Horas y Minutos (Derecha, como en la captura) */}
            <div className="flex gap-1 shrink-0">
              {/* Columna Horas */}
              <div className="w-12">
                <div className="text-[10px] font-bold text-slate-500 text-center mb-1">Hora</div>
                <div className="h-44 overflow-y-auto space-y-0.5 pr-0.5 border border-slate-100 rounded">
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => {
                    const isSelected = h === currentHour;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setTempTime(`${h}:${currentMin}`)}
                        className={`w-full py-1 text-xs text-center rounded transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Columna Minutos */}
              <div className="w-12">
                <div className="text-[10px] font-bold text-slate-500 text-center mb-1">Min</div>
                <div className="h-44 overflow-y-auto space-y-0.5 pr-0.5 border border-slate-100 rounded">
                  {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => {
                    const isSelected = m === currentMin;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTempTime(`${currentHour}:${m}`)}
                        className={`w-full py-1 text-xs text-center rounded transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Inputs auxiliares invisibles para testing sintético */}
          <input
            type="date"
            data-testid={testId ? `${testId}-date-input` : 'datetime-date-input'}
            value={tempDate}
            onChange={(e) => {
              if (e.target.value) {
                setTempDate(e.target.value);
                const parts = e.target.value.split('-');
                setViewYear(parseInt(parts[0], 10) || viewYear);
                setViewMonth((parseInt(parts[1], 10) || 1) - 1);
              }
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <select
            data-testid={testId ? `${testId}-hour-select` : 'datetime-hour-select'}
            value={currentHour}
            onChange={(e) => setTempTime(`${e.target.value}:${currentMin}`)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select
            data-testid={testId ? `${testId}-minute-select` : 'datetime-minute-select'}
            value={currentMin}
            onChange={(e) => setTempTime(`${currentHour}:${e.target.value}`)}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Resumen de selección actual y Pie inferior con Hoy, Cancelar y ACEPTAR */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSetToday}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Hoy
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid={testId ? `${testId}-accept-btn` : 'datetime-accept-btn'}
                onClick={handleAccept}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aceptar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
