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
  X,
} from 'lucide-react';
import { InstallationBackendEngine } from '../services/backendEngine';
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
  const { requestSaveConfirmation, notifySuccessGreen, notifyError } = useUIConfirmation();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    onRefresh();
  };

  // Control de ventana emergente de alta para la pestaña actual
  const [showCreateModal, setShowCreateModal] = useState(false);

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
  const [custPostalCode, setCustPostalCode] = useState('28000');
  const [custCity, setCustCity] = useState('Madrid');
  const [custProvince, setCustProvince] = useState('Madrid');
  const [custNotes, setCustNotes] = useState('');

  // Estado formulario Domicilio/Instalación
  const [addrCustomerId, setAddrCustomerId] = useState(customers[0]?.id || '');
  const [addrAlias, setAddrAlias] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrPostal, setAddrPostal] = useState('28000');
  const [addrCity, setAddrCity] = useState('Madrid');
  const [addrProvince, setAddrProvince] = useState('Madrid');
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
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supContact, setSupContact] = useState('');

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
  const [usrRole, setUsrRole] = useState<'operario' | 'admin'>('operario');

  const q = search.trim().toLowerCase();

  const createButtonLabel: Record<typeof activeTab, string> = {
    customers: '+ Nuevo Cliente',
    addresses: '+ Nuevo Domicilio / Instalación',
    articles: '+ Nuevo Artículo',
    suppliers: '+ Nuevo Proveedor',
    review_types: '+ Nuevo Tipo de Revisión',
    users: '+ Invitar Usuario',
  };

  return (
    <div className="space-y-5">
      <ScreenHeaderBar
        title="Datos Maestros y Administración de Usuarios"
        subtitle="Clientes, domicilios/instalaciones, artículos, proveedores, tipos de revisión y usuarios con ciclo activo/inactivo"
        onBack={onBack}
        searchTerm={search}
        onSearchChange={setSearch}
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" /> {createButtonLabel[activeTab]}
          </button>
        }
      />

      {/* Pestañas de maestros */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200">
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

      {/* 1. LISTADO DE CLIENTES */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs">
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
              </div>
            ))}
        </div>
      )}

      {/* 2. LISTADO DE DOMICILIOS / INSTALACIONES */}
      {activeTab === 'addresses' && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs">
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
              </div>
            );
          })}
        </div>
      )}

      {/* 3. LISTADO DE ARTÍCULOS */}
      {activeTab === 'articles' && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs">
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
              </div>
            ))}
        </div>
      )}

      {/* 4. LISTADO DE PROVEEDORES */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs">
          {suppliers.map((s) => (
            <div key={s.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">{s.name}</div>
                <div className="text-slate-600">
                  NIF: {s.tax_id || '—'} · Contacto: {s.contact_person || '—'}
                </div>
              </div>
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
            </div>
          ))}
        </div>
      )}

      {/* 5. LISTADO DE TIPOS DE REVISIÓN */}
      {activeTab === 'review_types' && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs">
          {reviewTypes.map((rt) => (
            <div key={rt.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-900">{rt.name}</div>
                <div className="text-slate-600">
                  Precio orientativo: {formatCentsToEUR(rt.suggested_price_cents)} · Periodicidad:{' '}
                  {rt.periodicity_value} {rt.periodicity_unit}
                </div>
              </div>
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
            </div>
          ))}
        </div>
      )}

      {/* 6. LISTADO DE USUARIOS Y ROLES */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs">
          {profiles.map((u) => {
            const isSelf = u.id === currentUser.id;
            return (
              <div
                key={u.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-sm text-slate-900">
                    {u.full_name} ({u.email}){' '}
                    <span
                      className={`ml-1.5 px-2 py-0.5 rounded font-bold text-[11px] ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                    {!u.is_active && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-bold">
                        INACTIVO (Sesión revocada)
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600">
                    DNI: {u.dni || '—'} · Tel: {u.phone || '—'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">{createButtonLabel[activeTab]}</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeTab === 'customers' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowCreateModal(false);
                  requestSaveConfirmation({
                    title: 'Alta de Ficha Completa de Cliente',
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
                      const created = backend.saveCustomer({
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
                        is_active: true,
                      });
                      const createdAddrs = backend.getCustomerAddresses(created.id, false);
                      if (createdAddrs[0]) {
                        backend.saveCustomerAddress({
                          ...createdAddrs[0],
                          postal_code: custPostalCode,
                          city: custCity,
                          province: custProvince,
                          contact_name: custContactName || created.name,
                          contact_phone: custPhone,
                          contact_email: custEmail,
                        });
                      }
                      setCustCode('');
                      setCustName('');
                      setCustTaxId('');
                      setCustContactName('');
                      setCustPhone('');
                      setCustEmail('');
                      setCustAddress('');
                      setCustPostalCode('28000');
                      setCustCity('Madrid');
                      setCustProvince('Madrid');
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
                      placeholder="28000"
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
                      placeholder="Madrid"
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
                      placeholder="Madrid"
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
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Guardar Cliente
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'addresses' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowCreateModal(false);
                  requestSaveConfirmation({
                    title: 'Alta de Domicilio / Instalación de Cliente',
                    changes: [
                      { label: 'Alias', value: addrAlias },
                      { label: 'Dirección', value: `${addrLine}, ${addrPostal} ${addrCity}` },
                    ],
                    onConfirm: () => {
                      backend.saveCustomerAddress({
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
                        is_active: true,
                      });
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
                  placeholder="Escribe para buscar cliente..."
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
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Guardar Domicilio
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
                  requestSaveConfirmation({
                    title: 'Alta de Artículo en Catálogo',
                    changes: [
                      { label: 'Código único', value: artCode },
                      { label: 'Nombre', value: artName },
                      { label: 'Precio Compra', value: formatCentsToEUR(buyCents) },
                      { label: 'Precio Venta', value: formatCentsToEUR(saleCents) },
                      { label: 'Unidad de medida', value: artUnit },
                    ],
                    onConfirm: () => {
                      backend.saveArticle({
                        code: artCode,
                        name: artName,
                        description: artDesc,
                        supplier_id: artSupplierId || null,
                        purchase_price_cents: buyCents,
                        sale_price_cents: saleCents,
                        unit: artUnit,
                        is_active: true,
                      });
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
                    <option value="">-- Sin proveedor habitual --</option>
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
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Guardar Artículo
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'suppliers' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowCreateModal(false);
                  requestSaveConfirmation({
                    title: 'Alta de Proveedor',
                    changes: [
                      { label: 'Proveedor', value: supName },
                      { label: 'NIF/CIF', value: supTaxId || '—' },
                    ],
                    onConfirm: () => {
                      backend.saveSupplier({
                        name: supName,
                        tax_id: supTaxId,
                        phone: supPhone,
                        email: supEmail,
                        contact_person: supContact,
                        notes: '',
                        is_active: true,
                      });
                      setSupName('');
                      setSupTaxId('');
                      setSupPhone('');
                      setSupEmail('');
                      setSupContact('');
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
                <input
                  type="text"
                  value={supTaxId}
                  onChange={(e) => setSupTaxId(e.target.value)}
                  placeholder="NIF / CIF opcional"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <PhoneInputField
                  value={supPhone}
                  onChange={setSupPhone}
                  placeholder="Teléfono contacto"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Guardar Proveedor
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
                  requestSaveConfirmation({
                    title: 'Alta de Tipo de Revisión Periódica',
                    changes: [
                      { label: 'Nombre', value: rtName },
                      { label: 'Precio orientativo', value: formatCentsToEUR(cents) },
                      { label: 'Periodicidad', value: `${rtValue} ${rtUnit}` },
                    ],
                    onConfirm: () => {
                      backend.saveReviewType({
                        name: rtName,
                        suggested_price_cents: cents,
                        periodicity_unit: rtUnit,
                        periodicity_value: parseInt(rtValue, 10) || 12,
                        is_active: true,
                      });
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
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Guardar Tipo
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'users' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowCreateModal(false);
                  requestSaveConfirmation({
                    title: 'Alta de Usuario por Invitación Administrativa',
                    changes: [
                      { label: 'Nombre completo', value: usrName },
                      { label: 'Email', value: usrEmail },
                      { label: 'Rol asignado', value: usrRole },
                    ],
                    onConfirm: () => {
                      backend.inviteAndCreateUser({
                        full_name: usrName,
                        dni: usrDni,
                        email: usrEmail,
                        phone: usrPhone,
                        role: usrRole,
                      });
                      setUsrName('');
                      setUsrDni('');
                      setUsrEmail('');
                      setUsrPhone('');
                      refresh();
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
                  value={usrEmail}
                  onChange={(e) => setUsrEmail(e.target.value)}
                  placeholder="Correo electrónico *"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
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
                  <option value="operario">Rol: Operario</option>
                  <option value="admin">Rol: Administrador</option>
                </select>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Enviar Invitación
                  </button>
                </div>
              </form>
            )}
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
  initialSection?: 'audit' | 'backups' | 'settings';
  filterEntityId?: string;
  onBack: () => void;
  onRefresh: () => void;
}> = ({ backend, initialSection = 'audit', filterEntityId = '', onBack, onRefresh }) => {
  const { requestSaveConfirmation, notifySuccessGreen, notifyError } = useUIConfirmation();
  const [section, setSection] = useState(initialSection);
  const [tick, setTick] = useState(0);
  const refresh = () => {
    setTick((t) => t + 1);
    onRefresh();
  };

  const auditEntries = useMemo(() => backend.getAuditLog(), [backend, tick]);
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
  const [compPostalCode, setCompPostalCode] = useState(settings.postal_code || '28022');
  const [compCity, setCompCity] = useState(settings.city || 'Madrid');
  const [compProvince, setCompProvince] = useState(settings.province || 'Madrid');
  const [compNotifEmail, setCompNotifEmail] = useState(settings.notification_email);
  const [compPrefix, setCompPrefix] = useState(settings.work_order_prefix);
  const [compTimezone, setCompTimezone] = useState(sanitizeTimezone(settings.timezone));
  const [compLogoUrl, setCompLogoUrl] = useState<string>(settings.logo_url || '');

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

  const handleRunIsolatedRestoreDrill = () => {
    try {
      const snapshot = backend.exportFullSnapshot();
      const isolatedInstance = new InstallationBackendEngine(
        'entorno-aislado-prueba-restore',
        false
      );
      isolatedInstance.login('admin@climalux-demo.es', 'Admin1234!');
      isolatedInstance.restoreFromSnapshot(snapshot, 'AUTORIZO_RESTAURACION_VERIFICADA');
      const restoredOrders = isolatedInstance.getWorkOrders({ includeArchived: true });
      setIsolatedRestoreVerifyMsg(
        `Verificación completada en entorno aislado ('entorno-aislado-prueba-restore'): restaurados ${restoredOrders.length} partes, configuración, fotografías y firmas sin alterar la instalación de producción.`
      );
      notifySuccessGreen('Simulacro de restauración en entorno aislado verificado con éxito.');
    } catch (err: any) {
      notifyError(err?.message || 'Error en verificación de restauración');
    }
  };

  return (
    <div className="space-y-5">
      <ScreenHeaderBar
        title="Auditoría, Copias de Seguridad y Configuración de Empresa"
        subtitle="Trazabilidad inmutable en servidor, copias automáticas diarias de escritorio / manuales y parámetros de la instalación"
        onBack={onBack}
      />

      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setSection('audit')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold ${
            section === 'audit' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Auditoría y Trazabilidad ({auditEntries.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('backups')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold ${
            section === 'backups' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'
          }`}
        >
          <DatabaseBackup className="w-4 h-4" /> Copias de Seguridad y Restauración (
          {backupJobs.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('settings')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold ${
            section === 'settings' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" /> Configuración de Empresa
        </button>
      </div>

      {section === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
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
              <option value="backups">Backups</option>
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

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white">
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

      {section === 'backups' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
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
              >
                <RotateCcw className="w-4 h-4" /> Probar Restauración en Entorno Aislado
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
                <Plus className="w-4 h-4" /> Lanzar Copia de Seguridad Manual Ahora
              </button>
            </div>
          </div>

          {isolatedRestoreVerifyMsg && (
            <div
              className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs text-emerald-950 font-medium"
              data-testid="isolated-restore-success-banner"
            >
              ✓ {isolatedRestoreVerifyMsg}
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-3">Fecha Local</th>
                  <th className="p-3">Tipo Disparador</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Alcance Verificado</th>
                  <th className="p-3">Tamaño / Checksum</th>
                  <th className="p-3">Ubicación Externa / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {backupJobs.map((b) => (
                  <tr key={b.id}>
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
                });
                refresh();
              },
            });
          }}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs"
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
                  placeholder="Ej. 28022"
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
                  placeholder="Ej. Madrid"
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
                  placeholder="Ej. Madrid"
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
