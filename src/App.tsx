import React, { useState, useEffect, useMemo } from 'react';
import {
  Menu,
  X,
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  ShoppingCart,
  Clock,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  DatabaseBackup,
  Settings,
  LogOut,
  Plus,
  Wifi,
  WifiOff,
  Archive,
  Trash2,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  FileText,
  ArrowUpRight,
  Euro,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wrench,
  MapPin,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { defaultBackend } from './services/backendEngine';
import { WorkOrder, WorkOrderAssignment } from './types/domain';
import {
  PhoneActionLinks,
  ScreenHeaderBar,
  UIConfirmationProvider,
  useUIConfirmation,
  WorkOrderStatusBadge,
} from './components/CommonUI';
import { WorkOrderCreateModal, WorkOrderDetailView } from './components/WorkOrdersModule';
import {
  AttendanceAndReportsModule,
  ReviewsAndNotificationsModule,
  ShoppingListModule,
} from './components/OperationalModules';
import { AdminSystemModule, MasterDataAndUsersModule } from './components/AdminAndMasterModules';
import { ImportExportModule } from './components/ImportExportModule';
import {
  formatCentsToEUR,
  formatDateES,
  formatDateTimeES,
  formatTimeES,
  getCurrentLocalDate,
  getLocalDateString,
  getReviewAlertInfo,
  getWeekDays,
  parseDateRobust,
  sanitizeTimezone,
  WeekDayInfo,
} from './utils/formatters';
import { isMobilePreviewEnabled } from './config/branchConfig';

type ActiveRoute =
  | 'dashboard'
  | 'agenda'
  | 'work_orders_list'
  | 'work_order_detail'
  | 'archived_work_orders'
  | 'trash_work_orders'
  | 'reviews'
  | 'shopping'
  | 'attendance'
  | 'masters'
  | 'import_export'
  | 'admin_system';

const DEFAULT_WO_COLUMNS = [
  'code',
  'customer',
  'address',
  'planned_work',
  'scheduled_at',
  'created_at',
  'operators',
  'status',
];

const MONTHS_ES = [
  { value: 'all', label: 'Todos los meses' },
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const WorkOrderMobileCard: React.FC<{
  wo: WorkOrder;
  tz: string;
  assignments: WorkOrderAssignment[];
  getUserName: (id: string) => string;
  onOpenDetail: (id: string) => void;
  onReschedule: (wo: WorkOrder) => void;
}> = ({ wo, tz, assignments, getUserName, onOpenDetail, onReschedule }) => {
  const woOps = assignments
    .filter((a) => a.work_order_id === wo.id)
    .map((a) => getUserName(a.operator_id));

  const isReopenedCard =
    wo.status === 'reabierto' ||
    Boolean(wo.reopened_at && (!wo.closed_at || wo.reopened_at > wo.closed_at));

  return (
    <div
      key={wo.id}
      data-testid={`operator-card-${wo.id}`}
      className={`bg-white rounded-2xl border-2 p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between ${
        isReopenedCard
          ? 'border-[#78350f]'
          : wo.status === 'en_curso'
          ? 'border-amber-400'
          : wo.status === 'no_iniciado'
          ? 'border-blue-400'
          : wo.status === 'terminado'
          ? 'border-emerald-400'
          : 'border-slate-300'
      }`}
    >
      <div className="space-y-2.5">
        {/* BANNER DESTACADO DE FECHA Y HORA PREVISTA */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-sm space-y-2.5">
          {/* Fila superior: etiqueta de fecha en dos líneas y código de parte */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-blue-100 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider leading-tight text-blue-100">
                <div>Fecha y Hora</div>
                <div>Prevista</div>
              </div>
            </div>
            <span className="font-mono font-extrabold text-xs px-3 py-1 rounded-md bg-white/15 border border-white/25 text-white shadow-2xs shrink-0 whitespace-nowrap tracking-wide">
              {wo.code}
            </span>
          </div>

          {/* Fila inferior: fecha y hora destacada y botón reprogramar */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="text-sm sm:text-base font-black tracking-tight text-white">
              <span>{formatDateES(wo.scheduled_at, tz)}</span>
              <span className="text-blue-200 font-semibold text-xs mx-1.5">a las</span>
              <span>{formatTimeES(wo.scheduled_at, tz)} h</span>
            </div>
            <button
              type="button"
              data-testid={`operator-card-reschedule-${wo.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onReschedule(wo);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-[11px] sm:text-xs font-bold border border-white/30 transition cursor-pointer shadow-xs shrink-0"
              title="Reprogramar fecha y hora prevista"
            >
              Reprogramar
            </button>
          </div>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="text-base font-extrabold text-slate-900 tracking-tight leading-snug">
            {wo.snapshot_customer_name}
          </div>
          <div>
            <WorkOrderStatusBadge
              status={wo.status}
              archivedAt={wo.archived_at}
              reopenedAt={wo.reopened_at}
              reopenReason={wo.reopen_reason}
              closedAt={wo.closed_at}
            />
          </div>
        </div>

        {wo.reopen_reason && (
          <div
            data-testid={`operator-card-reopen-${wo.id}`}
            className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs shadow-2xs space-y-1"
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Parte reabierto por administración:</span>
            </div>
            <p className="font-semibold text-slate-900 pl-5">"{wo.reopen_reason}"</p>
          </div>
        )}

        <div className="text-xs text-slate-700 font-medium">
          📍 {wo.snapshot_address_line}, {wo.snapshot_postal_code} {wo.snapshot_city}
        </div>
        <div className="text-xs">
          <PhoneActionLinks phone={wo.snapshot_contact_phone} />
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
          <strong>Trabajo a realizar:</strong> {wo.planned_work}
        </div>

        {wo.total_amount_cents !== null && (
          <div
            data-testid={`operator-card-amount-${wo.id}`}
            className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between text-emerald-950 text-xs shadow-2xs"
          >
            <div className="flex items-center gap-1.5 font-bold">
              <Euro className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Importe a cobrar:</span>
            </div>
            <span className="font-extrabold text-sm text-emerald-800">
              {formatCentsToEUR(wo.total_amount_cents)}
            </span>
          </div>
        )}

        <div className="text-xs text-slate-600">
          👷 <strong>Equipo asignado:</strong> {woOps.length > 0 ? woOps.join(', ') : 'Sin asignar'}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onOpenDetail(wo.id)}
        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
      >
        Abrir Parte / Gestionar →
      </button>
    </div>
  );
};

const MainApplicationContent: React.FC = () => {
  const backend = defaultBackend;
  const { notifySuccessGreen, notifyError, requestSaveConfirmation } = useUIConfirmation();

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const [loggedUser, setLoggedUser] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const roleParam = params.get('role');
        const userParam = params.get('user');
        if (userParam === 'lucia') {
          return backend.login('lucia@climalux-demo.es', 'Oper1234!');
        }
        if (roleParam === 'operario' || userParam === 'carlos') {
          return backend.login('carlos@climalux-demo.es', 'Oper1234!');
        }
      }
      return backend.login('admin@climalux-demo.es', 'Admin1234!');
    } catch {
      return null;
    }
  });

  const [loginEmail, setLoginEmail] = useState('admin@climalux-demo.es');
  const [loginPass, setLoginPass] = useState('Admin1234!');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);

  const [routeStack, setRouteStack] = useState<ActiveRoute[]>(['dashboard']);
  const currentRoute = routeStack[routeStack.length - 1] || 'dashboard';

  const navigateTo = (next: ActiveRoute) => {
    setRouteStack((prev) => [...prev, next]);
    setMobileMenuOpen(false);
  };

  const navigateBack = () => {
    setRouteStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['dashboard']));
  };

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [woListFilterStatus, setWoListFilterStatus] = useState<
    'all' | 'no_iniciado' | 'en_curso' | 'reabierto' | 'terminado' | 'cerrado'
  >('all');
  const [woSearch, setWoSearch] = useState('');

  // Selectores de periodo en cabecera del Dashboard (estilo Panel de Control)
  const [selectedMonth, setSelectedMonth] = useState<string>('10');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Menú lateral móvil recogido por defecto (Regla 5)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modal de creación de parte
  const [createWoModalProps, setCreateWoModalProps] = useState<{
    open: boolean;
    customerId?: string;
    addressId?: string;
    plannedWork?: string;
    scheduledAt?: string;
    occurrenceId?: string | null;
    amountCents?: number | null;
  }>({ open: false });

  // Modal rápido de reprogramación de fecha y hora prevista (Admin y Operarios)
  const [rescheduleWoModal, setRescheduleWoModal] = useState<{
    open: boolean;
    workOrderId: string;
    code: string;
    currentScheduledAt: string;
  }>({ open: false, workOrderId: '', code: '', currentScheduledAt: '' });
  const [rescheduleDatetimeInput, setRescheduleDatetimeInput] = useState('');
  const [rescheduleReasonInput, setRescheduleReasonInput] = useState('');

  // Planing semanal en Agenda Operativa (0 = semana actual, 1 = semana siguiente)
  const [agendaWeekOffset, setAgendaWeekOffset] = useState<number>(0);

  // Modal rápido de «Añadir a compra» siempre accesible
  const [quickShopModalOpen, setQuickShopModalOpen] = useState(false);
  const [quickShopArticleId, setQuickShopArticleId] = useState('art-1');

  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [adminInitialSection, setAdminInitialSection] = useState<'audit' | 'backups' | 'settings'>(
    'audit'
  );
  const [masterInitialTab, setMasterInitialTab] = useState<
    'customers' | 'addresses' | 'articles' | 'suppliers' | 'review_types' | 'users'
  >('customers');

  const company = useMemo(() => backend.getCompanySettings(), [backend, tick]);

  // Disparador automático de copia de seguridad en la primera apertura diaria de escritorio (Regla 15)
  useEffect(() => {
    if (!loggedUser) return;
    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
    try {
      backend.triggerDailyDesktopAutoBackupIfNeeded({ isDesktopContext: isDesktop });
      refresh();
    } catch {
      // Si está offline, no marca la copia como realizada y reintentará al recuperar red
    }
  }, [loggedUser?.id]);

  // Pantalla de Acceso y Recuperación de Cuenta
  if (!loggedUser) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-7 space-y-5">
          <div className="flex flex-col items-center gap-2 justify-center text-center">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.company_name}
                data-testid="login-company-logo"
                className="h-16 max-w-[220px] object-contain mb-1"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                PT
              </div>
            )}
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight uppercase">
                {company.company_name}
              </h1>
              <p className="text-xs text-slate-500">Gestión de Partes de Trabajo e Instalaciones</p>
            </div>
          </div>

          {!recoveryMode ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const u = backend.login(loginEmail, loginPass);
                  setLoggedUser(u);
                  setRouteStack(['dashboard']);
                } catch (err: any) {
                  notifyError(err?.message || 'Error de autenticación');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contraseña *</label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition"
              >
                Iniciar Sesión
              </button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode(true);
                    setRecoverySent(false);
                  }}
                  className="text-blue-600 hover:underline font-medium"
                >
                  ¿Has olvidado tu contraseña? Recuperar acceso
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                <div className="font-bold">Cuentas de demostración (Datos semilla ficticios):</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@climalux-demo.es');
                      setLoginPass('Admin1234!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold"
                  >
                    Admin (Elena)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('carlos@climalux-demo.es');
                      setLoginPass('Oper1234!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold"
                  >
                    Operario 1 (Carlos)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('lucia@climalux-demo.es');
                      setLoginPass('Oper1234!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold"
                  >
                    Operario 2 (Lucía)
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRecoverySent(true);
              }}
              className="space-y-3 text-xs"
            >
              <h2 className="font-bold text-sm text-slate-900">Recuperación de Acceso</h2>
              <p className="text-slate-600">
                Introduce tu correo corporativo para recibir el enlace de restablecimiento de contraseña.
              </p>
              <input
                type="email"
                required
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="tu-correo@empresa.es"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
              {recoverySent && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                  Si el correo corresponde a un usuario activo, se ha enviado la solicitud de recuperación.
                </div>
              )}
              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setRecoveryMode(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300"
                >
                  Volver al acceso
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
                >
                  Enviar enlace
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const isAdmin = loggedUser.role === 'admin';
  const tz = sanitizeTimezone(company.timezone);

  const allProfiles = useMemo(() => backend.getProfiles(), [backend, tick]);
  const getUserName = (id: string) => allProfiles.find((p) => p.id === id)?.full_name || id;

  const visibleWoColumns = useMemo(() => {
    const prefs = loggedUser.column_preferences?.work_orders_list || DEFAULT_WO_COLUMNS;
    let cols = prefs.includes('scheduled_at') ? prefs : [...prefs, 'scheduled_at'];
    if (!cols.includes('planned_work')) {
      const addrIdx = cols.indexOf('address');
      if (addrIdx !== -1) {
        cols = [...cols.slice(0, addrIdx + 1), 'planned_work', ...cols.slice(addrIdx + 1)];
      } else {
        cols = [...cols, 'planned_work'];
      }
    }
    return cols;
  }, [loggedUser.column_preferences]);

  const handleToggleWoColumn = (colKey: string) => {
    const next = visibleWoColumns.includes(colKey)
      ? visibleWoColumns.filter((k) => k !== colKey)
      : [...visibleWoColumns, colKey];
    const updatedProfile = backend.saveUserColumnPreferences('work_orders_list', next);
    setLoggedUser(updatedProfile);
  };

  // Datos operativos según rol
  const activeWorkOrders = backend.getWorkOrders({ includeArchived: false });
  const archivedWorkOrders = isAdmin ? backend.getWorkOrders({ onlyArchived: true }) : [];
  const trashWorkOrders = isAdmin ? backend.getWorkOrders({ onlyDeletedTrash: true }) : [];
  const assignments = backend.getWorkOrderAssignments();
  const shoppingRequests = backend.getShoppingRequests();
  const pendingShoppingCount = shoppingRequests.filter(
    (s) => s.status === 'pending_quantity' || s.status === 'pending_purchase'
  ).length;
  const openAttendance = backend.getOpenAttendanceSessionForCurrentUser();
  const articlesCatalog = backend.getArticles(false);

  // Contadores de las 5 tarjetas obligatorias del Dashboard Administrativo (Regla 5):
  const countNoIniciados = activeWorkOrders.filter((w) => w.status === 'no_iniciado').length;
  const countEnCurso = activeWorkOrders.filter((w) => w.status === 'en_curso').length;
  const countPendientesCierre = activeWorkOrders.filter((w) => w.status === 'terminado').length;
  const reviewOccurrences = isAdmin ? backend.getReviewOccurrences() : [];
  const installationReviews = isAdmin ? backend.getInstallationReviews() : [];
  const customersCatalog = isAdmin ? backend.getCustomers(true) : [];
  const addressesCatalog = isAdmin ? backend.getCustomerAddresses(undefined, true) : [];
  const reviewTypesCatalog = isAdmin ? backend.getReviewTypes(true) : [];

  const upcomingDashboardReviews = reviewOccurrences
    .filter((o) => o.status === 'pendiente' || o.status === 'programada')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((occ) => {
      const rev = installationReviews.find((r) => r.id === occ.installation_review_id);
      const cust = customersCatalog.find((c) => c.id === rev?.customer_id);
      const addr = addressesCatalog.find((a) => a.id === rev?.customer_address_id);
      const rType = reviewTypesCatalog.find((rt) => rt.id === rev?.review_type_id);
      return { occ, rev, cust, addr, rType };
    });

  const countRevisionesPendientes = upcomingDashboardReviews.length;

  // Importes facturados/cobrados para resumen visual en tarjetas
  const totalFinishedCents = activeWorkOrders
    .filter((w) => w.status === 'terminado' || w.status === 'cerrado')
    .reduce((acc, w) => acc + (w.total_amount_cents || 0), 0);

  // Helper: indica si un parte ya ha sido realizado / finalizado
  const isWoFinished = (status: string, reopenedAt?: string | null, closedAt?: string | null) => {
    if (status === 'reabierto') return false;
    if (reopenedAt && (!closedAt || reopenedAt > closedAt)) return false;
    return status === 'terminado' || status === 'cerrado';
  };

  // Ordenación de partes: fecha y hora prevista estrictamente ascendente (sin tener en cuenta el estado del parte)
  const dashboardSortedWorkOrders = [...activeWorkOrders].sort((a, b) => {
    const timeA = a.scheduled_at
      ? parseDateRobust(a.scheduled_at)?.getTime() ?? Number.MAX_SAFE_INTEGER
      : Number.MAX_SAFE_INTEGER;
    const timeB = b.scheduled_at
      ? parseDateRobust(b.scheduled_at)?.getTime() ?? Number.MAX_SAFE_INTEGER
      : Number.MAX_SAFE_INTEGER;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    const createA = parseDateRobust(a.created_at)?.getTime() ?? 0;
    const createB = parseDateRobust(b.created_at)?.getTime() ?? 0;
    if (createA !== createB) {
      return createA - createB;
    }
    return a.code.localeCompare(b.code);
  });

  const agendaSortedWorkOrders = dashboardSortedWorkOrders;

  // Partes pendientes específicos para la vista móvil despejada del Administrador (Regla: igual al operario)
  const pendingAdminWorkOrders = useMemo(
    () => agendaSortedWorkOrders.filter((w) => w.status === 'no_iniciado' || w.status === 'en_curso' || w.status === 'reabierto'),
    [agendaSortedWorkOrders]
  );
  const [adminMobileFilter, setAdminMobileFilter] = useState<'pendientes' | 'todos'>('pendientes');
  const [adminMobileShowDashboard, setAdminMobileShowDashboard] = useState(false);

  // Cálculos para el Planing Semanal de la Agenda Operativa (Lunes a Viernes, días laborables)
  const todayLocalDate = getCurrentLocalDate(tz);
  const currentWeekDays = useMemo(() => getWeekDays(todayLocalDate, 0, tz, true), [todayLocalDate, tz]);
  const nextWeekDays = useMemo(() => getWeekDays(todayLocalDate, 1, tz, true), [todayLocalDate, tz]);
  const selectedWeekDays = useMemo(
    () => getWeekDays(todayLocalDate, agendaWeekOffset, tz, true),
    [todayLocalDate, agendaWeekOffset, tz]
  );

  const currentWeekRangeLabel = `${currentWeekDays[0].dayNumber} ${currentWeekDays[0].monthShort} – ${currentWeekDays[currentWeekDays.length - 1].dayNumber} ${currentWeekDays[currentWeekDays.length - 1].monthShort}`;
  const nextWeekRangeLabel = `${nextWeekDays[0].dayNumber} ${nextWeekDays[0].monthShort} – ${nextWeekDays[nextWeekDays.length - 1].dayNumber} ${nextWeekDays[nextWeekDays.length - 1].monthShort}`;

  // Agrupación de partes de trabajo por día civil en la semana seleccionada:
  // Los partes pendientes de realizar van arriba (hora ascendente) y los ya realizados pasan al final del día
  const weekWorkOrdersByDay = useMemo(() => {
    const map = new Map<string, typeof activeWorkOrders>();
    selectedWeekDays.forEach((d) => map.set(d.dateStr, []));
    for (const wo of activeWorkOrders) {
      const dStr = getLocalDateString(wo.scheduled_at, tz);
      if (map.has(dStr)) {
        map.get(dStr)!.push(wo);
      }
    }
    // Dentro de cada día: orden cronológico por hora prevista
    map.forEach((list) => {
      list.sort((a, b) => {
        const timeA = parseDateRobust(a.scheduled_at)?.getTime() ?? 0;
        const timeB = parseDateRobust(b.scheduled_at)?.getTime() ?? 0;
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return a.code.localeCompare(b.code);
      });
    });
    return map;
  }, [selectedWeekDays, activeWorkOrders, tz]);

  // Agrupación de revisiones por día civil en la semana seleccionada
  const weekReviewsByDay = useMemo(() => {
    const map = new Map<string, typeof reviewOccurrences>();
    selectedWeekDays.forEach((d) => map.set(d.dateStr, []));
    for (const occ of reviewOccurrences) {
      if (occ.status === 'realizada' || occ.status === 'cancelada') continue;
      if (map.has(occ.due_date)) {
        map.get(occ.due_date)!.push(occ);
      }
    }
    return map;
  }, [selectedWeekDays, reviewOccurrences]);

  // Totales de la semana seleccionada
  const totalWeekWorkOrders = useMemo(() => {
    let count = 0;
    weekWorkOrdersByDay.forEach((list) => {
      count += list.length;
    });
    return count;
  }, [weekWorkOrdersByDay]);

  const handleQuickClockToggle = () => {
    try {
      if (!openAttendance) {
        const s = backend.clockIn('Fichaje rápido desde barra persistente');
        notifySuccessGreen(`Entrada registrada (${formatTimeES(s.clock_in_at, tz)})`);
      } else {
        const s = backend.clockOut('Salida desde barra persistente');
        notifySuccessGreen(`Salida registrada (${formatTimeES(s.clock_out_at, tz)})`);
      }
      refresh();
    } catch (err: any) {
      notifyError(err?.message || 'Error al fichar');
    }
  };

  const handleQuickAddShopping = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = backend.requestShoppingArticle({ article_id: quickShopArticleId });
      setQuickShopModalOpen(false);
      notifySuccessGreen(
        res.mergedExisting
          ? 'Artículo ya pendiente: registrada tu solicitud adicional sin duplicar fila.'
          : 'Artículo añadido a la lista de compra.'
      );
      refresh();
    } catch (err: any) {
      notifyError(err?.message || 'Error al añadir a compra');
    }
  };

  const handleSwitchSessionRoleDemo = (email: string, pass: string) => {
    try {
      const u = backend.login(email, pass);
      setLoggedUser(u);
      setRouteStack(['dashboard']);
      setSelectedWorkOrderId(null);
      setMobileMenuOpen(false);
    } catch (err: any) {
      notifyError(err?.message);
    }
  };

  const handleLogout = () => {
    backend.logout();
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_SENSITIVE_CACHE' });
    }
    setLoggedUser(null);
  };

  // Cálculo para los dos gráficos interactivos del Panel de Control (al estilo de la captura de referencia)
  const totalForPie = Math.max(
    1,
    countNoIniciados + countEnCurso + countPendientesCierre + archivedWorkOrders.length
  );
  const pctNoIniciado = Math.round((countNoIniciados / totalForPie) * 100);
  const pctEnCurso = Math.round((countEnCurso / totalForPie) * 100);
  const pctTerminado = Math.round((countPendientesCierre / totalForPie) * 100);
  const pctArchivado = Math.max(0, 100 - pctNoIniciado - pctEnCurso - pctTerminado);

  // PLANING SEMANAL INTERACTIVO REUTILIZABLE (INICIO Y AGENDA)
  const renderWeeklyPlanningSection = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4" data-testid="weekly-planning-board">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-slate-900">
                Planing Semanal de Trabajos y Horarios
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                {totalWeekWorkOrders} {totalWeekWorkOrders === 1 ? 'parte' : 'partes'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Semana del {selectedWeekDays[0].formattedDate} al{' '}
              {selectedWeekDays[selectedWeekDays.length - 1].formattedDate} (Lunes a Viernes)
            </p>
          </div>
        </div>

        {/* BOTONES PARA CAMBIAR ENTRE SEMANA ACTUAL Y SIGUIENTE */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="btn-agenda-current-week"
            onClick={() => setAgendaWeekOffset(0)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              agendaWeekOffset === 0
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Semana Actual ({currentWeekRangeLabel})</span>
            {agendaWeekOffset === 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            data-testid="btn-agenda-next-week"
            onClick={() => setAgendaWeekOffset(1)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              agendaWeekOffset === 1
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>Semana Siguiente ({nextWeekRangeLabel})</span>
            {agendaWeekOffset === 1 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
            <button
              type="button"
              title="Semana anterior"
              onClick={() => setAgendaWeekOffset((p) => p - 1)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Semana posterior"
              onClick={() => setAgendaWeekOffset((p) => p + 1)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CUADRÍCULA DE LOS 5 DÍAS LABORABLES (LUNES A VIERNES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 items-start">
        {selectedWeekDays.map((day) => {
          const dayWos = weekWorkOrdersByDay.get(day.dateStr) || [];
          const dayRevs = weekReviewsByDay.get(day.dateStr) || [];

          return (
            <div
              key={day.dateStr}
              className={`rounded-2xl border transition-all overflow-hidden flex flex-col ${
                day.isToday
                  ? 'bg-blue-50/30 border-blue-400 ring-2 ring-blue-200 shadow-sm'
                  : 'bg-slate-50/50 border-slate-200'
              }`}
            >
              {/* Cabecera del día */}
              <div
                className={`p-3 border-b flex items-center justify-between ${
                  day.isToday
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white text-slate-900 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs">
                      {day.weekdayName}
                    </span>
                    {day.isToday && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black tracking-wide">
                        HOY
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[11px] ${
                      day.isToday ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {day.dayNumber} {day.monthShort}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    day.isToday
                      ? 'bg-blue-700 text-blue-100'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {dayWos.length}
                </span>
              </div>

              {/* Lista de trabajos y horas del día */}
              <div className="p-2 space-y-2.5 min-h-[140px] flex-1">
                {dayWos.length === 0 && dayRevs.length === 0 ? (
                  <div className="h-full py-8 text-center flex flex-col items-center justify-center text-slate-400 text-[11px]">
                    <Clock className="w-4 h-4 text-slate-300 mb-1 opacity-60" />
                    <span>Sin trabajos</span>
                  </div>
                ) : (
                  <>
                    {dayWos.map((wo) => {
                      const finished = isWoFinished(wo.status, wo.reopened_at, wo.closed_at);
                      return (
                        <div
                          key={wo.id}
                          onClick={() => {
                            setSelectedWorkOrderId(wo.id);
                            navigateTo('work_order_detail');
                          }}
                          className={`rounded-xl p-3 border transition space-y-2 text-left cursor-pointer ${
                            finished
                              ? 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                              : 'bg-white border-slate-200 shadow-2xs hover:border-blue-500 hover:shadow-sm'
                          }`}
                          title={
                            finished
                              ? 'Parte ya realizado (clic para ver detalle)'
                              : 'Próximo trabajo a realizar (clic para ver detalle)'
                          }
                        >
                          {/* Hora y situación del parte */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-extrabold text-[11px] shadow-2xs ${
                                finished
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              {finished ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {formatTimeES(wo.scheduled_at, tz)} h
                            </span>
                            <WorkOrderStatusBadge
                              status={wo.status}
                              archivedAt={wo.archived_at}
                              reopenedAt={wo.reopened_at}
                              reopenReason={wo.reopen_reason}
                              closedAt={wo.closed_at}
                              compact
                            />
                          </div>

                          {/* Nombre del cliente */}
                          <div
                            className={`font-bold text-xs sm:text-[13px] leading-snug ${
                              finished ? 'text-slate-600' : 'text-slate-900'
                            }`}
                            title={wo.snapshot_customer_name}
                          >
                            {wo.snapshot_customer_name}
                          </div>

                          {/* Aviso de reapertura si fue devuelto por administración */}
                          {wo.reopen_reason && (
                            <div
                              className="text-[11px] font-bold text-amber-950 bg-amber-100 border border-amber-300 rounded-md px-2 py-0.5 flex items-center gap-1 shadow-2xs"
                              title={`Parte Reabierto: ${wo.reopen_reason}`}
                            >
                              <RotateCcw className="w-3 h-3 text-amber-700 shrink-0" />
                              <span className="truncate">Reabierto: {wo.reopen_reason}</span>
                            </div>
                          )}

                          {/* Trabajo a realizar destacado */}
                          <div
                            className={`text-xs sm:text-[13px] font-bold leading-snug px-2.5 py-1.5 rounded-lg border transition ${
                              finished
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-blue-50/90 text-blue-950 border-blue-200/80 shadow-2xs'
                            }`}
                            title={wo.planned_work}
                          >
                            <span className="flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="break-words">{wo.planned_work}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Revisiones previstas para este día */}
                    {dayRevs.map((occ) => {
                      return (
                        <div
                          key={occ.id}
                          onClick={() => navigateTo('reviews')}
                          className="bg-amber-50/70 border border-amber-200 rounded-xl p-2 space-y-1 text-left text-xs cursor-pointer hover:border-amber-400 transition"
                          title="Gestionar revisión"
                        >
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-600 text-white font-bold text-[10px]">
                            Revisión
                          </span>
                          <div className="text-xs sm:text-[13px] font-medium text-slate-800 leading-relaxed">
                            {occ.notes || 'Revisión periódica'}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f4f6fa] text-slate-900">
      {/* =====================================================================
          BARRA LATERAL IZQUIERDA OSCURA A TODA ALTURA (ESTILO PANEL DE CONTROL)
          En móvil permanece recogida y se abre con su botón (Regla 5)
      ===================================================================== */}
      <aside
        data-testid="sidebar-navigation"
        className={`${
          mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'
        } lg:flex lg:sticky lg:top-0 lg:h-screen w-64 shrink-0 bg-[#0b1120] text-slate-300 flex-col border-r border-slate-800/80 select-none`}
      >
        {/* Cabecera de marca en Sidebar */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-slate-800/80">
          <div
            className="flex items-center gap-3 cursor-pointer min-w-0"
            onClick={() => setRouteStack(['dashboard'])}
          >
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.company_name}
                data-testid="sidebar-company-logo"
                className="w-10 h-10 rounded-xl object-contain bg-white/10 p-0.5 shadow-md border border-white/20 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-md shrink-0">
                PT
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-extrabold tracking-wider text-white uppercase truncate">
                {company.company_name.split(' ')[0]}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Partes de Trabajo
              </div>
            </div>
          </div>
          {mobileMenuOpen && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 rounded text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tarjeta de Sesión / Instalación Activa (igual al recuadro superior del sidebar de la captura) */}
        <div className="p-3.5">
          <div className="rounded-xl bg-[#131c31] border border-slate-700/70 p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>SESIÓN E INSTALACIÓN</span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setCreateWoModalProps({ open: true })}
                  className="text-blue-400 hover:text-blue-300 font-bold"
                >
                  + Nuevo
                </button>
              )}
            </div>

            <select
              aria-label="Cambiar sesión activa para verificar permisos"
              data-testid="select-active-session-user"
              value={loggedUser.email}
              onChange={(e) => {
                const email = e.target.value;
                const pass = email.startsWith('admin') ? 'Admin1234!' : 'Oper1234!';
                handleSwitchSessionRoleDemo(email, pass);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0b1120] border border-slate-700 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="admin@climalux-demo.es">Elena Martín (Admin)</option>
              <option value="carlos@climalux-demo.es">Carlos Gómez (Operario 1)</option>
              <option value="lucia@climalux-demo.es">Lucía Fernández (Operario 2)</option>
              <option value="david@climalux-demo.es">David Ruiz (Operario 3)</option>
            </select>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[11px] text-slate-400 truncate max-w-[110px]">
                {company.work_order_prefix} · {company.currency}
              </span>
              <span
                className={`px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wide ${
                  isAdmin
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                    : 'bg-blue-500/15 border-blue-500/50 text-blue-400'
                }`}
              >
                {isAdmin ? 'ADMINISTRADOR' : 'OPERARIO'}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de navegación lateral con píldora azul activa */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto text-[13px] font-medium">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              currentRoute === 'dashboard'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Inicio</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  setWoListFilterStatus('all');
                  navigateTo('work_orders_list');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'work_orders_list'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                <span>Todos los partes</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('archived_work_orders')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'archived_work_orders'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Archive className="w-4 h-4 shrink-0" />
                <span>Partes archivados</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('reviews')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'reviews'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <CalendarClock className="w-4 h-4 shrink-0" />
                <span>Revisiones periódicas</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => navigateTo('shopping')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition ${
              currentRoute === 'shopping'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>Lista de compra</span>
            </span>
            {pendingShoppingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {pendingShoppingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigateTo('attendance')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
              currentRoute === 'attendance'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>Fichaje e informes</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMasterInitialTab('customers');
                  navigateTo('masters');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'masters' && masterInitialTab !== 'users'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Catálogos y clientes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMasterInitialTab('users');
                  navigateTo('masters');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'masters' && masterInitialTab === 'users'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Usuarios y permisos</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('import_export')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'import_export'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Importar Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuditEntityFilter('');
                  setAdminInitialSection('backups');
                  navigateTo('admin_system');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'admin_system' && adminInitialSection === 'backups'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <DatabaseBackup className="w-4 h-4 shrink-0" />
                <span>Copias de seguridad</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('trash_work_orders')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'trash_work_orders'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Papelera de partes</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuditEntityFilter('');
                  setAdminInitialSection('audit');
                  navigateTo('admin_system');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'admin_system' && adminInitialSection === 'audit'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Auditoría técnica</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuditEntityFilter('');
                  setAdminInitialSection('settings');
                  navigateTo('admin_system');
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                  currentRoute === 'admin_system' && adminInitialSection === 'settings'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Configuración</span>
              </button>
            </>
          )}
        </nav>

        {/* Enlace para descargar el Manual del Operario en PDF */}
        <div className="px-3 pb-2">
          <a
            href="/Manual_Operario_App_Partes_Trabajo.pdf"
            download="Manual_Operario_App_Partes_Trabajo.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-blue-300 bg-blue-950/60 border border-blue-800/80 hover:bg-blue-900/80 hover:text-white transition shadow-2xs"
            title="Descargar Manual Completo de Uso para Operarios (PDF con capturas)"
          >
            <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Manual Operario (PDF)</span>
          </a>
        </div>

        {/* Pie del Sidebar: Cerrar sesión */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión ({loggedUser.full_name.split(' ')[0]})</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          COLUMNA PRINCIPAL DERECHA (BARRA SUPERIOR BLANCA + CONTENIDO CENTRAL)
      ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 pb-20">
        {/* Barra Superior Blanca (idéntica a la captura: insignia azul a la izquierda, metadatos de rol/moneda/zona horaria, botón recargar y CTA azul a la derecha) */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 px-4 lg:px-7 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Botón de menú móvil */}
            <button
              type="button"
              data-testid="btn-toggle-mobile-menu"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
              aria-label="Abrir o cerrar menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {company.logo_url ? (
              <div className="flex items-center gap-2">
                <img
                  src={company.logo_url}
                  alt={company.company_name}
                  data-testid="header-company-logo"
                  className="h-8 max-w-[130px] object-contain shrink-0"
                />
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-extrabold tracking-wide uppercase">
                  {company.company_name.split(' ')[0]}
                </span>
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-extrabold tracking-wide uppercase">
                {company.company_name.split(' ')[0]}
              </span>
            )}

            {/* Selector rápido de cuenta visible también en móvil sin abrir el menú */}
            <select
              aria-label="Cambiar cuenta activa (Admin u Operario)"
              value={loggedUser.email}
              onChange={(e) => {
                const email = e.target.value;
                const pass = email.startsWith('admin') ? 'Admin1234!' : 'Oper1234!';
                handleSwitchSessionRoleDemo(email, pass);
              }}
              className={`px-2 py-1 rounded-lg border text-xs font-bold focus:outline-none ${
                isAdmin
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-blue-50 border-blue-300 text-blue-800'
              }`}
            >
              <option value="admin@climalux-demo.es">👤 Admin (Elena)</option>
              <option value="carlos@climalux-demo.es">👷 Operario 1 (Carlos)</option>
              <option value="lucia@climalux-demo.es">👷 Operario 2 (Lucía)</option>
              <option value="david@climalux-demo.es">👷 Operario 3 (David)</option>
            </select>

            <span className="text-xs text-slate-500 hidden md:inline">
              Moneda: <strong className="text-slate-700">{company.currency} (€)</strong> · Zona:{' '}
              <strong className="text-slate-700">{tz}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/Manual_Operario_App_Partes_Trabajo.pdf"
              download="Manual_Operario_App_Partes_Trabajo.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition shadow-2xs"
              title="Descargar Manual Completo de Uso para Operarios (PDF con capturas)"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline">Manual Operario (PDF)</span>
              <span className="sm:hidden">Manual PDF</span>
            </a>
            {/* Selector interactivo de versiones móviles (Solo visible en rama pruebas / desarrollo; omitido en producción Fontanería Roma) */}
            {isMobilePreviewEnabled() && (
              <div className="relative group" data-testid="header-mobile-view-container">
                <a
                  href="/movil.html"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                  title="Abrir simulador con tamaño real de pantalla de móvil y selector de modelos"
                  data-testid="header-mobile-view-link"
                >
                  📱 Vista Móvil <ChevronDown className="w-3 h-3 opacity-60" />
                </a>
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 hidden group-hover:block hover:block text-xs">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                    Versiones Móviles (Pruebas)
                  </div>
                  <a
                    href="/movil.html"
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 font-medium text-slate-700"
                  >
                    <span>📱 Simulador Completo</span>
                    <span className="text-[10px] text-blue-600 font-bold">Abrir ↗</span>
                  </a>
                  <a
                    href="/movil.html"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/movil.html', 'mobile-iphone', 'width=430,height=890,resizable=yes');
                    }}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
                  >
                    <span>🍎 iPhone 15 Pro</span>
                    <span className="text-[10px] text-slate-400">390×844</span>
                  </a>
                  <a
                    href="/movil.html"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/movil.html', 'mobile-android', 'width=450,height=960,resizable=yes');
                    }}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
                  >
                    <span>🤖 Android / Pixel</span>
                    <span className="text-[10px] text-slate-400">412×915</span>
                  </a>
                  <a
                    href="/movil.html"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/movil.html', 'mobile-compact', 'width=390,height=790,resizable=yes');
                    }}
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
                  >
                    <span>📐 Móvil Compacto</span>
                    <span className="text-[10px] text-slate-400">360×740</span>
                  </a>
                </div>
              </div>
            )}
            {/* Botón Simulación Red Online/Offline */}
            <button
              type="button"
              data-testid="btn-toggle-offline"
              onClick={() => {
                const next = !backend.isOffline();
                backend.setOfflineMode(next);
                refresh();
              }}
              title="Probar comportamiento ante pérdida de conexión"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                backend.isOffline()
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {backend.isOffline() ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" /> Sin Red
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Online
                </>
              )}
            </button>

            <button
              type="button"
              onClick={refresh}
              title="Actualizar datos"
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {isAdmin && (
              <button
                type="button"
                data-testid="btn-open-create-wo"
                onClick={() => setCreateWoModalProps({ open: true })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
              >
                <Plus className="w-4 h-4" /> Nuevo parte
              </button>
            )}
          </div>
        </header>

        {/* Aviso de pérdida de conexión (Regla 18) */}
        {backend.isOffline() && (
          <div
            className="bg-red-700 text-white px-4 py-2 text-xs font-bold text-center"
            data-testid="banner-offline-warning"
          >
            ⚠️ Conexión perdida con el servidor. Las escrituras, finalizaciones, fichajes y envíos requieren conexión; tus formularios en pantalla se mantienen sin pérdida de datos.
          </div>
        )}

        {/* Contenedor central de vistas */}
        <main className="flex-1 w-full px-4 lg:px-6 xl:px-8 py-6">
          {/* =================================================================
              1. PANEL DE CONTROL PRINCIPAL (ESTILO CAPTURA DE REFERENCIA)
          ================================================================= */}
          {currentRoute === 'dashboard' && (
            <div className="space-y-6">
              {isAdmin ? (
                <>
                  {/* VISTA MÓVIL EXCLUSIVA DE ADMINISTRADOR (md:hidden): PARTES PENDIENTES EN FORMATO TARJETAS (IGUAL A LA DEL OPERARIO) */}
                  <div className="block md:hidden space-y-4" data-testid="admin-mobile-home-view">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h1 className="text-base font-extrabold text-slate-900 truncate">
                            Partes Pendientes ({pendingAdminWorkOrders.length})
                          </h1>
                          <p className="text-[11px] text-slate-500 truncate">
                            Próximos trabajos por hora prevista (ascendente)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCreateWoModalProps({ open: true })}
                          className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Nuevo</span>
                        </button>
                      </div>

                      {/* Selector de filtro rápido en móvil */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => setAdminMobileFilter('pendientes')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            adminMobileFilter === 'pendientes'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Pendientes ({pendingAdminWorkOrders.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminMobileFilter('todos')}
                          className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                            adminMobileFilter === 'todos'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Todos ({agendaSortedWorkOrders.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminMobileShowDashboard(!adminMobileShowDashboard)}
                          className={`ml-auto px-2.5 py-1.5 rounded-lg font-semibold text-[11px] border cursor-pointer ${
                            adminMobileShowDashboard
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {adminMobileShowDashboard ? 'Ver Partes' : '📊 Métricas'}
                        </button>
                      </div>
                    </div>

                    {adminMobileShowDashboard ? (
                      /* Si el admin en móvil pulsa en Métricas, puede ver el resumen y los contadores en versión móvil */
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3" data-testid="admin-mobile-cards-grid">
                          <button
                            type="button"
                            onClick={() => {
                              setWoListFilterStatus('no_iniciado');
                              navigateTo('work_orders_list');
                            }}
                            className="p-4 rounded-xl bg-blue-600 text-white text-left shadow-xs cursor-pointer"
                          >
                            <div className="text-[11px] font-bold uppercase opacity-85">1. No iniciados</div>
                            <div className="text-2xl font-black mt-1">{countNoIniciados}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWoListFilterStatus('en_curso');
                              navigateTo('work_orders_list');
                            }}
                            className="p-4 rounded-xl bg-amber-500 text-slate-950 text-left shadow-xs cursor-pointer"
                          >
                            <div className="text-[11px] font-bold uppercase opacity-85">2. En curso</div>
                            <div className="text-2xl font-black mt-1">{countEnCurso}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWoListFilterStatus('terminado');
                              navigateTo('work_orders_list');
                            }}
                            className="p-4 rounded-xl bg-emerald-600 text-white text-left shadow-xs cursor-pointer"
                          >
                            <div className="text-[11px] font-bold uppercase opacity-85">3. Pdtes. Cierre</div>
                            <div className="text-2xl font-black mt-1">{countPendientesCierre}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigateTo('reviews')}
                            className="p-4 rounded-xl bg-indigo-600 text-white text-left shadow-xs cursor-pointer"
                          >
                            <div className="text-[11px] font-bold uppercase opacity-85">4. Revisiones</div>
                            <div className="text-2xl font-black mt-1">{countRevisionesPendientes}</div>
                          </button>
                        </div>
                        {renderWeeklyPlanningSection()}
                      </div>
                    ) : (
                      /* VISTA PRINCIPAL POR DEFECTO EN MÓVIL: TARJETAS DE PARTES IGUAL QUE EN OPERARIO */
                      (adminMobileFilter === 'pendientes' ? pendingAdminWorkOrders : agendaSortedWorkOrders).length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                          No hay partes de trabajo en este momento.
                        </div>
                      ) : (
                        <div className="space-y-3.5">
                          {(adminMobileFilter === 'pendientes' ? pendingAdminWorkOrders : agendaSortedWorkOrders).map((wo) => (
                            <WorkOrderMobileCard
                              key={wo.id}
                              wo={wo}
                              tz={tz}
                              assignments={assignments}
                              getUserName={getUserName}
                              onOpenDetail={(id) => {
                                setSelectedWorkOrderId(id);
                                navigateTo('work_order_detail');
                              }}
                              onReschedule={(targetWo) => {
                                setRescheduleDatetimeInput(targetWo.scheduled_at.slice(0, 16));
                                setRescheduleReasonInput('');
                                setRescheduleWoModal({
                                  open: true,
                                  workOrderId: targetWo.id,
                                  code: targetWo.code,
                                  currentScheduledAt: targetWo.scheduled_at,
                                });
                              }}
                            />
                          ))}
                        </div>
                      )
                    )}
                  </div>

                  {/* VISTA ESCRITORIO DE ADMINISTRADOR (hidden md:block): PANEL DE CONTROL COMPLETO */}
                  <div className="hidden md:block space-y-6">
                    {/* Tarjeta de Cabecera del Panel de Control con selectores de Mes y Año */}
                  <div className="bg-white rounded-2xl border border-slate-200/90 px-6 py-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        Panel de Control y Resumen Operativo de Partes
                      </h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Los partes archivados y en papelera quedan excluidos de los contadores operativos en curso.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                      >
                        {MONTHS_ES.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700"
                      >
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                      </select>
                    </div>
                  </div>

                  {/* LAS 5 TARJETAS OBLIGATORIAS DEL ADMINISTRADOR CON EL DISEÑO DE LA CAPTURA */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
                    data-testid="admin-dashboard-five-cards"
                  >
                    {/* Tarjeta 1: Destacada en azul marino intenso (como la 1ª tarjeta de la imagen) */}
                    <button
                      type="button"
                      data-testid="card-no-iniciados"
                      onClick={() => {
                        setWoListFilterStatus('no_iniciado');
                        navigateTo('work_orders_list');
                      }}
                      className="bg-gradient-to-br from-[#1e3a8a] to-[#1d4ed8] text-white rounded-2xl p-5 text-left shadow-md hover:shadow-lg transition flex flex-col justify-between min-h-[132px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-blue-100">
                          1. Partes no iniciados
                        </span>
                        <ClipboardList className="w-4 h-4 text-blue-200" />
                      </div>
                      <div className="text-3xl font-extrabold tracking-tight my-1">
                        {countNoIniciados}
                      </div>
                      <div className="text-[11px] text-blue-100/90 flex items-center gap-1">
                        <span>Estado Azul · Planificados</span>
                      </div>
                    </button>

                    {/* Tarjeta 2: Blanca limpia con métrica en ámbar/naranja */}
                    <button
                      type="button"
                      data-testid="card-en-curso"
                      onClick={() => {
                        setWoListFilterStatus('en_curso');
                        navigateTo('work_orders_list');
                      }}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 text-left shadow-2xs hover:border-amber-400 transition flex flex-col justify-between min-h-[132px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-medium text-slate-500">
                          2. Partes en curso
                        </span>
                        <PlayCircle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-3xl font-extrabold text-amber-600 tracking-tight my-1">
                        {countEnCurso}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Estado Naranja · En intervención
                      </div>
                    </button>

                    {/* Tarjeta 3: Blanca limpia con métrica en verde esmeralda */}
                    <button
                      type="button"
                      data-testid="card-pendientes-cierre"
                      onClick={() => {
                        setWoListFilterStatus('terminado');
                        navigateTo('work_orders_list');
                      }}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 text-left shadow-2xs hover:border-emerald-400 transition flex flex-col justify-between min-h-[132px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-medium text-slate-500">
                          3. Finalizados pdtes. cierre
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-3xl font-extrabold text-emerald-600 tracking-tight my-1">
                        {countPendientesCierre}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Estado Verde · Total: {formatCentsToEUR(totalFinishedCents)}
                      </div>
                    </button>

                    {/* Tarjeta 4: Blanca limpia con métrica en azul/índigo */}
                    <button
                      type="button"
                      data-testid="card-revisiones-pendientes"
                      onClick={() => navigateTo('reviews')}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 text-left shadow-2xs hover:border-blue-400 transition flex flex-col justify-between min-h-[132px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-medium text-slate-500">
                          4. Revisiones pendientes
                        </span>
                        <CalendarClock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-3xl font-extrabold text-blue-600 tracking-tight my-1">
                        {countRevisionesPendientes}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Vencimientos activos en agenda
                      </div>
                    </button>

                    {/* Tarjeta 5: Blanca limpia con enlace «Pulsa para revisar ↗» como la última tarjeta de la imagen */}
                    <button
                      type="button"
                      data-testid="card-lista-compra"
                      onClick={() => navigateTo('shopping')}
                      className="bg-white rounded-2xl border border-slate-200/90 p-5 text-left shadow-2xs hover:border-amber-400 transition flex flex-col justify-between min-h-[132px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-medium text-slate-500">
                          5. Cesta / Lista de compra
                        </span>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-3xl font-extrabold text-amber-600 tracking-tight my-1">
                        {pendingShoppingCount}
                      </div>
                      <div className="text-[11px] font-semibold text-blue-600 flex items-center gap-0.5">
                        <span>Pulsa para revisar</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  </div>

                  {/* PLANING SEMANAL DE TRABAJOS Y HORARIOS EN EL INICIO */}
                  {renderWeeklyPlanningSection()}

                  {/* SECCIÓN PRINCIPAL: DOS COLUMNAS EN ESCRITORIO (PARTES Y REVISIONES) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* COLUMNA 1: LISTADO GENERAL DE PARTES DE MÁS RECIENTE A MÁS ANTIGUO (REGLA 5 OBLIGATORIA) */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-extrabold text-slate-900">
                            Listado General de Partes (Por fecha y hora prevista ascendente)
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Pulsa sobre cualquier parte para abrir su ficha completa, aportaciones, firma o cierre administrativo
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateTo('agenda')}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 shrink-0"
                        >
                          Ver Agenda por Fecha Prevista →
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100" data-testid="dashboard-wo-list">
                        {dashboardSortedWorkOrders.map((wo) => {
                          const woOps = assignments
                            .filter((a) => a.work_order_id === wo.id)
                            .map((a) => getUserName(a.operator_id));
                          const isRowReopened =
                            wo.status === 'reabierto' ||
                            Boolean(wo.reopened_at && (!wo.closed_at || wo.reopened_at > wo.closed_at));
                          return (
                            <div
                              key={wo.id}
                              data-testid={`dashboard-wo-row-${wo.id}`}
                              onClick={() => {
                                setSelectedWorkOrderId(wo.id);
                                navigateTo('work_order_detail');
                              }}
                              className="px-5 py-4 hover:bg-slate-50/90 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition"
                            >
                              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-white shrink-0 mt-0.5 ${
                                    isRowReopened
                                      ? 'bg-[#78350f]'
                                      : wo.status === 'no_iniciado'
                                      ? 'bg-blue-600'
                                      : wo.status === 'en_curso'
                                      ? 'bg-amber-500 text-slate-950'
                                      : wo.status === 'terminado'
                                      ? 'bg-emerald-600'
                                      : 'bg-red-700'
                                  }`}
                                >
                                  {wo.code.slice(-2)}
                                </div>
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono font-extrabold text-sm text-slate-900">
                                      {wo.code}
                                    </span>
                                    <WorkOrderStatusBadge
                                      status={wo.status}
                                      archivedAt={wo.archived_at}
                                      reopenedAt={wo.reopened_at}
                                      reopenReason={wo.reopen_reason}
                                      closedAt={wo.closed_at}
                                    />
                                    <span className="font-bold text-slate-800 truncate">
                                      {wo.snapshot_customer_name}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-extrabold text-xs shadow-2xs">
                                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                      Previsto: {formatDateES(wo.scheduled_at, tz)} ·{' '}
                                      {formatTimeES(wo.scheduled_at, tz)} h
                                    </span>
                                    {wo.status !== 'cerrado' && wo.archived_at === null && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRescheduleDatetimeInput(wo.scheduled_at.slice(0, 16));
                                          setRescheduleReasonInput('');
                                          setRescheduleWoModal({
                                            open: true,
                                            workOrderId: wo.id,
                                            code: wo.code,
                                            currentScheduledAt: wo.scheduled_at,
                                          });
                                        }}
                                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-[11px] font-bold transition cursor-pointer"
                                        title="Reprogramar fecha y hora prevista"
                                      >
                                        Reprogramar
                                      </button>
                                    )}
                                  </div>
                                  {/* Aviso si el parte ha sido reabierto con motivo */}
                                  {wo.reopen_reason && (
                                    <div className="pt-0.5">
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs shadow-2xs">
                                        <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        <span>Parte Reabierto: "{wo.reopen_reason}"</span>
                                      </span>
                                    </div>
                                  )}

                                  {/* Trabajo a realizar destacado */}
                                  <div className="pt-0.5">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/90 text-blue-950 font-bold text-xs sm:text-[13px] shadow-2xs">
                                      <Wrench className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span>{wo.planned_work}</span>
                                    </span>
                                  </div>

                                  {/* Dirección de la instalación / servicio */}
                                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>
                                      {wo.snapshot_address_line} ({wo.snapshot_city})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Alta: {formatDateTimeES(wo.created_at, tz)} · Asignados:{' '}
                                    <strong className="text-slate-600">{woOps.join(', ')}</strong>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <div className="text-left sm:text-right">
                                  <div className="text-sm font-extrabold text-slate-900">
                                    {wo.total_amount_cents !== null
                                      ? formatCentsToEUR(wo.total_amount_cents)
                                      : 'Sin fijar'}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {wo.customer_has_paid
                                      ? 'Pagado'
                                      : wo.total_amount_cents !== null
                                      ? wo.status === 'terminado' || wo.status === 'cerrado'
                                        ? 'Pendiente cobro'
                                        : 'A cobrar'
                                      : 'En curso'}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  data-testid={`btn-open-wo-${wo.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWorkOrderId(wo.id);
                                    navigateTo('work_order_detail');
                                  }}
                                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shrink-0"
                                >
                                  Abrir →
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLUMNA 2: LISTADO DIRECTO DE PRÓXIMAS REVISIONES EN EL PANEL DE CONTROL */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                            <CalendarClock className="w-4 h-4 text-blue-600 shrink-0" />
                            Listado de Próximas Revisiones Periódicas (Por fecha de vencimiento ascendente)
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Consulta directamente las revisiones pendientes y genera su parte de trabajo o abre la gestión de revisiones
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigateTo('reviews')}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 shrink-0"
                        >
                          Ver Todas las Revisiones y Avisos →
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100" data-testid="dashboard-reviews-list">
                        {upcomingDashboardReviews.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500">
                            No hay revisiones periódicas pendientes en este momento.
                          </div>
                        ) : (
                          upcomingDashboardReviews.map(({ occ, rev, cust, addr, rType }) => {
                            const todayLocal = getCurrentLocalDate(tz);
                            const alertInfo = getReviewAlertInfo(occ.due_date, todayLocal);
                            return (
                              <div
                                key={occ.id}
                                data-testid={`dashboard-review-row-${occ.id}`}
                                onClick={() => navigateTo('reviews')}
                                className={`px-5 py-4 hover:bg-slate-50/90 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${alertInfo.borderCardClass}`}
                              >
                                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                  <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold shrink-0 mt-0.5 ${alertInfo.iconBgClass}`}
                                  >
                                    <CalendarClock className="w-5 h-5" />
                                  </div>
                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-extrabold text-xs shadow-2xs border ${
                                          alertInfo.level === 'caducada'
                                            ? 'bg-slate-100 border-black text-black'
                                            : alertInfo.level === 'semana'
                                            ? 'bg-red-50 border-red-300 text-red-900'
                                            : alertInfo.level === 'mes'
                                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                                            : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                                        }`}
                                      >
                                        <Calendar className="w-3.5 h-3.5" />
                                        Vencimiento: {formatDateES(occ.due_date)}
                                      </span>
                                      <span
                                        className={`px-2.5 py-0.5 rounded-full font-black text-xs border shadow-2xs ${alertInfo.badgeClass}`}
                                      >
                                        {alertInfo.label}
                                      </span>
                                      <span className="font-bold text-slate-900 truncate">
                                        {cust?.name || 'Cliente'}
                                      </span>
                                    </div>
                                    <div className="text-slate-600">
                                      <strong>{rType?.name || 'Revisión periódica'}</strong> ·{' '}
                                      <span className="text-slate-500">
                                        {addr?.alias ? `${addr.alias} — ` : ''}
                                        {addr?.address_line} ({addr?.city})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400">
                                      Periodicidad: cada {rType?.periodicity_value}{' '}
                                      {rType?.periodicity_unit}
                                      {occ.notes ? ` · Nota: ${occ.notes}` : ''}
                                      {occ.linked_work_order_id && (
                                        <span className="ml-2 text-blue-700 font-semibold">
                                          · Parte vinculado: {occ.linked_work_order_id}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                  <div className="text-left sm:text-right">
                                    <div className="text-sm font-extrabold text-slate-900">
                                      {formatCentsToEUR(rType?.suggested_price_cents ?? null)}
                                    </div>
                                    <div className="text-[11px] text-slate-400">Tarifa revisión</div>
                                  </div>

                                  {!occ.linked_work_order_id && rev && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCreateWoModalProps({
                                          open: true,
                                          customerId: rev.customer_id,
                                          addressId: rev.customer_address_id,
                                          plannedWork: `${
                                            rType?.name || 'Revisión periódica'
                                          } — Vencimiento ${formatDateES(occ.due_date)}`,
                                          scheduledAt: `${occ.due_date}T09:00`,
                                          occurrenceId: occ.id,
                                          amountCents: rType?.suggested_price_cents ?? null,
                                        });
                                      }}
                                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0"
                                    >
                                      + Generar Parte
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigateTo('reviews');
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shrink-0 cursor-pointer"
                                  >
                                    Ver →
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* TERCERA FILA: DOS PANELES GRÁFICOS INTERACTIVOS EN LA PARTE INFERIOR (SOLO ESCRITORIO; OCULTOS EN MÓVIL) */}
                  <div className="hidden lg:grid lg:grid-cols-2 gap-5">
                    {/* Gráfico 1: Barras Interactivas de Actividad por Estado Operativo */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col justify-between">
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900">
                          Volumen de Partes por Estado Operativo (Interactivo)
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pulsa sobre cualquier barra para filtrar sus partes de trabajo
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-4 gap-4 items-end h-44 px-4">
                        {[
                          {
                            label: 'No iniciados',
                            count: countNoIniciados,
                            color: 'bg-blue-600 hover:bg-blue-700',
                            status: 'no_iniciado' as const,
                          },
                          {
                            label: 'En curso',
                            count: countEnCurso,
                            color: 'bg-amber-500 hover:bg-amber-600',
                            status: 'en_curso' as const,
                          },
                          {
                            label: 'Terminados',
                            count: countPendientesCierre,
                            color: 'bg-emerald-600 hover:bg-emerald-700',
                            status: 'terminado' as const,
                          },
                          {
                            label: 'Archivados',
                            count: archivedWorkOrders.length,
                            color: 'bg-slate-900 hover:bg-slate-800',
                            status: 'cerrado' as const,
                          },
                        ].map((bar) => {
                          const maxVal = Math.max(
                            2,
                            countNoIniciados,
                            countEnCurso,
                            countPendientesCierre,
                            archivedWorkOrders.length
                          );
                          const heightPct = Math.max(18, Math.round((bar.count / maxVal) * 100));
                          return (
                            <div
                              key={bar.label}
                              onClick={() => {
                                if (bar.label === 'Archivados') {
                                  navigateTo('archived_work_orders');
                                } else {
                                  setWoListFilterStatus(bar.status);
                                  navigateTo('work_orders_list');
                                }
                              }}
                              className="flex flex-col items-center justify-end h-full cursor-pointer group"
                            >
                              <span className="text-xs font-extrabold text-slate-700 mb-1.5">
                                {bar.count}
                              </span>
                              <div
                                style={{ height: `${heightPct}%` }}
                                className={`w-full max-w-[68px] rounded-t-lg transition-all ${bar.color}`}
                              />
                              <span className="text-[11px] font-medium text-slate-500 mt-2 text-center">
                                {bar.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-blue-600" /> No iniciado
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-amber-500" /> En curso
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-emerald-600" /> Terminado
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-slate-900" /> Archivado
                        </span>
                      </div>
                    </div>

                    {/* Gráfico 2: Distribución Circular y Carga por Operario / Revisiones */}
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col justify-between">
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-900">
                          Distribución de Carga y Estado de Cierres ({selectedYear})
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Pulsa sobre una categoría para consultar el desglose de operaciones
                        </p>
                      </div>

                      <div className="my-4 flex flex-col sm:flex-row items-center justify-around gap-6">
                        {/* Gráfico circular SVG limpio */}
                        <svg viewBox="0 0 36 36" className="w-36 h-36 -rotate-90 shrink-0">
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke="#e2e8f0"
                            strokeWidth="3.8"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke="#2563eb"
                            strokeWidth="3.8"
                            strokeDasharray={`${pctNoIniciado} ${100 - pctNoIniciado}`}
                            strokeDashoffset="0"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke="#f59e0b"
                            strokeWidth="3.8"
                            strokeDasharray={`${pctEnCurso} ${100 - pctEnCurso}`}
                            strokeDashoffset={`-${pctNoIniciado}`}
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.915"
                            fill="transparent"
                            stroke="#16a34a"
                            strokeWidth="3.8"
                            strokeDasharray={`${pctTerminado} ${100 - pctTerminado}`}
                            strokeDashoffset={`-${pctNoIniciado + pctEnCurso}`}
                          />
                        </svg>

                        <div className="space-y-2.5 text-xs w-full max-w-xs">
                          <div
                            onClick={() => {
                              setWoListFilterStatus('no_iniciado');
                              navigateTo('work_orders_list');
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="flex items-center gap-2 text-slate-700 font-medium">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                              Trabajo no iniciado
                            </span>
                            <strong className="text-slate-900">{countNoIniciados} partes</strong>
                          </div>

                          <div
                            onClick={() => {
                              setWoListFilterStatus('en_curso');
                              navigateTo('work_orders_list');
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="flex items-center gap-2 text-slate-700 font-medium">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                              Trabajo en curso
                            </span>
                            <strong className="text-slate-900">{countEnCurso} partes</strong>
                          </div>

                          <div
                            onClick={() => {
                              setWoListFilterStatus('terminado');
                              navigateTo('work_orders_list');
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="flex items-center gap-2 text-slate-700 font-medium">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                              Pendientes de cierre
                            </span>
                            <strong className="text-slate-900">
                              {countPendientesCierre} ({formatCentsToEUR(totalFinishedCents)})
                            </strong>
                          </div>

                          <div
                            onClick={() => navigateTo('archived_work_orders')}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            <span className="flex items-center gap-2 text-slate-700 font-medium">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                              Cerrados y archivados
                            </span>
                            <strong className="text-slate-900">
                              {archivedWorkOrders.length} ({pctArchivado}%)
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </>
              ) : (
                /* PANTALLA INICIAL DESPEJADA DEL OPERARIO (Regla 5 y Regla 7) */
                <div className="space-y-4" data-testid="operator-home-view">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div>
                      <h1 className="text-lg font-extrabold text-slate-900">
                        Mis Partes de Trabajo Asignados ({agendaSortedWorkOrders.length})
                      </h1>
                      <p className="text-xs text-slate-500">
                        Ordenados por fecha y hora previstas de realización (ascendente)
                      </p>
                    </div>
                  </div>

                  {agendaSortedWorkOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                      No tienes partes pendientes o en curso asignados en este momento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {agendaSortedWorkOrders.map((wo) => (
                        <WorkOrderMobileCard
                          key={wo.id}
                          wo={wo}
                          tz={tz}
                          assignments={assignments}
                          getUserName={getUserName}
                          onOpenDetail={(id) => {
                            setSelectedWorkOrderId(id);
                            navigateTo('work_order_detail');
                          }}
                          onReschedule={(targetWo) => {
                            setRescheduleDatetimeInput(targetWo.scheduled_at.slice(0, 16));
                            setRescheduleReasonInput('');
                            setRescheduleWoModal({
                              open: true,
                              workOrderId: targetWo.id,
                              code: targetWo.code,
                              currentScheduledAt: targetWo.scheduled_at,
                            });
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. AGENDA OPERATIVA DIFERENCIADA */}
          {currentRoute === 'agenda' && (
            <div className="space-y-6">
              <ScreenHeaderBar
                title="Agenda Operativa de Trabajos y Revisiones"
                subtitle="Partes ordenados por el trabajo que tengamos que realizar antes en el día por fecha y hora previstas (ascendente: el primero a ejecutar arriba)"
                onBack={navigateBack}
              />

              {/* PLANING SEMANAL INTERACTIVO */}
              {renderWeeklyPlanningSection()}

              {/* LISTADOS DETALLADOS COMPLEMENTARIOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                  <h2 className="font-bold text-sm text-slate-900">
                    1. Agenda de Partes por Fecha y Hora Previstas (Ascendente: primero a ejecutar arriba)
                  </h2>
                  <div className="divide-y divide-slate-100 text-xs">
                    {agendaSortedWorkOrders.map((wo) => {
                      const finished = isWoFinished(wo.status, wo.reopened_at, wo.closed_at);
                      return (
                        <div
                          key={wo.id}
                          onClick={() => {
                            setSelectedWorkOrderId(wo.id);
                            navigateTo('work_order_detail');
                          }}
                          className={`py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 px-2 rounded-xl transition ${
                            finished ? 'opacity-70' : ''
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-white font-extrabold text-xs shadow-2xs ${
                                  finished ? 'bg-emerald-600' : 'bg-indigo-600'
                                }`}
                              >
                                {finished ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5" />
                                )}
                                {formatDateES(wo.scheduled_at, tz)} · {formatTimeES(wo.scheduled_at, tz)} h
                              </span>
                              <WorkOrderStatusBadge
                                status={wo.status}
                                archivedAt={wo.archived_at}
                                reopenedAt={wo.reopened_at}
                                reopenReason={wo.reopen_reason}
                                closedAt={wo.closed_at}
                                compact
                              />
                              <span className="font-bold text-slate-900 text-xs">
                                {wo.snapshot_customer_name}
                              </span>
                            </div>
                            <div className="text-slate-600 text-xs pl-0.5">
                              {wo.planned_work}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWorkOrderId(wo.id);
                              navigateTo('work_order_detail');
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shrink-0 cursor-pointer"
                          >
                            Ver →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isAdmin && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                    <h2 className="font-bold text-sm text-slate-900">
                      2. Próximas Revisiones por Vencimiento (Ascendente)
                    </h2>
                    <div className="divide-y divide-slate-100 text-xs">
                      {reviewOccurrences
                        .filter((o) => o.status !== 'realizada' && o.status !== 'cancelada')
                        .sort((a, b) => a.due_date.localeCompare(b.due_date))
                        .map((o) => {
                          const todayLocal = getCurrentLocalDate(tz);
                          const alertInfo = getReviewAlertInfo(o.due_date, todayLocal);
                          return (
                            <div key={o.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full font-black text-xs border ${alertInfo.badgeClass}`}>
                                  {alertInfo.shortLabel}
                                </span>
                                <span className={`font-bold ${alertInfo.textClass}`}>
                                  Vencimiento: {formatDateES(o.due_date)}
                                </span>{' '}
                                <span className="text-slate-500">({o.notes || o.status})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigateTo('reviews')}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 font-semibold shrink-0 cursor-pointer"
                              >
                                Gestionar
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. LISTADO GENERAL FILTRABLE DE PARTES */}
          {(currentRoute === 'work_orders_list' ||
            currentRoute === 'archived_work_orders' ||
            currentRoute === 'trash_work_orders') && (
            <div className="space-y-4">
              <ScreenHeaderBar
                title={
                  currentRoute === 'archived_work_orders'
                    ? 'Archivo Histórico de Partes Cerrados'
                    : currentRoute === 'trash_work_orders'
                    ? 'Papelera Administrativa de Partes (Borrado Lógico)'
                    : 'Listado de Partes de Trabajo'
                }
                subtitle="Búsqueda, filtros conservados en sesión y selector de columnas visibles por usuario"
                onBack={navigateBack}
                searchTerm={woSearch}
                onSearchChange={setWoSearch}
                availableColumns={[
                  { key: 'code', label: 'Número de Parte' },
                  { key: 'customer', label: 'Cliente' },
                  { key: 'address', label: 'Dirección Servicio' },
                  { key: 'planned_work', label: 'Trabajo a Realizar' },
                  { key: 'scheduled_at', label: 'Fecha Programada' },
                  { key: 'created_at', label: 'Fecha de Alta' },
                  { key: 'operators', label: 'Operarios Asignados' },
                  { key: 'status', label: 'Estado' },
                ]}
                visibleColumns={visibleWoColumns}
                onToggleColumn={handleToggleWoColumn}
              />

              {currentRoute === 'work_orders_list' && (
                <div className="flex flex-wrap gap-2">
                  {(['all', 'no_iniciado', 'en_curso', 'reabierto', 'terminado', 'cerrado'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setWoListFilterStatus(st)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                          woListFilterStatus === st
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {st === 'all'
                          ? 'Todos los estados activos'
                          : st === 'reabierto'
                          ? 'REABIERTO'
                          : st.toUpperCase()}
                      </button>
                    )
                  )}
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b1120] text-white">
                    <tr>
                      {visibleWoColumns.includes('code') && <th className="p-3.5">N.º Parte</th>}
                      {visibleWoColumns.includes('customer') && <th className="p-3.5">Cliente</th>}
                      {visibleWoColumns.includes('address') && <th className="p-3.5">Dirección</th>}
                      {visibleWoColumns.includes('planned_work') && (
                        <th className="p-3.5 min-w-[220px]">Trabajo a realizar</th>
                      )}
                      {visibleWoColumns.includes('scheduled_at') && (
                        <th className="p-3.5">Previsto</th>
                      )}
                      {visibleWoColumns.includes('created_at') && <th className="p-3.5">Alta</th>}
                      {visibleWoColumns.includes('operators') && (
                        <th className="p-3.5">Operarios</th>
                      )}
                      {visibleWoColumns.includes('status') && (
                        <th className="p-3.5 text-center">Estado</th>
                      )}
                      <th className="p-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(currentRoute === 'archived_work_orders'
                      ? archivedWorkOrders
                      : currentRoute === 'trash_work_orders'
                      ? trashWorkOrders
                      : dashboardSortedWorkOrders.filter((w) =>
                          woListFilterStatus === 'all' ? true : w.status === woListFilterStatus
                        )
                    )
                      .filter(
                        (w) =>
                          !woSearch.trim() ||
                          w.code.toLowerCase().includes(woSearch.toLowerCase()) ||
                          w.snapshot_customer_name
                            .toLowerCase()
                            .includes(woSearch.toLowerCase()) ||
                          w.planned_work.toLowerCase().includes(woSearch.toLowerCase())
                      )
                      .map((wo) => {
                        const ops = assignments
                          .filter((a) => a.work_order_id === wo.id)
                          .map((a) => getUserName(a.operator_id))
                          .join(', ');
                        return (
                          <tr key={wo.id} className="hover:bg-slate-50">
                            {visibleWoColumns.includes('code') && (
                              <td className="p-3.5 font-mono font-bold">{wo.code}</td>
                            )}
                            {visibleWoColumns.includes('customer') && (
                              <td className="p-3.5 font-semibold">{wo.snapshot_customer_name}</td>
                            )}
                            {visibleWoColumns.includes('address') && (
                              <td className="p-3.5">
                                {wo.snapshot_address_line} ({wo.snapshot_city})
                              </td>
                            )}
                            {visibleWoColumns.includes('planned_work') && (
                              <td className="p-3.5 max-w-[280px]">
                                <div className="font-medium text-slate-800 text-xs leading-relaxed line-clamp-2" title={wo.planned_work}>
                                  {wo.planned_work || '—'}
                                </div>
                              </td>
                            )}
                            {visibleWoColumns.includes('scheduled_at') && (
                              <td className="p-3.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-extrabold">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                  {formatDateES(wo.scheduled_at, tz)} · {formatTimeES(wo.scheduled_at, tz)} h
                                </span>
                              </td>
                            )}
                            {visibleWoColumns.includes('created_at') && (
                              <td className="p-3.5">{formatDateTimeES(wo.created_at, tz)}</td>
                            )}
                            {visibleWoColumns.includes('operators') && (
                              <td className="p-3.5">{ops}</td>
                            )}
                            {visibleWoColumns.includes('status') && (
                              <td className="p-3.5 text-center">
                                <WorkOrderStatusBadge
                                  status={wo.status}
                                  archivedAt={wo.archived_at}
                                  deletedAt={wo.deleted_at}
                                  reopenedAt={wo.reopened_at}
                                  reopenReason={wo.reopen_reason}
                                  closedAt={wo.closed_at}
                                />
                              </td>
                            )}
                            <td className="p-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedWorkOrderId(wo.id);
                                  navigateTo('work_order_detail');
                                }}
                                className="inline-flex items-center justify-center text-center whitespace-nowrap px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                              >
                                Abrir Detalle
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. DETALLE DE UN PARTE DE TRABAJO */}
          {currentRoute === 'work_order_detail' && selectedWorkOrderId && (
            <WorkOrderDetailView
              backend={backend}
              workOrderId={selectedWorkOrderId}
              onBack={navigateBack}
              onRefresh={refresh}
              onOpenAuditForWorkOrder={(woId) => {
                setAuditEntityFilter(woId);
                setAdminInitialSection('audit');
                navigateTo('admin_system');
              }}
            />
          )}

          {/* 5. REVISIONES PERIÓDICAS Y AVISOS AUTOMÁTICOS */}
          {currentRoute === 'reviews' && (
            <ReviewsAndNotificationsModule
              backend={backend}
              onBack={navigateBack}
              onRefresh={refresh}
              onOpenCreateWorkOrderFromReview={(p) => {
                setCreateWoModalProps({
                  open: true,
                  customerId: p.customerId,
                  addressId: p.addressId,
                  plannedWork: p.plannedWork,
                  scheduledAt: p.scheduledAt,
                  occurrenceId: p.occurrenceId,
                  amountCents: p.amountCents ?? null,
                });
              }}
            />
          )}

          {/* 6. LISTA DE COMPRA DE MATERIALES */}
          {currentRoute === 'shopping' && (
            <ShoppingListModule
              backend={backend}
              onBack={navigateBack}
              onRefresh={refresh}
            />
          )}

          {/* 7. FICHAJE Y CONTROL HORARIO */}
          {currentRoute === 'attendance' && (
            <AttendanceAndReportsModule
              key={tick}
              backend={backend}
              onBack={navigateBack}
              onRefresh={refresh}
            />
          )}

          {/* 8. DATOS MAESTROS Y USUARIOS */}
          {currentRoute === 'masters' && (
            <MasterDataAndUsersModule
              key={masterInitialTab}
              backend={backend}
              initialTab={masterInitialTab}
              onBack={navigateBack}
              onRefresh={refresh}
            />
          )}

          {/* 9. IMPORTACIÓN Y EXPORTACIÓN EXCEL / PDF */}
          {currentRoute === 'import_export' && (
            <ImportExportModule
              backend={backend}
              onBack={navigateBack}
              onRefresh={refresh}
            />
          )}

          {/* 10. AUDITORÍA, COPIAS Y CONFIGURACIÓN DE EMPRESA */}
          {currentRoute === 'admin_system' && (
            <AdminSystemModule
              key={`${adminInitialSection}-${auditEntityFilter}`}
              backend={backend}
              initialSection={adminInitialSection}
              filterEntityId={auditEntityFilter}
              onBack={navigateBack}
              onRefresh={refresh}
            />
          )}
        </main>
      </div>

      {/* BARRA INFERIOR PERSISTENTE EN MÓVIL Y ACCESO RÁPIDO (Regla 5 y Escenario 18) */}
      <div
        data-testid="persistent-mobile-action-bar"
        className="fixed bottom-0 right-0 left-0 lg:left-64 z-30 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-4 lg:px-8 py-2.5 shadow-lg flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="btn-persistent-add-to-shopping"
            onClick={() => setQuickShopModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" /> Añadir a compra
          </button>
        </div>

        <div className="flex items-center gap-2.5" data-testid="persistent-attendance-control">
          <span className="text-xs font-medium text-slate-600 hidden sm:inline">
            Estado fichaje:{' '}
            <strong className={openAttendance ? 'text-emerald-600' : 'text-amber-600'}>
              {openAttendance
                ? `En jornada (desde ${formatTimeES(openAttendance.clock_in_at, tz)})`
                : 'Fuera de jornada'}
            </strong>
          </span>
          <button
            type="button"
            data-testid="btn-persistent-clock-action"
            onClick={handleQuickClockToggle}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs ${
              openAttendance
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{openAttendance ? 'Fichar Salida' : 'Fichar Entrada'}</span>
          </button>
        </div>
      </div>

      {/* Modal rápido de «Añadir a compra» */}
      {quickShopModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleQuickAddShopping}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-slate-900">
              Añadir a Lista de Compra (Acceso rápido)
            </h3>
            <p className="text-slate-600">
              Selecciona un artículo existente del catálogo. Administración asignará las unidades de compra.
            </p>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Artículo existente *
              </label>
              <select
                value={quickShopArticleId}
                onChange={(e) => setQuickShopArticleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {articlesCatalog.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name} ({a.unit})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickShopModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold"
              >
                Solicitar Artículo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Alta de Parte */}
      {createWoModalProps.open && (
        <WorkOrderCreateModal
          backend={backend}
          preselectedCustomerId={createWoModalProps.customerId}
          preselectedAddressId={createWoModalProps.addressId}
          preselectedPlannedWork={createWoModalProps.plannedWork}
          preselectedScheduledAt={createWoModalProps.scheduledAt}
          preselectedAmountCents={createWoModalProps.amountCents}
          originReviewOccurrenceId={createWoModalProps.occurrenceId}
          onClose={() => setCreateWoModalProps({ open: false })}
          onCreated={(newId) => {
            setCreateWoModalProps({ open: false });
            setSelectedWorkOrderId(newId);
            navigateTo('work_order_detail');
            refresh();
          }}
        />
      )}

      {/* Modal global de reprogramación de fecha y hora prevista (Admin y Operarios) */}
      {rescheduleWoModal.open && (
        <div
          data-testid="modal-reschedule-quick"
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!rescheduleDatetimeInput) {
                notifyError('Debes indicar una fecha y hora prevista válida.');
                return;
              }
              const isoTarget = rescheduleDatetimeInput.includes('Z')
                ? rescheduleDatetimeInput
                : new Date(rescheduleDatetimeInput).toISOString();

              requestSaveConfirmation({
                title: 'Confirmar Reprogramación de Fecha y Hora Prevista',
                changes: [
                  { label: 'Parte de trabajo', value: rescheduleWoModal.code },
                  {
                    label: 'Fecha/hora anterior',
                    value: `${formatDateES(rescheduleWoModal.currentScheduledAt, tz)} ${formatTimeES(rescheduleWoModal.currentScheduledAt, tz)} h`,
                  },
                  {
                    label: 'Nueva fecha/hora prevista',
                    value: `${formatDateES(isoTarget, tz)} ${formatTimeES(isoTarget, tz)} h`,
                  },
                  ...(rescheduleReasonInput.trim()
                    ? [{ label: 'Motivo', value: rescheduleReasonInput.trim() }]
                    : []),
                ],
                onConfirm: () => {
                  try {
                    backend.rescheduleWorkOrder({
                      work_order_id: rescheduleWoModal.workOrderId,
                      scheduled_at: isoTarget,
                      reason: rescheduleReasonInput.trim() || undefined,
                    });
                    notifySuccessGreen(`Parte ${rescheduleWoModal.code} reprogramado con éxito.`);
                    setRescheduleWoModal({
                      open: false,
                      workOrderId: '',
                      code: '',
                      currentScheduledAt: '',
                    });
                    refresh();
                  } catch (err: any) {
                    notifyError(err?.message || 'Error al reprogramar el parte.');
                  }
                },
              });
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Reprogramar Fecha y Hora Prevista
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRescheduleWoModal({
                    open: false,
                    workOrderId: '',
                    code: '',
                    currentScheduledAt: '',
                  })
                }
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600">
              Tanto administradores como operarios pueden reprogramar la fecha y hora prevista del parte{' '}
              <strong>{rescheduleWoModal.code}</strong> en cualquier momento.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nueva fecha y hora prevista *
              </label>
              <input
                type="datetime-local"
                required
                data-testid="input-quick-reschedule-datetime"
                value={rescheduleDatetimeInput}
                onChange={(e) => setRescheduleDatetimeInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo del cambio (opcional)
              </label>
              <input
                type="text"
                data-testid="input-quick-reschedule-reason"
                value={rescheduleReasonInput}
                onChange={(e) => setRescheduleReasonInput(e.target.value)}
                placeholder="Ej. Solicitud del cliente, retraso en obra previa..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() =>
                  setRescheduleWoModal({
                    open: false,
                    workOrderId: '',
                    code: '',
                    currentScheduledAt: '',
                  })
                }
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-submit-quick-reschedule"
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

export default function App() {
  return (
    <UIConfirmationProvider>
      <MainApplicationContent />
    </UIConfirmationProvider>
  );
}
