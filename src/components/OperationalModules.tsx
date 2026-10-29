import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Calendar,
  ShoppingCart,
  Clock,
  FileText,
  Plus,
  Check,
  Edit3,
  Trash2,
  Send,
} from 'lucide-react';
import { InstallationBackendEngine } from '../services/backendEngine';
import { ScreenHeaderBar, useUIConfirmation, SearchableSelect, DateTimePickerField } from './CommonUI';
import {
  calculateDuration,
  calculateReviewNoticeSchedule,
  formatCentsToEUR,
  formatDateES,
  formatDateTimeES,
  formatTimeES,
  getCurrentLocalDate,
  getReviewAlertInfo,
  getWeekdayNameES,
  parseDateRobust,
  parseEurosToCents,
} from '../utils/formatters';
import { generateAttendanceReportPDF } from '../utils/exportImportUtils';

// =============================================================================
// 1. MÓDULO DE REVISIONES PERIÓDICAS Y MOTOR DE AVISOS AUTOMÁTICOS (SECCIONES 10 Y 11)
// =============================================================================
export const ReviewsAndNotificationsModule: React.FC<{
  backend: InstallationBackendEngine;
  onBack: () => void;
  onRefresh: () => void;
  onOpenCreateWorkOrderFromReview: (params: {
    customerId: string;
    addressId: string;
    plannedWork: string;
    scheduledAt: string;
    occurrenceId: string;
    amountCents?: number | null;
  }) => void;
}> = ({ backend, onBack, onRefresh, onOpenCreateWorkOrderFromReview }) => {
  const { requestSaveConfirmation, requestDeleteConfirmation, notifySuccessGreen, notifyError } = useUIConfirmation();
  const [tick, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    onRefresh();
  };

  const todayLocal = getCurrentLocalDate(backend.getCompanySettings().timezone);
  const reviews = useMemo(() => backend.getInstallationReviews(), [backend, tick]);
  const occurrences = useMemo(() => backend.getReviewOccurrences(), [backend, tick]);
  const customers = useMemo(() => backend.getCustomers(true), [backend, tick]);
  const addresses = useMemo(() => backend.getCustomerAddresses(undefined, true), [backend, tick]);
  const reviewTypes = useMemo(() => backend.getReviewTypes(true), [backend, tick]);

  // Filtros obligatorios del apartado 10: próximas, vencidas, realizadas, cliente, municipio e intervalo de fechas
  const [statusFilter, setStatusFilter] = useState<'all' | 'proximas' | 'vencidas' | 'realizadas'>(
    'all'
  );
  const [customerFilter, setCustomerFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Alta y Modificación de revisión periódica
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewCustomerId, setReviewCustomerId] = useState('');
  const [reviewAddressId, setReviewAddressId] = useState('');
  const [reviewTypeId, setReviewTypeId] = useState('');
  const [reviewNextDate, setReviewNextDate] = useState('2026-11-30');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'pendiente' | 'programada' | 'realizada' | 'cancelada'>('pendiente');

  // Modal Reprogramar Vencimiento de Revisión
  const [rescheduleOccModal, setRescheduleOccModal] = useState<{
    open: boolean;
    occurrenceId: string;
    revName: string;
    currentDueDate: string;
    linkedWoCode?: string | null;
    notes?: string;
  }>({ open: false, occurrenceId: '', revName: '', currentDueDate: '' });
  const [rescheduleDueDateInput, setRescheduleDueDateInput] = useState('');
  const [rescheduleNotesInput, setRescheduleNotesInput] = useState('');

  const availableAddressesForReview = useMemo(() => {
    return addresses.filter((a) => a.customer_id === reviewCustomerId);
  }, [addresses, reviewCustomerId]);

  const filteredOccurrences = occurrences
    .map((occ) => {
      const rev = reviews.find((r) => r.id === occ.installation_review_id);
      const cust = customers.find((c) => c.id === rev?.customer_id);
      const addr = addresses.find((a) => a.id === rev?.customer_address_id);
      const rType = reviewTypes.find((rt) => rt.id === rev?.review_type_id);
      return { occ, rev, cust, addr, rType };
    })
    .filter((item) => {
      if (!item.rev) return false;
      if (statusFilter === 'realizadas' && item.occ.status !== 'realizada') return false;
      if (statusFilter === 'vencidas') {
        if (item.occ.status === 'realizada' || item.occ.status === 'cancelada') return false;
        if (item.occ.due_date >= todayLocal) return false;
      }
      if (statusFilter === 'proximas') {
        if (item.occ.status === 'realizada' || item.occ.status === 'cancelada') return false;
        if (item.occ.due_date < todayLocal) return false;
      }
      if (customerFilter && item.rev.customer_id !== customerFilter) return false;
      if (
        cityFilter &&
        !(item.addr?.city || '').toLowerCase().includes(cityFilter.trim().toLowerCase())
      ) {
        return false;
      }
      if (dateFrom && item.occ.due_date < dateFrom) return false;
      if (dateTo && item.occ.due_date > dateTo) return false;
      return true;
    })
    .sort((a, b) => a.occ.due_date.localeCompare(b.occ.due_date));

  const handleOpenCreateReview = () => {
    setEditingReviewId(null);
    const initialCustId = customers[0]?.id || '';
    setReviewCustomerId(initialCustId);
    const custAddrs = addresses.filter((a) => a.customer_id === initialCustId);
    setReviewAddressId(custAddrs[0]?.id || '');
    setReviewTypeId(reviewTypes[0]?.id || '');
    setReviewNextDate('2026-11-30');
    setReviewNotes('');
    setReviewStatus('pendiente');
    setShowReviewModal(true);
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAddrId = reviewAddressId || availableAddressesForReview[0]?.id;
    if (!targetAddrId) {
      notifyError('El cliente seleccionado debe tener al menos un domicilio/instalación.');
      return;
    }
    const isEdit = Boolean(editingReviewId);
    requestSaveConfirmation({
      title: isEdit ? 'Confirmar Modificación de Revisión Periódica' : 'Confirmar Alta de Revisión Periódica',
      changes: [
        {
          label: 'Cliente',
          value: customers.find((c) => c.id === reviewCustomerId)?.name || reviewCustomerId,
        },
        {
          label: 'Instalación',
          value: addresses.find((a) => a.id === targetAddrId)?.address_line || targetAddrId,
        },
        {
          label: 'Tipo de revisión',
          value: reviewTypes.find((t) => t.id === reviewTypeId)?.name || reviewTypeId,
        },
        { label: 'Próximo vencimiento', value: formatDateES(reviewNextDate) },
        { label: 'Estado', value: reviewStatus.toUpperCase() },
        ...(reviewNotes ? [{ label: 'Notas', value: reviewNotes }] : []),
      ],
      onConfirm: () => {
        try {
          backend.saveInstallationReview({
            id: editingReviewId || undefined,
            customer_id: reviewCustomerId,
            customer_address_id: targetAddrId,
            review_type_id: reviewTypeId,
            origin_work_order_id: null,
            last_review_date: null,
            next_review_date: reviewNextDate,
            status: reviewStatus,
            notes: reviewNotes,
          });
          notifySuccessGreen(isEdit ? 'Revisión modificada con éxito.' : 'Revisión dada de alta con éxito.');
          setShowReviewModal(false);
          setEditingReviewId(null);
          refresh();
        } catch (err: any) {
          notifyError(err?.message || 'Error al guardar la revisión.');
        }
      },
    });
  };

  const handleRescheduleOccurrence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDueDateInput) {
      notifyError('Debes indicar una fecha de vencimiento válida.');
      return;
    }
    requestSaveConfirmation({
      title: 'Confirmar Reprogramación de Revisión',
      changes: [
        { label: 'Revisión', value: rescheduleOccModal.revName },
        { label: 'Fecha anterior', value: formatDateES(rescheduleOccModal.currentDueDate) },
        { label: 'Nueva fecha reprogramada', value: formatDateES(rescheduleDueDateInput) },
        ...(rescheduleNotesInput.trim() ? [{ label: 'Notas / Motivo', value: rescheduleNotesInput.trim() }] : []),
        ...(rescheduleOccModal.linkedWoCode
          ? [{ label: 'Parte vinculado', value: `Sincronizará la fecha de ${rescheduleOccModal.linkedWoCode}` }]
          : []),
      ],
      onConfirm: () => {
        try {
          backend.rescheduleReviewOccurrence({
            occurrence_id: rescheduleOccModal.occurrenceId,
            new_due_date: rescheduleDueDateInput,
            notes: rescheduleNotesInput.trim() || undefined,
          });
          notifySuccessGreen('Revisión reprogramada con éxito. Cola de avisos sincronizada.');
          setRescheduleOccModal({ open: false, occurrenceId: '', revName: '', currentDueDate: '' });
          refresh();
        } catch (err: any) {
          notifyError(err?.message || 'Error al reprogramar la revisión.');
        }
      },
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
      <div className="shrink-0 bg-[#f4f6fa]">
        <ScreenHeaderBar
          title="Revisiones Periódicas de Instalaciones y Avisos Automáticos"
          subtitle="Control de vencimientos, generación de partes vinculados y cola de avisos por correo (1 mes, 1 semana, mismo día)"
          onBack={onBack}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const res = backend.processNotificationQueue();
                  notifySuccessGreen(
                    `Cola de avisos procesada: ${res.sent} enviados, ${res.skippedRecovery} omitidos por recuperación.`
                  );
                  refresh();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold"
              >
                <Send className="w-3.5 h-3.5" /> Ejecutar Tarea Programada de Avisos Ahora
              </button>
              <button
                type="button"
                onClick={handleOpenCreateReview}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva Revisión Periódica
              </button>
            </div>
          }
        />
      </div>

      {/* Filtros obligatorios */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Situación</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
          >
            <option value="all">Todas (Próximas, Vencidas y Realizadas)</option>
            <option value="proximas">Próximas (en plazo)</option>
            <option value="vencidas">Vencidas (pendientes fuera de fecha)</option>
            <option value="realizadas">Realizadas (histórico completado)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Cliente</label>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
          >
            <option value="">Todos los clientes</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Municipio</label>
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Ej. Ciudad Real, Miguelturra, Puertollano..."
            className="w-full px-2.5 py-1.5 rounded border border-slate-300"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Desde fecha</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-slate-300"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Hasta fecha</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-slate-300"
          />
        </div>
      </div>

      {/* Leyenda explicativa de las señales de alerta de revisiones */}
      <div className="shrink-0 bg-slate-50 rounded-xl border border-slate-200 p-2.5 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-extrabold text-slate-800">Señales de Alerta:</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black text-white font-extrabold text-[11px] shadow-2xs">
          ⛔ Alerta Negra: Caducada (vencimiento superado)
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white font-extrabold text-[11px] shadow-2xs">
          🚨 Alerta Roja: Queda 1 semana o menos (urgente)
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[11px] shadow-2xs">
          ⚠️ Alerta Naranja: Queda 1 mes o menos (próxima)
        </span>
      </div>

      {/* Listado cronológico de vencimientos y ejecuciones */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 py-3 bg-slate-900 text-white text-xs font-bold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-400" />
            Vencimientos e Historial de Revisiones ({filteredOccurrences.length})
          </span>
          <span>Ordenado por próximo vencimiento ascendente</span>
        </div>

        <div className="flex-1 min-h-0 divide-y divide-slate-200 overflow-y-auto overscroll-contain">
          {filteredOccurrences.map(({ occ, rev, cust, addr, rType }) => {
            const isDone = occ.status === 'realizada';
            const alertInfo = getReviewAlertInfo(occ.due_date, todayLocal);
            const sched = calculateReviewNoticeSchedule(occ.due_date);

            return (
              <div
                key={occ.id}
                data-testid={`review-row-${occ.id}`}
                className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs transition ${
                  isDone ? 'bg-white' : alertInfo.borderCardClass
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {isDone ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ Realizada
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide border shadow-2xs ${alertInfo.badgeClass}`}
                        data-testid={`review-alert-badge-${occ.id}`}
                      >
                        {alertInfo.label}
                      </span>
                    )}

                    <strong className={`text-sm ${isDone ? 'text-slate-900' : alertInfo.textClass}`}>
                      Vencimiento: {formatDateES(occ.due_date)}
                    </strong>
                    <span className="text-slate-600 font-semibold">
                      — {rType?.name} ({formatCentsToEUR(rType?.suggested_price_cents)})
                    </span>
                  </div>
                  <div className="text-slate-700">
                    <strong>Cliente:</strong> {cust?.name} · <strong>Instalación:</strong>{' '}
                    {addr?.alias} ({addr?.address_line}, {addr?.city})
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Hitos de aviso calculados: 1 mes antes ({formatDateES(sched.oneMonthBefore)}) · 1 semana antes ({formatDateES(sched.oneWeekBefore)}) · Mismo día ({formatDateES(sched.sameDay)})
                    {occ.linked_work_order_id && (
                      <span className="ml-2 text-blue-700 font-semibold">
                        [Vinculado a Parte {occ.linked_work_order_id}]
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {occ.status !== 'realizada' && (
                    <button
                      type="button"
                      data-testid={`btn-reschedule-review-${occ.id}`}
                      onClick={() => {
                        setRescheduleOccModal({
                          open: true,
                          occurrenceId: occ.id,
                          revName: `${cust?.name || 'Cliente'} — ${rType?.name || 'Revisión'}`,
                          currentDueDate: occ.due_date,
                          linkedWoCode: occ.linked_work_order_id,
                          notes: occ.notes || '',
                        });
                        setRescheduleDueDateInput(occ.due_date);
                        setRescheduleNotesInput(occ.notes || '');
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer text-xs"
                      title="Reprogramar fecha de vencimiento de este aviso"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reprogramar</span>
                    </button>
                  )}

                  {rev && (
                    <button
                      type="button"
                      data-testid={`btn-edit-review-${rev.id}`}
                      onClick={() => {
                        setEditingReviewId(rev.id);
                        setReviewCustomerId(rev.customer_id);
                        setReviewAddressId(rev.customer_address_id);
                        setReviewTypeId(rev.review_type_id);
                        setReviewNextDate(rev.next_review_date);
                        setReviewNotes(rev.notes || '');
                        setReviewStatus(rev.status);
                        setShowReviewModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer text-xs"
                      title="Modificar los datos de la revisión periódica"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Modificar</span>
                    </button>
                  )}

                  {rev && (
                    <button
                      type="button"
                      data-testid={`btn-delete-review-${rev.id}`}
                      onClick={() => {
                        requestDeleteConfirmation({
                          recordName: `Mantenimiento «${cust?.name || 'Cliente'} — ${rType?.name || 'Revisión'}»`,
                          consequence:
                            'Se eliminará este plan de mantenimiento periódico y todos sus vencimientos asociados. Esta acción puede influir en alguna acción o listado.',
                          requireReason: false,
                          onConfirm: () => {
                            backend.deleteInstallationReview(rev.id);
                            refresh();
                          },
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer text-xs"
                      title="Borrar mantenimiento periódico definitivamente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar</span>
                    </button>
                  )}

                  {occ.status !== 'realizada' && !occ.linked_work_order_id && rev && (
                    <button
                      type="button"
                      data-testid={`btn-create-wo-from-review-${occ.id}`}
                      onClick={() =>
                        onOpenCreateWorkOrderFromReview({
                          customerId: rev.customer_id,
                          addressId: rev.customer_address_id,
                          plannedWork: `${rType?.name || 'Revisión periódica'} — Vencimiento ${formatDateES(
                            occ.due_date
                          )}`,
                          scheduledAt: `${occ.due_date}T09:00`,
                          occurrenceId: occ.id,
                          amountCents: rType?.suggested_price_cents ?? null,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      + Generar Parte desde Revisión
                    </button>
                  )}

                  {occ.status !== 'realizada' && (
                    <button
                      type="button"
                      data-testid={`btn-complete-review-${occ.id}`}
                      onClick={() => {
                        requestSaveConfirmation({
                          title: 'Confirmar Realización de Vencimiento y Programar Siguiente',
                          changes: [
                            { label: 'Revisión', value: rType?.name || '' },
                            { label: 'Vencimiento completado', value: formatDateES(occ.due_date) },
                            {
                              label: 'Comportamiento',
                              value:
                                'Se marcará este vencimiento en el histórico y se calculará la siguiente fecha según periodicidad.',
                            },
                          ],
                          onConfirm: () => {
                            backend.completeReviewOccurrenceAndScheduleNext({
                              occurrence_id: occ.id,
                              completed_date: todayLocal,
                            });
                            refresh();
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      Confirmar Realización y Siguiente Fecha
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE ALTA Y MODIFICACIÓN DE REVISIÓN PERIÓDICA */}
      {showReviewModal && (
        <div
          data-testid="modal-edit-review"
          className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleSaveReview}
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-md w-full h-full sm:h-auto overflow-y-auto p-5 sm:p-6 space-y-4 text-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  {editingReviewId ? 'Modificar Revisión Periódica' : 'Nueva Revisión Periódica'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  setEditingReviewId(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cliente *</label>
              <SearchableSelect
                value={reviewCustomerId}
                onChange={(cid) => {
                  setReviewCustomerId(cid);
                  const custAddrs = addresses.filter((a) => a.customer_id === cid);
                  setReviewAddressId(custAddrs[0]?.id || '');
                }}
                placeholder="-- Cliente a seleccionar --"
                emptyOptionLabel="-- Cliente a seleccionar --"
                options={customers.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Instalación / Domicilio *
              </label>
              <SearchableSelect
                value={reviewAddressId}
                onChange={setReviewAddressId}
                placeholder="-- Instalación o domicilio a seleccionar --"
                emptyOptionLabel="-- Instalación o domicilio a seleccionar --"
                disabled={!reviewCustomerId || availableAddressesForReview.length === 0}
                options={availableAddressesForReview.map((a) => ({
                  value: a.id,
                  label: `${a.alias ? `${a.alias} — ` : ''}${a.address_line} (${a.city})`,
                }))}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipo de Revisión *</label>
              <SearchableSelect
                value={reviewTypeId}
                onChange={setReviewTypeId}
                placeholder="-- Tipo de revisión a seleccionar --"
                emptyOptionLabel="-- Tipo de revisión a seleccionar --"
                options={reviewTypes.map((rt) => ({
                  value: rt.id,
                  label: `${rt.name} (${rt.periodicity_value} ${rt.periodicity_unit} — ${formatCentsToEUR(rt.suggested_price_cents)})`,
                }))}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Próxima fecha de vencimiento *
              </label>
              <input
                type="date"
                required
                data-testid="input-review-next-date"
                value={reviewNextDate}
                onChange={(e) => setReviewNextDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
              />
            </div>

            {editingReviewId && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estado de la Revisión *</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as typeof reviewStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="pendiente">Pendiente (activa en agenda)</option>
                  <option value="programada">Programada (con parte o fecha fijada)</option>
                  <option value="realizada">Realizada (completada)</option>
                  <option value="cancelada">Cancelada (anulada)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Notas / Observaciones</label>
              <input
                type="text"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Ej. Revisión anual de climatización antes de invierno..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  setEditingReviewId(null);
                }}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-submit-review"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
              >
                {editingReviewId ? 'Guardar Cambios' : 'Crear Revisión'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL REPROGRAMAR VENCIMIENTO DE REVISIÓN */}
      {rescheduleOccModal.open && (
        <div
          data-testid="modal-reschedule-review"
          className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
        >
          <form
            onSubmit={handleRescheduleOccurrence}
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-md w-full h-full sm:h-auto overflow-y-auto p-5 sm:p-6 space-y-4 text-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Reprogramar Fecha de Vencimiento
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRescheduleOccModal({
                    open: false,
                    occurrenceId: '',
                    revName: '',
                    currentDueDate: '',
                  })
                }
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="font-extrabold text-slate-900">{rescheduleOccModal.revName}</div>
              <div className="text-slate-600">
                Fecha actual de vencimiento:{' '}
                <strong className="text-slate-900">
                  {formatDateES(rescheduleOccModal.currentDueDate)}
                </strong>
              </div>
              {rescheduleOccModal.linkedWoCode && (
                <div className="text-blue-700 font-bold text-[11px]">
                  ℹ️ Esta revisión está vinculada al parte {rescheduleOccModal.linkedWoCode}. Al reprogramarla se sincronizará automáticamente la fecha del parte.
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nueva fecha de vencimiento *
              </label>
              <input
                type="date"
                required
                data-testid="input-reschedule-review-due-date"
                value={rescheduleDueDateInput}
                onChange={(e) => setRescheduleDueDateInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Motivo / Notas de la reprogramación (opcional)
              </label>
              <input
                type="text"
                data-testid="input-reschedule-review-notes"
                value={rescheduleNotesInput}
                onChange={(e) => setRescheduleNotesInput(e.target.value)}
                placeholder="Ej. Solicitado aplazamiento por obras del cliente..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() =>
                  setRescheduleOccModal({
                    open: false,
                    occurrenceId: '',
                    revName: '',
                    currentDueDate: '',
                  })
                }
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-submit-reschedule-review"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Guardar Reprogramación
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 2. MÓDULO DE LISTA DE COMPRA DE MATERIALES (SECCIÓN 12)
// - Operario: solo selecciona un artículo existente en un desplegable; no crea productos ni decide unidades.
// - Administrador: mantiene artículos, establece unidades y marca productos comprados (pasan al historial).
// =============================================================================
export const ShoppingListModule: React.FC<{
  backend: InstallationBackendEngine;
  onBack: () => void;
  onRefresh: () => void;
}> = ({ backend, onBack, onRefresh }) => {
  const { requestSaveConfirmation, requestDeleteConfirmation, notifySuccessGreen, notifyError } = useUIConfirmation();
  const [tick, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    onRefresh();
  };

  const currentUser = backend.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';
  const articles = useMemo(() => backend.getArticles(false), [backend, tick]);
  const suppliers = useMemo(() => backend.getSuppliers(true), [backend, tick]);
  const profiles = useMemo(() => backend.getProfiles(), [backend, tick]);
  const requests = useMemo(() => backend.getShoppingRequests(), [backend, tick]);

  const [selectedArticleId, setSelectedArticleId] = useState('');
  const [adminQty, setAdminQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [editingQtyMap, setEditingQtyMap] = useState<Record<string, string>>({});
  const [showAddShoppingModal, setShowAddShoppingModal] = useState(false);

  // Alta de artículo desde la lista de compra (solo Admin): al terminar vuelve a esta pantalla
  const [showNewArticleModal, setShowNewArticleModal] = useState(false);
  const [returnToShoppingModal, setReturnToShoppingModal] = useState(false);
  const [naCode, setNaCode] = useState('');
  const [naName, setNaName] = useState('');
  const [naDesc, setNaDesc] = useState('');
  const [naUnit, setNaUnit] = useState('ud');
  const [naBuyPrice, setNaBuyPrice] = useState('');
  const [naSalePrice, setNaSalePrice] = useState('');
  const [naSupplierId, setNaSupplierId] = useState('');

  const openNewArticleModal = () => {
    setNaCode('');
    setNaName('');
    setNaDesc('');
    setNaUnit('ud');
    setNaBuyPrice('');
    setNaSalePrice('');
    setNaSupplierId(suppliers[0]?.id || '');
    setShowNewArticleModal(true);
  };

  const closeNewArticleModal = () => {
    setShowNewArticleModal(false);
    if (returnToShoppingModal) {
      setShowAddShoppingModal(true);
      setReturnToShoppingModal(false);
    }
  };

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    const buyCents = parseEurosToCents(naBuyPrice || '0');
    const saleCents = parseEurosToCents(naSalePrice || '0');
    if (!naCode.trim() || !naName.trim()) {
      notifyError('El código y el nombre del artículo son obligatorios.');
      return;
    }
    if (buyCents === null || saleCents === null) {
      notifyError('Introduce precios válidos (ej. 12,50).');
      return;
    }
    const reopenShopping = returnToShoppingModal;
    setShowNewArticleModal(false);
    setReturnToShoppingModal(false);
    requestSaveConfirmation({
      title: 'Alta de Artículo en Catálogo',
      changes: [
        { label: 'Código único', value: naCode.trim().toUpperCase() },
        { label: 'Nombre', value: naName },
        { label: 'Unidad de medida', value: naUnit },
        { label: 'Precio compra', value: formatCentsToEUR(buyCents) },
        { label: 'Precio venta', value: formatCentsToEUR(saleCents) },
        {
          label: 'Proveedor habitual',
          value: suppliers.find((s) => s.id === naSupplierId)?.name || 'Sin proveedor',
        },
      ],
      onConfirm: () => {
        const created = backend.saveArticle({
          code: naCode,
          name: naName,
          description: naDesc,
          supplier_id: naSupplierId || null,
          purchase_price_cents: buyCents,
          sale_price_cents: saleCents,
          unit: naUnit,
          is_active: true,
        });
        // Volver a la lista de compra con el artículo recién creado ya seleccionado
        setSelectedArticleId(created.id);
        refresh();
        if (reopenShopping) {
          setShowAddShoppingModal(true);
        }
      },
    });
  };

  const pendingList = requests.filter(
    (r) => r.status === 'pending_quantity' || r.status === 'pending_purchase'
  );
  const historyList = requests.filter((r) => r.status === 'purchased');

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticleId) {
      notifyError('Debes seleccionar un artículo del catálogo.');
      return;
    }
    const art = articles.find((a) => a.id === selectedArticleId);
    if (!art) {
      notifyError('Selecciona un artículo existente del desplegable.');
      return;
    }

    const qtyNum = isAdmin ? parseFloat(adminQty.replace(',', '.')) : null;
    setShowAddShoppingModal(false);
    requestSaveConfirmation({
      title: 'Añadir Artículo a la Lista de Compra',
      changes: [
        { label: 'Artículo seleccionado', value: `${art.code} — ${art.name}` },
        {
          label: 'Unidades de compra',
          value: isAdmin && qtyNum ? `${qtyNum} ${art.unit}` : 'Pendiente de definir por Administración',
        },
      ],
      onConfirm: () => {
        const res = backend.requestShoppingArticle({
          article_id: art.id,
          quantity: isAdmin ? qtyNum : undefined,
          notes,
        });
        if (res.mergedExisting) {
          notifySuccessGreen(
            'El artículo ya estaba pendiente en la lista: se ha registrado tu solicitud sin duplicar la fila.'
          );
        }
        setNotes('');
        refresh();
      },
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 bg-[#f4f6fa]">
        <ScreenHeaderBar
          title="Lista de Compra de Materiales"
          subtitle={
            isAdmin
              ? 'Gestión de solicitudes de operarios, asignación de unidades y confirmación de compra'
              : 'Solicita material seleccionando únicamente un artículo existente del catálogo'
          }
          onBack={onBack}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  data-testid="btn-open-new-article-from-shopping"
                  onClick={() => {
                    setReturnToShoppingModal(false);
                    openNewArticleModal();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" /> Alta de Artículo
                </button>
              )}
              <button
                type="button"
                data-testid="btn-open-add-shopping-modal"
                onClick={() => { setSelectedArticleId(''); setAdminQty('1'); setNotes(''); setShowAddShoppingModal(true); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" /> Añadir Artículo a Lista de Compra
              </button>
            </div>
          }
        />
      </div>

      {/* Modal emergente: alta de artículo en catálogo desde la lista de compra */}
      {showNewArticleModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleCreateArticle}
            data-testid="modal-new-article-from-shopping"
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-lg w-full h-full sm:h-auto overflow-y-auto p-5 space-y-3 text-xs sm:my-6 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Alta de Artículo en Catálogo</h2>
              <button
                type="button"
                onClick={closeNewArticleModal}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Código (automático si vacío)
                </label>
                <input
                  type="text"
                  value={naCode}
                  onChange={(e) => setNaCode(e.target.value)}
                  placeholder="Ej. MAT-005 (o dejar vacío)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unidad de medida</label>
                <select
                  value={naUnit}
                  onChange={(e) => setNaUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="">-- Unidad a seleccionar --</option>
                  <option value="ud">Unidad (ud)</option>
                  <option value="m">Metros (m)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="l">Litros (l)</option>
                  <option value="h">Horas (h)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre del artículo *</label>
              <input
                type="text"
                required
                autoFocus
                value={naName}
                onChange={(e) => setNaName(e.target.value)}
                placeholder="Nombre descriptivo del artículo *"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
              <input
                type="text"
                value={naDesc}
                onChange={(e) => setNaDesc(e.target.value)}
                placeholder="Detalles técnicos, medidas, modelo..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Precio de Compra (€)</label>
                <input
                  type="text"
                  value={naBuyPrice}
                  onChange={(e) => setNaBuyPrice(e.target.value)}
                  placeholder="Ej. 10,00 €"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Precio de Venta (€)</label>
                <input
                  type="text"
                  value={naSalePrice}
                  onChange={(e) => setNaSalePrice(e.target.value)}
                  placeholder="Ej. 20,00 €"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Proveedor habitual</label>
              <select
                value={naSupplierId}
                onChange={(e) => setNaSupplierId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="">-- Sin proveedor habitual --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeNewArticleModal}
                className="px-3.5 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Guardar Artículo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal emergente para añadir artículo a la lista de compra */}
      {showAddShoppingModal && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleAddRequest}
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-md w-full h-full sm:h-auto overflow-y-auto p-5 sm:p-6 space-y-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                Añadir artículo a la lista de compra
              </h2>
              <button
                type="button"
                onClick={() => setShowAddShoppingModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-700"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Artículo del catálogo *
                </label>
                <SearchableSelect
                  data-testid="select-shopping-article"
                  value={selectedArticleId}
                  onChange={setSelectedArticleId}
                  placeholder="-- Artículo a seleccionar --"
                  emptyOptionLabel="-- Artículo a seleccionar --"
                  options={articles.map((a) => ({
                    value: a.id,
                    label: `${a.code} — ${a.name} (${a.unit})`,
                  }))}
                />
                {isAdmin && (
                  <button
                    type="button"
                    data-testid="btn-shopping-modal-new-article"
                    onClick={() => {
                      setReturnToShoppingModal(true);
                      setShowAddShoppingModal(false);
                      openNewArticleModal();
                    }}
                    className="mt-1.5 text-xs font-semibold text-blue-700 hover:underline"
                  >
                    ¿No está en el catálogo? + Dar de alta nuevo artículo
                  </button>
                )}
              </div>

              {/* Solo el Administrador puede decidir o introducir unidades */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidades a comprar (Solo Admin)
                  </label>
                  <input
                    type="text"
                    value={adminQty}
                    onChange={(e) => setAdminQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Urgente para mantenimiento..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddShoppingModal(false)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-submit-shopping-request"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                + Añadir a Lista de Compra
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista pendiente de compra */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 py-3 bg-slate-900 text-white text-xs font-bold">
          Artículos Pendientes de Compra ({pendingList.length})
        </div>
        <div className="flex-1 min-h-0 divide-y divide-slate-200 overflow-y-auto overscroll-contain">
          {pendingList.map((item) => {
            const art = articles.find((a) => a.id === item.article_id);
            const sup = suppliers.find((s) => s.id === item.supplier_id);
            const reqUser = profiles.find((p) => p.id === item.requested_by);
            const qtyVal =
              editingQtyMap[item.id] !== undefined
                ? editingQtyMap[item.id]
                : item.quantity !== null
                ? String(item.quantity)
                : '';

            return (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900">
                    {art?.code} — {art?.name}
                  </div>
                  <div className="text-slate-600">
                    Proveedor habitual: <strong>{sup?.name || '—'}</strong> · Precio venta:{' '}
                    <strong>{formatCentsToEUR(item.sale_price_cents)}</strong>
                    {isAdmin && item.purchase_price_cents !== undefined && (
                      <span className="ml-2 text-blue-800 font-semibold">
                        · Precio compra (Admin): {formatCentsToEUR(item.purchase_price_cents)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Solicitado por: <strong>{reqUser?.full_name || item.requested_by}</strong> (
                    {formatDateTimeES(item.requested_at)})
                    {item.additional_requesters.length > 0 && (
                      <span className="ml-2 text-amber-700 font-semibold">
                        + {item.additional_requesters.length} solicitud(es) coincidente(s)
                      </span>
                    )}
                  </div>
                </div>

                {isAdmin ? (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <input
                      type="text"
                      data-testid={`input-admin-shop-qty-${item.id}`}
                      value={qtyVal}
                      onChange={(e) =>
                        setEditingQtyMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      placeholder="Unidades..."
                      className="w-24 px-2.5 py-1.5 rounded border border-slate-300 text-xs font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const q = parseFloat(qtyVal.replace(',', '.'));
                        if (Number.isNaN(q) || q <= 0) {
                          notifyError('Indica una cantidad mayor que cero.');
                          return;
                        }
                        backend.adminUpdateShoppingRequest(item.id, { quantity: q });
                        notifySuccessGreen('Unidades de compra actualizadas.');
                        refresh();
                      }}
                      className="px-3 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-800 font-semibold"
                    >
                      Fijar Unidades
                    </button>
                    <button
                      type="button"
                      data-testid={`btn-mark-purchased-${item.id}`}
                      onClick={() => {
                        const q = parseFloat((qtyVal || '1').replace(',', '.'));
                        requestSaveConfirmation({
                          title: 'Marcar Producto como Comprado',
                          changes: [
                            { label: 'Artículo', value: art?.name || item.article_id || 'Artículo' },
                            { label: 'Unidades compradas', value: String(q) },
                          ],
                          onConfirm: () => {
                            backend.adminUpdateShoppingRequest(item.id, {
                              quantity: q,
                              markPurchased: true,
                            });
                            refresh();
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <Check className="w-3.5 h-3.5" /> Marcar Comprado
                    </button>
                    <button
                      type="button"
                      data-testid={`btn-delete-shopping-${item.id}`}
                      onClick={() => {
                        requestDeleteConfirmation({
                          recordName: `Solicitud de compra «${art?.name || 'Material'}»`,
                          consequence:
                            'Se eliminará definitivamente esta solicitud de la lista de compra.',
                          requireReason: false,
                          onConfirm: () => {
                            backend.deleteShoppingRequest(item.id);
                            refresh();
                          },
                        });
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold cursor-pointer"
                      title="Eliminar solicitud de compra"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Borrar
                    </button>
                  </div>
                ) : (
                  <div className="font-semibold text-slate-700">
                    Unidades:{' '}
                    {item.quantity !== null ? (
                      `${item.quantity} ${art?.unit}`
                    ) : (
                      <span className="text-amber-700">Pendiente de fijar por Admin</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Histórico administrativo de compras realizadas */}
      {isAdmin && (
        <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-3 space-y-2 max-h-36 overflow-y-auto overscroll-contain">
          <h3 className="text-xs font-bold uppercase text-slate-700">
            Histórico Administrativo de Productos Comprados ({historyList.length})
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {historyList.map((h) => {
              const art = articles.find((a) => a.id === h.article_id);
              return (
                <div key={h.id} className="py-2 flex justify-between">
                  <span>
                    <strong>{art?.name}</strong> — {h.quantity} {art?.unit}
                  </span>
                  <span className="text-slate-500">
                    Comprado el {formatDateTimeES(h.purchased_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 3. MÓDULO DE FICHAJE Y CONTROL HORARIO CON INFORMES PDF Y DOBLE BLOQUE DE FIRMA (SECCIÓN 13)
// =============================================================================
export const AttendanceAndReportsModule: React.FC<{
  backend: InstallationBackendEngine;
  onBack: () => void;
  onRefresh: () => void;
}> = ({ backend, onBack, onRefresh }) => {
  const { requestSaveConfirmation, requestDeleteConfirmation, notifySuccessGreen, notifyError } =
    useUIConfirmation();
  const [tick, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    onRefresh();
  };

  const currentUser = backend.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';
  const company = backend.getCompanySettings();
  const tz = company.timezone || 'Europe/Madrid';

  const profiles = backend.getProfiles();
  const sessions = backend.getAttendanceSessions(false);
  const openSession = backend.getOpenAttendanceSessionForCurrentUser();
  const corrections = isAdmin ? backend.getAttendanceCorrections() : [];

  const [workerNote, setWorkerNote] = useState('');

  // Rango de fechas por defecto: mes en curso según zona horaria
  const todayStr = getCurrentLocalDate(tz);
  const [currentYear, currentMonth] = todayStr.split('-');
  const defaultFrom = `${currentYear}-${currentMonth}-01`;
  const lastDayOfMonth = new Date(Number(currentYear), Number(currentMonth), 0).getDate();
  const defaultTo = `${currentYear}-${currentMonth}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const [filterWorkerId, setFilterWorkerId] = useState<string>('all');
  const [filterFrom, setFilterFrom] = useState(defaultFrom);
  const [filterTo, setFilterTo] = useState(defaultTo);

  const handleRunAutoResolveAttendance = () => {
    try {
      const res = backend.autoResolvePendingAttendance({
        completeMissingWorkers: true,
      });
      notifySuccessGreen(
        `Cierre automático completado: ${res.closedSessionsCount} jornada(s) pendiente(s) cerrada(s) y ${res.createdSessionsCount} fichaje(s) por defecto asignado(s).`
      );
      refresh();
    } catch (err: any) {
      notifyError(err?.message || 'Error al ejecutar el cierre automático');
    }
  };

  // Formulario administrativo para crear o corregir fichaje con motivo obligatorio
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | undefined>(undefined);
  const [adminUserId, setAdminUserId] = useState(profiles[1]?.id || currentUser.id);
  const [adminClockIn, setAdminClockIn] = useState('2026-10-21T08:00');
  const [adminClockOut, setAdminClockOut] = useState('2026-10-21T16:00');
  const [adminNotesIn, setAdminNotesIn] = useState('');
  const [adminReason, setAdminReason] = useState('');

  const filteredSessions = sessions
    .filter((s) => {
      if (filterWorkerId !== 'all' && s.user_id !== filterWorkerId) return false;
      const inDate = s.clock_in_at ? getCurrentLocalDate(tz, parseDateRobust(s.clock_in_at) || undefined) : '';
      const outDate = s.clock_out_at
        ? getCurrentLocalDate(tz, parseDateRobust(s.clock_out_at) || undefined)
        : inDate;
      if (filterFrom && outDate < filterFrom) return false;
      if (filterTo && inDate > filterTo) return false;
      return true;
    })
    .sort((a, b) => new Date(b.clock_in_at).getTime() - new Date(a.clock_in_at).getTime());

  const totalMinutes = filteredSessions.reduce(
    (acc, s) => acc + calculateDuration(s.clock_in_at, s.clock_out_at).minutes,
    0
  );

  const handleClockInOrOut = () => {
    try {
      if (!openSession) {
        const created = backend.clockIn(workerNote);
        setWorkerNote('');
        notifySuccessGreen(
          `Entrada fichada en servidor: ${formatDateTimeES(created.clock_in_at, tz)}`
        );
      } else {
        const closed = backend.clockOut(workerNote);
        setWorkerNote('');
        notifySuccessGreen(
          `Salida fichada en servidor: ${formatDateTimeES(closed.clock_out_at, tz)}`
        );
      }
      refresh();
    } catch (err: any) {
      notifyError(err?.message || 'Error al registrar fichaje');
    }
  };

  const handleSaveAdminCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReason.trim()) {
      notifyError('El motivo de la creación o corrección administrativa es obligatorio.');
      return;
    }
    const inIso = new Date(adminClockIn).toISOString();
    const outIso = adminClockOut ? new Date(adminClockOut).toISOString() : null;

    requestSaveConfirmation({
      title: editingSessionId
        ? 'Corrección Administrativa de Fichaje'
        : 'Alta Administrativa de Fichaje',
      changes: [
        {
          label: 'Trabajador',
          value: profiles.find((p) => p.id === adminUserId)?.full_name || adminUserId,
        },
        { label: 'Hora de entrada', value: formatDateTimeES(inIso, tz) },
        { label: 'Hora de salida', value: outIso ? formatDateTimeES(outIso, tz) : 'Abierta' },
        { label: 'Motivo registrado en auditoría', value: adminReason },
      ],
      onConfirm: () => {
        backend.adminCreateOrCorrectAttendance({
          session_id: editingSessionId,
          user_id: adminUserId,
          clock_in_at: inIso,
          clock_out_at: outIso,
          worker_notes_in: adminNotesIn,
          worker_notes_out: '',
          reason: adminReason,
        });
        setShowAdminModal(false);
        setAdminReason('');
        refresh();
      },
    });
  };

  const handleDownloadAttendancePDF = () => {
    const targetWorkers =
      filterWorkerId === 'all'
        ? profiles.filter((p) => filteredSessions.some((s) => s.user_id === p.id))
        : profiles.filter((p) => p.id === filterWorkerId);

    const workersPayload = (targetWorkers.length > 0 ? targetWorkers : [currentUser]).map((w) => ({
      worker: w,
      sessions: filteredSessions.filter((s) => s.user_id === w.id),
    }));

    generateAttendanceReportPDF({
      company,
      periodLabel: `${formatDateES(filterFrom)} a ${formatDateES(filterTo)}`,
      workers: workersPayload,
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
      <div className="shrink-0 bg-[#f4f6fa]">
        <ScreenHeaderBar
          title="Fichaje y Control Horario"
          subtitle="Fichaje en directo con hora del servidor, cálculo real de duración (medianoche y horario de verano) e informes PDF con firmas"
          onBack={onBack}
          actions={
            isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                {company.logo_url && (
                  <img
                    src={company.logo_url}
                    alt={company.company_name}
                    className="h-8 max-w-[120px] object-contain rounded border border-slate-200 bg-white p-0.5"
                  />
                )}
                <button
                  type="button"
                  data-testid="btn-download-attendance-pdf"
                  onClick={handleDownloadAttendancePDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  <FileText className="w-3.5 h-3.5" /> Exportar Informe PDF Oficial con Bloques de Firma
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSessionId(undefined);
                    setAdminReason('');
                    setShowAdminModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> + Añadir Fichaje (Admin)
                </button>
              </div>
            )
          }
        />
      </div>

      {/* Panel de información de cierre automático por jornada individual de cada trabajador */}
      {isAdmin && (
        <div className="shrink-0 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-3 sm:p-4 shadow-sm space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white">
                  Cierre Automático de Fichajes por Jornada Individual
                </h3>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Cada trabajador cuenta con su propio horario de entrada y salida habitual fijado de forma independiente en su ficha (<span className="text-indigo-200 font-semibold">Datos Maestros &gt; Usuarios y Roles</span>). Al ejecutar el cierre automático o finalizar la jornada, el sistema aplica el horario individual asignado a cada operario.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="btn-auto-resolve-attendance"
                onClick={handleRunAutoResolveAttendance}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                title="Comprobar jornadas pendientes y completar con el horario individual asignado a cada trabajador"
              >
                <Check className="w-3.5 h-3.5" /> Ejecutar Cierre Automático Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de fichaje en directo para el usuario actual */}
      <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="text-xs font-bold uppercase text-slate-500 flex flex-wrap items-center gap-2">
            <span>Tu Estado Actual de Jornada ({currentUser.full_name})</span>
            <span className="text-[11px] font-normal text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              🕒 Horario asignado: <strong>{currentUser.work_start_time || '08:00'}</strong> a <strong>{currentUser.work_end_time || '18:00'}</strong>
            </span>
          </div>
          {openSession ? (
            <div className="text-xs sm:text-sm font-bold text-emerald-700">
              ● JORNADA ABIERTA — Entrada registrada a las{' '}
              {formatDateTimeES(openSession.clock_in_at, tz)}
            </div>
          ) : (
            <div className="text-xs sm:text-sm font-bold text-slate-700">
              ○ Fuera de jornada (Sin entrada abierta)
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={workerNote}
            onChange={(e) => setWorkerNote(e.target.value)}
            placeholder="Observaciones del fichaje (opcional)..."
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs w-64"
          />
          <button
            type="button"
            data-testid="btn-direct-clock-toggle"
            onClick={handleClockInOrOut}
            className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs ${
              openSession
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {openSession ? 'Registrar Salida Ahora' : 'Registrar Entrada Ahora'}
          </button>
        </div>
      </div>

      {/* Filtros administrativos de escritorio */}
      {isAdmin && (
        <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Trabajador</label>
            <select
              value={filterWorkerId}
              onChange={(e) => setFilterWorkerId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
            >
              <option value="all">Informe Conjunto (Todos los trabajadores)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Desde fecha</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hasta fecha</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300"
            />
          </div>
          <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 font-bold text-slate-900 text-center">
            Total horas filtradas: {Math.floor(totalMinutes / 60)}h{' '}
            {String(totalMinutes % 60).padStart(2, '0')}m
          </div>
        </div>
      )}

      {/* Tabla con todos los campos mínimos exigidos en el apartado 13 */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-auto overscroll-contain">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-xs">
            <tr>
              <th className="p-3">Trabajador</th>
              <th className="p-3">Fecha completa</th>
              <th className="p-3">Día de la semana</th>
              <th className="p-3">Hora de entrada</th>
              <th className="p-3">Hora de salida</th>
              <th className="p-3">Horas trabajadas</th>
              <th className="p-3">Observaciones</th>
              {isAdmin && <th className="p-3 text-right">Corrección Admin</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSessions.map((s) => {
              const worker = profiles.find((p) => p.id === s.user_id);
              const dur = calculateDuration(s.clock_in_at, s.clock_out_at);
              const inDate = formatDateES(s.clock_in_at, tz);
              const outDate = s.clock_out_at ? formatDateES(s.clock_out_at, tz) : null;
              const isMultiDay = Boolean(outDate && inDate !== outDate);
              const inWeekday = getWeekdayNameES(s.clock_in_at, tz);
              const outWeekday = s.clock_out_at ? getWeekdayNameES(s.clock_out_at, tz) : null;

              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-900">
                    {worker?.full_name || s.user_id}
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-slate-800">{inDate}</div>
                    {isMultiDay && (
                      <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                        Salida: {outDate}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="text-slate-700">{inWeekday}</div>
                    {isMultiDay && (
                      <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                        a {outWeekday}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono font-bold text-emerald-700">
                    {formatTimeES(s.clock_in_at, tz)}
                  </td>
                  <td className="p-3 font-mono font-bold text-blue-700">
                    {s.clock_out_at ? formatTimeES(s.clock_out_at, tz) : 'ABIERTA'}
                  </td>
                  <td className="p-3 font-bold">{dur.formatted}</td>
                  <td className="p-3 text-slate-600">
                    <div className="space-y-1">
                      <div>
                        {[s.worker_notes_in, s.worker_notes_out].filter(Boolean).join(' / ') || '—'}
                      </div>
                      {(s.worker_notes_in?.includes('por defecto') ||
                        s.worker_notes_out?.includes('automático') ||
                        s.worker_notes_out?.includes('por defecto')) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Horario automático
                        </span>
                      )}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="p-3 text-right space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSessionId(s.id);
                          setAdminUserId(s.user_id);
                          const dIn = parseDateRobust(s.clock_in_at);
                          const dOut = s.clock_out_at ? parseDateRobust(s.clock_out_at) : null;
                          const fmtLocal = (d: Date) => {
                            const y = d.getFullYear();
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const day = String(d.getDate()).padStart(2, '0');
                            const h = String(d.getHours()).padStart(2, '0');
                            const min = String(d.getMinutes()).padStart(2, '0');
                            return `${y}-${m}-${day}T${h}:${min}`;
                          };
                          setAdminClockIn(dIn ? fmtLocal(dIn) : s.clock_in_at.slice(0, 16));
                          setAdminClockOut(dOut ? fmtLocal(dOut) : '');
                          setAdminNotesIn(s.worker_notes_in);
                          setAdminReason('');
                          setShowAdminModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 font-semibold"
                      >
                        <Edit3 className="w-3 h-3" /> Corregir
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          requestDeleteConfirmation({
                            recordName: `Fichaje de ${worker?.full_name} (${formatDateES(
                              s.clock_in_at,
                              tz
                            )})`,
                            consequence:
                              'Se aplicará borrado lógico conservando datos originales y motivo en trazabilidad.',
                            requireReason: true,
                            onConfirm: (reason) => {
                              backend.adminSoftDeleteAttendance(s.id, reason);
                              refresh();
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 bg-red-50 text-red-700 font-semibold"
                      >
                        <Trash2 className="w-3 h-3" /> Borrar
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Trazabilidad de correcciones administrativas */}
      {isAdmin && corrections.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
          <h3 className="font-bold text-slate-900">
            Historial de Correcciones Administrativas de Fichajes ({corrections.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {corrections.map((c) => (
              <div key={c.id} className="py-2 flex flex-wrap justify-between gap-2">
                <div>
                  <strong>Motivo:</strong> {c.reason} ·{' '}
                  <span className="text-slate-500">
                    Antes: {formatDateTimeES(c.previous_data.clock_in_at, tz)} →{' '}
                    {formatDateTimeES(c.previous_data.clock_out_at, tz)} | Nuevo:{' '}
                    {formatDateTimeES(c.new_data.clock_in_at, tz)} →{' '}
                    {formatDateTimeES(c.new_data.clock_out_at, tz)}
                  </span>
                </div>
                <div className="text-slate-500">{formatDateTimeES(c.corrected_at, tz)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveAdminCorrection}
            className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-md w-full h-full sm:h-auto overflow-y-auto p-5 sm:p-6 space-y-3.5 text-xs flex flex-col justify-between"
          >
            <h3 className="text-base font-bold text-slate-900">
              {editingSessionId
                ? 'Corregir Fichaje Existente (Con Trazabilidad)'
                : 'Añadir Fichaje Administrativo'}
            </h3>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trabajador *</label>
              <select
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 bg-white"
              >
                <option value="">-- Trabajador a seleccionar --</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Entrada *</label>
                <DateTimePickerField
                  value={adminClockIn}
                  onChange={setAdminClockIn}
                  required
                  testId="input-admin-clock-in"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Salida</label>
                <DateTimePickerField
                  value={adminClockOut}
                  onChange={setAdminClockOut}
                  testId="input-admin-clock-out"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
              <input
                type="text"
                value={adminNotesIn}
                onChange={(e) => setAdminNotesIn(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Motivo obligatorio de la corrección/alta administrativa *
              </label>
              <input
                type="text"
                required
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="Ej. Olvido de fichaje de salida confirmado por encargado"
                className="w-full px-3 py-1.5 rounded border border-slate-300"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="px-3 py-1.5 rounded border border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-blue-600 text-white font-bold"
              >
                Guardar con Auditoría
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
