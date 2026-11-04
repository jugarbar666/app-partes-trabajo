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
  Loader2,
  Search,
  RotateCcw,
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
import { DateTimeWheelModal } from './DateTimeWheelModal';

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

export interface SaveProgressHelpers {
  updateProgress?: (info: { current: number; total: number; message?: string }) => void;
}

export interface SaveConfirmModalState {
  title: string;
  changes: SaveSummaryItem[];
  warnings?: string[];
  onConfirm: (helpers?: SaveProgressHelpers) => Promise<void> | void;
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
  const [progressInfo, setProgressInfo] = useState<{
    current: number;
    total: number;
    message?: string;
  } | null>(null);

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
    setProgressInfo(null);
    setSaveModal(params);
  }, []);

  const requestDeleteConfirmation = useCallback((params: DeleteConfirmModalState) => {
    setDeleteReason('');
    setDeleteModal(params);
  }, []);

  const handleExecuteSave = async () => {
    if (!saveModal) return;
    setIsProcessing(true);
    setProgressInfo(null);
    // Ceder el hilo principal para permitir que el navegador pinte el estado de procesamiento (ocultar botón Aceptar)
    await new Promise((resolve) => setTimeout(resolve, 50));
    try {
      await saveModal.onConfirm({
        updateProgress: (info) => {
          setProgressInfo(info);
        },
      });
      setSaveModal(null);
      setProgressInfo(null);
      // Confirmación con fondo verde SOLO tras persistencia correcta en servidor
      notifySuccessGreen('Datos guardados correctamente en el servidor.');
    } catch (err: any) {
      // No muestra éxito si falla; preserva datos del formulario tras un error
      setSaveModal(null);
      setProgressInfo(null);
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

              {/* Indicador de actividad y barra de progreso real durante el guardado / importación */}
              {isProcessing && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2.5 my-2" data-testid="import-save-progress-box">
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      {progressInfo?.message || 'Guardando registros en el servidor...'}
                    </span>
                    {progressInfo && progressInfo.total > 0 && (
                      <span className="tabular-nums font-bold text-blue-700">
                        Procesados {progressInfo.current} de {progressInfo.total} registros ({Math.min(100, Math.round((progressInfo.current / progressInfo.total) * 100))}%)
                      </span>
                    )}
                  </div>
                  {progressInfo && progressInfo.total > 0 && (
                    <div className="w-full bg-blue-200/70 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-150 ease-out"
                        style={{ width: `${Math.min(100, Math.max(3, Math.round((progressInfo.current / progressInfo.total) * 100)))}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  if (!isProcessing) {
                    setSaveModal(null);
                    setProgressInfo(null);
                  }
                }}
                className={`px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Cancelar
              </button>
              {/* Una vez iniciada la importación/guardado, oculta el botón «Aceptar» / «Confirmar y Guardar» para impedir nuevas confirmaciones */}
              {!isProcessing && (
                <button
                  type="button"
                  data-testid="btn-confirm-save-summary"
                  onClick={handleExecuteSave}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs"
                >
                  Confirmar y Guardar
                </button>
              )}
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
  keywords?: string[];
}

/**
 * Desplegable interactivo con selector y buscador integrado en tiempo real.
 * - Soporta búsqueda por coincidencias parciales de texto, código, referencia y descripción.
 * - Insensible a acentos, tildes y mayúsculas/minúsculas.
 * - Navegación completa por teclado (Flechas Arriba/Abajo, Enter y Escape).
 * - Desplazamiento automático al elemento resaltado.
 * - Botón para borrar el término de búsqueda y restablecer el listado completo.
 * - Mensaje comprensible cuando no existan coincidencias.
 * - Adaptado tanto para pantallas táctiles de móviles como para escritorio.
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Normalizador para búsqueda insensible a acentos y mayúsculas
  const normalize = (str: string) =>
    (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  // Filtrado de opciones en tiempo real por cualquier parte del texto
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = normalize(searchTerm);
    return options.filter((o) => {
      if (normalize(o.label).includes(term)) return true;
      if (o.sublabel && normalize(o.sublabel).includes(term)) return true;
      if (o.keywords && o.keywords.some((k) => normalize(k).includes(term))) return true;
      return false;
    });
  }, [options, searchTerm]);

  // Al cambiar opciones filtradas o abrirse, ajustar el índice resaltado
  useEffect(() => {
    if (isOpen) {
      if (filteredOptions.length > 0) {
        const selectedIdx = filteredOptions.findIndex((o) => o.value === value);
        setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      } else {
        setHighlightedIndex(-1);
      }
    }
  }, [searchTerm, isOpen, filteredOptions, value]);

  // Scroll automático para mantener visible la opción resaltada
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector<HTMLElement>(
        `[data-option-index="${highlightedIndex}"]`
      );
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

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

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex].value);
        } else if (filteredOptions.length > 0) {
          handleSelectOption(filteredOptions[0].value);
        }
      }
    }
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
          <Search className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            data-testid={testId ? `${testId}-search-input` : 'searchable-select-input'}
            disabled={disabled}
            value={isOpen ? searchTerm : selectedOption ? selectedOption.label : ''}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isOpen
                ? selectedOption
                  ? `Actual: ${selectedOption.label}`
                  : placeholder
                : selectedOption
                ? selectedOption.label
                : placeholder
            }
            className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm truncate"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {isOpen && searchTerm ? (
            <button
              type="button"
              data-testid={testId ? `${testId}-clear-search` : 'btn-clear-search'}
              onClick={handleClearSearch}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              title="Borrar texto de búsqueda"
              aria-label="Borrar texto de búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : value && !disabled ? (
            <button
              type="button"
              data-testid={testId ? `${testId}-clear-selection` : 'btn-clear-selection'}
              onClick={handleClearSelection}
              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              title="Borrar selección"
              aria-label="Borrar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}

          <ChevronDown
            className={`w-4 h-4 transition-transform text-slate-400 pointer-events-none ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Lista desplegable filtrada en tiempo real */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          data-testid={testId ? `${testId}-dropdown-list` : 'searchable-select-dropdown'}
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 sm:max-h-64 overflow-y-auto overscroll-contain rounded-xl bg-white border border-slate-200 shadow-xl py-1 text-sm divide-y divide-slate-50 touch-pan-y"
        >
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
            <div className="px-4 py-4 text-center text-xs text-slate-500">
              <p className="font-semibold text-slate-700">No se encontraron artículos</p>
              <p className="mt-0.5 text-slate-500">
                No hay coincidencias para &laquo;<span className="font-semibold text-slate-800">{searchTerm}</span>&raquo;
              </p>
              <button
                type="button"
                onClick={handleClearSearch}
                className="mt-2.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                Restablecer búsqueda
              </button>
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <div
                  key={opt.value}
                  data-option-index={idx}
                  data-testid={testId ? `${testId}-option-${opt.value}` : `option-${opt.value}`}
                  onClick={() => handleSelectOption(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2.5 cursor-pointer transition flex items-center justify-between gap-2 text-left ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : isHighlighted
                      ? 'bg-blue-50 text-blue-900 font-medium'
                      : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div
                        className={`text-[11px] truncate mt-0.5 ${
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
  collapsibleSearchOnMobile?: boolean;
  mobileSearchOpen?: boolean;
  onMobileSearchOpenChange?: (open: boolean) => void;
  quickResults?: Array<{
    id: string;
    code: string;
    title: string;
    subtitle?: string;
    badge?: string;
    details?: string;
  }>;
  onSelectQuickResult?: (id: string) => void;
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
  collapsibleSearchOnMobile = false,
  mobileSearchOpen: controlledMobileSearchOpen,
  onMobileSearchOpenChange,
  quickResults,
  onSelectQuickResult,
}) => {
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [internalMobileSearchOpen, setInternalMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const isMobileSearchOpen =
    controlledMobileSearchOpen !== undefined
      ? controlledMobileSearchOpen
      : internalMobileSearchOpen;

  const setMobileSearchOpen = (open: boolean) => {
    if (onMobileSearchOpenChange) {
      onMobileSearchOpenChange(open);
    } else {
      setInternalMobileSearchOpen(open);
    }
  };

  useEffect(() => {
    if (isMobileSearchOpen && mobileInputRef.current) {
      mobileInputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

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
          {/* Botón compacto de búsqueda para móvil (cuando collapsibleSearchOnMobile está activo) */}
          {collapsibleSearchOnMobile && onSearchChange && (
            <button
              type="button"
              data-testid="btn-toggle-screen-header-search"
              onClick={() => {
                setMobileSearchOpen(!isMobileSearchOpen);
                if (!isMobileSearchOpen) {
                  setTimeout(() => mobileInputRef.current?.focus(), 50);
                }
              }}
              className={`md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                (searchTerm && searchTerm.trim()) || isMobileSearchOpen
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title="Buscar partes por cualquier campo"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
              {searchTerm && searchTerm.trim() && (
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              )}
            </button>
          )}

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

      {/* Buscador de escritorio o buscador fijo cuando no es colapsable en móvil */}
      {onSearchChange && !collapsibleSearchOnMobile && (
        <div className="relative flex items-center">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="search"
            value={searchTerm || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Borrar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Buscador responsivo (cuando collapsibleSearchOnMobile está activo) */}
      {onSearchChange && collapsibleSearchOnMobile && (
        <>
          {/* 1. Versión de escritorio siempre fija y visible */}
          <div className="hidden md:flex relative items-center">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="search"
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 2. Versión móvil desplegable que no ocupa espacio vertical cuando está cerrada */}
          {isMobileSearchOpen && (
            <div
              data-testid="screen-header-mobile-search-dropdown"
              className="block md:hidden p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 shadow-inner"
            >
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    ref={mobileInputRef}
                    type="search"
                    data-testid="input-screen-header-mobile-search"
                    value={searchTerm || ''}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                    autoFocus
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => onSearchChange('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Borrar texto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  data-testid="btn-close-screen-header-mobile-search"
                  onClick={() => setMobileSearchOpen(false)}
                  className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer shrink-0"
                >
                  Cerrar
                </button>
              </div>

              {/* Lista rápida de resultados directos (se cierra al seleccionar el parte localizado) */}
              {searchTerm && searchTerm.trim() && quickResults && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 px-0.5">
                    <span>
                      {quickResults.length === 0
                        ? 'Sin coincidencias'
                        : `${quickResults.length} parte(s) encontrado(s)`}
                    </span>
                    {searchTerm.trim() && (
                      <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        className="text-blue-600 hover:underline font-bold text-[11px]"
                      >
                        Limpiar búsqueda
                      </button>
                    )}
                  </div>

                  {quickResults.length > 0 && onSelectQuickResult && (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 p-1.5">
                      {quickResults.slice(0, 15).map((res) => (
                        <button
                          key={res.id}
                          type="button"
                          data-testid={`quick-result-item-${res.id}`}
                          onClick={() => {
                            // LOCALIZADO EL PARTE: se cierra el buscador desplegable
                            setMobileSearchOpen(false);
                            onSelectQuickResult(res.id);
                          }}
                          className="w-full text-left p-2 rounded-md hover:bg-blue-50 transition flex flex-col gap-0.5 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-[11px] text-blue-700">{res.code}</span>
                            {res.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                                {res.badge}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {res.title}
                          </div>
                          {res.subtitle && (
                            <div className="text-[11px] text-slate-500 truncate">
                              📍 {res.subtitle}
                            </div>
                          )}
                          {res.details && (
                            <div className="text-[11px] text-slate-600 line-clamp-1 italic">
                              "{res.details}"
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Chip compacto en móvil cuando está cerrado pero hay filtro activo */}
          {!isMobileSearchOpen && searchTerm && searchTerm.trim() && (
            <div className="block md:hidden flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs text-blue-900 shadow-2xs">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">
                  Filtro activo: <strong>"{searchTerm}"</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  className="text-blue-700 font-bold hover:underline cursor-pointer"
                >
                  Modificar
                </button>
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Quitar filtro"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Componente Selector de Fecha y Hora unificado con la ventana emergente de referencia.
 * Formato emergente con ruedas para día, mes, año y hora:minuto en colores corporativos azul y blanco.
 */
export const DateTimePickerField: React.FC<{
  value: string; // ISO o 'YYYY-MM-DDTHH:mm'
  onChange: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  testId?: string;
  title?: string;
  subtitle?: string;
  showClear?: boolean;
}> = ({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder = 'Pendiente de programar',
  testId,
  title = 'Establecer fecha y hora',
  subtitle,
  showClear = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Formato para mostrar en el campo disparador: "DD/MM/AAAA HH:mm"
  const formattedDisplay = useMemo(() => {
    if (!value || value.trim() === '') return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        const parts = value.split('T');
        if (parts.length === 2) {
          const [y, m, day] = parts[0].split('-');
          return `${day}/${m}/${y} ${parts[1].slice(0, 5)}`;
        }
        return value;
      }
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hour = String(d.getHours()).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hour}:${minute}`;
    } catch {
      return value;
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      {/* Botón disparador visible en la interfaz */}
      <div
        role="button"
        tabIndex={0}
        data-testid={testId}
        onClick={() => {
          if (!disabled) setIsOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(true);
          }
        }}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between text-sm transition cursor-pointer select-none shadow-2xs ${
          disabled
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : value
            ? 'bg-blue-50/70 hover:bg-blue-100/70 border-blue-300 text-blue-950 font-bold focus:ring-2 focus:ring-blue-500'
            : 'bg-white hover:border-blue-400 border-slate-300 text-slate-500 focus:ring-2 focus:ring-blue-500'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar className={`w-4 h-4 shrink-0 ${value ? 'text-blue-600' : 'text-slate-400'}`} />
          <span className={value ? 'font-bold text-blue-900' : 'text-slate-400 font-normal'}>
            {formattedDisplay || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {value && showClear && !disabled && (
            <button
              type="button"
              data-testid={testId ? `${testId}-clear-btn` : 'btn-clear-datetime'}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
              title="Borrar fecha y hora"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs font-semibold text-blue-700 hover:underline">
            {value ? 'Cambiar' : 'Establecer'}
          </span>
        </div>
      </div>

      {/* Input oculto para compatibilidad */}
      <input
        type="hidden"
        value={value || ''}
        required={required}
      />

      {/* Modal unificado exactamente en el modelo de referencia */}
      <DateTimeWheelModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        subtitle={subtitle}
        value={value}
        onConfirm={(newIso) => {
          onChange(newIso);
          setIsOpen(false);
        }}
        onClear={() => {
          onChange('');
          setIsOpen(false);
        }}
        showClear={showClear}
        confirmLabel="Establecer"
        testId={testId ? `${testId}-picker-popover` : 'datetime-picker-popover'}
      />
    </div>
  );
};
