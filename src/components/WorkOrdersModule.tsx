import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  UserPlus,
  Plus,
  Camera,
  FileText,
  Lock,
  Archive,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Euro,
  Clock,
  Users,
  Wrench,
  Package,
  History,
  Download,
  PenTool,
  ArrowLeft,
  ArrowRight,
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
  WorkOrderStatusBadge,
} from './CommonUI';
import { SignaturePadCanvas } from './SignaturePadCanvas';
import {
  calculateDuration,
  formatCentsToEUR,
  formatDateES,
  formatDateTimeES,
  formatTimeES,
  parseEurosToCents,
} from '../utils/formatters';
import { generateWorkOrderDetailPDF } from '../utils/exportImportUtils';

// Feature flag: Fotografías y archivos privados (oculto temporalmente para todos los usuarios, conservado íntegro para próximas versiones)
const ENABLE_PHOTO_ATTACHMENTS = false;
// Feature flag: Historial de estados en el detalle del parte (retirado a petición del usuario)
const ENABLE_HISTORY_SECTION = false;

// =============================================================================
// 1. FORMULARIO DE ALTA DE PARTE (SOLO ADMIN) EN VENTANA EMERGENTE
// =============================================================================
export const WorkOrderCreateModal: React.FC<{
  backend: InstallationBackendEngine;
  preselectedCustomerId?: string;
  preselectedAddressId?: string;
  preselectedPlannedWork?: string;
  preselectedScheduledAt?: string;
  preselectedAmountCents?: number | null;
  originReviewOccurrenceId?: string | null;
  onClose: () => void;
  onCreated: (workOrderId: string) => void;
}> = ({
  backend,
  preselectedCustomerId,
  preselectedAddressId,
  preselectedPlannedWork,
  preselectedScheduledAt,
  preselectedAmountCents,
  originReviewOccurrenceId,
  onClose,
  onCreated,
}) => {
  const { requestSaveConfirmation, notifyError } = useUIConfirmation();
  const [customers, setCustomers] = useState(() => backend.getCustomers(false));
  const [customerSearch, setCustomerSearch] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    preselectedCustomerId || ''
  );

  const allAddresses = useMemo(() => {
    const raw = backend.getCustomerAddresses(undefined, false);
    const list = [...raw];
    for (const c of customers) {
      if (c.main_address && !list.some((a) => a.customer_id === c.id)) {
        list.push({
          id: `main-${c.id}`,
          customer_id: c.id,
          alias: 'Dirección principal',
          address_line: c.main_address,
          postal_code: c.postal_code || '',
          city: c.city || '',
          province: c.province || '',
          contact_name: c.contact_name || c.name,
          contact_phone: c.phones[0] || '',
          contact_email: c.emails[0] || '',
          notes: '',
          is_active: true,
          created_at: c.created_at,
          updated_at: c.updated_at,
        });
      }
    }
    return list;
  }, [backend, customers]);

  const addresses = useMemo(() => {
    if (!selectedCustomerId) return allAddresses;
    const clientAddrs = allAddresses.filter((a) => a.customer_id === selectedCustomerId);
    const otherAddrs = allAddresses.filter((a) => a.customer_id !== selectedCustomerId);
    return [...clientAddrs, ...otherAddrs];
  }, [allAddresses, selectedCustomerId]);

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    preselectedAddressId || ''
  );

  const initialCustomer = preselectedCustomerId ? customers.find((c) => c.id === preselectedCustomerId) : undefined;
  const initialAddr = preselectedAddressId ? addresses.find((a) => a.id === preselectedAddressId) : undefined;

  const [contactName, setContactName] = useState(
    initialAddr?.contact_name || initialCustomer?.contact_name || initialCustomer?.name || ''
  );
  const [contactPhone, setContactPhone] = useState(
    initialAddr?.contact_phone || initialCustomer?.phones[0] || ''
  );
  const [contactEmail, setContactEmail] = useState(
    initialAddr?.contact_email || initialCustomer?.emails[0] || ''
  );
  const [addressLine, setAddressLine] = useState(
    initialAddr?.address_line || (preselectedCustomerId ? initialCustomer?.main_address || '' : '')
  );
  const [postalCode, setPostalCode] = useState(initialAddr?.postal_code || (preselectedCustomerId ? '28000' : ''));
  const [city, setCity] = useState(initialAddr?.city || (preselectedCustomerId ? 'Madrid' : ''));
  const [province, setProvince] = useState(initialAddr?.province || (preselectedCustomerId ? 'Madrid' : ''));

  const [plannedWork, setPlannedWork] = useState(preselectedPlannedWork || '');
  const [scheduledAt, setScheduledAt] = useState(
    preselectedScheduledAt || '2026-10-22T09:00'
  );
  const [initialNotes, setInitialNotes] = useState('');
  const [amountStr, setAmountStr] = useState(
    preselectedAmountCents !== undefined && preselectedAmountCents !== null
      ? (preselectedAmountCents / 100).toFixed(2)
      : ''
  );

  const operators = useMemo(
    () => backend.getProfiles().filter((p) => p.role === 'operario' && p.is_active),
    [backend]
  );
  const [selectedOperatorIds, setSelectedOperatorIds] = useState<string[]>(
    operators[0] ? [operators[0].id] : []
  );

  const [showInlineCustomerModal, setShowInlineCustomerModal] = useState(false);
  const [newCustomerCode, setNewCustomerCode] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerTaxId, setNewCustomerTaxId] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerPostalCode, setNewCustomerPostalCode] = useState('28000');
  const [newCustomerCity, setNewCustomerCity] = useState('Madrid');
  const [newCustomerProvince, setNewCustomerProvince] = useState('Madrid');
  const [newCustomerContactName, setNewCustomerContactName] = useState('');
  const [newCustomerNotes, setNewCustomerNotes] = useState('');

  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    setSelectedAddressId('');
    setAddressSearch('');
    if (!custId) {
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setAddressLine('');
      setPostalCode('');
      setCity('');
      setProvince('');
      return;
    }
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setContactName(cust.contact_name || cust.name || '');
      setContactPhone(cust.phones[0] || '');
      setContactEmail(cust.emails[0] || '');
      setAddressLine('');
      setPostalCode('');
      setCity('');
      setProvince('');
    }
  };

  const handleSelectAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (!addrId) {
      setAddressLine('');
      setPostalCode('');
      setCity('');
      setProvince('');
      return;
    }
    const addr = allAddresses.find((a) => a.id === addrId);
    if (addr) {
      if (selectedCustomerId !== addr.customer_id) {
        setSelectedCustomerId(addr.customer_id);
      }
      const cust = customers.find((c) => c.id === addr.customer_id);
      setAddressLine(addr.address_line);
      setPostalCode(addr.postal_code || '');
      setCity(addr.city || '');
      setProvince(addr.province || '');
      if (addr.contact_name || cust?.contact_name || cust?.name) {
        setContactName(addr.contact_name || cust?.contact_name || cust?.name || '');
      }
      if (addr.contact_phone || cust?.phones[0]) {
        setContactPhone(addr.contact_phone || cust?.phones[0] || '');
      }
      if (addr.contact_email || cust?.emails[0]) {
        setContactEmail(addr.contact_email || cust?.emails[0] || '');
      }
    }
  };

  const handleCreateInlineCustomer = () => {
    if (!newCustomerName.trim()) {
      notifyError('El nombre del nuevo cliente es obligatorio.');
      return;
    }
    try {
      const created = backend.saveCustomer({
        code: newCustomerCode.trim(),
        name: newCustomerName.trim(),
        tax_id: newCustomerTaxId.trim(),
        phones: newCustomerPhone.trim()
          ? newCustomerPhone
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
        emails: newCustomerEmail.trim()
          ? newCustomerEmail
              .split(',')
              .map((m) => m.trim())
              .filter(Boolean)
          : [],
        main_address: newCustomerAddress.trim(),
        postal_code: newCustomerPostalCode.trim(),
        city: newCustomerCity.trim(),
        province: newCustomerProvince.trim(),
        contact_name: newCustomerContactName.trim(),
        notes: newCustomerNotes.trim() || 'Creado desde formulario de alta de parte',
        is_active: true,
      });
      const createdAddrs = backend.getCustomerAddresses(created.id, false);
      if (createdAddrs[0]) {
        backend.saveCustomerAddress({
          ...createdAddrs[0],
          postal_code: newCustomerPostalCode.trim() || '28000',
          city: newCustomerCity.trim() || 'Madrid',
          province: newCustomerProvince.trim() || 'Madrid',
          contact_name: newCustomerContactName.trim() || created.name,
          contact_phone: created.phones[0] || '',
          contact_email: created.emails[0] || '',
        });
      }
      const updatedCustomers = backend.getCustomers(false);
      setCustomers(updatedCustomers);
      setSelectedCustomerId(created.id);
      const updatedAddrs = backend.getCustomerAddresses(created.id, false);
      setSelectedAddressId(updatedAddrs[0]?.id || '');
      setContactName(newCustomerContactName.trim() || created.name);
      setContactPhone(created.phones[0] || '');
      setContactEmail(created.emails[0] || '');
      setAddressLine(created.main_address || '');
      setPostalCode(newCustomerPostalCode.trim() || '28000');
      setCity(newCustomerCity.trim() || 'Madrid');
      setProvince(newCustomerProvince.trim() || 'Madrid');
      setShowInlineCustomerModal(false);
      setNewCustomerCode('');
      setNewCustomerName('');
      setNewCustomerTaxId('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCustomerAddress('');
      setNewCustomerPostalCode('28000');
      setNewCustomerCity('Madrid');
      setNewCustomerProvince('Madrid');
      setNewCustomerContactName('');
      setNewCustomerNotes('');
    } catch (err: any) {
      notifyError(err?.message || 'Error al crear cliente');
    }
  };

  const normalizeSearch = (str: string) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const term = normalizeSearch(customerSearch);
    return normalizeSearch(c.name).includes(term);
  });

  const filteredAddresses = useMemo(() => {
    if (!addressSearch.trim()) return addresses;
    const term = normalizeSearch(addressSearch);
    return addresses.filter((a) => {
      const combined = `${a.alias || ''} ${a.address_line || ''} ${a.city || ''} ${a.postal_code || ''} ${a.province || ''}`;
      return normalizeSearch(combined).includes(term);
    });
  }, [addresses, addressSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === selectedCustomerId);
    if (!cust) {
      notifyError('Debes seleccionar un cliente.');
      return;
    }
    if (!addressLine.trim() || !city.trim()) {
      notifyError('Debes indicar la dirección y municipio del servicio.');
      return;
    }
    if (selectedOperatorIds.length === 0) {
      notifyError('Debes asignar al menos un operario al parte.');
      return;
    }

    const scheduledIso = scheduledAt.includes('Z')
      ? scheduledAt
      : new Date(scheduledAt).toISOString();

    const parsedCents = amountStr.trim() !== '' ? parseEurosToCents(amountStr) : null;

    requestSaveConfirmation({
      title: 'Alta de Nuevo Parte de Trabajo',
      changes: [
        { label: 'Cliente', value: cust.name },
        { label: 'Dirección específica del servicio', value: `${addressLine}, ${city}` },
        { label: 'Trabajos a realizar', value: plannedWork },
        { label: 'Fecha y hora prevista', value: formatDateTimeES(scheduledIso) },
        ...(parsedCents !== null
          ? [
              {
                label: 'Importe a cobrar al cliente',
                value: formatCentsToEUR(parsedCents),
              },
            ]
          : []),
        {
          label: 'Operarios asignados',
          value: operators
            .filter((o) => selectedOperatorIds.includes(o.id))
            .map((o) => o.full_name)
            .join(', '),
        },
      ],
      onConfirm: () => {
        const createdWo = backend.createWorkOrder({
          customer_id: cust.id,
          customer_address_id: selectedAddressId || null,
          snapshot_customer_name: cust.name,
          snapshot_customer_tax_id: cust.tax_id,
          snapshot_contact_name: contactName,
          snapshot_contact_phone: contactPhone,
          snapshot_contact_email: contactEmail,
          snapshot_address_line: addressLine,
          snapshot_postal_code: postalCode,
          snapshot_city: city,
          snapshot_province: province,
          planned_work: plannedWork,
          scheduled_at: scheduledIso,
          initial_notes: initialNotes,
          operator_ids: selectedOperatorIds,
          origin_review_occurrence_id: originReviewOccurrenceId || null,
          total_amount_cents: parsedCents,
        });
        onCreated(createdWo.id);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-8 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Nuevo Parte de Trabajo</h2>
            <p className="text-xs text-slate-300">
              La numeración única se generará en servidor al guardar. Los datos del servicio se guardan como instantánea.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase">
                1. Cliente e Instalación (Selector con búsqueda)
              </label>
              <button
                type="button"
                data-testid="btn-inline-new-customer"
                onClick={() => setShowInlineCustomerModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                <UserPlus className="w-3.5 h-3.5" /> + Crear cliente faltante sin perder datos
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cliente registrado *
                </label>
                <SearchableSelect
                  data-testid="select-wo-customer"
                  value={selectedCustomerId}
                  onChange={handleSelectCustomer}
                  emptyOptionLabel="-- Cliente a seleccionar --"
                  placeholder="Escribe para buscar cliente..."
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Domicilio / Instalación registrada del cliente
                </label>
                <SearchableSelect
                  data-testid="select-wo-address"
                  value={selectedAddressId}
                  onChange={handleSelectAddress}
                  emptyOptionLabel="-- Dirección o calle a seleccionar --"
                  placeholder="Escribe calle, dirección, municipio o cliente..."
                  disabled={addresses.length === 0}
                  options={addresses.map((a) => {
                    const cust = customers.find((c) => c.id === a.customer_id);
                    const cityPart = a.city ? ` (${a.city})` : '';
                    const custPart = a.customer_id !== selectedCustomerId && cust ? ` — Cliente: ${cust.name}` : '';
                    return {
                      value: a.id,
                      label: `${a.address_line}${cityPart}${custPart}`,
                    };
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección específica del servicio (Instantánea del parte) *
                </label>
                <input
                  type="text"
                  data-testid="input-wo-address"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Municipio *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Persona de contacto en servicio
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono servicio
                </label>
                <PhoneInputField
                  value={contactPhone}
                  onChange={setContactPhone}
                  placeholder="600 11 22 33"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email servicio
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Trabajos a realizar *
              </label>
              <textarea
                rows={2}
                required
                data-testid="input-wo-planned-work"
                value={plannedWork}
                onChange={(e) => setPlannedWork(e.target.value)}
                placeholder="Describe la avería, instalación o revisión a realizar..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Fecha y hora previstas *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledAt.slice(0, 16)}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Importe a cobrar (€)</span>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </label>
              <input
                type="text"
                data-testid="input-wo-initial-amount"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="Ej. 120,00"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                El operario sabrá cuánto cobrar al cliente.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observaciones iniciales de planificación
            </label>
            <input
              type="text"
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              placeholder="Acceso, llaves, indicaciones..."
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              3. Operarios asignados al parte (selecciona uno o varios) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {operators.map((op) => {
                const checked = selectedOperatorIds.includes(op.id);
                return (
                  <label
                    key={op.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer font-medium ${
                      checked
                        ? 'bg-blue-50 border-blue-500 text-blue-900'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedOperatorIds((prev) =>
                          prev.includes(op.id)
                            ? prev.filter((id) => id !== op.id)
                            : [...prev, op.id]
                        );
                      }}
                    />
                    <span>{op.full_name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="btn-submit-create-wo"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs"
            >
              Crear Parte de Trabajo
            </button>
          </div>
        </form>
      </div>

      {showInlineCustomerModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          data-testid="modal-inline-customer"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  Alta de Ficha Completa de Cliente
                </h3>
                <p className="text-[11px] text-slate-300">
                  Se guardará el cliente y su domicilio principal sin perder los datos del parte actual
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInlineCustomerModal(false)}
                className="p-1 rounded hover:bg-white/10 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código Cliente (auto si vacío)
                  </label>
                  <input
                    type="text"
                    value={newCustomerCode}
                    onChange={(e) => setNewCustomerCode(e.target.value)}
                    placeholder="Ej. CLI-0050"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre o Razón Social *
                  </label>
                  <input
                    type="text"
                    data-testid="input-inline-cust-name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Nombre completo o empresa *"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIF / CIF / DNI
                  </label>
                  <input
                    type="text"
                    value={newCustomerTaxId}
                    onChange={(e) => setNewCustomerTaxId(e.target.value)}
                    placeholder="Ej. B12345678"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Persona de contacto
                  </label>
                  <input
                    type="text"
                    value={newCustomerContactName}
                    onChange={(e) => setNewCustomerContactName(e.target.value)}
                    placeholder="Nombre de contacto"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teléfono(s)
                  </label>
                  <PhoneInputField
                    value={newCustomerPhone}
                    onChange={setNewCustomerPhone}
                    placeholder="600 11 22 33"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Correo(s) electrónico(s)
                  </label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="cliente@correo.es"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dirección / Domicilio principal *
                </label>
                <input
                  type="text"
                  data-testid="input-inline-cust-address"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                  placeholder="Calle, número, piso, local..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    value={newCustomerPostalCode}
                    onChange={(e) => setNewCustomerPostalCode(e.target.value)}
                    placeholder="28000"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Municipio / Localidad
                  </label>
                  <input
                    type="text"
                    value={newCustomerCity}
                    onChange={(e) => setNewCustomerCity(e.target.value)}
                    placeholder="Madrid"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={newCustomerProvince}
                    onChange={(e) => setNewCustomerProvince(e.target.value)}
                    placeholder="Madrid"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observaciones de la ficha del cliente
                </label>
                <textarea
                  rows={2}
                  value={newCustomerNotes}
                  onChange={(e) => setNewCustomerNotes(e.target.value)}
                  placeholder="Horario de atención, notas de acceso o facturación..."
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInlineCustomerModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-save-inline-customer"
                onClick={handleCreateInlineCustomer}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                Guardar y Seleccionar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 2. VISTA COMPLETA DE DETALLE DE UN PARTE DE TRABAJO
// Todas las altas y ediciones (Añadir Trabajo, Modificar Trabajo, Añadir Jornada,
// Añadir Material, Capturar Firma, Subir Fotografía, Reabrir Parte y Finalizar Parte)
// se abren en una VENTANA EMERGENTE (Modal) limpia y adaptada a móvil y escritorio.
// =============================================================================
export const WorkOrderDetailView: React.FC<{
  backend: InstallationBackendEngine;
  workOrderId: string;
  onBack: () => void;
  onRefresh: () => void;
  onOpenAuditForWorkOrder?: (woId: string) => void;
}> = ({ backend, workOrderId, onBack, onRefresh, onOpenAuditForWorkOrder }) => {
  const { requestSaveConfirmation, requestDeleteConfirmation, notifySuccessGreen, notifyError } =
    useUIConfirmation();
  const [tick, setTick] = useState(0);
  const refreshLocal = () => {
    setTick((t) => t + 1);
    onRefresh();
  };

  const currentUser = backend.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';

  let wo: ReturnType<typeof backend.getWorkOrderById> | null = null;
  let accessError: string | null = null;
  try {
    wo = backend.getWorkOrderById(workOrderId);
  } catch (err: any) {
    accessError = err?.message || 'Acceso denegado';
  }

  const profiles = useMemo(() => backend.getProfiles(), [backend, tick]);
  const companySettings = useMemo(() => backend.getCompanySettings(), [backend, tick]);
  const getUserName = (id: string | null) =>
    profiles.find((p) => p.id === id)?.full_name || (id ? 'Operario borrado' : '—');

  if (accessError || !wo) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-red-900 space-y-3">
        <div className="flex items-center gap-2 font-bold text-lg">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <span>Acceso restringido al parte de trabajo</span>
        </div>
        <p className="text-sm">{accessError}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
        >
          Volver a mi panel
        </button>
      </div>
    );
  }

  const assignments = backend.getWorkOrderAssignments(wo.id);
  const entries = backend.getWorkEntries(wo.id);
  const sessions = backend.getWorkSessions(wo.id);
  const materials = backend.getWorkMaterials(wo.id);
  const files = backend.getWorkFiles(wo.id);
  const signatures = backend.getWorkSignatures(wo.id);
  const events = backend.getWorkOrderEvents(wo.id);
  const articlesCatalog = backend.getArticles(false);

  const isEditable =
    wo.deleted_at === null &&
    wo.archived_at === null &&
    (isAdmin ? wo.status !== 'cerrado' : wo.status === 'no_iniciado' || wo.status === 'en_curso' || wo.status === 'reabierto');

  // Ventanas emergentes (Modales) para añadir o editar elementos del parte
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [newEntryDesc, setNewEntryDesc] = useState('');
  const [newEntryObs, setNewEntryObs] = useState('');

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryDesc, setEditEntryDesc] = useState('');
  const [editEntryObs, setEditEntryObs] = useState('');

  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [sessStart, setSessStart] = useState('2026-10-21T09:00');
  const [sessEnd, setSessEnd] = useState('2026-10-21T11:00');
  const [sessNotes, setSessNotes] = useState('');

  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState(articlesCatalog[0]?.id || '');
  const [matQty, setMatQty] = useState('1');
  const [matNotes, setMatNotes] = useState('');

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState('');

  // Modal Fijar / Modificar Importe antes del cierre (Solo Admin)
  const [showEditAmountModal, setShowEditAmountModal] = useState(false);
  const [editAmountStr, setEditAmountStr] = useState(
    wo.total_amount_cents !== null ? (wo.total_amount_cents / 100).toFixed(2) : ''
  );

  // Modal Reprogramar Fecha y Hora Prevista (Disponible para Administradores y Operarios en cualquier momento)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDateStr, setRescheduleDateStr] = useState(
    wo.scheduled_at ? wo.scheduled_at.slice(0, 16) : '2026-10-22T09:00'
  );
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Modal Modificar Datos del Servicio, Dirección y Contacto (Solo Admin)
  const [showEditServiceDataModal, setShowEditServiceDataModal] = useState(false);
  const [editAddressLine, setEditAddressLine] = useState(wo.snapshot_address_line);
  const [editPostalCode, setEditPostalCode] = useState(wo.snapshot_postal_code);
  const [editCity, setEditCity] = useState(wo.snapshot_city);
  const [editProvince, setEditProvince] = useState(wo.snapshot_province);
  const [editContactName, setEditContactName] = useState(wo.snapshot_contact_name);
  const [editContactPhone, setEditContactPhone] = useState(wo.snapshot_contact_phone);
  const [editContactEmail, setEditContactEmail] = useState(wo.snapshot_contact_email);
  const [editPlannedWork, setEditPlannedWork] = useState(wo.planned_work);
  const [editInitialNotes, setEditInitialNotes] = useState(wo.initial_notes || '');

  const customerAddresses = useMemo(
    () => (wo.customer_id ? backend.getCustomerAddresses(wo.customer_id, false) : []),
    [backend, wo.customer_id]
  );

  useEffect(() => {
    if (wo?.scheduled_at) {
      setRescheduleDateStr(wo.scheduled_at.slice(0, 16));
    }
  }, [wo?.scheduled_at]);

  // Formulario de Finalización Atómica (Regla 8)
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeAmountStr, setFinalizeAmountStr] = useState(
    wo.total_amount_cents !== null
      ? (wo.total_amount_cents / 100).toFixed(2).replace('.', ',')
      : ''
  );
  const [finalizeRequestsInvoice, setFinalizeRequestsInvoice] = useState<
    'unset' | 'yes' | 'no'
  >('unset');
  const [finalizeHasPaid, setFinalizeHasPaid] = useState<'unset' | 'yes' | 'no'>('unset');
  const [finalizeObservations, setFinalizeObservations] = useState(wo.final_observations || '');

  useEffect(() => {
    if (wo?.total_amount_cents !== null && wo?.total_amount_cents !== undefined) {
      setFinalizeAmountStr((wo.total_amount_cents / 100).toFixed(2).replace('.', ','));
    }
  }, [wo?.total_amount_cents]);

  // Modal Reapertura con motivo (Solo Admin)
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenTarget, setReopenTarget] = useState<'reabierto' | 'en_curso' | 'terminado'>('reabierto');

  // Doble confirmación en fondo rojo para borrado irreversible de parte (Solo Admin)
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2 | null>(null);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntryDesc.trim()) {
      notifyError('Indica la descripción del trabajo realizado.');
      return;
    }
    const descToSave = newEntryDesc;
    const obsToSave = newEntryObs;
    setShowAddEntryModal(false);
    requestSaveConfirmation({
      title: 'Añadir Trabajo Realizado al Parte',
      changes: [
        { label: 'Parte', value: wo.code },
        { label: 'Trabajo realizado', value: descToSave },
        { label: 'Observaciones', value: obsToSave || '—' },
        { label: 'Autor', value: currentUser.full_name },
      ],
      onConfirm: () => {
        backend.addWorkEntry(wo.id, descToSave, obsToSave);
        setNewEntryDesc('');
        setNewEntryObs('');
        refreshLocal();
      },
    });
  };

  const handleSaveEditEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntryId) return;
    const targetId = editingEntryId;
    const descToSave = editEntryDesc;
    const obsToSave = editEntryObs;
    setEditingEntryId(null);
    requestSaveConfirmation({
      title: 'Modificar Trabajo Realizado',
      changes: [
        { label: 'Descripción actualizada', value: descToSave },
        { label: 'Observaciones actualizadas', value: obsToSave || '—' },
      ],
      onConfirm: () => {
        backend.updateWorkEntry(targetId, {
          description: descToSave,
          observations: obsToSave,
        });
        refreshLocal();
      },
    });
  };

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    const startIso = new Date(sessStart).toISOString();
    const endIso = sessEnd ? new Date(sessEnd).toISOString() : null;
    const notesToSave = sessNotes;
    setShowAddSessionModal(false);
    requestSaveConfirmation({
      title: 'Registrar Jornada Imputada al Parte',
      changes: [
        { label: 'Inicio', value: formatDateTimeES(startIso) },
        { label: 'Fin', value: endIso ? formatDateTimeES(endIso) : 'Jornada abierta' },
        { label: 'Notas', value: notesToSave || '—' },
      ],
      onConfirm: () => {
        backend.addWorkSession({
          work_order_id: wo.id,
          started_at: startIso,
          ended_at: endIso,
          notes: notesToSave,
        });
        setSessNotes('');
        refreshLocal();
      },
    });
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const art = articlesCatalog.find((a) => a.id === selectedArticleId);
    const qty = parseFloat(matQty.replace(',', '.'));
    if (!art || Number.isNaN(qty) || qty <= 0) {
      notifyError('Selecciona un artículo y una cantidad válida (admite decimales como 2,5 m).');
      return;
    }
    const notesToSave = matNotes;
    setShowAddMaterialModal(false);
    requestSaveConfirmation({
      title: 'Añadir Material Utilizado al Parte',
      changes: [
        { label: 'Artículo', value: `${art.code} — ${art.name}` },
        { label: 'Cantidad', value: `${qty} ${art.unit}` },
        { label: 'Precio unitario venta', value: formatCentsToEUR(art.sale_price_cents) },
      ],
      onConfirm: () => {
        backend.addWorkMaterial({
          work_order_id: wo.id,
          article_id: art.id,
          article_name_snapshot: art.name,
          unit_snapshot: art.unit,
          quantity: qty,
          unit_price_cents: art.sale_price_cents,
          notes: notesToSave,
        });
        setMatNotes('');
        refreshLocal();
      },
    });
  };

  const handleFinalizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseEurosToCents(finalizeAmountStr);
    if (cents === null) {
      notifyError('Debes introducir un importe válido mayor o igual a 0,00 €.');
      return;
    }
    if (finalizeRequestsInvoice === 'unset' || finalizeHasPaid === 'unset') {
      notifyError(
        'Debes responder explícitamente Sí o No tanto a «¿El cliente solicita factura?» como a «¿El cliente ha pagado?».');
      return;
    }

    setShowFinalizeModal(false);
    requestSaveConfirmation({
      title: `Finalizar Trabajo del Parte ${wo.code}`,
      changes: [
        { label: 'Importe a cobrar al cliente', value: formatCentsToEUR(cents) },
        ...(wo.total_amount_cents !== null && cents !== wo.total_amount_cents
          ? [
              {
                label: 'Modificación sobre importe admin',
                value: `Modificado de ${formatCentsToEUR(wo.total_amount_cents)} a ${formatCentsToEUR(cents)}`,
              },
            ]
          : []),
        {
          label: '¿El cliente ha pagado?',
          value: finalizeHasPaid === 'yes' ? `SÍ (${formatCentsToEUR(cents)})` : 'NO (Pendiente de cobro)',
        },
        {
          label: '¿El cliente solicita factura?',
          value: finalizeRequestsInvoice === 'yes' ? 'SÍ' : 'NO',
        },
        ...(finalizeObservations.trim()
          ? [{ label: 'Observaciones de finalización', value: finalizeObservations.trim() }]
          : []),
        {
          label: 'Efecto operativo',
          value:
            'El parte pasará a Trabajo Terminado, saldrá de la lista de los operarios y quedará pendiente de cierre administrativo.',
        },
      ],
      onConfirm: () => {
        backend.finalizeWorkOrder({
          work_order_id: wo.id,
          total_amount_cents: cents,
          customer_requests_invoice: finalizeRequestsInvoice === 'yes',
          customer_has_paid: finalizeHasPaid === 'yes',
          observations: finalizeObservations.trim() || undefined,
        });
        if (!isAdmin) {
          onBack();
        } else {
          refreshLocal();
        }
      },
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        backend.addWorkFile({
          work_order_id: wo.id,
          file_name: file.name,
          mime_type: file.type || 'image/png',
          size_bytes: file.size || 1024,
          caption: photoCaption || file.name,
          data_url: String(reader.result || ''),
        });
        setPhotoCaption('');
        setShowPhotoModal(false);
        notifySuccessGreen('Fotografía guardada en Storage privado y vinculada al parte.');
        refreshLocal();
      } catch (err: any) {
        notifyError(err?.message || 'Error al subir fotografía');
      }
    };
    reader.readAsDataURL(file);
  };

  const validSignature = signatures.find((s) => s.is_valid) || null;

  return (
    <div className="space-y-5">
      {/* CABECERA PRINCIPAL DEL PARTE: NÚMERO DE PARTE, CLIENTE, VOLVER Y SITUACIÓN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2.5">
        {/* Primera línea: Número de parte */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
              Parte {wo.code}
            </span>
            <span className="text-slate-300 font-normal">·</span>
            <span className="text-slate-500 text-xs">
              Alta: {formatDateTimeES(wo.created_at)}
            </span>
          </div>
        </div>

        {/* Segunda línea: Nombre del cliente */}
        <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          {wo.snapshot_customer_name === 'Cliente borrado' || wo.snapshot_customer_name.includes('borrado') ? (
            <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg text-base inline-flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-600" /> Cliente borrado
            </span>
          ) : (
            wo.snapshot_customer_name
          )}
        </div>

        {/* Tercera línea (abajo en la misma línea): Botón Volver a la izquierda y Situación a la derecha */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Volver</span>
          </button>

          <div>
            <WorkOrderStatusBadge
              status={wo.status}
              archivedAt={wo.archived_at}
              deletedAt={wo.deleted_at}
              reopenedAt={wo.reopened_at}
              reopenReason={wo.reopen_reason}
              closedAt={wo.closed_at}
            />
          </div>
        </div>
      </div>

      {/* BANNER DESTACADO SI EL PARTE HA SIDO REABIERTO CON MOTIVO PARA LOS OPERARIOS */}
      {wo.reopen_reason && (
        <div
          data-testid="banner-wo-reopened"
          className="rounded-2xl bg-amber-500/10 border-2 border-amber-500 p-4 sm:p-5 shadow-sm text-slate-900 space-y-2"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-amber-950 font-black text-sm uppercase tracking-wide">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <span>Parte Reabierto por Administración</span>
            </div>
            {wo.reopened_at && (
              <span className="text-xs font-bold text-amber-900 bg-amber-200/80 border border-amber-300 px-2.5 py-0.5 rounded-full">
                Reabierto: {formatDateTimeES(wo.reopened_at)}
              </span>
            )}
          </div>
          <div className="bg-white rounded-xl p-3 border border-amber-300 shadow-2xs space-y-1">
            <span className="text-xs font-extrabold uppercase text-amber-800 tracking-wider block">
              Motivo por el que se ha reabierto:
            </span>
            <p className="text-sm font-bold text-slate-900">
              "{wo.reopen_reason}"
            </p>
          </div>
          <p className="text-xs text-amber-900 font-medium">
            ⚠️ <strong>Atención Operario:</strong> Este parte ha sido devuelto a tu lista para su revisión o subsanación. Comprueba las indicaciones del motivo antes de darlo de nuevo por finalizado.
          </p>
        </div>
      )}

      {/* BLOQUE DESTACADO DE FECHA, HORA, OPERARIOS Y ACCIONES PRINCIPALES */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white p-4 sm:p-5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100 flex items-center gap-2">
                <span>Fecha y Hora Prevista del Trabajo</span>
              </div>
              <div className="text-lg sm:text-xl font-extrabold tracking-tight flex flex-wrap items-center gap-3">
                <span>{formatDateES(wo.scheduled_at)} a las {formatTimeES(wo.scheduled_at)} h</span>
                {wo.status !== 'cerrado' && wo.archived_at === null && (
                  <button
                    type="button"
                    data-testid="btn-reschedule-wo"
                    onClick={() => setShowRescheduleModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 border border-white/35 text-xs font-bold text-white inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Reprogramar fecha y hora prevista (disponible para administradores y técnicos)"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Reprogramar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-50 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 w-fit">
            <Users className="w-4 h-4 text-blue-200 shrink-0" />
            <span className="font-bold text-white">Operarios asignados:</span>
            <span>
              {assignments.map((a) => getUserName(a.operator_id)).join(', ') || 'Sin asignar'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {wo.total_amount_cents !== null && (
            <span
              data-testid="wo-header-amount-badge"
              className="px-3 py-1.5 rounded-lg bg-emerald-500/95 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs border border-emerald-400"
            >
              <Euro className="w-4 h-4" />
              <span>Importe a cobrar: {formatCentsToEUR(wo.total_amount_cents)}</span>
            </span>
          )}

          {wo.status === 'no_iniciado' && isEditable && (
            <button
              type="button"
              data-testid="btn-start-work"
              onClick={() => {
                backend.startWorkOrder(wo.id);
                notifySuccessGreen('Trabajo iniciado: el parte pasa a Trabajo en curso.');
                refreshLocal();
              }}
              className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shadow-xs transition"
            >
              Iniciar Trabajo
            </button>
          )}

          {(wo.status === 'no_iniciado' || wo.status === 'en_curso' || wo.status === 'reabierto') && isEditable && (
            <button
              type="button"
              data-testid="btn-open-finalize-modal"
              onClick={() => {
                setFinalizeAmountStr(
                  wo.total_amount_cents !== null
                    ? (wo.total_amount_cents / 100).toFixed(2).replace('.', ',')
                    : ''
                );
                setFinalizeObservations(wo.final_observations || '');
                setShowFinalizeModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-xs transition"
            >
              Finalizar Trabajo
            </button>
          )}

          {/* Botón «Cerrar parte» — COLOR ROJO OBLIGATORIO */}
          {isAdmin && wo.status === 'terminado' && !wo.deleted_at && (
            <button
              type="button"
              data-testid="btn-close-wo-red"
              onClick={() => {
                requestSaveConfirmation({
                  title: `Cerrar administrativamente el parte ${wo.code}`,
                  changes: [
                    { label: 'Parte', value: wo.code },
                    { label: 'Transición', value: 'Terminado -> Cerrado' },
                  ],
                  onConfirm: () => {
                    backend.closeWorkOrder(wo.id);
                    refreshLocal();
                  },
                });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-xs transition"
            >
              <Lock className="w-3.5 h-3.5" /> Cerrar parte
            </button>
          )}

          {/* Botón «Archivar parte» — COLOR NEGRO OBLIGATORIO */}
          {isAdmin && wo.status === 'cerrado' && !wo.archived_at && !wo.deleted_at && (
            <button
              type="button"
              data-testid="btn-archive-wo-black"
              onClick={() => {
                requestSaveConfirmation({
                  title: `Archivar parte cerrado ${wo.code}`,
                  changes: [
                    { label: 'Parte', value: wo.code },
                    {
                      label: 'Comportamiento',
                      value:
                        'Conserva estado operativo Cerrado, marca archived_at y retira del listado activo manteniendo fotos, firma e historial.',
                    },
                  ],
                  onConfirm: () => {
                    backend.archiveWorkOrder(wo.id);
                    refreshLocal();
                  },
                });
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition"
            >
              <Archive className="w-3.5 h-3.5" /> Archivar parte
            </button>
          )}

          {isAdmin && (wo.status === 'cerrado' || wo.status === 'terminado' || wo.status === 'reabierto' || wo.archived_at !== null) && (
            <button
              type="button"
              onClick={() => setShowReopenModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/30 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reabrir con motivo
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              data-testid="btn-delete-wo"
              onClick={() => setDeleteConfirmStep(1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-300/40 bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              title="Borrar este parte de trabajo definitivamente (requiere doble confirmación)"
            >
              <Trash2 className="w-3.5 h-3.5" /> Borrar parte
            </button>
          )}
        </div>
      </div>

      {/* Datos del cliente, contacto y dirección específica del servicio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          className={`${
            isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'
          } bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 text-sm`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-900">
              Datos del Servicio e Instantánea del Cliente
            </h2>
            {isAdmin && isEditable && (
              <button
                type="button"
                data-testid="btn-open-edit-service-data"
                onClick={() => {
                  setEditAddressLine(wo.snapshot_address_line);
                  setEditPostalCode(wo.snapshot_postal_code);
                  setEditCity(wo.snapshot_city);
                  setEditProvince(wo.snapshot_province);
                  setEditContactName(wo.snapshot_contact_name);
                  setEditContactPhone(wo.snapshot_contact_phone);
                  setEditContactEmail(wo.snapshot_contact_email);
                  setEditPlannedWork(wo.planned_work);
                  setEditInitialNotes(wo.initial_notes || '');
                  setShowEditServiceDataModal(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Modificar dirección, población, contacto o trabajos encargados"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Modificar Datos</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div>
              <span className="text-slate-500">Cliente:</span>{' '}
              <strong className="text-slate-900">{wo.snapshot_customer_name}</strong>{' '}
              {wo.snapshot_customer_tax_id && <span>({wo.snapshot_customer_tax_id})</span>}
            </div>
            <div>
              <span className="text-slate-500">Dirección servicio:</span>{' '}
              <strong className="text-slate-900">
                {wo.snapshot_address_line}, {wo.snapshot_postal_code} {wo.snapshot_city} (
                {wo.snapshot_province})
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Contacto en destino:</span>{' '}
              <strong>{wo.snapshot_contact_name || '—'}</strong>
            </div>
            <div>
              <span className="text-slate-500">Teléfono:</span>{' '}
              <PhoneActionLinks phone={wo.snapshot_contact_phone} />
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-500">Email:</span>{' '}
              <EmailActionLink email={wo.snapshot_contact_email} />
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
            <div className="pb-1.5 border-b border-slate-200/80">
              <span className="font-bold text-slate-700">Trabajos encargados / planificados:</span>
            </div>
            <p className="text-slate-900 pt-1">{wo.planned_work}</p>
            {wo.initial_notes && (
              <p className="text-slate-600">
                <strong>Notas iniciales:</strong> {wo.initial_notes}
              </p>
            )}
            {wo.final_observations && (
              <div className="pt-2 mt-2 border-t border-slate-200">
                <span className="font-bold text-blue-900">Observaciones de finalización:</span>
                <p className="text-slate-800 pt-0.5 whitespace-pre-line">{wo.final_observations}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumen económico y Bloque Administrativo Reservado (Solo para administradores) */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                <Euro className="w-4 h-4 text-blue-600" />
                Datos de Finalización y Cobro
              </h2>
              {wo.status !== 'cerrado' && !wo.archived_at && !wo.deleted_at && (
                <button
                  type="button"
                  data-testid="btn-open-edit-amount"
                  onClick={() => {
                    setEditAmountStr(
                      wo.total_amount_cents !== null ? (wo.total_amount_cents / 100).toFixed(2) : ''
                    );
                    setShowEditAmountModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200 transition"
                >
                  <span>{wo.total_amount_cents !== null ? '✏️ Modificar importe' : '+ Fijar importe'}</span>
                </button>
              )}
            </div>

            {/* Tarjeta destacada de importe a cobrar al cliente */}
            {wo.total_amount_cents !== null ? (
              <div
                data-testid="box-amount-to-collect"
                className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-950"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                    <Euro className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Importe a cobrar al cliente
                    </div>
                    <div className="text-base font-extrabold text-emerald-950">
                      {formatCentsToEUR(wo.total_amount_cents)}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] bg-emerald-200/90 text-emerald-900 font-bold px-2 py-0.5 rounded-md">
                  {wo.status === 'terminado' || wo.status === 'cerrado'
                    ? 'Finalizado'
                    : 'Fijado por Administración'}
                </span>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <span>Importe a cobrar aún no fijado.</span>
                <span className="text-[11px] text-blue-600 font-medium">
                  Puedes fijarlo antes de finalizar para que el operario sepa cuánto cobrar.
                </span>
              </div>
            )}

            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-slate-500">Importe del trabajo:</dt>
                <dd className="font-bold text-slate-900 text-sm">
                  {formatCentsToEUR(wo.total_amount_cents)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">¿Cliente ha pagado?:</dt>
                <dd className="font-semibold">
                  {wo.customer_has_paid === null
                    ? 'Pendiente de finalizar'
                    : wo.customer_has_paid
                    ? 'SÍ'
                    : 'NO'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">¿Cliente solicita factura?:</dt>
                <dd className="font-semibold">
                  {wo.customer_requests_invoice === null
                    ? 'Pendiente de finalizar'
                    : wo.customer_requests_invoice
                    ? 'SÍ'
                    : 'NO'}
                </dd>
              </div>
            </dl>

            {wo.admin_data && (
              <div
                className="mt-3 pt-3 border-t-2 border-slate-200 bg-slate-50 rounded-xl p-3 space-y-2.5"
                data-testid="admin-reserved-financial-box"
              >
                <div className="text-[11px] font-bold uppercase text-slate-700 flex items-center justify-between">
                  <span>Control Reservado Admin</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10px]">
                    Solo Admin
                  </span>
                </div>

                {wo.customer_has_paid && !wo.admin_data.money_delivered && (
                  <div className="p-2 rounded bg-amber-100 border border-amber-300 text-[11px] text-amber-950 font-medium">
                    ⚠️ Aviso: El cliente pagó pero el dinero figura como NO entregado.
                  </div>
                )}
                {wo.customer_requests_invoice && !wo.admin_data.invoice_issued && (
                  <div className="p-2 rounded bg-amber-100 border border-amber-300 text-[11px] text-amber-950 font-medium">
                    ⚠️ Aviso: El cliente solicitó factura pero aún figura como NO emitida.
                  </div>
                )}

                <label className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>Dinero entregado en oficina:</span>
                  <input
                    type="checkbox"
                    checked={wo.admin_data.money_delivered}
                    onChange={(e) => {
                      backend.updateWorkOrderAdminData(wo.id, {
                        money_delivered: e.target.checked,
                      });
                      notifySuccessGreen('Estado de dinero entregado actualizado.');
                      refreshLocal();
                    }}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>Factura emitida:</span>
                  <input
                    type="checkbox"
                    checked={wo.admin_data.invoice_issued}
                    onChange={(e) => {
                      backend.updateWorkOrderAdminData(wo.id, {
                        invoice_issued: e.target.checked,
                      });
                      notifySuccessGreen('Estado de factura emitida actualizado.');
                      refreshLocal();
                    }}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================================
          SECCIÓN DE APORTACIONES 1: TRABAJOS REALIZADOS (CON BOTÓN QUE ABRE VENTANA EMERGENTE)
      ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <Wrench className="w-4 h-4 text-blue-600" />
            Trabajos Realizados y Observaciones ({entries.length})
          </h2>

          {isEditable && (
            <button
              type="button"
              data-testid="btn-add-entry"
              onClick={() => {
                setNewEntryDesc('');
                setNewEntryObs('');
                setShowAddEntryModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" /> + Añadir Trabajo
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Aún no se han registrado trabajos realizados en este parte. Pulsa «+ Añadir Trabajo».
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isOwnContribution = entry.created_by === currentUser.id;
              const canModifyOrDelete = isEditable && (isAdmin || isOwnContribution);

              return (
                <div
                  key={entry.id}
                  data-testid={`work-entry-item-${entry.id}`}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-slate-900">{entry.description}</div>
                    {entry.observations && (
                      <div className="text-slate-600">Observaciones: {entry.observations}</div>
                    )}
                    <div className="text-[11px] text-slate-500">
                      Autor: <strong>{getUserName(entry.created_by)}</strong> ·{' '}
                      {formatDateTimeES(entry.created_at)}
                    </div>
                  </div>

                  {/* Regla 4: Operario ve las de compañeros, pero sus botones Modificar y Borrar aparecen deshabilitados y grises */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={!canModifyOrDelete}
                      data-testid={`btn-edit-entry-${entry.id}`}
                      onClick={() => {
                        setEditingEntryId(entry.id);
                        setEditEntryDesc(entry.description);
                        setEditEntryObs(entry.observations);
                      }}
                      title={
                        canModifyOrDelete
                          ? 'Modificar aportación en ventana emergente'
                          : 'Solo puedes modificar tus propias aportaciones'
                      }
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        canModifyOrDelete
                          ? 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                      }`}
                    >
                      Modificar
                    </button>
                    <button
                      type="button"
                      disabled={!canModifyOrDelete}
                      data-testid={`btn-delete-entry-${entry.id}`}
                      onClick={() =>
                        requestDeleteConfirmation({
                          recordName: `Trabajo realizado: ${entry.description.slice(0, 40)}`,
                          consequence: 'Se eliminará esta aportación del parte de trabajo.',
                          onConfirm: () => {
                            backend.deleteWorkEntry(entry.id);
                            refreshLocal();
                          },
                        })
                      }
                      title={
                        canModifyOrDelete
                          ? 'Borrar aportación'
                          : 'Solo puedes borrar tus propias aportaciones'
                      }
                      className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                        canModifyOrDelete
                          ? 'bg-white hover:bg-red-50 text-red-700 border-red-200'
                          : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                      }`}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          SECCIÓN DE APORTACIONES 2: MATERIALES UTILIZADOS (CON BOTÓN DE VENTANA EMERGENTE)
      ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-blue-600" />
            Materiales Utilizados ({materials.length})
          </h2>
          {isEditable && (
            <button
              type="button"
              onClick={() => {
                setMatQty('1');
                setMatNotes('');
                setShowAddMaterialModal(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> + Añadir Material
            </button>
          )}
        </div>

        <div className="space-y-2">
          {materials.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Sin materiales registrados en este parte. Pulsa «+ Añadir Material» si has utilizado repuestos o consumibles.
            </div>
          ) : (
            materials.map((m) => {
              const isOwn = m.created_by === currentUser.id;
              const canEdit = isEditable && (isAdmin || isOwn);
              return (
                <div
                  key={m.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      {m.article_name_snapshot === 'Artículo borrado' ? (
                        <span className="text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" /> Artículo borrado
                        </span>
                      ) : (
                        <span>{m.article_name_snapshot}</span>
                      )}
                      <span>—</span>
                      <span className="text-blue-700">
                        {m.quantity} {m.unit_snapshot}
                      </span>{' '}
                      ({formatCentsToEUR(m.unit_price_cents)} / {m.unit_snapshot})
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Autor: <strong>{getUserName(m.created_by)}</strong>{' '}
                      {m.notes && `· ${m.notes}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() =>
                      requestDeleteConfirmation({
                        recordName: `Material ${m.article_name_snapshot}`,
                        consequence: 'Se retirará el material imputado al parte.',
                        onConfirm: () => {
                          backend.deleteWorkMaterial(m.id);
                          refreshLocal();
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded text-xs font-semibold border ${
                      canEdit
                        ? 'bg-white text-red-700 border-red-200'
                        : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                    }`}
                  >
                    Borrar
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =====================================================================
          SECCIÓN 3: FIRMA MANUSCRITA DEL CLIENTE Y FOTOGRAFÍAS PRIVADAS (EN VENTANA EMERGENTE)
      ===================================================================== */}
      <div className={ENABLE_PHOTO_ATTACHMENTS ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-4'}>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <PenTool className="w-4 h-4 text-blue-600" />
              Firma Manuscrita del Cliente
            </h2>
            {isEditable && (
              <button
                type="button"
                onClick={() => setShowSignatureModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                <PenTool className="w-3.5 h-3.5" />{' '}
                {validSignature ? 'Repetir Firma en Pantalla' : '+ Firmar en Pantalla'}
              </button>
            )}
          </div>

          {validSignature ? (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Firma vigente para el contenido actual
                </span>
                <span className="text-[11px] text-emerald-700">
                  {formatDateTimeES(validSignature.signed_at)}
                </span>
              </div>
              <div>
                Firmante: <strong>{validSignature.signer_name}</strong> (
                {validSignature.signer_dni || 'Sin DNI'})
              </div>
              <img
                src={validSignature.data_url}
                alt="Firma manuscrita del cliente"
                className="h-20 bg-white border border-emerald-200 rounded p-1"
              />
            </div>
          ) : (
            <div className="text-xs text-slate-500 p-3 rounded-xl border border-dashed border-slate-200">
              No hay firma vigente en este momento. Pulsa «+ Firmar en Pantalla» para abrir el recuadro de firma del cliente.
            </div>
          )}

          {signatures.filter((s) => !s.is_valid).length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <div className="font-bold">Evidencias de firmas históricas invalidadas:</div>
              {signatures
                .filter((s) => !s.is_valid)
                .map((s) => (
                  <div key={s.id}>
                    • {s.signer_name} ({formatDateTimeES(s.signed_at)}) — {s.invalidated_reason}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Fotografías y adjuntos en Storage privado (Conservado para próximas versiones) */}
        {ENABLE_PHOTO_ATTACHMENTS && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Camera className="w-4 h-4 text-blue-600" />
                Fotografías y Archivos Privados ({files.length})
              </h2>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoCaption('');
                    setShowPhotoModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  <Camera className="w-3.5 h-3.5" /> + Añadir Fotografía
                </button>
              )}
            </div>

            {files.length === 0 ? (
              <div className="text-xs text-slate-500 p-3 rounded-xl border border-dashed border-slate-200">
                Sin fotografías adjuntas todavía.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs"
                  >
                    {f.data_url.startsWith('data:image/') ? (
                      <img
                        src={f.data_url}
                        alt={f.caption}
                        className="w-full h-28 object-cover rounded border border-slate-200 bg-white"
                      />
                    ) : (
                      <div className="h-20 flex items-center justify-center bg-slate-100 rounded font-semibold">
                        <FileText className="w-5 h-5 mr-1 text-slate-600" /> {f.file_name}
                      </div>
                    )}
                    <div className="font-semibold text-slate-800 truncate">
                      {f.caption || f.file_name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Subido por {getUserName(f.created_by)} · {formatDateTimeES(f.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historial de transiciones (Oculto a petición del usuario) */}
      {ENABLE_HISTORY_SECTION && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <History className="w-4 h-4 text-blue-600" />
              Historial de Estados y Trazabilidad del Parte
            </h2>
            {isAdmin && onOpenAuditForWorkOrder && (
              <button
                type="button"
                onClick={() => onOpenAuditForWorkOrder(wo.id)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Ver en Auditoría Técnica Completa →
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {events.map((ev) => (
              <div key={ev.id} className="py-2 flex flex-wrap justify-between gap-2">
                <div>
                  <span className="font-bold uppercase text-slate-800">{ev.event_type}</span>{' '}
                  {ev.from_status && (
                    <span className="text-slate-500">
                      ({ev.from_status} → {ev.to_status})
                    </span>
                  )}
                  {ev.reason && (
                    <span className="ml-2 text-amber-800 font-medium">Motivo: {ev.reason}</span>
                  )}
                </div>
                <div className="text-slate-500">
                  {getUserName(ev.actor_id)} · {formatDateTimeES(ev.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VENTANAS EMERGENTES (MODALES) PARA ESCRIBIR Y GUARDAR APORTACIONES
      ===================================================================== */}

      {/* 1. VENTANA EMERGENTE: AÑADIR TRABAJO REALIZADO */}
      {showAddEntryModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
          data-testid="modal-add-work-entry"
        >
          <form
            onSubmit={handleAddEntry}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
          >
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-base">Añadir Trabajo Realizado — {wo.code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEntryModal(false)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción del trabajo realizado *
                </label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  data-testid="input-new-entry-desc"
                  value={newEntryDesc}
                  onChange={(e) => setNewEntryDesc(e.target.value)}
                  placeholder="Describe detalladamente la intervención realizada..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observaciones adicionales (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newEntryObs}
                  onChange={(e) => setNewEntryObs(e.target.value)}
                  placeholder="Parámetros medidos, recomendaciones, estado de la instalación..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddEntryModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                Revisar y Guardar Trabajo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. VENTANA EMERGENTE: MODIFICAR TRABAJO REALIZADO */}
      {editingEntryId && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditEntry}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
          >
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Modificar Trabajo Realizado</h3>
              <button
                type="button"
                onClick={() => setEditingEntryId(null)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción del trabajo *
                </label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  value={editEntryDesc}
                  onChange={(e) => setEditEntryDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={editEntryObs}
                  onChange={(e) => setEditEntryObs(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingEntryId(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. VENTANA EMERGENTE: AÑADIR MATERIAL AL PARTE */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddMaterial}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
          >
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Añadir Material Utilizado — {wo.code}</h3>
              <button
                type="button"
                onClick={() => setShowAddMaterialModal(false)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Artículo del catálogo *
                </label>
                <SearchableSelect
                  value={selectedArticleId}
                  onChange={setSelectedArticleId}
                  placeholder="Escribe para buscar artículo..."
                  options={articlesCatalog.map((a) => ({
                    value: a.id,
                    label: `${a.code} — ${a.name} (${a.unit} · ${formatCentsToEUR(a.sale_price_cents)})`,
                  }))}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cantidad utilizada (admite decimales como 2,5 m) *
                </label>
                <input
                  type="text"
                  required
                  value={matQty}
                  onChange={(e) => setMatQty(e.target.value)}
                  placeholder="Ej. 1 o 2,5"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observaciones del material
                </label>
                <input
                  type="text"
                  value={matNotes}
                  onChange={(e) => setMatNotes(e.target.value)}
                  placeholder="Ubicación o nota de instalación..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMaterialModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Guardar Material
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 5. VENTANA EMERGENTE: FIRMA MANUSCRITA DEL CLIENTE EN PANTALLA */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                Firma Manuscrita del Cliente — Parte {wo.code}
              </h3>
              <button
                type="button"
                onClick={() => setShowSignatureModal(false)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <SignaturePadCanvas
                onConfirmSignature={({ signerName, signerDni, dataUrl }) => {
                  backend.saveWorkSignature({
                    work_order_id: wo.id,
                    signer_name: signerName,
                    signer_dni: signerDni,
                    data_url: dataUrl,
                  });
                  setShowSignatureModal(false);
                  notifySuccessGreen('Firma manuscrita del cliente guardada con éxito.');
                  refreshLocal();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. VENTANA EMERGENTE: SUBIR / CAPTURAR FOTOGRAFÍA (Conservado para próximas versiones) */}
      {ENABLE_PHOTO_ATTACHMENTS && showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base">Adjuntar Fotografía al Parte {wo.code}</h3>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción o leyenda de la fotografía
                </label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Ej. Estado final de la válvula instalada..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-800 font-bold cursor-pointer">
                <Camera className="w-7 h-7 text-blue-600" />
                <span>Seleccionar o hacer foto con la cámara</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 7. VENTANA EMERGENTE: REAPERTURA CON MOTIVO (SOLO ADMIN) */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-3 text-xs">
            <h3 className="text-base font-bold text-slate-900">
              Reapertura Administrativa con Motivo — {wo.code}
            </h3>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Motivo obligatorio para auditoría *
              </label>
              <input
                type="text"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Indica el motivo de la reapertura..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Estado destino</label>
              <select
                value={reopenTarget}
                onChange={(e) => setReopenTarget(e.target.value as 'reabierto' | 'en_curso' | 'terminado')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="reabierto">Reabierto (marrón en negrita - devolver a operarios)</option>
                <option value="en_curso">Reabrir a En Curso</option>
                <option value="terminado">Reabrir a Terminado (solo revisión admin)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    backend.reopenWorkOrder(wo.id, reopenReason, reopenTarget);
                    setReopenReason('');
                    setShowReopenModal(false);
                    notifySuccessGreen('Parte reabierto y registrado en auditoría.');
                    refreshLocal();
                  } catch (err: any) {
                    notifyError(err?.message || 'Error al reabrir');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
              >
                Confirmar Reapertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. VENTANA EMERGENTE 1 DE BORRADO DE PARTE (FONDO ROJO, CENTRADA EN PANTALLA) */}
      {deleteConfirmStep === 1 && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          data-testid="modal-delete-wo-step1"
        >
          <div className="bg-red-700 text-white rounded-2xl shadow-2xl border-2 border-red-400 max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-red-600 pb-3">
              <div className="p-2.5 rounded-full bg-red-900/80 border border-red-400">
                <AlertTriangle className="w-7 h-7 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white">
                  ADVERTENCIA DE PELIGRO (Paso 1 de 2)
                </h3>
                <p className="text-xs text-red-200">Solo administradores autorizados</p>
              </div>
            </div>

            <div className="bg-red-900/70 border border-red-400/50 rounded-xl p-4 space-y-2.5 text-xs text-red-100">
              <p className="font-extrabold text-sm text-white">
                ¿Está seguro de que desea borrar este parte de trabajo?
              </p>
              <div className="space-y-1 bg-red-950/50 p-3 rounded-lg border border-red-500/30">
                <div>
                  <span className="text-red-300 font-semibold">Número de parte:</span>{' '}
                  <strong className="text-white text-sm">{wo.code}</strong>
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Cliente:</span>{' '}
                  <strong className="text-white">{wo.snapshot_customer_name}</strong>
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Dirección:</span>{' '}
                  {wo.snapshot_address_line} ({wo.snapshot_city})
                </div>
                <div>
                  <span className="text-red-300 font-semibold">Trabajo previsto:</span>{' '}
                  {wo.planned_work}
                </div>
              </div>
              <p className="text-red-200">
                Para garantizar la seguridad de los datos, el sistema le solicitará una segunda confirmación antes de proceder a la destrucción completa.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="btn-cancel-delete-wo-step1"
                onClick={() => setDeleteConfirmStep(null)}
                className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-wo-step1"
                onClick={() => setDeleteConfirmStep(2)}
                className="px-4 py-2 rounded-xl bg-white text-red-900 hover:bg-red-50 text-xs font-black shadow-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Continuar con el borrado</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. VENTANA EMERGENTE 2 DE BORRADO DE PARTE (FONDO ROJO EXTREMO, DESTRUCCIÓN IRREVERSIBLE) */}
      {deleteConfirmStep === 2 && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="modal-delete-wo-step2"
        >
          <div className="bg-red-800 text-white rounded-2xl shadow-2xl border-4 border-red-500 max-w-lg w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-red-700 pb-3">
              <div className="p-3 rounded-full bg-red-950 border-2 border-red-400">
                <AlertTriangle className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white uppercase">
                  🚨 PELIGRO EXTREMO: CONFIRMACIÓN DEFINITIVA (Paso 2 de 2)
                </h3>
                <p className="text-xs text-red-200 font-semibold">Acción destructiva sin marcha atrás</p>
              </div>
            </div>

            <div className="bg-red-950/80 border-2 border-red-400 rounded-xl p-4 space-y-3 text-xs leading-relaxed text-red-100">
              <p className="text-sm font-black text-amber-200">
                ⚠️ Los datos de este parte van a eliminarse definitivamente y no va a haber forma de recuperarlos.
              </p>
              <p>
                Al confirmar, <strong>se borrarán todos los datos y huellas de este parte ({wo.code})</strong>:
                trabajos realizados, materiales consumidos, jornadas de operarios, firmas manuscritas del cliente,
                fotografías adjuntas y registros de auditoría.
              </p>
              <p className="font-extrabold text-red-100 bg-red-900/80 p-2.5 rounded-lg border border-red-500/50">
                No quedará ningún rastro en las bases de datos. Los datos serán completamente irrecuperables aunque se intenten buscar internamente dentro de los ficheros de las bases de datos.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                data-testid="btn-cancel-delete-wo-step2"
                onClick={() => setDeleteConfirmStep(null)}
                className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition cursor-pointer"
              >
                Cancelar y Proteger Parte
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-wo-step2"
                onClick={() => {
                  try {
                    const deletedCode = wo.code;
                    backend.permanentDeleteWorkOrder(wo.id);
                    setDeleteConfirmStep(null);
                    onRefresh?.();
                    notifySuccessGreen(
                      `Parte ${deletedCode} eliminado definitivamente y partes restantes renumerados de forma continua sin dejar rastro.`
                    );
                    onBack();
                  } catch (err: any) {
                    notifyError(err?.message || 'Error al eliminar el parte de trabajo.');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-white text-red-950 hover:bg-red-100 text-xs font-black shadow-2xl transition cursor-pointer flex items-center gap-2 border-2 border-red-300"
              >
                <Trash2 className="w-4 h-4 text-red-700" />
                <span>SÍ, ELIMINAR DEFINITIVAMENTE SIN RASTRO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VENTANA EMERGENTE: MODIFICAR DATOS DEL SERVICIO, UBICACIÓN Y CONTACTO (SOLO ADMIN) */}
      {showEditServiceDataModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4 overflow-y-auto"
          data-testid="modal-edit-service-data"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editAddressLine.trim() || !editCity.trim()) {
                notifyError('La dirección y la población son campos obligatorios.');
                return;
              }
              setShowEditServiceDataModal(false);
              requestSaveConfirmation({
                title: `Modificar Datos del Parte — ${wo.code}`,
                changes: [
                  { label: 'Dirección', value: editAddressLine },
                  { label: 'Población / Municipio', value: editCity },
                  { label: 'Código Postal', value: editPostalCode },
                  { label: 'Provincia', value: editProvince },
                  { label: 'Persona de contacto', value: editContactName || '—' },
                  { label: 'Teléfono', value: editContactPhone || '—' },
                  { label: 'Trabajo encargado', value: editPlannedWork },
                ],
                onConfirm: () => {
                  backend.updateWorkOrderPlanningAndAssignments(wo.id, {
                    snapshot_address_line: editAddressLine.trim(),
                    snapshot_postal_code: editPostalCode.trim(),
                    snapshot_city: editCity.trim(),
                    snapshot_province: editProvince.trim(),
                    snapshot_contact_name: editContactName.trim(),
                    snapshot_contact_phone: editContactPhone.trim(),
                    snapshot_contact_email: editContactEmail.trim(),
                    planned_work: editPlannedWork.trim() || wo.planned_work,
                    initial_notes: editInitialNotes.trim(),
                  });
                  notifySuccessGreen('Datos del servicio y población actualizados correctamente.');
                  refreshLocal();
                },
              });
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                Modificar Datos del Servicio y Ubicación
              </h3>
              <button
                type="button"
                onClick={() => setShowEditServiceDataModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Edita la dirección del servicio, población, personas de contacto o el trabajo planificado de este parte.
            </p>

            {customerAddresses.length > 0 && (
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
                <label className="block text-[11px] font-bold text-blue-900">
                  📍 Cargar desde otra dirección registrada del cliente:
                </label>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const found = customerAddresses.find((a) => a.id === e.target.value);
                    if (found) {
                      setEditAddressLine(found.address_line);
                      setEditPostalCode(found.postal_code);
                      setEditCity(found.city);
                      setEditProvince(found.province);
                      if (found.contact_name) setEditContactName(found.contact_name);
                      if (found.contact_phone) setEditContactPhone(found.contact_phone);
                      if (found.contact_email) setEditContactEmail(found.contact_email);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-blue-300 text-slate-800"
                >
                  <option value="">-- Seleccionar dirección guardada --</option>
                  {customerAddresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.address_line}, {a.city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Dirección del Servicio (Calle, número, piso):
                </label>
                <input
                  type="text"
                  required
                  value={editAddressLine}
                  onChange={(e) => setEditAddressLine(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="col-span-1 sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Población:</label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cód. Postal:</label>
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Provincia:</label>
                  <input
                    type="text"
                    value={editProvince}
                    onChange={(e) => setEditProvince(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contacto:</label>
                  <input
                    type="text"
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono:</label>
                  <PhoneInputField
                    value={editContactPhone}
                    onChange={setEditContactPhone}
                    placeholder="600 11 22 33"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email:</label>
                  <input
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Trabajo Encargado / Planificado:
                </label>
                <textarea
                  rows={2}
                  value={editPlannedWork}
                  onChange={(e) => setEditPlannedWork(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas Iniciales:</label>
                <textarea
                  rows={2}
                  value={editInitialNotes}
                  onChange={(e) => setEditInitialNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditServiceDataModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VENTANA EMERGENTE: FIJAR / MODIFICAR IMPORTE DEL TRABAJO (SOLO ADMIN) */}
      {showEditAmountModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4"
          data-testid="modal-edit-amount"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cents = editAmountStr.trim() === '' ? null : parseEurosToCents(editAmountStr);
              if (cents !== null && (Number.isNaN(cents) || cents < 0)) {
                notifyError('Debes introducir un importe válido mayor o igual a 0,00 € o dejarlo vacío para quitarlo.');
                return;
              }
              setShowEditAmountModal(false);
              requestSaveConfirmation({
                title: `Fijar Importe del Trabajo — Parte ${wo.code}`,
                changes: [
                  { label: 'Parte', value: wo.code },
                  {
                    label: 'Importe a cobrar al cliente',
                    value: cents !== null ? formatCentsToEUR(cents) : 'Sin fijar (pendiente)',
                  },
                  {
                    label: 'Información para el operario',
                    value:
                      'Los operarios asignados verán este importe antes del cierre del trabajo para saber exactamente cuánto cobrar al cliente.',
                  },
                ],
                onConfirm: () => {
                  backend.setWorkOrderAmount(wo.id, cents);
                  notifySuccessGreen('Importe a cobrar actualizado correctamente.');
                  refreshLocal();
                },
              });
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Euro className="w-5 h-5 text-blue-600" />
                Fijar Importe a Cobrar al Cliente
              </h3>
              <button
                type="button"
                onClick={() => setShowEditAmountModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Indica el importe para que el operario asignado conozca cuánto cobrar al cliente durante su visita antes de finalizar la intervención.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Importe del trabajo a cobrar al cliente (€)
              </label>
              <input
                type="text"
                autoFocus
                data-testid="input-edit-amount"
                value={editAmountStr}
                onChange={(e) => setEditAmountStr(e.target.value)}
                placeholder="Ej. 150,00 (dejar vacío si se determinará al finalizar)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Admite decimales (ej. 125,50) o 0. Si lo dejas vacío, el importe quedará sin fijar.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowEditAmountModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-save-edit-amount"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
              >
                Guardar Importe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. VENTANA EMERGENTE: FINALIZACIÓN ATÓMICA DEL PARTE */}
      {showFinalizeModal && (() => {
        const currentEnteredCents =
          finalizeAmountStr.trim() !== '' ? parseEurosToCents(finalizeAmountStr) : null;
        const isModifiedFromAdmin =
          wo.total_amount_cents !== null &&
          currentEnteredCents !== null &&
          currentEnteredCents !== wo.total_amount_cents;

        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/70 flex items-center justify-center p-4"
            data-testid="modal-finalize-wo"
          >
            <form
              onSubmit={handleFinalizeSubmit}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
            >
              <h3 className="text-lg font-bold text-slate-900">
                Finalizar Trabajo — Parte {wo.code}
              </h3>
              <p className="text-xs text-slate-600">
                Verifica el importe a cobrar al cliente y responde obligatoriamente si se ha cobrado y si solicita factura.
              </p>

              {wo.total_amount_cents !== null && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-blue-900">
                      <Euro className="w-4 h-4 text-blue-600 shrink-0" />
                      Importe fijado por el Administrador:
                    </span>
                    <span className="font-extrabold text-sm text-blue-900">
                      {formatCentsToEUR(wo.total_amount_cents)}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700">
                    Aparece precargado abajo. Puedes modificarlo libremente si ha habido trabajos o materiales adicionales.
                  </p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    1. Importe a cobrar al cliente (€, modificable) *
                  </label>
                  {isModifiedFromAdmin && wo.total_amount_cents !== null && (
                    <button
                      type="button"
                      onClick={() =>
                        setFinalizeAmountStr(
                          (wo.total_amount_cents! / 100).toFixed(2).replace('.', ',')
                        )
                      }
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold underline"
                    >
                      Restablecer al importe del admin
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  data-testid="input-finalize-amount"
                  value={finalizeAmountStr}
                  onChange={(e) => setFinalizeAmountStr(e.target.value)}
                  placeholder="Ej. 125,50 o 0"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-base font-extrabold text-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {isModifiedFromAdmin ? (
                    <span className="text-amber-700 font-semibold">
                      ✏️ Has modificado el importe puesto por el administrador (previsto: {formatCentsToEUR(wo.total_amount_cents)}).
                    </span>
                  ) : wo.total_amount_cents !== null ? (
                    <span className="text-emerald-700">
                      Coincide con el importe fijado previamente por el administrador.
                    </span>
                  ) : (
                    'Indica el importe a cobrar al cliente (admite 0,00 €).'
                  )}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  2. ¿El cliente ha pagado el importe de{' '}
                  <span className="text-emerald-700 font-extrabold underline">
                    {currentEnteredCents !== null
                      ? formatCentsToEUR(currentEnteredCents)
                      : finalizeAmountStr.trim()
                      ? `${finalizeAmountStr} €`
                      : '0,00 €'}
                  </span>
                  ? *
                </label>
                <select
                  data-testid="select-finalize-paid"
                  value={finalizeHasPaid}
                  onChange={(e) => setFinalizeHasPaid(e.target.value as 'unset' | 'yes' | 'no')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="unset">-- Selecciona si el cliente ha pagado o no --</option>
                  <option value="yes">
                    SÍ, el cliente ha pagado{' '}
                    {currentEnteredCents !== null ? `(${formatCentsToEUR(currentEnteredCents)})` : ''}
                  </option>
                  <option value="no">NO, el importe queda pendiente de cobro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. ¿El cliente solicita factura? (Respuesta explícita Sí/No) *
                </label>
                <select
                  data-testid="select-finalize-invoice"
                  value={finalizeRequestsInvoice}
                  onChange={(e) =>
                    setFinalizeRequestsInvoice(e.target.value as 'unset' | 'yes' | 'no')
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                >
                  <option value="unset">-- Selecciona respuesta explícita --</option>
                  <option value="yes">SÍ solicita factura</option>
                  <option value="no">NO solicita factura</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Observaciones de la intervención / cobro (opcional)
                </label>
                <textarea
                  data-testid="textarea-finalize-observations"
                  rows={3}
                  value={finalizeObservations}
                  onChange={(e) => setFinalizeObservations(e.target.value)}
                  placeholder="Escribe aquí observaciones sobre el trabajo realizado, modificaciones de precio, cobro o incidencias..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-finalize-wo"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Revisar y Finalizar Parte
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* MODAL REPROGRAMAR FECHA Y HORA PREVISTA (ADMIN Y OPERARIOS) */}
      {showRescheduleModal && (
        <div
          data-testid="modal-reschedule-work-order"
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!rescheduleDateStr) {
                notifyError('Debes indicar una fecha y hora prevista válida.');
                return;
              }
              const isoTarget = rescheduleDateStr.includes('Z')
                ? rescheduleDateStr
                : new Date(rescheduleDateStr).toISOString();

              requestSaveConfirmation({
                title: 'Confirmar Reprogramación de Fecha y Hora Prevista',
                changes: [
                  { label: 'Parte de trabajo', value: wo.code },
                  {
                    label: 'Fecha/hora anterior',
                    value: `${formatDateES(wo.scheduled_at)} ${formatTimeES(wo.scheduled_at)} h`,
                  },
                  {
                    label: 'Nueva fecha/hora prevista',
                    value: `${formatDateES(isoTarget)} ${formatTimeES(isoTarget)} h`,
                  },
                  ...(rescheduleReason.trim()
                    ? [{ label: 'Motivo', value: rescheduleReason.trim() }]
                    : []),
                ],
                onConfirm: () => {
                  try {
                    backend.rescheduleWorkOrder({
                      work_order_id: wo.id,
                      scheduled_at: isoTarget,
                      reason: rescheduleReason.trim() || undefined,
                    });
                    notifySuccessGreen(`Parte ${wo.code} reprogramado con éxito.`);
                    setShowRescheduleModal(false);
                    refreshLocal();
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
                onClick={() => setShowRescheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-600">
              Tanto administradores como operarios pueden reprogramar la cita prevista del parte {wo.code} en cualquier momento.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nueva fecha y hora prevista *
              </label>
              <input
                type="datetime-local"
                required
                data-testid="input-reschedule-datetime"
                value={rescheduleDateStr}
                onChange={(e) => setRescheduleDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motivo del cambio (opcional)
              </label>
              <input
                type="text"
                data-testid="input-reschedule-reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Ej. Solicitud del cliente, retraso en obra previa..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-submit-reschedule"
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
