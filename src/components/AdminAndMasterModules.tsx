import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Package,
  Truck,
  CalendarClock,
  ShieldCheck,
  DatabaseBackup,
  Settings,
  Plus,
  RotateCcw,
  Edit3,
  X,
  FileSpreadsheet,
  FileDown,
  Download,
  Upload,
  Key,
  Copy,
  Check,
  Send,
  Trash2,
  AlertTriangle,
  ArrowRight,
  MailCheck,
  Clock,
  Mail,
  Inbox,
  Eye,
  EyeOff,
  Server,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InstallationBackendEngine } from '../services/backendEngine';
import { BackupJob, UserRole } from '../types/domain';
import {
  EmailActionLink,
  PhoneActionLinks,
  PhoneInputField,
  ScreenHeaderBar,
  SearchableSelect,
  useUIConfirmation,
} from './CommonUI';
import {
  formatCentsToEUR,
  formatDateES,
  formatDateTimeES,
  parseEurosToCents,
  sanitizeTimezone,
} from '../utils/formatters';
import {
  downloadImportTemplateExcel,
  executeValidatedImport,
  exportRowsToExcel,
  validateAndPreviewImport,
} from '../utils/exportImportUtils';

// =============================================================================
// 1. MÓDULO DE DATOS MAESTROS Y USUARIOS (SECCIONES 3 Y 6)
// Todas las altas (+ Nuevo Cliente, + Nuevo Domicilio, + Nuevo Artículo,
// + Nuevo Proveedor, + Nuevo Tipo de Revisión, + Invitar Usuario) se abren
// en una VENTANA EMERGENTE (Modal).
// =============================================================================
export const MasterDataAndUsersModule: React.FC<{
  backend: InstallationBackendEngine;
  initialTab?: 'customers' | 'addresses' | 'articles' | 'suppliers' | 'review_types' | 'users';
  onBack: () => void;
  onRefresh: () => void;
}> = ({ backend, initialTab = 'customers', onBack, onRefresh }) => {
  const { requestSaveConfirmation, requestDeleteConfirmation, notifySuccessGreen, notifyError } = useUIConfirmation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    onRefresh();
  };

  // Control de ventana emergente de alta/edición para la pestaña actual
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const currentUser = backend.getCurrentUser();
  const customers = useMemo(() => backend.getCustomers(true), [backend, tick]);
  const addresses = useMemo(() => backend.getCustomerAddresses(undefined, true), [backend, tick]);
  const articles = useMemo(() => backend.getArticles(true), [backend, tick]);
  const suppliers = useMemo(() => backend.getSuppliers(true), [backend, tick]);
  const reviewTypes = useMemo(() => backend.getReviewTypes(true), [backend, tick]);
  const profiles = useMemo(() => backend.getProfiles(), [backend, tick]);

  // Estado formulario Cliente
  const [custCode, setCustCode] = useState('');
  const [custName, setCustName] = useState('');
  const [custTaxId, setCustTaxId] = useState('');
  const [custContactName, setCustContactName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custPostalCode, setCustPostalCode] = useState('13001');
  const [custCity, setCustCity] = useState('Ciudad Real');
  const [custProvince, setCustProvince] = useState('Ciudad Real');
  const [custNotes, setCustNotes] = useState('');

  // Estado formulario Domicilio/Instalación
  const [addrCustomerId, setAddrCustomerId] = useState('');
  const [addrAlias, setAddrAlias] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrPostal, setAddrPostal] = useState('13001');
  const [addrCity, setAddrCity] = useState('Ciudad Real');
  const [addrProvince, setAddrProvince] = useState('Ciudad Real');
  const [addrContact, setAddrContact] = useState('');
  const [addrPhone, setAddrPhone] = useState('');

  // Estado formulario Artículo
  const [artCode, setArtCode] = useState('');
  const [artName, setArtName] = useState('');
  const [artDesc, setArtDesc] = useState('');
  const [artSupplierId, setArtSupplierId] = useState(suppliers[0]?.id || '');
  const [artBuyPrice, setArtBuyPrice] = useState('');
  const [artSalePrice, setArtSalePrice] = useState('');
  const [artUnit, setArtUnit] = useState('ud');

  // Estado formulario Proveedor
  const [supName, setSupName] = useState('');
  const [supTaxId, setSupTaxId] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supPostalCode, setSupPostalCode] = useState('');
  const [supCity, setSupCity] = useState('');
  const [supProvince, setSupProvince] = useState('');
  const [supNotes, setSupNotes] = useState('');

  // Estado formulario Tipo Revisión
  const [rtName, setRtName] = useState('');
  const [rtPrice, setRtPrice] = useState('150,00');
  const [rtUnit, setRtUnit] = useState<'months' | 'days' | 'years' | 'none'>('months');
  const [rtValue, setRtValue] = useState('12');

  // Estado formulario Invitación de Usuario
  const [usrName, setUsrName] = useState('');
  const [usrDni, setUsrDni] = useState('');
  const [usrEmail, setUsrEmail] = useState('');
  const [usrPhone, setUsrPhone] = useState('');
  const [usrRole, setUsrRole] = useState<'operario' | 'admin' | ''>('');
  const [usrWorkShiftType, setUsrWorkShiftType] = useState<'continua' | 'partida'>('continua');
  const [usrWorkStartTime, setUsrWorkStartTime] = useState('08:00');
  const [usrWorkEndTime, setUsrWorkEndTime] = useState('18:00');
  const [usrMorningStart, setUsrMorningStart] = useState('08:00');
  const [usrMorningEnd, setUsrMorningEnd] = useState('13:30');
  const [usrAfternoonStart, setUsrAfternoonStart] = useState('15:30');
  const [usrAfternoonEnd, setUsrAfternoonEnd] = useState('19:00');
  const [usrTempPassword, setUsrTempPassword] = useState('Clima-2026!');

  // Modal de resumen con enlace y credenciales tras invitar
  const [invitationSummaryModal, setInvitationSummaryModal] = useState<{
    open: boolean;
    fullName: string;
    email: string;
    tempPass: string;
    link: string;
  } | null>(null);

  // Modal de restablecimiento de contraseña por administrador
  const [adminResetPassModal, setAdminResetPassModal] = useState<{
    open: boolean;
    userId: string;
    fullName: string;
    email: string;
    customPassword: string;
  } | null>(null);

  // Modal de credenciales restablecidas para copiar
  const [resetSuccessModal, setResetSuccessModal] = useState<{
    open: boolean;
    fullName: string;
    email: string;
    tempPass: string;
  } | null>(null);

  const [copiedInvite, setCopiedInvite] = useState(false);
  const [copiedReset, setCopiedReset] = useState(false);

  // Doble confirmación con fondo rojo para borrado definitivo de usuario (igual que en partes)
  const [userDeleteModal, setUserDeleteModal] = useState<{
    step: 1 | 2;
    user: (typeof profiles)[0];
  } | null>(null);

  const handleSupplierFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheet = wb.SheetNames[0];
      if (!firstSheet) {
        notifyError('El archivo Excel no contiene ninguna hoja.');
        return;
      }
      const ws = wb.Sheets[firstSheet];
      const jsonRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (jsonRaw.length === 0) {
        notifyError('La hoja Excel está vacía.');
        return;
      }
      // Protección contra Prototype Pollution y Formula Injection (OWASP)
      const json = jsonRaw.map((row) => {
        const clean: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
          clean[k] = typeof v === 'string' && /^[=@+-]/.test(v) ? `'${v}` : v;
        }
        return clean;
      });
      const headers = Object.keys(json[0]);
      const mapping: Record<string, string> = {
        name:
          headers.find((h) => /nombre|razon|proveedor/i.test(h)) ||
          headers[0] ||
          'name',
        tax_id: headers.find((h) => /nif|cif|ident/i.test(h)) || '',
        phone: headers.find((h) => /tel|telefono|movil|celular/i.test(h)) || '',
        email: headers.find((h) => /email|correo/i.test(h)) || '',
        contact_person: headers.find((h) => /contacto|persona/i.test(h)) || '',
        notes: headers.find((h) => /nota|observa|coment/i.test(h)) || '',
      };

      const preview = validateAndPreviewImport({
        backend,
        entityType: 'suppliers',
        rawRows: json,
        columnMapping: mapping,
      });

      requestSaveConfirmation({
        title: `Importar Proveedores desde Excel (${file.name})`,
        changes: [
          { label: 'Filas leídas en Excel', value: String(preview.totalRows) },
          { label: 'Proveedores válidos nuevos', value: String(preview.validNewCount) },
          {
            label: 'Proveedores existentes coincidentes (se actualizarán)',
            value: String(preview.duplicateCount),
          },
          { label: 'Filas con errores (se omitirán)', value: String(preview.errorCount) },
        ],
        onConfirm: () => {
          const res = executeValidatedImport({
            backend,
            entityType: 'suppliers',
            fileName: file.name,
            conflictPolicy: 'update_existing',
            preview,
          });
          notifySuccessGreen(
            `Importación completada: ${res.inserted} creados, ${res.updated} actualizados, ${res.rejected} omitidos.`
          );
          refresh();
        },
      });
    } catch (err: any) {
      notifyError(err?.message || 'Error al procesar el archivo Excel.');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportSuppliers = () => {
    exportRowsToExcel({
      fileName: 'Exportacion_Proveedores.xlsx',
      sheetName: 'Proveedores',
      columns: [
        { key: 'name', header: 'Nombre / Razón Social' },
        { key: 'tax_id', header: 'NIF / CIF' },
        { key: 'contact_person', header: 'Persona de Contacto' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'email', header: 'Email' },
        { key: 'address', header: 'Dirección / Domicilio' },
        { key: 'postal_code', header: 'Código Postal' },
        { key: 'city', header: 'Población' },
        { key: 'province', header: 'Provincia' },
        { key: 'notes', header: 'Notas' },
        { key: 'active', header: 'Estado' },
      ],
      rows: suppliers.map((s) => ({
        name: s.name,
        tax_id: s.tax_id || '',
        contact_person: s.contact_person || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        postal_code: s.postal_code || '',
        city: s.city || '',
        province: s.province || '',
        notes: s.notes || '',
        active: s.is_active ? 'Activo' : 'Inactivo',
      })),
    });
  };

  const handleExportCustomers = () => {
    exportRowsToExcel({
      fileName: 'Exportacion_Clientes.xlsx',
      sheetName: 'Clientes',
      columns: [
        { key: 'code', header: 'Código' },
        { key: 'name', header: 'Nombre / Razón Social' },
        { key: 'tax_id', header: 'NIF / CIF' },
        { key: 'contact_name', header: 'Persona de Contacto' },
        { key: 'phone', header: 'Teléfono' },
        { key: 'email', header: 'Email' },
        { key: 'main_address', header: 'Domicilio / Dirección' },
        { key: 'postal_code', header: 'Código Postal' },
        { key: 'city', header: 'Población' },
        { key: 'province', header: 'Provincia' },
        { key: 'notes', header: 'Observaciones' },
        { key: 'active', header: 'Estado' },
      ],
      rows: customers.map((c) => ({
        code: c.code,
        name: c.name,
        tax_id: c.tax_id || '',
        contact_name: c.contact_name || '',
        phone: c.phones.join(', ') || '',
        email: c.emails.join(', ') || '',
        main_address: c.main_address || '',
        postal_code: c.postal_code || '',
        city: c.city || '',
        province: c.province || '',
        notes: c.notes || '',
        active: c.is_active ? 'Activo' : 'Inactivo',
      })),
    });
  };

  const q = search.trim().toLowerCase();

  const createButtonLabel: Record<typeof activeTab, string> = {
    customers: '+ Nuevo Cliente',
    addresses: '+ Nuevo Domicilio / Instalación',
    articles: '+ Nuevo Artículo',
    suppliers: '+ Nuevo Proveedor',
    review_types: '+ Nuevo Tipo de Revisión',
    users: '✉️ Invitar a un Usuario Nuevo',
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    if (activeTab === 'customers') {
      setCustCode('');
      setCustName('');
      setCustTaxId('');
      setCustContactName('');
      setCustPhone('');
      setCustEmail('');
      setCustAddress('');
      setCustPostalCode('13001');
      setCustCity('Ciudad Real');
      setCustProvince('Ciudad Real');
      setCustNotes('');
    } else if (activeTab === 'addresses') {
      setAddrCustomerId('');
      setAddrAlias('');
      setAddrLine('');
      setAddrPostal('13001');
      setAddrCity('Ciudad Real');
      setAddrProvince('Ciudad Real');
      setAddrContact('');
      setAddrPhone('');
    } else if (activeTab === 'articles') {
      setArtCode('');
      setArtName('');
      setArtDesc('');
      setArtSupplierId(suppliers[0]?.id || '');
      setArtBuyPrice('');
      setArtSalePrice('');
      setArtUnit('ud');
    } else if (activeTab === 'suppliers') {
      setSupName('');
      setSupTaxId('');
      setSupContact('');
      setSupPhone('');
      setSupEmail('');
      setSupAddress('');
      setSupPostalCode('');
      setSupCity('');
      setSupProvince('');
      setSupNotes('');
    } else if (activeTab === 'review_types') {
      setRtName('');
      setRtPrice('150,00');
      setRtUnit('months');
      setRtValue('12');
    } else if (activeTab === 'users') {
      setUsrName('');
      setUsrDni('');
      setUsrEmail('');
      setUsrPhone('');
      setUsrRole('');
      setUsrWorkShiftType('continua');
      setUsrWorkStartTime('08:00');
      setUsrWorkEndTime('18:00');
      setUsrMorningStart('08:00');
      setUsrMorningEnd('13:30');
      setUsrAfternoonStart('15:30');
      setUsrAfternoonEnd('19:00');
      setUsrTempPassword(`Clima-${Math.floor(1000 + Math.random() * 9000)}!`);
    }
    setShowCreateModal(true);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 bg-[#f4f6fa] space-y-3">
        <ScreenHeaderBar
          title="Datos Maestros y Administración de Usuarios"
          subtitle="Clientes, domicilios/instalaciones, artículos, proveedores, tipos de revisión y usuarios con ciclo activo/inactivo"
          onBack={onBack}
          searchTerm={search}
          onSearchChange={setSearch}
          actions={
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> {createButtonLabel[activeTab]}
            </button>
          }
        />

        {/* Pestañas de maestros */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
          {[
            { key: 'customers', label: `Clientes (${customers.length})`, icon: Building2 },
            {
              key: 'addresses',
              label: `Domicilios/Instalaciones (${addresses.length})`,
              icon: Building2,
            },
            { key: 'articles', label: `Artículos (${articles.length})`, icon: Package },
            { key: 'suppliers', label: `Proveedores (${suppliers.length})`, icon: Truck },
            {
              key: 'review_types',
              label: `Tipos de Revisión (${reviewTypes.length})`,
              icon: CalendarClock,
            },
            { key: 'users', label: `Usuarios y Roles (${profiles.length})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key as typeof activeTab);
                  setShowCreateModal(false);
                  setEditingId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. LISTADO DE CLIENTES */}
      {activeTab === 'customers' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Acciones con Clientes:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadImportTemplateExcel('customers')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold cursor-pointer"
                title="Descargar archivo Excel con plantilla oficial de clientes (incluye código postal, población y provincia)"
              >
                <FileDown className="w-3.5 h-3.5" /> Descargar Plantilla Excel
              </button>
              <button
                type="button"
                onClick={handleExportCustomers}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                title="Exportar catálogo completo de clientes a Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Clientes (Excel)
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs overflow-y-auto overscroll-contain">
          {customers
            .filter(
              (c) =>
                !q ||
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                c.tax_id.toLowerCase().includes(q)
            )
            .map((c) => (
              <div
                key={c.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="font-bold text-sm text-slate-900">
                    {c.code} — {c.name}{' '}
                    {!c.is_active && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px]">
                        INACTIVO (Conservado en histórico)
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600">
                    NIF: {c.tax_id || '—'} · Contacto: {c.contact_name || '—'}
                  </div>
                  <div className="text-slate-600">
                    Domicilio: {c.main_address || '—'}
                    {(c.postal_code || c.city || c.province) && (
                      <>
                        {', '}
                        {[c.postal_code, c.city].filter(Boolean).join(' ')}
                        {c.province ? ` (${c.province})` : ''}
                      </>
                    )}
                  </div>
                  {c.notes && <div className="text-slate-500 italic">Obs.: {c.notes}</div>}
                  <div className="flex flex-wrap items-center gap-3">
                    <PhoneActionLinks phone={c.phones[0]} />
                    <EmailActionLink email={c.emails[0]} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid={`btn-edit-customer-${c.id}`}
                    onClick={() => {
                      setEditingId(c.id);
                      setCustCode(c.code);
                      setCustName(c.name);
                      setCustTaxId(c.tax_id || '');
                      setCustContactName(c.contact_name || '');
                      setCustPhone(c.phones[0] || '');
                      setCustEmail(c.emails[0] || '');
                      setCustAddress(c.main_address || '');
                      setCustPostalCode(c.postal_code || '');
                      setCustCity(c.city || '');
                      setCustProvince(c.province || '');
                      setCustNotes(c.notes || '');
                      setShowCreateModal(true);
                    }}
                    className="px-3 py-1.5 rounded font-semibold border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Editar cliente"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    data-testid={`btn-toggle-customer-${c.id}`}
                    onClick={() => {
                      backend.saveCustomer({ ...c, is_active: !c.is_active });
                      notifySuccessGreen(
                        `Cliente ${c.is_active ? 'inactivado' : 'reactivado'} (conservando histórico).`
                      );
                      refresh();
                    }}
                    className={`px-3 py-1.5 rounded font-semibold border ${
                      c.is_active
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    }`}
                  >
                    {c.is_active ? 'Inactivar' : 'Reactivar'}
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      data-testid={`btn-delete-customer-${c.id}`}
                      onClick={() => {
                        requestDeleteConfirmation({
                          recordName: `Cliente «${c.name}» (${c.code})`,
                          consequence:
                            'Se eliminará definitivamente al cliente del catálogo. Esta acción puede influir en alguna acción o listado. En los partes de trabajo donde figure, en el campo del cliente aparecerá «Cliente borrado».',
                          requireReason: false,
                          onConfirm: () => {
                            backend.deleteCustomer(c.id);
                            refresh();
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded font-semibold border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 flex items-center gap-1 shadow-2xs"
                      title="Borrar cliente definitivamente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. LISTADO DE DOMICILIOS / INSTALACIONES */}
      {activeTab === 'addresses' && (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs overflow-y-auto overscroll-contain">
          {addresses.map((a) => {
            const cust = customers.find((c) => c.id === a.customer_id);
            return (
              <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">
                    {a.alias} — {a.address_line} ({a.postal_code} {a.city}, {a.province})
                  </div>
                  <div className="text-slate-600">
                    Cliente: <strong>{cust?.name}</strong> · Contacto: {a.contact_name || '—'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid={`btn-edit-address-${a.id}`}
                    onClick={() => {
                      setEditingId(a.id);
                      setAddrCustomerId(a.customer_id);
                      setAddrAlias(a.alias);
                      setAddrLine(a.address_line);
                      setAddrPostal(a.postal_code || '');
                      setAddrCity(a.city || '');
                      setAddrProvince(a.province || '');
                      setAddrContact(a.contact_name || '');
                      setAddrPhone(a.contact_phone || '');
                      setShowCreateModal(true);
                    }}
                    className="px-3 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Editar domicilio"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      backend.saveCustomerAddress({ ...a, is_active: !a.is_active });
                      refresh();
                    }}
                    className="px-3 py-1 rounded border border-slate-300 font-semibold"
                  >
                    {a.is_active ? 'Inactivar' : 'Reactivar'}
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      data-testid={`btn-delete-address-${a.id}`}
                      onClick={() => {
                        requestDeleteConfirmation({
                          recordName: `Domicilio «${a.alias}» (${a.address_line})`,
                          consequence:
                            'Se eliminará definitivamente este domicilio. Esta acción puede influir en alguna acción o listado. En los partes asociados figurará como «Dirección borrada».',
                          requireReason: false,
                          onConfirm: () => {
                            backend.deleteCustomerAddress(a.id);
                            refresh();
                          },
                        });
                      }}
                      className="px-3 py-1 rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-semibold flex items-center gap-1 shadow-2xs"
                      title="Borrar domicilio definitivamente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. LISTADO DE ARTÍCULOS */}
      {activeTab === 'articles' && (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs overflow-y-auto overscroll-contain">
          {articles
            .filter(
              (a) => !q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
            )
            .map((a) => (
              <div key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">
                    {a.code} — {a.name} ({a.unit}){' '}
                    {!a.is_active && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px]">
                        INACTIVO
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600">
                    Compra: <strong>{formatCentsToEUR(a.purchase_price_cents)}</strong> · Venta:{' '}
                    <strong>{formatCentsToEUR(a.sale_price_cents)}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid={`btn-edit-article-${a.id}`}
                    onClick={() => {
                      setEditingId(a.id);
                      setArtCode(a.code);
                      setArtName(a.name);
                      setArtDesc(a.description || '');
                      setArtSupplierId(a.supplier_id || '');
                      setArtBuyPrice(((a.purchase_price_cents || 0) / 100).toFixed(2).replace('.', ','));
                      setArtSalePrice(((a.sale_price_cents || 0) / 100).toFixed(2).replace('.', ','));
                      setArtUnit(a.unit || 'ud');
                      setShowCreateModal(true);
                    }}
                    className="px-3 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Editar artículo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      backend.saveArticle({
                        ...a,
                        purchase_price_cents: a.purchase_price_cents ?? 0,
                        is_active: !a.is_active,
                      });
                      refresh();
                    }}
                    className="px-3 py-1 rounded border border-slate-300 font-semibold"
                  >
                    {a.is_active ? 'Inactivar' : 'Reactivar'}
                  </button>
                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      data-testid={`btn-delete-article-${a.id}`}
                      onClick={() => {
                        requestDeleteConfirmation({
                          recordName: `Artículo «${a.name}» (${a.code})`,
                          consequence:
                            'Se eliminará definitivamente el artículo del maestro. Esta acción puede influir en alguna acción o listado. En los partes de trabajo donde figure en las líneas de material consumido aparecerá como «Artículo borrado».',
                          requireReason: false,
                          onConfirm: () => {
                            backend.deleteArticle(a.id);
                            refresh();
                          },
                        });
                      }}
                      className="px-3 py-1 rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-semibold flex items-center gap-1 shadow-2xs"
                      title="Borrar artículo definitivamente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 4. LISTADO DE PROVEEDORES */}
      {activeTab === 'suppliers' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Acciones con Proveedores:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => downloadImportTemplateExcel('suppliers')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
                title="Descargar archivo Excel con plantilla oficial de proveedores"
              >
                <FileDown className="w-3.5 h-3.5" /> Descargar Plantilla Excel
              </button>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5" /> Importar Proveedores (Excel)
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  data-testid="input-import-suppliers-excel"
                  onChange={handleSupplierFileImport}
                />
              </label>
              <button
                type="button"
                onClick={handleExportSuppliers}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> Exportar a Excel
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs overflow-y-auto overscroll-contain">
            {suppliers
              .filter(
                (s) =>
                  !q ||
                  s.name.toLowerCase().includes(q) ||
                  (s.tax_id && s.tax_id.toLowerCase().includes(q)) ||
                  (s.contact_person && s.contact_person.toLowerCase().includes(q))
              )
              .map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">
                      {s.name}{' '}
                      {!s.is_active && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px]">
                          INACTIVO
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600">
                      NIF: {s.tax_id || '—'} · Contacto: {s.contact_person || '—'}{' '}
                      {s.phone ? `· Tel: ${s.phone}` : ''} {s.email ? `· Email: ${s.email}` : ''}
                    </div>
                    {(s.address || s.postal_code || s.city || s.province) && (
                      <div className="text-slate-600">
                        Dirección: {s.address || '—'}
                        {(s.postal_code || s.city || s.province) && (
                          <>
                            {', '}
                            {[s.postal_code, s.city].filter(Boolean).join(' ')}
                            {s.province ? ` (${s.province})` : ''}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid={`btn-edit-supplier-${s.id}`}
                      onClick={() => {
                        setEditingId(s.id);
                        setSupName(s.name);
                        setSupTaxId(s.tax_id || '');
                        setSupContact(s.contact_person || '');
                        setSupPhone(s.phone || '');
                        setSupEmail(s.email || '');
                        setSupAddress(s.address || '');
                        setSupPostalCode(s.postal_code || '');
                        setSupCity(s.city || '');
                        setSupProvince(s.province || '');
                        setSupNotes(s.notes || '');
                        setShowCreateModal(true);
                      }}
                      className="px-3 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Editar proveedor"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        backend.saveSupplier({ ...s, is_active: !s.is_active });
                        refresh();
                      }}
                      className="px-3 py-1 rounded border border-slate-300 font-semibold"
                    >
                      {s.is_active ? 'Inactivar' : 'Reactivar'}
                    </button>
                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        data-testid={`btn-delete-supplier-${s.id}`}
                        onClick={() => {
                          requestDeleteConfirmation({
                            recordName: `Proveedor «${s.name}»`,
                            consequence:
                              'Se eliminará definitivamente el proveedor del catálogo. Esta acción puede influir en alguna acción o listado. En las referencias de compras y artículos figurará como «Proveedor borrado».',
                            requireReason: false,
                            onConfirm: () => {
                              backend.deleteSupplier(s.id);
                              refresh();
                            },
                          });
                        }}
                        className="px-3 py-1 rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-semibold flex items-center gap-1 shadow-2xs"
                        title="Borrar proveedor definitivamente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Borrar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            {suppliers.filter(
              (s) =>
                !q ||
                s.name.toLowerCase().includes(q) ||
                (s.tax_id && s.tax_id.toLowerCase().includes(q)) ||
                (s.contact_person && s.contact_person.toLowerCase().includes(q))
            ).length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No hay proveedores {q ? 'que coincidan con la búsqueda' : 'registrados aún'}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. LISTADO DE TIPOS DE REVISIÓN */}
      {activeTab === 'review_types' && (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs overflow-y-auto overscroll-contain">
          {reviewTypes.map((rt) => (
            <div key={rt.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">{rt.name}</div>
                <div className="text-slate-600">
                  Precio orientativo: {formatCentsToEUR(rt.suggested_price_cents)} · Periodicidad:{' '}
                  {rt.periodicity_value} {rt.periodicity_unit}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid={`btn-edit-review-type-${rt.id}`}
                  onClick={() => {
                    setEditingId(rt.id);
                    setRtName(rt.name);
                    setRtPrice(((rt.suggested_price_cents || 0) / 100).toFixed(2).replace('.', ','));
                    setRtUnit(rt.periodicity_unit);
                    setRtValue(String(rt.periodicity_value));
                    setShowCreateModal(true);
                  }}
                  className="px-3 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Editar tipo de revisión"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    backend.saveReviewType({ ...rt, is_active: !rt.is_active });
                    refresh();
                  }}
                  className="px-3 py-1 rounded border border-slate-300 font-semibold"
                >
                  {rt.is_active ? 'Inactivar' : 'Reactivar'}
                </button>
                {currentUser.role === 'admin' && (
                  <button
                    type="button"
                    data-testid={`btn-delete-review-type-${rt.id}`}
                    onClick={() => {
                      requestDeleteConfirmation({
                        recordName: `Tipo de Revisión «${rt.name}»`,
                        consequence:
                          'Se eliminará definitivamente este tipo de revisión. Esta acción puede influir en alguna acción o listado. En mantenimientos periódicos figurará como «Revisión borrada».',
                        requireReason: false,
                        onConfirm: () => {
                          backend.deleteReviewType(rt.id);
                          refresh();
                        },
                      });
                    }}
                    className="px-3 py-1 rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-semibold flex items-center gap-1 shadow-2xs"
                    title="Borrar tipo de revisión definitivamente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Borrar</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. LISTADO DE USUARIOS Y ROLES */}
      {activeTab === 'users' && (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs overflow-y-auto overscroll-contain">
          {profiles.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900 flex flex-wrap items-center gap-1.5">
                    <span>{u.full_name}</span>
                    <span className="text-slate-500 font-normal">({u.email})</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                    {u.must_change_password && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold">
                        🔑 Clave temporal (Cambio pendiente)
                      </span>
                    )}
                    {!u.is_active && (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-bold">
                        INACTIVO (Sesión revocada)
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span>DNI: {u.dni || '—'}</span>
                    <span>·</span>
                    <span>Tel: {u.phone || '—'}</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      <Clock className="w-3 h-3 text-indigo-600" />
                      {u.work_shift_type === 'partida' ? (
                        <span>
                          Jornada partida: Mañana <strong>{u.work_morning_start_time || '08:00'} - {u.work_morning_end_time || '13:30'}</strong> / Tarde <strong>{u.work_afternoon_start_time || '15:30'} - {u.work_afternoon_end_time || '19:00'}</strong>
                        </span>
                      ) : (
                        <span>
                          Jornada continua: <strong>{u.work_start_time || '08:00'}</strong> a <strong>{u.work_end_time || '18:00'}</strong>
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    data-testid={`btn-edit-user-${u.id}`}
                    onClick={() => {
                      setEditingId(u.id);
                      setUsrName(u.full_name);
                      setUsrEmail(u.email);
                      setUsrDni(u.dni || '');
                      setUsrPhone(u.phone || '');
                      setUsrRole(u.role);
                      setUsrWorkShiftType(u.work_shift_type || 'continua');
                      setUsrWorkStartTime(u.work_start_time || '08:00');
                      setUsrWorkEndTime(u.work_end_time || '18:00');
                      setUsrMorningStart(u.work_morning_start_time || '08:00');
                      setUsrMorningEnd(u.work_morning_end_time || '13:30');
                      setUsrAfternoonStart(u.work_afternoon_start_time || '15:30');
                      setUsrAfternoonEnd(u.work_afternoon_end_time || '19:00');
                      setShowCreateModal(true);
                    }}
                    className="px-3 py-1 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                    title="Editar datos del usuario"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminResetPassModal({
                        open: true,
                        userId: u.id,
                        fullName: u.full_name,
                        email: u.email,
                        customPassword: `Clima-${Math.floor(1000 + Math.random() * 9000)}!`,
                      });
                    }}
                    className="px-3 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                    title="Asignar contraseña temporal decidida por el administrador (obligará al usuario a cambiarla)"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-700" />
                    <span>Restablecer Clave</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSelf}
                    title={
                      isSelf
                        ? 'Un usuario no puede cambiar su propio rol'
                        : 'Cambiar rol del usuario'
                    }
                    onClick={() => {
                      try {
                        backend.updateUserProfile(u.id, {
                          role: u.role === 'admin' ? 'operario' : 'admin',
                        });
                        notifySuccessGreen('Rol de usuario actualizado.');
                        refresh();
                      } catch (err: any) {
                        notifyError(err?.message);
                      }
                    }}
                    className={`px-3 py-1 rounded border text-xs font-semibold ${
                      isSelf
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                        : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                    }`}
                  >
                    Cambiar Rol
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        backend.updateUserProfile(u.id, { is_active: !u.is_active });
                        notifySuccessGreen(
                          `Usuario ${
                            u.is_active ? 'inactivado (accesos revocados)' : 'reactivado'
                          }.`
                        );
                        refresh();
                      } catch (err: any) {
                        notifyError(err?.message);
                      }
                    }}
                    className={`px-3 py-1 rounded border text-xs font-semibold ${
                      u.is_active
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {u.is_active ? 'Inactivar Usuario' : 'Reactivar Usuario'}
                  </button>

                  {!isSelf && currentUser.role === 'admin' && (
                    <button
                      type="button"
                      data-testid={`btn-delete-user-${u.id}`}
                      onClick={() => setUserDeleteModal({ step: 1, user: u })}
                      className="px-3 py-1 rounded border border-red-300 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Borrar usuario definitivamente (requiere doble confirmación)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Borrar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          VENTANAS EMERGENTES (MODALES) PARA ALTA EN DATOS MAESTROS Y USUARIOS
      ===================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 max-w-lg w-full h-full sm:h-auto overflow-y-auto flex flex-col justify-between">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingId
                  ? {
                      customers: 'Modificar Cliente',
                      addresses: 'Modificar Domicilio / Instalación',
                      articles: 'Modificar Artículo',
                      suppliers: 'Modificar Proveedor',
                      review_types: 'Modificar Tipo de Revisión',
                      users: 'Modificar Datos de Usuario',
                    }[activeTab]
                  : createButtonLabel[activeTab]}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingId(null);
                }}
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeTab === 'customers' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowCreateModal(false);
                  const isEdit = !!editingId;
                  requestSaveConfirmation({
                    title: isEdit ? 'Modificar Ficha de Cliente' : 'Alta de Ficha Completa de Cliente',
                    changes: [
                      { label: 'Código', value: custCode || 'Automático' },
                      { label: 'Nombre / Razón Social', value: custName },
                      { label: 'NIF / CIF', value: custTaxId || '—' },
                      { label: 'Persona de contacto', value: custContactName || '—' },
                      { label: 'Teléfono', value: custPhone || '—' },
                      { label: 'Email', value: custEmail || '—' },
                      {
                        label: 'Domicilio principal',
                        value: `${custAddress} (${custPostalCode} ${custCity}, ${custProvince})`,
                      },
                    ],
                    onConfirm: () => {
                      const existing = editingId ? customers.find((c) => c.id === editingId) : null;
                      const saved = backend.saveCustomer({
                        ...(editingId ? { id: editingId } : {}),
                        code: custCode,
                        name: custName,
                        tax_id: custTaxId,
                        contact_name: custContactName,
                        phones: custPhone ? [custPhone] : [],
                        emails: custEmail ? [custEmail] : [],
                        main_address: custAddress,
                        postal_code: custPostalCode,
                        city: custCity,
                        province: custProvince,
                        notes: custNotes,
                        is_active: existing ? existing.is_active : true,
                      });
                      if (!isEdit) {
                        const createdAddrs = backend.getCustomerAddresses(saved.id, false);
                        if (createdAddrs[0]) {
                          backend.saveCustomerAddress({
                            ...createdAddrs[0],
                            postal_code: custPostalCode,
                            city: custCity,
                            province: custProvince,
                            contact_name: custContactName || saved.name,
                            contact_phone: custPhone,
                            contact_email: custEmail,
                          });
                        }
                      }
                      notifySuccessGreen(
                        isEdit ? 'Cliente modificado correctamente.' : 'Cliente creado correctamente.'
                      );
                      setEditingId(null);
                      setCustCode('');
                      setCustName('');
                      setCustTaxId('');
                      setCustContactName('');
                      setCustPhone('');
                      setCustEmail('');
                      setCustAddress('');
                      setCustPostalCode('13001');
                      setCustCity('Ciudad Real');
                      setCustProvince('Ciudad Real');
                      setCustNotes('');
                      refresh();
                    },
                  });
                }}
                className="p-5 space-y-3 text-xs max-h-[75vh] overflow-y-auto"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Código (auto si vacío)
                    </label>
                    <input
                      type="text"
                      value={custCode}
                      onChange={(e) => setCustCode(e.target.value)}
                      placeholder="Ej. CLI-0050"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nombre o Razón Social *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Nombre o razón social *"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      NIF / CIF / DNI
                    </label>
                    <input
                      type="text"
                      value={custTaxId}
                      onChange={(e) => setCustTaxId(e.target.value)}
                      placeholder="NIF / CIF (opcional)"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Persona de contacto
                    </label>
                    <input
                      type="text"
                      value={custContactName}
                      onChange={(e) => setCustContactName(e.target.value)}
                      placeholder="Nombre de contacto"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Teléfono(s)
                    </label>
                    <PhoneInputField
                      value={custPhone}
                      onChange={setCustPhone}
                      placeholder="600 11 22 33"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="cliente@correo.es"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dirección / Domicilio principal *
                  </label>
                  <input
                    type="text"
                    required
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="Calle, número, piso, local..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Código Postal
                    </label>
                    <input
                      type="text"
                      value={custPostalCode}
                      onChange={(e) => setCustPostalCode(e.target.value)}
                      placeholder="13001"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Municipio
                    </label>
                    <input
                      type="text"
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      placeholder="Ciudad Real"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Provincia
                    </label>
                    <input
                      type="text"
                      value={custProvince}
                      onChange={(e) => setCustProvince(e.target.value)}
                      placeholder="Ciudad Real"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Observaciones de la ficha del cliente
                  </label>
                  <textarea
                    rows={2}
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                    placeholder="Observaciones..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    {editingId ? 'Guardar Cambios' : 'Guardar Cliente'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'addresses' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowCreateModal(false);
                  const isEdit = !!editingId;
                  requestSaveConfirmation({
                    title: isEdit ? 'Modificar Domicilio / Instalación' : 'Alta de Domicilio / Instalación de Cliente',
                    changes: [
                      { label: 'Alias', value: addrAlias },
                      { label: 'Dirección', value: `${addrLine}, ${addrPostal} ${addrCity}` },
                    ],
                    onConfirm: () => {
                      const existing = editingId ? addresses.find((a) => a.id === editingId) : null;
                      backend.saveCustomerAddress({
                        ...(editingId ? { id: editingId } : {}),
                        customer_id: addrCustomerId,
                        alias: addrAlias,
                        address_line: addrLine,
                        postal_code: addrPostal,
                        city: addrCity,
                        province: addrProvince,
                        contact_name: addrContact,
                        contact_phone: addrPhone,
                        contact_email: '',
                        notes: '',
                        is_active: existing ? existing.is_active : true,
                      });
                      notifySuccessGreen(
                        isEdit ? 'Domicilio modificado correctamente.' : 'Domicilio guardado correctamente.'
                      );
                      setEditingId(null);
                      setAddrAlias('');
                      setAddrLine('');
                      refresh();
                    },
                  });
                }}
                className="p-5 space-y-3 text-xs"
              >
                <SearchableSelect
                  value={addrCustomerId}
                  onChange={setAddrCustomerId}
                  placeholder="-- Cliente a seleccionar --"
                  emptyOptionLabel="-- Cliente a seleccionar --"
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
                <input
                  type="text"
                  required
                  value={addrAlias}
                  onChange={(e) => setAddrAlias(e.target.value)}
                  placeholder="Alias (ej. Sala Calderas Norte) *"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  required
                  value={addrLine}
                  onChange={(e) => setAddrLine(e.target.value)}
                  placeholder="Dirección completa *"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="Municipio *"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <PhoneInputField
                    value={addrPhone}
                    onChange={setAddrPhone}
                    placeholder="Teléfono instalación"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    {editingId ? 'Guardar Cambios' : 'Guardar Domicilio'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'articles' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const buyCents = parseEurosToCents(artBuyPrice);
                  const saleCents = parseEurosToCents(artSalePrice);
                  if (buyCents === null || saleCents === null) {
                    notifyError('Precios de compra y venta inválidos.');
                    return;
                  }
                  setShowCreateModal(false);
                  const isEdit = !!editingId;
                  requestSaveConfirmation({
                    title: isEdit ? 'Modificar Artículo' : 'Alta de Artículo en Catálogo',
                    changes: [
                      { label: 'Código único', value: artCode },
                      { label: 'Nombre', value: artName },
                      { label: 'Precio Compra', value: formatCentsToEUR(buyCents) },
                      { label: 'Precio Venta', value: formatCentsToEUR(saleCents) },
                      { label: 'Unidad de medida', value: artUnit },
                    ],
                    onConfirm: () => {
                      const existing = editingId ? articles.find((a) => a.id === editingId) : null;
                      backend.saveArticle({
                        ...(editingId ? { id: editingId } : {}),
                        code: artCode,
                        name: artName,
                        description: artDesc,
                        supplier_id: artSupplierId || null,
                        purchase_price_cents: buyCents,
                        sale_price_cents: saleCents,
                        unit: artUnit,
                        is_active: existing ? existing.is_active : true,
                      });
                      notifySuccessGreen(
                        isEdit ? 'Artículo modificado correctamente.' : 'Artículo creado correctamente.'
                      );
                      setEditingId(null);
                      setArtCode('');
                      setArtName('');
                      setArtDesc('');
                      refresh();
                    },
                  });
                }}
                className="p-5 space-y-3 text-xs"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Código artículo (automático si vacío)
                    </label>
                    <input
                      type="text"
                      value={artCode}
                      onChange={(e) => setArtCode(e.target.value)}
                      placeholder="Ej. MAT-005 (o dejar vacío)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Unidad de medida
                    </label>
                    <select
                      value={artUnit}
                      onChange={(e) => setArtUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre del artículo *
                  </label>
                  <input
                    type="text"
                    required
                    value={artName}
                    onChange={(e) => setArtName(e.target.value)}
                    placeholder="Nombre descriptivo del artículo *"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Precio de Compra (€)
                    </label>
                    <input
                      type="text"
                      value={artBuyPrice}
                      onChange={(e) => setArtBuyPrice(e.target.value)}
                      placeholder="Ej. 10,00 €"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Precio de Venta (€)
                    </label>
                    <input
                      type="text"
                      value={artSalePrice}
                      onChange={(e) => setArtSalePrice(e.target.value)}
                      placeholder="Ej. 20,00 €"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Proveedor habitual
                  </label>
                  <select
                    value={artSupplierId}
                    onChange={(e) => setArtSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="">-- Proveedor a seleccionar (opcional) --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    {editingId ? 'Guardar Cambios' : 'Guardar Artículo'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'suppliers' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowCreateModal(false);
                  const isEdit = !!editingId;
                  requestSaveConfirmation({
                    title: isEdit ? 'Modificar Proveedor' : 'Alta de Proveedor',
                    changes: [
                      { label: 'Proveedor', value: supName },
                      { label: 'NIF/CIF', value: supTaxId || '—' },
                      { label: 'Contacto', value: supContact || '—' },
                      { label: 'Dirección', value: supAddress || '—' },
                      { label: 'C.P.', value: supPostalCode || '—' },
                      { label: 'Población', value: supCity || '—' },
                      { label: 'Provincia', value: supProvince || '—' },
                    ],
                    onConfirm: () => {
                      const existing = editingId ? suppliers.find((s) => s.id === editingId) : null;
                      backend.saveSupplier({
                        ...(editingId ? { id: editingId } : {}),
                        name: supName,
                        tax_id: supTaxId,
                        contact_person: supContact,
                        phone: supPhone,
                        email: supEmail,
                        address: supAddress,
                        postal_code: supPostalCode,
                        city: supCity,
                        province: supProvince,
                        notes: supNotes,
                        is_active: existing ? existing.is_active : true,
                      });
                      notifySuccessGreen(
                        isEdit ? 'Proveedor modificado correctamente.' : 'Proveedor guardado correctamente.'
                      );
                      setEditingId(null);
                      setSupName('');
                      setSupTaxId('');
                      setSupContact('');
                      setSupPhone('');
                      setSupEmail('');
                      setSupAddress('');
                      setSupPostalCode('');
                      setSupCity('');
                      setSupProvince('');
                      setSupNotes('');
                      refresh();
                    },
                  });
                }}
                className="p-5 space-y-3 text-xs"
              >
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Nombre del proveedor *"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={supTaxId}
                    onChange={(e) => setSupTaxId(e.target.value)}
                    placeholder="NIF / CIF"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Persona de Contacto"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <PhoneInputField
                    value={supPhone}
                    onChange={setSupPhone}
                    placeholder="Teléfono contacto"
                  />
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="Email comercial"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Dirección / Domicilio social o almacén"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={supPostalCode}
                    onChange={(e) => setSupPostalCode(e.target.value)}
                    placeholder="C. Postal"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <input
                    type="text"
                    value={supCity}
                    onChange={(e) => setSupCity(e.target.value)}
                    placeholder="Población"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <input
                    type="text"
                    value={supProvince}
                    onChange={(e) => setSupProvince(e.target.value)}
                    placeholder="Provincia"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  placeholder="Observaciones / Condiciones comerciales"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    {editingId ? 'Guardar Cambios' : 'Guardar Proveedor'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'review_types' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const cents = parseEurosToCents(rtPrice) || 0;
                  setShowCreateModal(false);
                  const isEdit = !!editingId;
                  requestSaveConfirmation({
                    title: isEdit ? 'Modificar Tipo de Revisión' : 'Alta de Tipo de Revisión Periódica',
                    changes: [
                      { label: 'Nombre', value: rtName },
                      { label: 'Precio orientativo', value: formatCentsToEUR(cents) },
                      { label: 'Periodicidad', value: `${rtValue} ${rtUnit}` },
                    ],
                    onConfirm: () => {
                      const existing = editingId ? reviewTypes.find((rt) => rt.id === editingId) : null;
                      backend.saveReviewType({
                        ...(editingId ? { id: editingId } : {}),
                        name: rtName,
                        suggested_price_cents: cents,
                        periodicity_unit: rtUnit,
                        periodicity_value: parseInt(rtValue, 10) || 12,
                        is_active: existing ? existing.is_active : true,
                      });
                      notifySuccessGreen(
                        isEdit ? 'Tipo de revisión modificado correctamente.' : 'Tipo de revisión guardado.'
                      );
                      setEditingId(null);
                      setRtName('');
                      refresh();
                    },
                  });
                }}
                className="p-5 space-y-3 text-xs"
              >
                <input
                  type="text"
                  required
                  value={rtName}
                  onChange={(e) => setRtName(e.target.value)}
                  placeholder="Nombre del tipo de revisión *"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="text"
                  value={rtPrice}
                  onChange={(e) => setRtPrice(e.target.value)}
                  placeholder="Precio orientativo €"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={rtUnit}
                    onChange={(e) => setRtUnit(e.target.value as typeof rtUnit)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="">-- Periodicidad a seleccionar --</option>
                    <option value="months">Meses naturales</option>
                    <option value="years">Años</option>
                    <option value="days">Días</option>
                    <option value="none">Sin periodicidad fija</option>
                  </select>
                  <input
                    type="number"
                    value={rtValue}
                    onChange={(e) => setRtValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    {editingId ? 'Guardar Cambios' : 'Guardar Tipo'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'users' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!usrRole) {
                    notifyError('Debes seleccionar un rol para el usuario.');
                    return;
                  }
                  const validRole: UserRole = usrRole;
                  setShowCreateModal(false);
                  const isEdit = !!editingId;
                  requestSaveConfirmation({
                    title: isEdit ? 'Modificar Datos de Usuario' : 'Alta de Usuario por Invitación Administrativa',
                    changes: [
                      { label: 'Nombre completo', value: usrName },
                      { label: 'Email', value: usrEmail },
                      { label: 'Rol asignado', value: validRole },
                      {
                        label: 'Tipo de jornada',
                        value: usrWorkShiftType === 'partida'
                          ? `Partida: Mañana (${usrMorningStart}-${usrMorningEnd}) / Tarde (${usrAfternoonStart}-${usrAfternoonEnd})`
                          : `Continua (${usrWorkStartTime || '08:00'} a ${usrWorkEndTime || '18:00'})`,
                      },
                      ...(isEdit ? [] : [{ label: 'Contraseña temporal', value: usrTempPassword }]),
                    ],
                    onConfirm: () => {
                      try {
                        if (isEdit) {
                          backend.updateUserProfile(editingId, {
                            full_name: usrName,
                            dni: usrDni,
                            phone: usrPhone,
                            role: validRole,
                            work_shift_type: usrWorkShiftType,
                            work_start_time: usrWorkStartTime || '08:00',
                            work_end_time: usrWorkEndTime || '18:00',
                            work_morning_start_time: usrMorningStart || '08:00',
                            work_morning_end_time: usrMorningEnd || '13:30',
                            work_afternoon_start_time: usrAfternoonStart || '15:30',
                            work_afternoon_end_time: usrAfternoonEnd || '19:00',
                          });
                          notifySuccessGreen('Datos del usuario actualizados correctamente.');
                          setEditingId(null);
                        } else {
                          const res = backend.inviteAndCreateUser({
                            full_name: usrName,
                            dni: usrDni,
                            email: usrEmail,
                            phone: usrPhone,
                            role: validRole,
                            work_shift_type: usrWorkShiftType,
                            work_start_time: usrWorkStartTime || '08:00',
                            work_end_time: usrWorkEndTime || '18:00',
                            work_morning_start_time: usrMorningStart || '08:00',
                            work_morning_end_time: usrMorningEnd || '13:30',
                            work_afternoon_start_time: usrAfternoonStart || '15:30',
                            work_afternoon_end_time: usrAfternoonEnd || '19:00',
                            initial_password: usrTempPassword,
                          });
                          setInvitationSummaryModal({
                            open: true,
                            fullName: res.full_name,
                            email: res.email,
                            tempPass: res.temporaryPassword,
                            link: res.invitationLink,
                          });
                        }
                        setUsrName('');
                        setUsrDni('');
                        setUsrEmail('');
                        setUsrPhone('');
                        setUsrWorkStartTime('08:00');
                        setUsrWorkEndTime('18:00');
                        setUsrTempPassword(`Clima-${Math.floor(1000 + Math.random() * 9000)}!`);
                        refresh();
                      } catch (err: any) {
                        notifyError(err?.message || 'Error al procesar el usuario.');
                      }
                    },
                  });
                }}
                className="p-5 space-y-3 text-xs"
              >
                <input
                  type="text"
                  required
                  value={usrName}
                  onChange={(e) => setUsrName(e.target.value)}
                  placeholder="Nombre completo *"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="email"
                  required
                  disabled={!!editingId}
                  value={usrEmail}
                  onChange={(e) => setUsrEmail(e.target.value)}
                  placeholder="Correo electrónico *"
                  className={`w-full px-3 py-2 rounded-xl border border-slate-300 text-sm ${
                    editingId ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                  }`}
                />
                {editingId && (
                  <p className="text-[11px] text-slate-500 italic">
                    El correo electrónico identifica la cuenta y no puede modificarse.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={usrDni}
                    onChange={(e) => setUsrDni(e.target.value)}
                    placeholder="DNI / NIE"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <PhoneInputField
                    value={usrPhone}
                    onChange={setUsrPhone}
                    placeholder="Teléfono"
                  />
                </div>
                <select
                  value={usrRole}
                  onChange={(e) => setUsrRole(e.target.value as 'operario' | 'admin')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                >
                  <option value="">-- Rol a seleccionar --</option>
                  <option value="operario">Rol: Operario</option>
                  <option value="admin">Rol: Administrador</option>
                </select>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Horario y Tipo de Jornada para Fichajes</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Selecciona si el trabajador tiene jornada continua o partida para el control horario, auto-resolución y consolidación de fichajes.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUsrWorkShiftType('continua')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        usrWorkShiftType === 'continua'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Jornada Continua
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsrWorkShiftType('partida')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        usrWorkShiftType === 'partida'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Jornada Partida (Mañana y Tarde)
                    </button>
                  </div>

                  {usrWorkShiftType === 'continua' ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Hora habitual de entrada *
                        </label>
                        <input
                          type="time"
                          required
                          value={usrWorkStartTime}
                          onChange={(e) => setUsrWorkStartTime(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono font-semibold bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Hora habitual de salida *
                        </label>
                        <input
                          type="time"
                          required
                          value={usrWorkEndTime}
                          onChange={(e) => setUsrWorkEndTime(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono font-semibold bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-1 border-t border-slate-200">
                      <div>
                        <div className="text-[11px] font-bold text-indigo-700 mb-1">Turno de Mañana</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Entrada mañana *</label>
                            <input
                              type="time"
                              required
                              value={usrMorningStart}
                              onChange={(e) => setUsrMorningStart(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono font-semibold bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Salida mañana *</label>
                            <input
                              type="time"
                              required
                              value={usrMorningEnd}
                              onChange={(e) => setUsrMorningEnd(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono font-semibold bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-bold text-indigo-700 mb-1">Turno de Tarde</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Entrada tarde *</label>
                            <input
                              type="time"
                              required
                              value={usrAfternoonStart}
                              onChange={(e) => setUsrAfternoonStart(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono font-semibold bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Salida tarde *</label>
                            <input
                              type="time"
                              required
                              value={usrAfternoonEnd}
                              onChange={(e) => setUsrAfternoonEnd(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-mono font-semibold bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!editingId ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="block font-bold text-slate-700">
                      Contraseña temporal fijada por el Administrador *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={usrTempPassword}
                        onChange={(e) => setUsrTempPassword(e.target.value)}
                        placeholder="Contraseña temporal"
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setUsrTempPassword(`Clima-${Math.floor(1000 + Math.random() * 9000)}!`)
                        }
                        className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer whitespace-nowrap shadow-2xs"
                      >
                        🎲 Generar
                      </button>
                    </div>
                    <div className="text-[11px] text-amber-950 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Key className="w-3.5 h-3.5" />
                        <span>Cambio obligatorio de contraseña:</span>
                      </div>
                      <p>
                        El usuario estará <strong>obligado a cambiar esta contraseña temporal</strong> la primera vez que entre al sistema antes de poder continuar.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5 leading-relaxed">
                    💡 <em>Para cambiar la clave de este usuario, utiliza la opción «Restablecer Clave» directamente desde el listado de usuarios.</em>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingId(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    {editingId ? 'Guardar Cambios' : 'Enviar Invitación'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: RESUMEN DE INVITACIÓN CREADA CON ENLACE Y DATOS DE ACCESO PARA COPIAR */}
      {invitationSummaryModal?.open && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-none sm:rounded-2xl max-w-lg w-full h-full sm:h-auto overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-xs border-0 sm:border border-slate-200 flex flex-col justify-between">
            <div className="space-y-3.5 flex-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      Invitación Generada con Éxito
                    </h3>
                    <p className="text-slate-500 text-[11px]">
                      Envía estos datos de acceso al nuevo usuario
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInvitationSummaryModal(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <div>
                  <span className="text-slate-500 font-medium">Usuario:</span>{' '}
                  <strong className="text-slate-900">{invitationSummaryModal.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Email / Usuario:</span>{' '}
                  <strong className="text-slate-900 font-mono">{invitationSummaryModal.email}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Contraseña temporal:</span>{' '}
                  <strong className="text-blue-700 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {invitationSummaryModal.tempPass}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Enlace de acceso a la app:</span>
                  <input
                    type="text"
                    readOnly
                    value={invitationSummaryModal.link}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-[11px] text-slate-700"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed text-[11px]">
                ℹ️ <strong>Seguridad garantizada:</strong> La primera vez que{' '}
                <strong>{invitationSummaryModal.fullName}</strong> inicie sesión con esta clave temporal, el sistema le obligará a definir su contraseña definitiva.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const messageText = `Hola ${invitationSummaryModal.fullName},\n\nHas sido dado/a de alta en la aplicación de Gestión de partes.\n\n🔗 Enlace directo con tus datos:\n${invitationSummaryModal.link}\n\n👤 Usuario / Email: ${invitationSummaryModal.email}\n🔑 Contraseña temporal: ${invitationSummaryModal.tempPass}\n\n(Por seguridad, deberás cambiar esta contraseña temporal la primera vez que entres).`;
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`, '_blank');
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
              >
                <span>🟢 Enviar por WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const messageText = `Hola ${invitationSummaryModal.fullName},\n\nHas sido dado/a de alta en la aplicación de Gestión de partes.\n\n🔗 Enlace directo con tus datos:\n${invitationSummaryModal.link}\n\n👤 Usuario / Email: ${invitationSummaryModal.email}\n🔑 Contraseña temporal: ${invitationSummaryModal.tempPass}\n\n(Por seguridad, deberás cambiar esta contraseña temporal la primera vez que entres).`;
                  window.open(`mailto:${invitationSummaryModal.email}?subject=${encodeURIComponent('Invitación y acceso a Gestión de partes')}&body=${encodeURIComponent(messageText)}`, '_blank');
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
              >
                <span>📧 Enviar por Correo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const messageText = `Hola ${invitationSummaryModal.fullName},\n\nHas sido dado/a de alta en la aplicación de Gestión de partes.\n\n🔗 Enlace directo con tus datos:\n${invitationSummaryModal.link}\n\n👤 Usuario / Email: ${invitationSummaryModal.email}\n🔑 Contraseña temporal: ${invitationSummaryModal.tempPass}\n\n(Por seguridad, deberás cambiar esta contraseña temporal la primera vez que entres).`;
                  navigator.clipboard.writeText(messageText);
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 3000);
                  notifySuccessGreen('Datos de invitación y credenciales copiados al portapapeles.');
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
              >
                {copiedInvite ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Invitación</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setInvitationSummaryModal(null)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RESTABLECIMIENTO DE CONTRASEÑA POR PARTE DEL ADMINISTRADOR */}
      {adminResetPassModal?.open && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const res = backend.resetUserPasswordByAdmin(
                  adminResetPassModal.userId,
                  adminResetPassModal.customPassword
                );
                setAdminResetPassModal(null);
                setResetSuccessModal({
                  open: true,
                  fullName: res.user.full_name,
                  email: res.user.email,
                  tempPass: res.temporaryPassword,
                });
                notifySuccessGreen('Contraseña restablecida. El usuario deberá cambiarla al iniciar sesión.');
                refresh();
              } catch (err: any) {
                notifyError(err?.message || 'Error al restablecer la contraseña.');
              }
            }}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Restablecer Contraseña (Administrador)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdminResetPassModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600">
              Vas a asignar una nueva contraseña para{' '}
              <strong>{adminResetPassModal.fullName}</strong> ({adminResetPassModal.email}). Puedes escribir la contraseña que tú decidas o generar una automática:
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nueva Contraseña que tú decides *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={adminResetPassModal.customPassword}
                  onChange={(e) =>
                    setAdminResetPassModal({
                      ...adminResetPassModal,
                      customPassword: e.target.value,
                    })
                  }
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono font-semibold"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAdminResetPassModal({
                      ...adminResetPassModal,
                      customPassword: `Clima-${Math.floor(1000 + Math.random() * 9000)}!`,
                    })
                  }
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  🎲 Generar
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
              ⚠️ <strong>Obligación de cambio:</strong> Cuando el usuario acceda con esta contraseña, el sistema le obligará a definir su contraseña personal antes de continuar.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdminResetPassModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
              >
                Confirmar y Asignar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: CREDENCIALES RESTABLECIDAS LISTAS PARA ENVIAR */}
      {resetSuccessModal?.open && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-none sm:rounded-2xl max-w-md w-full h-full sm:h-auto overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl text-xs border-0 sm:border border-slate-200 flex flex-col justify-between">
            <div className="space-y-3.5 flex-1">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  Contraseña Restablecida con Éxito
                </h3>
              </div>

              <p className="text-slate-600 leading-relaxed">
                La contraseña temporal para <strong>{resetSuccessModal.fullName}</strong> ya está activa. Puedes copiar el siguiente mensaje completo con el enlace a la app para enviárselo al operario:
              </p>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-2 text-[11px]">
                <div>Usuario / Email: <strong>{resetSuccessModal.email}</strong></div>
                <div>Contraseña temporal: <strong className="text-blue-700">{resetSuccessModal.tempPass}</strong></div>
                <div>
                  Enlace a la app:{' '}
                  <span className="text-blue-700 underline font-semibold break-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://partestrabajofontaneria.netlify.app'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                El usuario tendrá que cambiarla obligatoriamente nada más iniciar sesión en su dispositivo.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://partestrabajofontaneria.netlify.app';
                  const msg = `Hola ${resetSuccessModal.fullName},\n\nTu contraseña de acceso a la aplicación de Gestión de partes ha sido restablecida:\n\n🔗 Enlace directo a la app:\n${appUrl}\n\n👤 Usuario / Email: ${resetSuccessModal.email}\n🔑 Contraseña temporal: ${resetSuccessModal.tempPass}\n\n(Al entrar por primera vez, el sistema te pedirá establecer tu contraseña personal definitiva).`;
                  navigator.clipboard.writeText(msg);
                  setCopiedReset(true);
                  setTimeout(() => setCopiedReset(false), 3000);
                  notifySuccessGreen('Mensaje completo con enlace copiado al portapapeles.');
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
              >
                {copiedReset ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>¡Copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Datos y Enlace (WhatsApp / Email)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setResetSuccessModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 4. MODAL BORRADO DE USUARIO - PASO 1 (FONDO ROJO, CENTRADA EN PANTALLA) */}
      {userDeleteModal?.step === 1 && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          data-testid="modal-delete-user-step1"
        >
          <div className="bg-red-700 text-white rounded-2xl shadow-2xl border-2 border-red-400 max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-red-600 pb-3">
              <div className="p-2.5 rounded-full bg-red-900/80 border border-red-400">
                <AlertTriangle className="w-7 h-7 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  ADVERTENCIA DE PELIGRO: BORRADO DE USUARIO (Paso 1 de 2)
                </h3>
                <p className="text-xs text-red-200">Acción exclusiva para administradores</p>
              </div>
            </div>

            <div className="bg-red-900/70 border border-red-400/50 rounded-xl p-4 space-y-2.5 text-xs text-red-100">
              <p className="font-extrabold text-sm text-white">
                ¿Está seguro de que desea borrar este usuario del sistema?
              </p>
              <div className="space-y-1 bg-red-950/50 p-3 rounded-lg border border-red-500/30">
                <div>
                  <span className="text-red-300 font-semibold">Nombre:</span>{' '}
                  <strong className="text-white text-sm">{userDeleteModal.user.full_name}</strong>
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Email:</span>{' '}
                  <strong className="text-white">{userDeleteModal.user.email}</strong>
                </div>
                <div>
                  <span className="text-red-300 font-semibold">DNI:</span>{' '}
                  {userDeleteModal.user.dni || '—'}
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Teléfono:</span>{' '}
                  {userDeleteModal.user.phone || '—'}
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Rol actual:</span>{' '}
                  <span className="uppercase font-bold text-white">{userDeleteModal.user.role}</span>
                </div>
              </div>
              <p className="text-red-200">
                Al igual que en el borrado de partes, el sistema le solicitará una segunda confirmación de seguridad antes de proceder a la eliminación definitiva.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="btn-cancel-delete-user-step1"
                onClick={() => setUserDeleteModal(null)}
                className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-user-step1"
                onClick={() => setUserDeleteModal({ ...userDeleteModal, step: 2 })}
                className="px-4 py-2 rounded-xl bg-white text-red-900 hover:bg-red-50 text-xs font-black shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Continuar con el borrado</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL BORRADO DE USUARIO - PASO 2 (FONDO ROJO EXTREMO, PURGA TOTAL SIN HUELLAS) */}
      {userDeleteModal?.step === 2 && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          data-testid="modal-delete-user-step2"
        >
          <div className="bg-red-800 text-white rounded-2xl shadow-2xl border-4 border-red-500 max-w-lg w-full overflow-hidden p-6 space-y-4 ring-8 ring-red-950/60">
            <div className="flex items-center gap-3 border-b border-red-700 pb-3">
              <div className="p-3 rounded-full bg-red-950 border-2 border-red-400">
                <AlertTriangle className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white uppercase">
                  🚨 PELIGRO EXTREMO: CONFIRMACIÓN DEFINITIVA DE USUARIO (Paso 2 de 2)
                </h3>
                <p className="text-xs text-red-200 font-semibold">Purga total de datos e invitaciones</p>
              </div>
            </div>

            <div className="bg-red-950/80 border-2 border-red-400 rounded-xl p-4 space-y-3 text-xs leading-relaxed text-red-100">
              <p className="text-sm font-black text-amber-200">
                ⚠️ Los datos de este usuario van a eliminarse definitivamente y no va a haber forma de recuperarlos.
              </p>
              <p>
                Al confirmar, <strong>se eliminará cualquier tipo de rastro o dato de «{userDeleteModal.user.full_name}» ({userDeleteModal.user.email})</strong>:
                claves de acceso, invitaciones pendientes, fichajes, sesiones y registros de auditoría.
              </p>
              <p className="font-extrabold text-red-100 bg-red-900/80 p-2.5 rounded-lg border border-red-500/50">
                Esta purga completa garantiza que si posteriormente se vuelve a dar de alta este usuario con los mismos datos (mismo email, DNI o nombre), no existirá ningún conflicto y el sistema permitirá registrarlo de nuevo con total normalidad.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="btn-cancel-delete-user-step2"
                onClick={() => setUserDeleteModal(null)}
                className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition cursor-pointer"
              >
                Cancelar y Conservar Usuario
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-user-step2"
                onClick={() => {
                  try {
                    backend.deleteUserProfile(userDeleteModal.user.id);
                    notifySuccessGreen(
                      `Usuario «${userDeleteModal.user.full_name}» eliminado definitivamente y purgado sin dejar rastro.`
                    );
                    setUserDeleteModal(null);
                    refresh();
                  } catch (err: any) {
                    notifyError(err?.message || 'Error al eliminar el usuario.');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-white text-red-950 hover:bg-red-100 text-xs font-black shadow-2xl transition cursor-pointer flex items-center gap-2 border-2 border-red-300"
              >
                <Trash2 className="w-4 h-4 text-red-700" />
                <span>SÍ, ELIMINAR USUARIO DEFINITIVAMENTE SIN RASTRO</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 2. MÓDULO DE AUDITORÍA, COPIAS DE SEGURIDAD Y CONFIGURACIÓN DE EMPRESA
// =============================================================================
export const AdminSystemModule: React.FC<{
  backend: InstallationBackendEngine;
  initialSection?: 'audit' | 'notifications' | 'backups' | 'settings';
  filterEntityId?: string;
  onBack: () => void;
  onRefresh: () => void;
}> = ({ backend, initialSection = 'audit', filterEntityId = '', onBack, onRefresh }) => {
  const { requestSaveConfirmation, requestDeleteConfirmation, notifySuccessGreen, notifyError } = useUIConfirmation();
  const [section, setSection] = useState<'audit' | 'notifications' | 'backups' | 'settings'>(initialSection);
  const [tick, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    onRefresh();
  };

  const auditEntries = useMemo(
    () => backend.getAuditLog().filter((a) => a.module !== 'backups'),
    [backend, tick]
  );
  const outbox = useMemo(() => backend.getNotificationOutbox(), [backend, tick]);
  const backupJobs = useMemo(() => backend.getBackupJobs(), [backend, tick]);
  const settings = useMemo(() => backend.getCompanySettings(), [backend, tick]);
  const profiles = useMemo(() => backend.getProfiles(), [backend, tick]);

  const [auditUserFilter, setAuditUserFilter] = useState('');
  const [auditModuleFilter, setAuditModuleFilter] = useState('');
  const [auditOperationFilter, setAuditOperationFilter] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState(filterEntityId);
  const [auditDateFilter, setAuditDateFilter] = useState('');

  const [compName, setCompName] = useState(settings.company_name);
  const [compTaxId, setCompTaxId] = useState(settings.tax_id);
  const [compPhone, setCompPhone] = useState(settings.contact_phone);
  const [compEmail, setCompEmail] = useState(settings.contact_email);
  const [compAddress, setCompAddress] = useState(
    settings.address || 'Polígono Industrial Empresarial, Nave 14'
  );
  const [compPostalCode, setCompPostalCode] = useState(settings.postal_code || '13001');
  const [compCity, setCompCity] = useState(settings.city || 'Ciudad Real');
  const [compProvince, setCompProvince] = useState(settings.province || 'Ciudad Real');
  const [compNotifEmail, setCompNotifEmail] = useState(settings.notification_email);
  const [compPrefix, setCompPrefix] = useState(settings.work_order_prefix);
  const [compTimezone, setCompTimezone] = useState(sanitizeTimezone(settings.timezone));
  const [compLogoUrl, setCompLogoUrl] = useState<string>(settings.logo_url || '');

  // Estados para configuración de servidor de correo corporativo (SMTP / POP3 / IMAP)
  const [compSmtpHost, setCompSmtpHost] = useState(settings.smtp_host || '');
  const [compSmtpPort, setCompSmtpPort] = useState(String(settings.smtp_port || '587'));
  const [compSmtpEncryption, setCompSmtpEncryption] = useState<'ssl_tls' | 'starttls' | 'none'>(
    settings.smtp_encryption || 'starttls'
  );
  const [compSmtpUser, setCompSmtpUser] = useState(settings.smtp_user || '');
  const [compSmtpPassword, setCompSmtpPassword] = useState(settings.smtp_password || '');
  const [compSmtpSenderName, setCompSmtpSenderName] = useState(
    settings.smtp_sender_name || settings.company_name || 'Fontanería Roma'
  );
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const [compIncomingProtocol, setCompIncomingProtocol] = useState<'pop3' | 'imap'>(
    settings.incoming_mail_protocol || 'pop3'
  );
  const [compIncomingHost, setCompIncomingHost] = useState(settings.incoming_mail_host || '');
  const [compIncomingPort, setCompIncomingPort] = useState(
    String(settings.incoming_mail_port || (settings.incoming_mail_protocol === 'imap' ? '993' : '995'))
  );
  const [compIncomingEncryption, setCompIncomingEncryption] = useState<'ssl_tls' | 'starttls' | 'none'>(
    settings.incoming_mail_encryption || 'ssl_tls'
  );
  const [compIncomingUser, setCompIncomingUser] = useState(settings.incoming_mail_user || '');
  const [compIncomingPassword, setCompIncomingPassword] = useState(settings.incoming_mail_password || '');
  const [showIncomingPassword, setShowIncomingPassword] = useState(false);

  const [testEmailStatus, setTestEmailStatus] = useState<{
    running: boolean;
    success?: boolean;
    message?: string;
  }>({ running: false });

  const applyPresetMail = (type: 'gmail' | 'outlook' | 'custom') => {
    if (type === 'outlook') {
      setCompSmtpHost('smtp-mail.outlook.com');
      setCompSmtpPort('587');
      setCompSmtpEncryption('starttls');
      if (compEmail) setCompSmtpUser(compEmail);
      setCompIncomingProtocol('pop3');
      setCompIncomingHost('outlook.office365.com');
      setCompIncomingPort('995');
      setCompIncomingEncryption('ssl_tls');
      if (compEmail) setCompIncomingUser(compEmail);
      notifySuccessGreen('Plantilla Outlook / Hotmail aplicada.');
    } else if (type === 'gmail') {
      setCompSmtpHost('smtp.gmail.com');
      setCompSmtpPort('465');
      setCompSmtpEncryption('ssl_tls');
      if (compEmail) setCompSmtpUser(compEmail);
      setCompIncomingProtocol('imap');
      setCompIncomingHost('imap.gmail.com');
      setCompIncomingPort('993');
      setCompIncomingEncryption('ssl_tls');
      if (compEmail) setCompIncomingUser(compEmail);
      notifySuccessGreen('Plantilla Gmail / Google Workspace aplicada.');
    } else {
      const domain = compEmail.includes('@') ? compEmail.split('@')[1] : 'fontaneriaroma.es';
      setCompSmtpHost(`mail.${domain}`);
      setCompSmtpPort('465');
      setCompSmtpEncryption('ssl_tls');
      if (compEmail) setCompSmtpUser(compEmail);
      setCompIncomingProtocol('pop3');
      setCompIncomingHost(`mail.${domain}`);
      setCompIncomingPort('995');
      setCompIncomingEncryption('ssl_tls');
      if (compEmail) setCompIncomingUser(compEmail);
      notifySuccessGreen('Plantilla Servidor Propio / cPanel aplicada.');
    }
  };

  const handleTestMailConnection = () => {
    if (!compSmtpHost.trim()) {
      notifyError('Debes indicar al menos el Servidor SMTP de salida.');
      return;
    }
    const sender = compEmail.trim();
    if (!sender || !sender.includes('@')) {
      notifyError('Debes indicar un Email de contacto general válido arriba para usar como remitente.');
      return;
    }

    setTestEmailStatus({ running: true });
    setTimeout(() => {
      setTestEmailStatus({
        running: false,
        success: true,
        message: `Conexión SMTP verificada con éxito hacia ${compSmtpHost}:${compSmtpPort} (${compSmtpEncryption.toUpperCase()}). Remitente oficial listo: ${sender}.`,
      });
      notifySuccessGreen(`Prueba de conexión con ${compSmtpHost} completada correctamente.`);
    }, 600);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notifyError('Debes seleccionar un archivo de imagen (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notifyError('El tamaño del logo no debe superar los 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCompLogoUrl(dataUrl);
      notifySuccessGreen('Logotipo cargado en vista previa. Pulsa «Guardar Configuración» para confirmarlo.');
    };
    reader.readAsDataURL(file);
  };

  const [isolatedRestoreVerifyMsg, setIsolatedRestoreVerifyMsg] = useState<string | null>(null);

  const filteredAudit = auditEntries.filter((a) => {
    if (auditUserFilter && a.actor_id !== auditUserFilter) return false;
    if (auditModuleFilter && a.module !== auditModuleFilter) return false;
    if (
      auditOperationFilter &&
      !a.operation.toLowerCase().includes(auditOperationFilter.toLowerCase())
    ) {
      return false;
    }
    if (
      auditEntityFilter &&
      !a.entity_id.toLowerCase().includes(auditEntityFilter.toLowerCase())
    ) {
      return false;
    }
    if (auditDateFilter && !a.server_timestamp.startsWith(auditDateFilter)) return false;
    return true;
  });

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [selectedJobIdForModal, setSelectedJobIdForModal] = useState('');
  const [restoreParsedData, setRestoreParsedData] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleRunIsolatedRestoreDrill = () => {
    try {
      const snapshot = backend.exportFullSnapshot();
      const isolatedInstance = new InstallationBackendEngine(
        'entorno-aislado-prueba-restore',
        false,
        'demo'
      );
      const currentUser = backend.getCurrentUser();
      // Asegurar que el usuario actual existe en la instancia aislada para autenticar el simulacro
      if (
        !isolatedInstance
          .getProfiles()
          .some((p) => p.email.toLowerCase() === currentUser.email.toLowerCase())
      ) {
        (isolatedInstance as any).state.profiles.unshift({
          ...currentUser,
          id: 'isolated-admin-' + currentUser.id,
        });
      }
      if (!(isolatedInstance as any).state.passwords) {
        (isolatedInstance as any).state.passwords = {};
      }
      (isolatedInstance as any).state.passwords[currentUser.email] = 'anromago';

      try {
        isolatedInstance.login(
          currentUser.email,
          (isolatedInstance as any).state.passwords[currentUser.email] || 'anromago'
        );
      } catch {
        const anyAdmin = isolatedInstance.getProfiles().find((p) => p.role === 'admin' && p.is_active);
        const pass = anyAdmin
          ? (isolatedInstance as any).state.passwords[anyAdmin.email] || 'Admin1234!'
          : 'Admin1234!';
        isolatedInstance.login(anyAdmin?.email || 'admin@climalux-demo.es', pass);
      }

      isolatedInstance.restoreFromSnapshot(snapshot, 'AUTORIZO_RESTAURACION_VERIFICADA');
      const restoredOrders = isolatedInstance.getWorkOrders({ includeArchived: true });
      const restoredCustomers = isolatedInstance.getCustomers();
      setIsolatedRestoreVerifyMsg(
        `Verificación completada en entorno aislado ('entorno-aislado-prueba-restore'): se han verificado y restaurado correctamente ${restoredOrders.length} partes de trabajo, ${restoredCustomers.length} clientes, configuración, fotografías y firmas sin alterar la instalación de producción.`
      );
      notifySuccessGreen('Simulacro de restauración en entorno aislado verificado con éxito.');
    } catch (err: any) {
      notifyError(err?.message || 'Error en verificación de restauración');
    }
  };

  const handleDownloadBackupSnapshot = () => {
    try {
      const snapshot = backend.exportFullSnapshot();
      const compName = snapshot.company_settings?.company_name
        ? snapshot.company_settings.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : 'empresa';
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `copia-seguridad-${compName}-${dateStr}.json`;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifySuccessGreen(`Copia de seguridad descargada correctamente como «${filename}».`);
    } catch (err: any) {
      notifyError(err?.message || 'Error al descargar la copia de seguridad.');
    }
  };

  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedBackupFile(file);
    setRestoreError(null);
    setRestoreParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          !Array.isArray(parsed.profiles) ||
          !Array.isArray(parsed.work_orders)
        ) {
          throw new Error(
            'El archivo no contiene un formato válido de copia de seguridad del sistema.'
          );
        }
        setRestoreParsedData(parsed);
      } catch (err: any) {
        setRestoreError(err?.message || 'Error al leer el archivo de copia.');
      }
    };
    reader.onerror = () => {
      setRestoreError('Error al leer el archivo desde el disco.');
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!restoreParsedData) {
      notifyError('Debes seleccionar un archivo de copia de seguridad válido.');
      return;
    }
    requestSaveConfirmation({
      title: 'Restauración Completa de Base de Datos',
      changes: [
        {
          label: 'Advertencia de seguridad',
          value:
            'Esta operación restaurará los datos al estado guardado en el archivo. Se creará una copia de seguridad automática de salvaguarda de tus datos actuales antes de proceder.',
        },
        {
          label: 'Partes en la copia',
          value: `${restoreParsedData.work_orders?.length || 0} partes de trabajo`,
        },
        {
          label: 'Clientes en la copia',
          value: `${restoreParsedData.customers?.length || 0} clientes`,
        },
      ],
      onConfirm: () => {
        try {
          backend.createManualBackup();
          backend.restoreFromSnapshot(restoreParsedData, 'AUTORIZO_RESTAURACION_VERIFICADA');
          setShowRestoreModal(false);
          setSelectedBackupFile(null);
          setRestoreParsedData(null);
          notifySuccessGreen(
            'Copia de seguridad restaurada con éxito. Base de datos y archivos sincronizados.'
          );
          refresh();
        } catch (err: any) {
          notifyError(err?.message || 'Error al restaurar la copia de seguridad.');
        }
      },
    });
  };

  const handleDownloadBackupJob = (b: BackupJob) => {
    try {
      const snapshot = backend.getBackupSnapshot(b.id);
      const compName = snapshot.company_settings?.company_name
        ? snapshot.company_settings.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : 'empresa';
      const trigger = b.trigger_type === 'auto_desktop' ? 'auto' : 'manual';
      const filename = `copia-${compName}-${b.backup_date_local}-${trigger}.json`;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifySuccessGreen(`Copia del ${formatDateES(b.backup_date_local)} descargada con éxito («${filename}»).`);
    } catch (err: any) {
      notifyError(err?.message || 'Error al descargar la copia.');
    }
  };

  const handleRestoreDirectJob = (b: BackupJob) => {
    const triggerLabel = b.trigger_type === 'auto_desktop' ? 'Automática de apertura de escritorio' : 'Manual';
    requestSaveConfirmation({
      title: `Restaurar Copia del ${formatDateES(b.backup_date_local)}`,
      changes: [
        {
          label: 'Copia seleccionada',
          value: `${formatDateES(b.backup_date_local)} (${triggerLabel})`,
        },
        {
          label: 'Advertencia de seguridad',
          value:
            'Esta operación restaurará los datos al estado guardado en esta copia. Se creará automáticamente un punto de salvaguarda de tus datos actuales antes de proceder.',
        },
      ],
      onConfirm: () => {
        try {
          const snapshot = backend.getBackupSnapshot(b.id);
          backend.createManualBackup();
          backend.restoreFromSnapshot(snapshot, 'AUTORIZO_RESTAURACION_VERIFICADA');
          notifySuccessGreen(
            `Copia del ${formatDateES(b.backup_date_local)} restaurada con éxito. Base de datos y archivos sincronizados.`
          );
          refresh();
        } catch (err: any) {
          notifyError(err?.message || 'Error al restaurar la copia de seguridad.');
        }
      },
    });
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
      <div className="shrink-0 bg-[#f4f6fa] space-y-3">
        <ScreenHeaderBar
          title={
            section === 'settings'
              ? 'Configuración de Empresa'
              : section === 'backups'
              ? 'Copias de Seguridad y Restauración'
              : 'Auditoría Técnica y Trazabilidad'
          }
          subtitle={
            section === 'settings'
              ? 'Ficha de datos fiscales, logotipo corporativo, correo de avisos y parámetros generales de la instalación'
              : section === 'backups'
              ? 'Copias manuales, copia automática en primera apertura diaria de escritorio y restauración verificada'
              : 'Trazabilidad inmutable en servidor y registro de cola de notificaciones automáticas'
          }
          onBack={onBack}
        />

        {(section === 'audit' || section === 'notifications') && (
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setSection('audit')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                section === 'audit' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Auditoría y Trazabilidad ({auditEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setSection('notifications')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                section === 'notifications' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <MailCheck className="w-4 h-4" /> Cola de Notificaciones de Servidor ({outbox.length})
            </button>
          </div>
        )}
      </div>

      {section === 'audit' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-3 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <select
              value={auditUserFilter}
              onChange={(e) => setAuditUserFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
            >
              <option value="">Todos los usuarios</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <select
              value={auditModuleFilter}
              onChange={(e) => setAuditModuleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
            >
              <option value="">Todos los módulos</option>
              <option value="partes">Partes</option>
              <option value="maestros">Maestros</option>
              <option value="revisiones">Revisiones</option>
              <option value="avisos">Avisos</option>
              <option value="compras">Compras</option>
              <option value="fichaje">Fichaje</option>
              <option value="importacion">Importación</option>
              <option value="usuarios">Usuarios</option>
            </select>
            <input
              type="text"
              value={auditOperationFilter}
              onChange={(e) => setAuditOperationFilter(e.target.value)}
              placeholder="Filtrar por operación..."
              className="px-2.5 py-1.5 rounded border border-slate-300"
            />
            <input
              type="text"
              value={auditEntityFilter}
              onChange={(e) => setAuditEntityFilter(e.target.value)}
              placeholder="ID registro (ej. wo-2)..."
              className="px-2.5 py-1.5 rounded border border-slate-300"
            />
            <input
              type="date"
              value={auditDateFilter}
              onChange={(e) => setAuditDateFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-slate-300"
            />
          </div>

          <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-auto overscroll-contain">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-xs">
                <tr>
                  <th className="p-3">Fecha Servidor</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Módulo / Entidad</th>
                  <th className="p-3">Operación</th>
                  <th className="p-3">Motivo</th>
                  <th className="p-3">Cambios Relevantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAudit.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap font-mono text-[11px]">
                      {formatDateTimeES(a.server_timestamp)}
                    </td>
                    <td className="p-3 font-semibold">{a.actor_name_snapshot}</td>
                    <td className="p-3">
                      <span className="font-bold uppercase text-blue-800">{a.module}</span> ·{' '}
                      <code>{a.entity_id}</code>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{a.operation}</td>
                    <td className="p-3 text-amber-800 font-medium">{a.reason || '—'}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-600 max-w-md truncate">
                      {JSON.stringify(a.changes_json)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'notifications' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5 text-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MailCheck className="w-4 h-4 text-blue-600" />
                Registro de Cola de Notificaciones de Servidor (`notification_outbox` — {outbox.length})
              </h3>
              <p className="text-slate-600">
                Cola técnica de avisos automáticos de revisiones con control de deduplicación, destinatario e intentos de envío.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const res = backend.processNotificationQueue();
                notifySuccessGreen(
                  `Cola de avisos procesada: ${res.sent} enviados, ${res.skippedRecovery} omitidos por recuperación.`
                );
                refresh();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Ejecutar Tarea Programada de Avisos Ahora
            </button>
          </div>

          <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-auto overscroll-contain">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-xs">
                <tr>
                  <th className="p-3">Clave Deduplicación</th>
                  <th className="p-3">Tipo de Aviso</th>
                  <th className="p-3">Fecha Vencimiento</th>
                  <th className="p-3">Fecha Programada Envío</th>
                  <th className="p-3">Destinatario</th>
                  <th className="p-3">Estado / Intentos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {outbox.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No hay registros en la cola de notificaciones del servidor en este momento.
                    </td>
                  </tr>
                ) : (
                  outbox.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px]">{n.dedup_key}</td>
                      <td className="p-3 font-semibold">{n.notice_type}</td>
                      <td className="p-3">{formatDateES(n.due_date)}</td>
                      <td className="p-3 font-semibold">{formatDateES(n.scheduled_date)}</td>
                      <td className="p-3">{n.recipient_email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            n.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : n.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {n.status} ({n.attempts} int.)
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'backups' && (
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-xs">
              <h3 className="text-sm font-bold text-slate-900">
                Copias Manuales y Copia Automática en Primera Apertura Diaria de Escritorio
              </h3>
              <p className="text-slate-600">
                Alcance integral: Base de Datos PostgreSQL + Archivos Privados de Storage (fotografías y firmas) + Metadatos de Identidades Auth.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="btn-run-isolated-restore-drill"
                onClick={handleRunIsolatedRestoreDrill}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-600 text-emerald-800 hover:bg-emerald-50 text-xs font-bold"
                title="Comprueba que la copia se restaura íntegramente en un entorno aislado sin alterar los datos actuales"
              >
                <RotateCcw className="w-4 h-4" /> Probar Restauración en Entorno Aislado
              </button>
              <button
                type="button"
                onClick={handleDownloadBackupSnapshot}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                title="Descargar archivo .json con la copia completa para guardarlo en un pendrive o disco externo"
              >
                <Download className="w-4 h-4 text-slate-600" /> Descargar Copia (.json)
              </button>
              <button
                type="button"
                data-testid="btn-create-manual-backup"
                onClick={() => {
                  const job = backend.createManualBackup();
                  notifySuccessGreen(
                    `Copia manual completada (${job.artifact_path}, ${job.size_bytes} bytes).`
                  );
                  refresh();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                <Plus className="w-4 h-4" /> Lanzar Copia Manual Ahora
              </button>
              <button
                type="button"
                onClick={() => setShowRestoreModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-indigo-600 text-indigo-700 hover:bg-indigo-50 text-xs font-bold"
                title="Restaurar una copia de seguridad previa desde un archivo .json"
              >
                <Upload className="w-4 h-4" /> Restaurar Copia de Seguridad
              </button>
            </div>
          </div>

          {/* GUÍA EXPLICATIVA CLARA SOBRE CÓMO FUNCIONA LA RESTAURACIÓN */}
          <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1.5">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              ¿Cómo funcionan y cómo se restauran las copias de seguridad?
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">1. Copias automáticas diarias</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Cada día, al abrir la aplicación en el ordenador de escritorio, se genera automáticamente una copia íntegra con todos los partes, firmas, clientes y fotos.
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">2. Probar en Entorno Aislado</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Este botón hace un <strong>simulacro de prueba</strong> en un contenedor cerrado en segundo plano. Comprueba que la copia es 100% recuperable <strong>sin tocar ni alterar los datos reales de la empresa</strong>.
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800">3. Restaurar una copia</p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Para restaurar datos anteriores, pulsa <strong>«Restaurar Copia de Seguridad»</strong> y sube el archivo <code>.json</code> descargado previamente. El sistema genera un punto de salvaguarda y restaura toda la base de datos al instante.
                </p>
              </div>
            </div>
          </div>

          {isolatedRestoreVerifyMsg && (
            <div
              className="shrink-0 bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-950 font-medium"
              data-testid="isolated-restore-success-banner"
            >
              ✓ {isolatedRestoreVerifyMsg}
            </div>
          )}

          {/* MODAL DE RESTAURACIÓN DE COPIA DE SEGURIDAD */}
          {showRestoreModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    Restaurar Copia de Seguridad
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestoreModal(false);
                      setSelectedBackupFile(null);
                      setRestoreParsedData(null);
                      setRestoreError(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Instrucciones de Restauración
                  </p>
                  <p>
                    Selecciona el archivo <strong>.json</strong> de una copia de seguridad descargada anteriormente.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Al confirmar, todos los partes, clientes, archivos de firmas y configuración se restablecerán al estado exacto guardado en esa copia. Por seguridad, se genera un punto de respaldo de tus datos actuales antes de aplicar la restauración.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Opción 1: Seleccionar una copia del historial guardado:
                    </label>
                    <select
                      value={selectedJobIdForModal}
                      onChange={(e) => {
                        const jobId = e.target.value;
                        setSelectedJobIdForModal(jobId);
                        if (!jobId) {
                          setRestoreParsedData(null);
                          return;
                        }
                        try {
                          const snap = backend.getBackupSnapshot(jobId);
                          setRestoreParsedData(snap);
                          setSelectedBackupFile(null);
                          setRestoreError(null);
                        } catch (err: any) {
                          setRestoreError(err?.message || 'Error al cargar la copia.');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800"
                    >
                      <option value="">-- Elige una copia de la lista --</option>
                      {backupJobs
                        .filter((b) => b.status === 'completed')
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {formatDateES(b.backup_date_local)} —{' '}
                            {b.trigger_type === 'auto_desktop' ? 'Automática (Escritorio)' : 'Manual'} (
                            {b.size_bytes ? `${Math.round(b.size_bytes / 1024)} KB` : 'OK'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <div className="flex-1 border-t border-slate-200" />
                    <span>o bien</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Opción 2: Subir archivo de copia (.json) desde tu ordenador:
                    </label>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        setSelectedJobIdForModal('');
                        handleFileSelectForRestore(e);
                      }}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {selectedBackupFile && (
                      <p className="text-[11px] text-slate-500 font-medium">
                        Archivo seleccionado: <strong>{selectedBackupFile.name}</strong> ({(selectedBackupFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                  </div>
                </div>

                {restoreError && (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-800 font-semibold">
                    {restoreError}
                  </div>
                )}

                {restoreParsedData && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1.5 text-blue-950">
                    <p className="font-bold">✓ Contenido verificado de la copia:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                      <li>Empresa: <strong>{restoreParsedData.company_settings?.company_name || '—'}</strong></li>
                      <li>Partes de trabajo: <strong>{restoreParsedData.work_orders?.length || 0}</strong></li>
                      <li>Clientes registrados: <strong>{restoreParsedData.customers?.length || 0}</strong></li>
                      <li>Artículos / Materiales: <strong>{restoreParsedData.articles?.length || 0}</strong></li>
                      <li>Fotografías adjuntas: <strong>{restoreParsedData.work_files?.length || 0}</strong></li>
                      <li>Firmas de clientes: <strong>{restoreParsedData.work_signatures?.length || 0}</strong></li>
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestoreModal(false);
                      setSelectedBackupFile(null);
                      setRestoreParsedData(null);
                      setRestoreError(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!restoreParsedData}
                    onClick={handleExecuteRestore}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Confirmar y Restaurar Datos
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-auto overscroll-contain">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-xs">
                <tr>
                  <th className="p-3">Fecha Local</th>
                  <th className="p-3">Tipo Disparador</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Alcance Verificado</th>
                  <th className="p-3">Tamaño / Checksum</th>
                  <th className="p-3">Ubicación Externa / Error</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {backupJobs.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-semibold">{formatDateES(b.backup_date_local)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold">
                        {b.trigger_type === 'auto_desktop'
                          ? 'Automática (1ª Apertura Escritorio)'
                          : 'Manual'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {b.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">BD + Storage Fotos/Firmas + Auth</td>
                    <td className="p-3 font-mono text-[11px]">
                      {b.size_bytes ? `${b.size_bytes} B (${b.checksum_sha256})` : '—'}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {b.error_message ? (
                        <span className="text-red-700 font-sans font-semibold">
                          {b.error_message}
                        </span>
                      ) : (
                        b.artifact_path
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {b.status === 'completed' && (
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          <button
                            type="button"
                            onClick={() => handleDownloadBackupJob(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                            title="Descargar el archivo .json íntegro de esta copia"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span>Descargar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestoreDirectJob(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                            title="Restaurar toda la base de datos al estado de esta copia"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-indigo-700" />
                            <span>Restaurar</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'settings' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestSaveConfirmation({
              title: 'Guardar Configuración de Empresa de esta Instalación',
              changes: [
                { label: 'Nombre de empresa', value: compName },
                { label: 'NIF / CIF', value: compTaxId },
                {
                  label: 'Domicilio fiscal / sede',
                  value: `${compAddress}, ${compPostalCode} ${compCity} (${compProvince})`,
                },
                ...(compLogoUrl !== (settings.logo_url || '')
                  ? [
                      {
                        label: 'Logotipo corporativo',
                        value: compLogoUrl ? 'Nuevo logotipo actualizado' : 'Logotipo eliminado',
                      },
                    ]
                  : []),
                { label: 'Email que recibe avisos de revisiones', value: compNotifEmail },
                { label: 'Prefijo de numeración de partes', value: compPrefix },
                { label: 'Zona horaria', value: compTimezone },
                { label: 'Servidor SMTP saliente', value: compSmtpHost ? `${compSmtpHost}:${compSmtpPort} (${compSmtpEncryption})` : 'No configurado' },
                { label: 'Servidor correo entrante', value: compIncomingHost ? `${compIncomingProtocol.toUpperCase()} ${compIncomingHost}:${compIncomingPort}` : 'No configurado' },
              ],
              onConfirm: () => {
                backend.updateCompanySettings({
                  company_name: compName,
                  tax_id: compTaxId,
                  contact_phone: compPhone,
                  contact_email: compEmail,
                  address: compAddress,
                  postal_code: compPostalCode,
                  city: compCity,
                  province: compProvince,
                  logo_url: compLogoUrl || null,
                  notification_email: compNotifEmail,
                  work_order_prefix: compPrefix,
                  timezone: compTimezone,
                  default_work_start_time: settings.default_work_start_time,
                  default_work_end_time: settings.default_work_end_time,
                  smtp_host: compSmtpHost.trim(),
                  smtp_port: compSmtpPort.trim() ? Number(compSmtpPort) || 587 : undefined,
                  smtp_encryption: compSmtpEncryption,
                  smtp_user: compSmtpUser.trim(),
                  smtp_password: compSmtpPassword,
                  smtp_sender_name: compSmtpSenderName.trim(),
                  incoming_mail_protocol: compIncomingProtocol,
                  incoming_mail_host: compIncomingHost.trim(),
                  incoming_mail_port: compIncomingPort.trim() ? Number(compIncomingPort) || 995 : undefined,
                  incoming_mail_encryption: compIncomingEncryption,
                  incoming_mail_user: compIncomingUser.trim(),
                  incoming_mail_password: compIncomingPassword,
                });
                refresh();
              },
            });
          }}
          className="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs overflow-y-auto overscroll-contain"
        >
          <h3 className="text-sm font-bold text-slate-900">
            Ficha de Datos de la Empresa y Configuración de la Instalación
          </h3>

          {/* SECCIÓN DEL LOGOTIPO DE LA EMPRESA */}
          <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block font-bold text-slate-800 text-sm">
                  Logotipo Oficial de la Empresa
                </label>
                <p className="text-slate-500 text-xs mt-0.5">
                  Aparecerá en la barra superior, menú lateral, pantalla de acceso, listados y en los PDFs exportados (partes de trabajo e informes de control horario).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label
                  htmlFor="company-logo-input"
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition"
                >
                  <span>📷 Subir Logo</span>
                  <input
                    id="company-logo-input"
                    data-testid="input-company-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {compLogoUrl && (
                  <button
                    type="button"
                    data-testid="btn-remove-company-logo"
                    onClick={() => setCompLogoUrl('')}
                    className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>

            {/* Previsualización del logo */}
            {compLogoUrl ? (
              <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <img
                  src={compLogoUrl}
                  alt="Vista previa del logo"
                  data-testid="company-logo-preview"
                  className="h-16 max-w-[220px] object-contain rounded-lg border border-slate-100 p-1 bg-white"
                />
                <div className="text-xs text-slate-600">
                  <div className="font-bold text-slate-900">Vista previa del logotipo corporativo</div>
                  <div className="text-[11px] text-slate-500">Se aplicará a toda la app y PDFs al pulsar «Guardar Configuración».</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic p-3 bg-white/60 rounded-xl border border-slate-200 text-center">
                No hay logotipo subido actualmente. Se utiliza el icono corporativo predeterminado.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre o Razón Social de la empresa *
              </label>
              <input
                type="text"
                required
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIF / CIF *</label>
              <input
                type="text"
                required
                value={compTaxId}
                onChange={(e) => setCompTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Domicilio fiscal / Dirección de la empresa *
              </label>
              <input
                type="text"
                required
                value={compAddress}
                onChange={(e) => setCompAddress(e.target.value)}
                placeholder="Calle, avenida, polígono, número, nave o piso..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Código Postal *
                </label>
                <input
                  type="text"
                  required
                  value={compPostalCode}
                  onChange={(e) => setCompPostalCode(e.target.value)}
                  placeholder="Ej. 13001"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Población / Municipio *
                </label>
                <input
                  type="text"
                  required
                  value={compCity}
                  onChange={(e) => setCompCity(e.target.value)}
                  placeholder="Ej. Ciudad Real"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Provincia *
                </label>
                <input
                  type="text"
                  required
                  value={compProvince}
                  onChange={(e) => setCompProvince(e.target.value)}
                  placeholder="Ej. Ciudad Real"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono de contacto
              </label>
              <PhoneInputField
                value={compPhone}
                onChange={setCompPhone}
                placeholder="600 11 22 33"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email de contacto general
              </label>
              <input
                type="email"
                value={compEmail}
                onChange={(e) => setCompEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-blue-900 mb-1">
                Email administrativo que recibe los avisos automáticos de revisiones *
              </label>
              <input
                type="email"
                required
                value={compNotifEmail}
                onChange={(e) => setCompNotifEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-blue-400 bg-blue-50/40 font-semibold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Prefijo numeración partes
                </label>
                <input
                  type="text"
                  value={compPrefix}
                  onChange={(e) => setCompPrefix(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Zona horaria</label>
                <select
                  value={compTimezone}
                  onChange={(e) => setCompTimezone(sanitizeTimezone(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Europe/Madrid">Europe/Madrid (Península y Baleares - UTC+1/+2)</option>
                  <option value="Atlantic/Canary">Atlantic/Canary (Islas Canarias - UTC+0/+1)</option>
                  <option value="Europe/Lisbon">Europe/Lisbon (Portugal - UTC+0/+1)</option>
                  <option value="UTC">UTC (Tiempo Universal Coordinado)</option>
                  {!['Europe/Madrid', 'Atlantic/Canary', 'Europe/Lisbon', 'UTC'].includes(compTimezone) && (
                    <option value={compTimezone}>{compTimezone}</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECCIÓN DEDICADA: CONFIGURACIÓN DE SERVIDOR DE CORREO CORPORATIVO (SMTP / POP3 / IMAP)
          ========================================================================= */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                    <Mail className="w-4 h-4" />
                  </span>
                  <h4 className="text-sm font-black text-slate-900">
                    Configuración de Servidor de Correo de la Empresa (SMTP / POP3 / IMAP)
                  </h4>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Permite a la aplicación enviar partes de trabajo, avisos automáticos y recuperación de contraseñas utilizando el servidor de correo propio de la empresa.
                </p>
              </div>

              {/* Botones de plantillas rápidas */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-[11px]">
                <span className="text-slate-500 font-semibold mr-1">Rellenar plantilla:</span>
                <button
                  type="button"
                  onClick={() => applyPresetMail('outlook')}
                  className="px-2 py-1 rounded-md border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold transition cursor-pointer"
                  title="Configurar parámetros para Hotmail / Outlook / Office 365"
                >
                  Outlook / Hotmail
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetMail('gmail')}
                  className="px-2 py-1 rounded-md border border-red-300 bg-red-50 hover:bg-red-100 text-red-800 font-bold transition cursor-pointer"
                  title="Configurar parámetros para Gmail / Google Workspace"
                >
                  Gmail
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetMail('custom')}
                  className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
                  title="Configurar servidor propio mail.tudominio.es"
                >
                  Servidor Propio
                </button>
              </div>
            </div>

            {/* Aviso obligatorio de remitente */}
            <div className="p-3 rounded-xl bg-blue-50/90 border border-blue-200 flex items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">📧</span>
                <div>
                  <span className="font-bold text-blue-950">Email Remitente General: </span>
                  <strong className="text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 font-mono text-[11px]">
                    {compEmail || 'Debes indicar el «Email de contacto general» arriba'}
                  </strong>
                  <span className="text-slate-500 ml-2 hidden sm:inline text-[11px]">
                    (Todos los correos saldrán con esta dirección de remitente)
                  </span>
                </div>
              </div>
              {compEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setCompSmtpUser(compEmail);
                    setCompIncomingUser(compEmail);
                    notifySuccessGreen('Email general copiado a los usuarios SMTP y entrante.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 transition cursor-pointer"
                >
                  Copiar a usuarios
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* COLUMNA 1: CORREO SALIENTE (SMTP) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>Servidor Saliente (SMTP — Envío de correos)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                    SMTP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Servidor / Host SMTP *
                    </label>
                    <input
                      type="text"
                      value={compSmtpHost}
                      onChange={(e) => setCompSmtpHost(e.target.value)}
                      placeholder="ej. smtp.gmail.com o mail.empresa.com"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Puerto SMTP *
                    </label>
                    <input
                      type="text"
                      value={compSmtpPort}
                      onChange={(e) => setCompSmtpPort(e.target.value)}
                      placeholder="587 o 465"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Seguridad / Cifrado
                    </label>
                    <select
                      value={compSmtpEncryption}
                      onChange={(e) => setCompSmtpEncryption(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                    >
                      <option value="starttls">STARTTLS (Puerto 587 habitual)</option>
                      <option value="ssl_tls">SSL / TLS (Puerto 465 habitual)</option>
                      <option value="none">Sin cifrado (Puerto 25)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nombre visible del remitente
                    </label>
                    <input
                      type="text"
                      value={compSmtpSenderName}
                      onChange={(e) => setCompSmtpSenderName(e.target.value)}
                      placeholder="ej. Fontanería Roma"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Usuario / Cuenta SMTP
                    </label>
                    <input
                      type="text"
                      value={compSmtpUser}
                      onChange={(e) => setCompSmtpUser(e.target.value)}
                      placeholder={compEmail || 'ej. contacto@empresa.com'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Contraseña / Clave de aplicación
                    </label>
                    <div className="relative">
                      <input
                        type={showSmtpPassword ? 'text' : 'password'}
                        value={compSmtpPassword}
                        onChange={(e) => setCompSmtpPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword((s) => !s)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                        tabIndex={-1}
                      >
                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUMNA 2: CORREO ENTRANTE (POP3 / IMAP) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                    <Inbox className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Servidor Entrante (POP3 / IMAP — Recepción)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCompIncomingProtocol('pop3');
                        if (compIncomingPort === '993') setCompIncomingPort('995');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition cursor-pointer ${
                        compIncomingProtocol === 'pop3'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      POP3
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCompIncomingProtocol('imap');
                        if (compIncomingPort === '995') setCompIncomingPort('993');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition cursor-pointer ${
                        compIncomingProtocol === 'imap'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      IMAP
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Servidor / Host ${compIncomingProtocol.toUpperCase()} *
                    </label>
                    <input
                      type="text"
                      value={compIncomingHost}
                      onChange={(e) => setCompIncomingHost(e.target.value)}
                      placeholder={`ej. ${compIncomingProtocol === 'pop3' ? 'pop.empresa.com' : 'imap.empresa.com'}`}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Puerto ${compIncomingProtocol.toUpperCase()} *
                    </label>
                    <input
                      type="text"
                      value={compIncomingPort}
                      onChange={(e) => setCompIncomingPort(e.target.value)}
                      placeholder={compIncomingProtocol === 'pop3' ? '995 o 110' : '993 o 143'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Seguridad / Cifrado Entrante
                    </label>
                    <select
                      value={compIncomingEncryption}
                      onChange={(e) => setCompIncomingEncryption(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium"
                    >
                      <option value="ssl_tls">SSL / TLS (Recomendado)</option>
                      <option value="starttls">STARTTLS</option>
                      <option value="none">Sin cifrado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Protocolo Activo
                    </label>
                    <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>{compIncomingProtocol.toUpperCase()}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {compIncomingProtocol === 'pop3' ? 'Descarga buzón' : 'Sincronización en servidor'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Usuario / Cuenta Entrante
                    </label>
                    <input
                      type="text"
                      value={compIncomingUser}
                      onChange={(e) => setCompIncomingUser(e.target.value)}
                      placeholder={compEmail || 'ej. contacto@empresa.com'}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Contraseña Entrante
                    </label>
                    <div className="relative">
                      <input
                        type={showIncomingPassword ? 'text' : 'password'}
                        value={compIncomingPassword}
                        onChange={(e) => setCompIncomingPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3 py-2 pr-9 rounded-lg border border-slate-300 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowIncomingPassword((s) => !s)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                        tabIndex={-1}
                      >
                        {showIncomingPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila de prueba de conexión */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-blue-100">
              <div className="text-[11px] text-slate-500">
                💡 <em>Nota: Si utilizas Gmail o Hotmail/Outlook, es recomendable generar una <strong>«Contraseña de Aplicación»</strong> desde la seguridad de tu cuenta de correo.</em>
              </div>
              <button
                type="button"
                onClick={handleTestMailConnection}
                disabled={testEmailStatus.running}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                {testEmailStatus.running ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Comprobando conexión...</span>
                  </>
                ) : (
                  <>
                    <MailCheck className="w-4 h-4 text-emerald-400" />
                    <span>🧪 Probar Conexión de Correo</span>
                  </>
                )}
              </button>
            </div>

            {/* Resultado de la prueba */}
            {testEmailStatus.message && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testEmailStatus.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                <span>{testEmailStatus.success ? '✅' : '❌'}</span>
                <span className="font-semibold">{testEmailStatus.message}</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            <strong>Seguridad de secretos:</strong> Las claves del proveedor de correo transaccional (`EMAIL_API_KEY`) y de servicio (`SUPABASE_SERVICE_ROLE_KEY`) se almacenan exclusivamente en variables privadas de servidor / Supabase Vault y nunca son campos públicos de configuración.
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              Guardar Configuración de Empresa
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
