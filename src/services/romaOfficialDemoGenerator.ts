import {
  Article,
  Customer,
  CustomerAddress,
  InstallationReview,
  ReviewOccurrence,
  ReviewType,
  Supplier,
  WorkEntry,
  WorkMaterial,
  WorkOrder,
  WorkOrderAdminData,
  WorkOrderAssignment,
  WorkOrderEvent,
  WorkOrderStatus,
  WorkSession,
} from '../types/domain';
import { DatabaseState } from './seedData';
import { computeWorkOrderContentHash } from '../utils/formatters';
import syncedUserDb from './browserSyncedData.json';

function normalizeText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Genera para la Demo Oficial de Fontanería Roma:
 * - 30 artículos de fontanería distintos con precios de compra y venta normales, asignados a los proveedores de la BD.
 * - 10 revisiones distintas con precios reales, incluyendo la revisión de cambio de ánodo de magnesio de termo.
 * - 30 partes de trabajo para las próximas 4 semanas a distintas horas del día:
 *   - 5 partes de la Universidad de Castilla-La Mancha indicando en qué facultad se realiza.
 *   - 4 partes del cliente Gesyre.
 *   - 21 partes escogiendo de forma aleatoria los clientes introducidos en la base de datos.
 *   - Repartidos en los estados: sin comenzar trabajo (no_iniciado), en curso (en_curso),
 *     finalizado (terminado), cerrado (cerrado), reabierto (reabierto) y archivado (cerrado + archived_at).
 */
export function populateRomaOfficialDemoData(state: DatabaseState): DatabaseState {
  const nowIso = '2026-10-29T11:30:00.000Z';

  // 1. Asegurar usuarios oficiales
  const profiles = [...state.profiles];
  const adminUser = profiles.find((p) => p.role === 'admin' && p.is_active) || profiles[0];
  const adminId = adminUser ? adminUser.id : 'usr-jc-admin';
  const operators = profiles.filter((p) => p.role === 'operario' && p.is_active);
  const operRaulId =
    operators.find((o) => normalizeText(o.full_name).includes('raul'))?.id ||
    operators[0]?.id ||
    adminId;
  const operMarcosId =
    operators.find((o) => normalizeText(o.full_name).includes('marcos'))?.id ||
    operators[1]?.id ||
    operRaulId;

  // 2. Proveedores de la base de datos introducidos por el usuario (excluyendo ficticios de pruebas)
  let suppliers: Supplier[] = (state.suppliers || []).filter(
    (s) => !s.name.includes('[FICTICIO]')
  );
  if (suppliers.length === 0) {
    suppliers = [...(syncedUserDb.suppliers as Supplier[])];
  }

  const pickSupplierId = (index: number): string => {
    return suppliers[index % suppliers.length].id;
  };

  // 3. 30 ARTÍCULOS DE FONTANERÍA DISTINTOS CON PRECIOS NORMALES DE COMPRA Y VENTA
  const plumbingArticlesCatalog: Array<{
    code: string;
    name: string;
    description: string;
    purchase_price_cents: number;
    sale_price_cents: number;
    unit: string;
  }> = [
    {
      code: 'ART-001',
      name: 'Grifo monomando de lavabo caño medio cromado con aireador antical',
      description: 'Grifería monomando con cartucho cerámico 35mm y latiguillos flexibles homologados 3/8"',
      purchase_price_cents: 2250,
      sale_price_cents: 4400,
      unit: 'ud',
    },
    {
      code: 'ART-002',
      name: 'Grifo monomando de ducha cromado con flexo reforzado 1,75m y soporte',
      description: 'Cuerpo de latón cromado con inversor automático y teleducha antical 3 funciones',
      purchase_price_cents: 2800,
      sale_price_cents: 5500,
      unit: 'ud',
    },
    {
      code: 'ART-003',
      name: 'Grifo monomando de fregadero caño alto giratorio 360º',
      description: 'Grifo de cocina en latón cromado con aireador economizador de caudal',
      purchase_price_cents: 2650,
      sale_price_cents: 5200,
      unit: 'ud',
    },
    {
      code: 'ART-004',
      name: 'Grifo termostático de ducha con botón de seguridad a 38ºC',
      description: 'Mezclador termostático antiescaldamiento con filtros colectores y excéntricas',
      purchase_price_cents: 5400,
      sale_price_cents: 9800,
      unit: 'ud',
    },
    {
      code: 'ART-005',
      name: 'Mecanismo descargador de cisterna universal doble pulsador 3/6L',
      description: 'Descargador universal economizador compatible con cisternas de tanque bajo',
      purchase_price_cents: 980,
      sale_price_cents: 2150,
      unit: 'ud',
    },
    {
      code: 'ART-006',
      name: 'Válvula de llenado de cisterna entrada lateral silenciosa',
      description: 'Grifo flotador compacto de cierre rápido con rosca de latón 3/8"',
      purchase_price_cents: 750,
      sale_price_cents: 1650,
      unit: 'ud',
    },
    {
      code: 'ART-007',
      name: 'Latiguillo flexible acero inoxidable trenzado 3/8" H-H 35cm',
      description: 'Flexo de fontanería homologado para agua fría y caliente sanitaria',
      purchase_price_cents: 210,
      sale_price_cents: 550,
      unit: 'ud',
    },
    {
      code: 'ART-008',
      name: 'Latiguillo flexible acero inoxidable trenzado 1/2" H - 3/8" M 40cm',
      description: 'Latiguillo reforzado con racores de latón niquelado y junta EPDM',
      purchase_price_cents: 240,
      sale_price_cents: 620,
      unit: 'ud',
    },
    {
      code: 'ART-009',
      name: 'Llave de corte de escuadra antical 1/2" x 3/8" cuarto de vuelta',
      description: 'Válvula de escuadra con cierre cerámico antical y plafón embellecedor',
      purchase_price_cents: 320,
      sale_price_cents: 790,
      unit: 'ud',
    },
    {
      code: 'ART-010',
      name: 'Sifón botella extensible PVC blanco 1 1/4" para lavabo o bidé',
      description: 'Sifón registrable con vaso desmontable de limpieza y juntas cónicas',
      purchase_price_cents: 410,
      sale_price_cents: 980,
      unit: 'ud',
    },
    {
      code: 'ART-011',
      name: 'Sifón doble de fregadero con toma para lavavajillas 1 1/2"',
      description: 'Conjunto de desagüe orientable en polipropileno blanco con válvulas cestilla',
      purchase_price_cents: 790,
      sale_price_cents: 1750,
      unit: 'ud',
    },
    {
      code: 'ART-012',
      name: 'Bote sifónico registrable PVC 110mm con tapa de acero inoxidable',
      description: 'Bote sifónico de 5 entradas de 40mm y salida de 50mm con cierre hermético',
      purchase_price_cents: 1180,
      sale_price_cents: 2450,
      unit: 'ud',
    },
    {
      code: 'ART-013',
      name: 'Manguito extensible excéntrico de inodoro 90-110mm',
      description: 'Enlace flexible con junta bilabiada para conexión de inodoro a bajante',
      purchase_price_cents: 590,
      sale_price_cents: 1400,
      unit: 'ud',
    },
    {
      code: 'ART-014',
      name: 'Tubería multicapa PE-RT/AL/PE-RT 16x2mm con aislamiento térmico',
      description: 'Tubo multicapa con alma de aluminio soldado a tope y coquilla aislante',
      purchase_price_cents: 185,
      sale_price_cents: 390,
      unit: 'm',
    },
    {
      code: 'ART-015',
      name: 'Tubería multicapa PE-RT/AL/PE-RT 20x2mm con aislamiento térmico',
      description: 'Tubo multicapa aislado para distribución de agua fría, ACS y calefacción',
      purchase_price_cents: 245,
      sale_price_cents: 510,
      unit: 'm',
    },
    {
      code: 'ART-016',
      name: 'Tubería de cobre rígido homologado 15x1mm (barra de 2,5m)',
      description: 'Tubo de cobre bacteriostático según norma UNE-EN 1057 para fontanería y gas',
      purchase_price_cents: 1450,
      sale_price_cents: 2700,
      unit: 'barra',
    },
    {
      code: 'ART-017',
      name: 'Tubería de cobre rígido homologado 18x1mm (barra de 2,5m)',
      description: 'Tubo de cobre rígido para montantes de agua y circuitos de calefacción',
      purchase_price_cents: 1820,
      sale_price_cents: 3350,
      unit: 'barra',
    },
    {
      code: 'ART-018',
      name: 'Tubería de cobre rígido homologado 22x1mm (barra de 2,5m)',
      description: 'Tubo de cobre rígido para colectores generales y salas de calderas',
      purchase_price_cents: 2350,
      sale_price_cents: 4200,
      unit: 'barra',
    },
    {
      code: 'ART-019',
      name: 'Válvula de esfera paso total latón cromado palanca 3/4" H-H',
      description: 'Llave de paso de bola PN25 con prensaestopas y maneta de acero plastificada',
      purchase_price_cents: 620,
      sale_price_cents: 1380,
      unit: 'ud',
    },
    {
      code: 'ART-020',
      name: 'Válvula de esfera paso total latón cromado palanca 1" H-H',
      description: 'Llave de corte general para acometida y montantes comunitarios',
      purchase_price_cents: 940,
      sale_price_cents: 1990,
      unit: 'ud',
    },
    {
      code: 'ART-021',
      name: 'Válvula reductora de presión 3/4" con manómetro 0-10 bar',
      description: 'Regulador de presión de pistón compensado en latón forjado para protección de red',
      purchase_price_cents: 3200,
      sale_price_cents: 6400,
      unit: 'ud',
    },
    {
      code: 'ART-022',
      name: 'Válvula de retención antirretorno en latón 3/4" con muelle inox',
      description: 'Válvula antirretorno universal de obturador guiado y asiento NBR',
      purchase_price_cents: 560,
      sale_price_cents: 1250,
      unit: 'ud',
    },
    {
      code: 'ART-023',
      name: 'Válvula de seguridad por sobrepresión 3 bar 1/2" M-H',
      description: 'Válvula de alivio tarada a 3 bar para calderas y circuitos cerrados',
      purchase_price_cents: 780,
      sale_price_cents: 1750,
      unit: 'ud',
    },
    {
      code: 'ART-024',
      name: 'Ánodo de sacrificio de magnesio M8 rosca 3/4" x 400mm para termo',
      description: 'Ánodo anticorrosión para protección catódica del calderín en termos eléctricos',
      purchase_price_cents: 950,
      sale_price_cents: 2400,
      unit: 'ud',
    },
    {
      code: 'ART-025',
      name: 'Resistencia eléctrica blindada sumergida 1500W con junta para termo',
      description: 'Resistencia de cobre con rosca 1 1/4", vaina portasonda y junta de estanqueidad',
      purchase_price_cents: 1680,
      sale_price_cents: 3600,
      unit: 'ud',
    },
    {
      code: 'ART-026',
      name: 'Termostato bipolar de varilla regulable con rearme 95ºC para termo',
      description: 'Termostato de control y seguridad térmica bipolar de enchufe rápido',
      purchase_price_cents: 1120,
      sale_price_cents: 2500,
      unit: 'ud',
    },
    {
      code: 'ART-027',
      name: 'Termo eléctrico mural vertical/horizontal 80L calderín vitrificado',
      description: 'Termo eléctrico de bajo consumo con aislamiento de poliuretano de alta densidad',
      purchase_price_cents: 11500,
      sale_price_cents: 21000,
      unit: 'ud',
    },
    {
      code: 'ART-028',
      name: 'Vaso de expansión multifunción ACS y calefacción 24 litros 8 bar',
      description: 'Vaso de expansión con membrana recambiable de EPDM alimentario y conexión 3/4"',
      purchase_price_cents: 3400,
      sale_price_cents: 6800,
      unit: 'ud',
    },
    {
      code: 'ART-029',
      name: 'Bomba circuladora electrónica rotor húmedo alta eficiencia ACS/Calefacción',
      description: 'Circulador electrónico con regulación automática de presión diferencial',
      purchase_price_cents: 9400,
      sale_price_cents: 17800,
      unit: 'ud',
    },
    {
      code: 'ART-030',
      name: 'Purgador automático de aire 1/2" en latón con válvula de retención',
      description: 'Purgador vertical de boya para eliminación continua de bolsas de aire en colectores',
      purchase_price_cents: 480,
      sale_price_cents: 1150,
      unit: 'ud',
    },
  ];

  const articles: Article[] = plumbingArticlesCatalog.map((item, idx) => ({
    id: `art-roma-${idx + 1}`,
    code: item.code,
    name: item.name,
    description: item.description,
    supplier_id: pickSupplierId(idx),
    purchase_price_cents: item.purchase_price_cents,
    sale_price_cents: item.sale_price_cents,
    unit: item.unit,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  // 4. CLIENTES DE LA BASE DE DATOS INTRODUCIDOS POR EL USUARIO (excluyendo ficticios de pruebas)
  let customers: Customer[] = (state.customers || []).filter(
    (c) => !c.name.includes('[FICTICIO]')
  );
  let addresses: CustomerAddress[] = (state.customer_addresses || []).filter((a) =>
    customers.some((c) => c.id === a.customer_id)
  );
  if (customers.length === 0) {
    customers = [...(syncedUserDb.customers as Customer[])];
    addresses = [...(syncedUserDb.customer_addresses as CustomerAddress[])];
  }

  // Buscar Universidad de Castilla-La Mancha en la BD del usuario
  let uclm = customers.find((c) => {
    const n = normalizeText(c.name);
    return n.includes('universidad') || n.includes('uclm');
  });

  if (!uclm) {
    uclm = {
      id: 'cust-uclm-roma',
      code: `CLI-${String(customers.length + 1).padStart(4, '0')}`,
      name: 'Universidad de Castilla-La Mancha',
      tax_id: 'Q1318001F',
      contact_name: 'Unidad Técnica de Infraestructuras y Mantenimiento (Campus Ciudad Real)',
      phones: ['+34 926 295 300'],
      emails: ['cau.infraestructuras@uclm.es'],
      main_address: 'Avda. Camilo José Cela s/n (Campus Universitario)',
      postal_code: '13071',
      city: 'Ciudad Real',
      province: 'Ciudad Real',
      notes: 'Cliente institucional UCLM - Campus de Ciudad Real',
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
    customers.push(uclm);
  }

  // Asegurar las 5 Facultades de la UCLM para los 5 partes solicitados
  const uclmFaculties = [
    {
      id: 'addr-uclm-fac-1',
      alias: 'Facultad de Medicina',
      address_line: 'Camino de Moledores s/n — Facultad de Medicina (UCLM)',
      contact_name: 'Conserjería Facultad de Medicina',
      contact_phone: uclm.phones[0] || '+34 926 295 300',
    },
    {
      id: 'addr-uclm-fac-2',
      alias: 'Facultad de Ciencias y Tecnologías Químicas',
      address_line: 'Avda. Camilo José Cela 10 — Facultad de Ciencias y Tecnologías Químicas (UCLM)',
      contact_name: 'Conserjería Facultad de Químicas',
      contact_phone: uclm.phones[0] || '+34 926 295 300',
    },
    {
      id: 'addr-uclm-fac-3',
      alias: 'Facultad de Derecho y Ciencias Sociales',
      address_line: 'Ronda de Toledo 1 — Facultad de Derecho y Ciencias Sociales (UCLM)',
      contact_name: 'Conserjería Facultad de Derecho',
      contact_phone: uclm.phones[0] || '+34 926 295 300',
    },
    {
      id: 'addr-uclm-fac-4',
      alias: 'Facultad de Letras',
      address_line: 'Avda. Camilo José Cela s/n — Facultad de Letras (UCLM)',
      contact_name: 'Conserjería Facultad de Letras',
      contact_phone: uclm.phones[0] || '+34 926 295 300',
    },
    {
      id: 'addr-uclm-fac-5',
      alias: 'Facultad de Educación',
      address_line: 'Ronda de Calatrava 3 — Facultad de Educación (UCLM)',
      contact_name: 'Conserjería Facultad de Educación',
      contact_phone: uclm.phones[0] || '+34 926 295 300',
    },
  ];

  uclmFaculties.forEach((fac) => {
    const existing = addresses.find(
      (a) => a.customer_id === uclm!.id && normalizeText(a.alias) === normalizeText(fac.alias)
    );
    if (!existing) {
      addresses.push({
        id: fac.id,
        customer_id: uclm!.id,
        alias: fac.alias,
        address_line: fac.address_line,
        postal_code: uclm!.postal_code || '13071',
        city: uclm!.city || 'Ciudad Real',
        province: uclm!.province || 'Ciudad Real',
        contact_name: fac.contact_name,
        contact_phone: fac.contact_phone,
        contact_email: uclm!.emails[0] || 'cau@uclm.es',
        notes: `Edificio universitario: ${fac.alias}`,
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  });

  // Buscar cliente Gesyre en la BD del usuario
  let gesyre = customers.find((c) => normalizeText(c.name).includes('gesyre'));
  if (!gesyre) {
    gesyre = {
      id: 'cust-gesyre-roma',
      code: `CLI-${String(customers.length + 1).padStart(4, '0')}`,
      name: 'Gesyre',
      tax_id: 'B13589012',
      contact_name: 'Departamento de Mantenimiento Gesyre',
      phones: ['+34 926 221 144'],
      emails: ['mantenimiento@gesyre.es'],
      main_address: 'Calle Toledo 42',
      postal_code: '13003',
      city: 'Ciudad Real',
      province: 'Ciudad Real',
      notes: 'Cliente Gesyre - Gestión y mantenimiento de inmuebles',
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
    customers.push(gesyre);
  }

  // Asegurar que todos los clientes tengan al menos una dirección activa en customer_addresses
  customers.forEach((c, idx) => {
    const hasAddr = addresses.some((a) => a.customer_id === c.id);
    if (!hasAddr) {
      addresses.push({
        id: `addr-auto-${c.id || idx + 1}`,
        customer_id: c.id,
        alias: 'Dirección Principal',
        address_line: c.main_address || 'Calle Principal s/n',
        postal_code: c.postal_code || '13001',
        city: c.city || 'Ciudad Real',
        province: c.province || 'Ciudad Real',
        contact_name: c.contact_name || c.name,
        contact_phone: c.phones?.[0] || '+34 926 000 000',
        contact_email: c.emails?.[0] || '',
        notes: c.notes || '',
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  });

  // Pool de clientes restantes de la base de datos (excluyendo UCLM y Gesyre) para elegir aleatoriamente en los otros 21 partes
  let otherPool = customers.filter((c) => c.id !== uclm!.id && c.id !== gesyre!.id && c.is_active !== false);
  if (otherPool.length === 0) {
    // Fallback solo si la BD estuviera vacía de otros clientes en un entorno limpio
    const fallbackNames = [
      'Comunidad de Propietarios Ronda del Carmen 14',
      'Restaurante Mesón Octavio',
      'Clínica Dental Alarcos',
      'Residencial Puerta de Toledo',
      'Hotel Guadiana Ciudad Real',
      'Colegio San José Ciudad Real',
      'Supermercados La Mancha S.L.',
      'Talleres Mecánicos Polígono Larache',
      'Gimnasio Quijote Fitness Center',
      'Panadería y Confitería La Plaza',
      'Centro Médico Calatrava',
      'Comunidad de Propietarios Avda. del Rey Santo 8',
      'Asador San Huberto',
      'Farmacia Central Calle Ciruela',
      'Residencia de Mayores Virgen del Prado',
      'Inmobiliaria Centro Mancha',
      'Guardería Infantil Pequeños Pasos',
      'Hostal El Torreón',
      'Comunidad de Propietarios Calle Alarcos 22',
      'Cafetería Las Terreras',
      'Autoescuela Ciudad Real Express',
    ];
    fallbackNames.forEach((fname, idx) => {
      const isMeson = fname === 'Restaurante Mesón Octavio';
      const fc: Customer = {
        id: `cust-roma-fb-${idx + 1}`,
        code: `CLI-${String(customers.length + 1).padStart(4, '0')}`,
        name: fname,
        tax_id: isMeson ? 'B13451299' : `B1300${String(idx + 10).padStart(4, '0')}`,
        contact_name: isMeson ? 'José Antonio García (Gerente)' : `Responsable ${fname}`,
        phones: [`+34 926 21${String(idx + 10).padStart(2, '0')} ${String(idx + 20).padStart(2, '0')}`],
        emails: [`contacto${idx + 1}@cliente-cr.es`],
        main_address: isMeson ? 'Calle Severo Ochoa 6' : `Calle Principal ${idx + 1}`,
        postal_code: isMeson ? '13005' : '13001',
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        notes: 'Cliente registrado en la base de datos',
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      };
      customers.push(fc);
      addresses.push({
        id: `addr-roma-fb-${idx + 1}`,
        customer_id: fc.id,
        alias: 'Dirección Principal',
        address_line: fc.main_address,
        postal_code: fc.postal_code || '13001',
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        contact_name: fc.contact_name || fc.name,
        contact_phone: fc.phones[0],
        contact_email: fc.emails[0],
        notes: '',
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      });
      otherPool.push(fc);
    });
  }

  // Función pseudoaleatoria determinista pero variada para mezclar clientes de la base de datos del usuario
  const shuffledCustomers: Customer[] = [];
  const poolCopy = [...otherPool];
  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  while (shuffledCustomers.length < 25) {
    if (poolCopy.length === 0) {
      poolCopy.push(...otherPool);
    }
    const rIdx = Math.floor(nextRand() * poolCopy.length);
    shuffledCustomers.push(poolCopy.splice(rIdx, 1)[0]);
  }

  const getPrimaryAddressForCustomer = (cust: Customer): CustomerAddress => {
    return (
      addresses.find((a) => a.customer_id === cust.id) || {
        id: `addr-fallback-${cust.id}`,
        customer_id: cust.id,
        alias: 'Dirección Principal',
        address_line: cust.main_address || 'Ciudad Real',
        postal_code: cust.postal_code || '13001',
        city: cust.city || 'Ciudad Real',
        province: cust.province || 'Ciudad Real',
        contact_name: cust.contact_name || cust.name,
        contact_phone: cust.phones?.[0] || '',
        contact_email: cust.emails?.[0] || '',
        notes: '',
        is_active: true,
        created_at: nowIso,
        updated_at: nowIso,
      }
    );
  };

  // 5. 10 REVISIONES DISTINTAS CON PRECIOS MÁS O MENOS REALES
  // (Incluyendo obligatoriamente la revisión de cambio de ánodo de magnesio de termo)
  const reviewTypesCatalog: Array<{
    id: string;
    name: string;
    suggested_price_cents: number;
    periodicity_unit: 'months' | 'years' | 'days';
    periodicity_value: number;
    due_date: string;
    last_date: string;
    notes: string;
    customer: Customer;
    addressId?: string;
  }> = [
    {
      id: 'rt-roma-1',
      name: 'Revisión de cambio de ánodo de magnesio de termo',
      suggested_price_cents: 6500, // 65,00 €
      periodicity_unit: 'months',
      periodicity_value: 12,
      last_date: '2025-11-04',
      due_date: '2026-11-04',
      notes: 'Sustitución preventiva de barra de magnesio 3/4" y limpieza de cal en resistencia de termo eléctrico.',
      customer: uclm,
      addressId: 'addr-uclm-fac-1',
    },
    {
      id: 'rt-roma-2',
      name: 'Revisión anual y mantenimiento de caldera mural de gas',
      suggested_price_cents: 9000, // 90,00 €
      periodicity_unit: 'months',
      periodicity_value: 12,
      last_date: '2025-11-06',
      due_date: '2026-11-06',
      notes: 'Limpieza de quemador, análisis de combustión, vaso de expansión y comprobación de estanqueidad.',
      customer: gesyre,
    },
    {
      id: 'rt-roma-3',
      name: 'Revisión de grupo de presión de agua potable y presostatos',
      suggested_price_cents: 12500, // 125,00 €
      periodicity_unit: 'months',
      periodicity_value: 6,
      last_date: '2026-05-10',
      due_date: '2026-11-10',
      notes: 'Verificación de alternancia de bombas, tarado de presostatos, manómetros y válvula de retención.',
      customer: shuffledCustomers[0],
    },
    {
      id: 'rt-roma-4',
      name: 'Revisión trimestral de sala de calderas y colectores comunitarios',
      suggested_price_cents: 17500, // 175,00 €
      periodicity_unit: 'months',
      periodicity_value: 3,
      last_date: '2026-08-12',
      due_date: '2026-11-12',
      notes: 'Control de bombas circuladoras, válvulas de tres vías motorizadas, purgadores y presiones de llenado.',
      customer: shuffledCustomers[1],
    },
    {
      id: 'rt-roma-5',
      name: 'Revisión de batería de contadores divisionarios y llaves de corte',
      suggested_price_cents: 8500, // 85,00 €
      periodicity_unit: 'months',
      periodicity_value: 12,
      last_date: '2025-11-15',
      due_date: '2026-11-15',
      notes: 'Inspección de juntas en cuarto de contadores, accionamiento de llaves de esfera y válvula antirretorno.',
      customer: shuffledCustomers[2],
    },
    {
      id: 'rt-roma-6',
      name: 'Revisión higiénico-sanitaria y purgado de acumuladores de ACS',
      suggested_price_cents: 14500, // 145,00 €
      periodicity_unit: 'months',
      periodicity_value: 12,
      last_date: '2025-11-18',
      due_date: '2026-11-18',
      notes: 'Vaciado de lodos de fondo, control de temperatura de consigna (>60ºC) y estado de recubrimiento interior.',
      customer: uclm,
      addressId: 'addr-uclm-fac-2',
    },
    {
      id: 'rt-roma-7',
      name: 'Revisión de bombas sumergibles de achique y boyas de nivel en foso',
      suggested_price_cents: 9500, // 95,00 €
      periodicity_unit: 'months',
      periodicity_value: 6,
      last_date: '2026-05-20',
      due_date: '2026-11-20',
      notes: 'Limpieza de pozo de bombeo, prueba de disparo de interruptores de boya y válvula de clapeta.',
      customer: gesyre,
    },
    {
      id: 'rt-roma-8',
      name: 'Revisión de equipo descalcificador y renovación de cartuchos filtrantes',
      suggested_price_cents: 7800, // 78,00 €
      periodicity_unit: 'months',
      periodicity_value: 6,
      last_date: '2026-05-22',
      due_date: '2026-11-22',
      notes: 'Medición de dureza residual en grados franceses, ajuste de cabezal volumétrico y carga de sal.',
      customer: shuffledCustomers[3],
    },
    {
      id: 'rt-roma-9',
      name: 'Revisión preventiva de arquetas sifónicas, sumideros y bajantes',
      suggested_price_cents: 11000, // 110,00 €
      periodicity_unit: 'months',
      periodicity_value: 12,
      last_date: '2025-11-24',
      due_date: '2026-11-24',
      notes: 'Limpieza preventiva con agua a presión de arquetas de paso y verificación de evacuación.',
      customer: shuffledCustomers[4],
    },
    {
      id: 'rt-roma-10',
      name: 'Revisión de válvulas mezcladoras termostáticas y retorno de ACS',
      suggested_price_cents: 8000, // 80,00 €
      periodicity_unit: 'months',
      periodicity_value: 12,
      last_date: '2025-11-26',
      due_date: '2026-11-26',
      notes: 'Comprobación de temperatura de mezcla antiescaldamiento, limpieza de filtros de malla y equilibrado.',
      customer: shuffledCustomers[5],
    },
  ];

  const review_types: ReviewType[] = reviewTypesCatalog.map((rt) => ({
    id: rt.id,
    name: rt.name,
    suggested_price_cents: rt.suggested_price_cents,
    periodicity_unit: rt.periodicity_unit,
    periodicity_value: rt.periodicity_value,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  const installation_reviews: InstallationReview[] = [];
  const review_occurrences: ReviewOccurrence[] = [];

  reviewTypesCatalog.forEach((rt, idx) => {
    const revId = `ir-roma-${idx + 1}`;
    const occId = `ro-roma-${idx + 1}`;
    const addrId = rt.addressId || getPrimaryAddressForCustomer(rt.customer).id;

    installation_reviews.push({
      id: revId,
      customer_id: rt.customer.id,
      customer_address_id: addrId,
      review_type_id: rt.id,
      origin_work_order_id: null,
      last_review_date: rt.last_date,
      next_review_date: rt.due_date,
      status: 'pendiente',
      notes: rt.notes,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    });

    review_occurrences.push({
      id: occId,
      installation_review_id: revId,
      due_date: rt.due_date,
      status: 'pendiente',
      linked_work_order_id: null,
      completed_date: null,
      completed_by: null,
      notes: rt.notes,
      created_at: nowIso,
      updated_at: nowIso,
    });
  });

  // 6. 30 PARTES DE TRABAJO PARA LAS PRÓXIMAS 4 SEMANAS A DISTINTAS HORAS DEL DÍA
  // - 5 partes de Universidad de Castilla-La Mancha indicando la facultad
  // - 4 partes del cliente Gesyre
  // - 21 partes de clientes de la base de datos escogidos de forma aleatoria
  // - Estados incluidos: sin comenzar trabajo (no_iniciado), en curso (en_curso),
  //   finalizado (terminado), cerrado (cerrado), reabierto (reabierto) y archivado (cerrado + archived_at)
  interface PlannedWoSpec {
    seq: number;
    customer: Customer;
    addressId?: string;
    facultyNote?: string;
    planned_work: string;
    scheduled_at: string;
    status: WorkOrderStatus;
    isArchived?: boolean;
    reopenReason?: string;
    notes: string;
    amountCents: number | null;
    operatorIds: string[];
  }

  const woSpecs: PlannedWoSpec[] = [
    // ==================== SEMANA 1 (29 OCT - 4 NOV 2026) ====================
    {
      seq: 1,
      customer: uclm,
      addressId: 'addr-uclm-fac-1',
      facultyNote: 'Facultad de Medicina',
      planned_work:
        '[Facultad de Medicina] Sustitución de ánodo de magnesio y limpieza de calderín en termo eléctrico de 150L de laboratorios docentes.',
      scheduled_at: '2026-10-29T08:00:00.000Z',
      status: 'cerrado',
      isArchived: true,
      notes: 'Intervención en Facultad de Medicina (Planta 1ª). Parte cerrado y archivado tras conformidad.',
      amountCents: 14500,
      operatorIds: [operRaulId],
    },
    {
      seq: 2,
      customer: gesyre,
      planned_work:
        'Reparación de fuga en llave de paso general de 1" y sustitución de latiguillos flexibles en cuarto húmedo.',
      scheduled_at: '2026-10-29T09:30:00.000Z',
      status: 'cerrado',
      isArchived: false,
      notes: 'Aviso gestionado con departamento técnico de Gesyre. Comprobada presión de red a 3,5 bar.',
      amountCents: 11200,
      operatorIds: [operMarcosId],
    },
    {
      seq: 3,
      customer: shuffledCustomers[0],
      planned_work:
        'Desatasco de bote sifónico registrable y sustitución de sifón botella de lavabo con pérdida por junta.',
      scheduled_at: '2026-10-29T11:15:00.000Z',
      status: 'terminado',
      notes: 'Trabajo finalizado y pendiente de cierre administrativo.',
      amountCents: 7800,
      operatorIds: [operRaulId],
    },
    {
      seq: 4,
      customer: shuffledCustomers[1],
      planned_work:
        'Localización y reparación de pérdida de agua caliente en tubería de cobre de 18mm empotrada en baño.',
      scheduled_at: '2026-10-29T13:00:00.000Z',
      status: 'en_curso',
      notes: 'Operarios trabajando en el domicilio con equipo de detección y soldadura capilar.',
      amountCents: 16500,
      operatorIds: [operRaulId, operMarcosId],
    },
    {
      seq: 5,
      customer: shuffledCustomers[2],
      planned_work:
        'Sustitución de grifo monomando de fregadero caño alto y cambio de dos llaves de escuadra antical 1/2"x3/8".',
      scheduled_at: '2026-10-29T16:00:00.000Z',
      status: 'reabierto',
      reopenReason: 'El cliente solicita revisar el ajuste del aireador y un pequeño goteo en la toma del lavavajillas.',
      notes: 'Parte reabierto para repaso técnico en racor de conexión.',
      amountCents: 9600,
      operatorIds: [operMarcosId],
    },
    {
      seq: 6,
      customer: uclm,
      addressId: 'addr-uclm-fac-2',
      facultyNote: 'Facultad de Ciencias y Tecnologías Químicas',
      planned_work:
        '[Facultad de Ciencias y Tecnologías Químicas] Reparación de batería de grifos de laboratorio y sustitución de válvula reductora de presión 3/4".',
      scheduled_at: '2026-10-30T08:30:00.000Z',
      status: 'en_curso',
      notes: 'Actuación en Facultad de Ciencias y Tecnologías Químicas (Laboratorio de Química Inorgánica).',
      amountCents: 21500,
      operatorIds: [operRaulId],
    },
    {
      seq: 7,
      customer: shuffledCustomers[3],
      planned_work:
        'Cambio de mecanismo descargador de doble pulsador 3/6L y válvula de llenado silenciosa en cisterna.',
      scheduled_at: '2026-10-30T10:45:00.000Z',
      status: 'terminado',
      notes: 'Sustitución completada y verificada estanqueidad del depósito.',
      amountCents: 6900,
      operatorIds: [operMarcosId],
    },
    {
      seq: 8,
      customer: shuffledCustomers[4],
      planned_work:
        'Sustitución de bomba circuladora electrónica en circuito de calefacción y purgado completo de radiadores.',
      scheduled_at: '2026-10-30T12:30:00.000Z',
      status: 'cerrado',
      isArchived: true,
      notes: 'Bomba puesta en marcha y regulada por presión diferencial. Parte cerrado y archivado.',
      amountCents: 26500,
      operatorIds: [operRaulId, operMarcosId],
    },
    {
      seq: 9,
      customer: shuffledCustomers[5],
      planned_work:
        'Instalación de termo eléctrico mural de 80L con válvula de seguridad de 3 bar y manguitos electrolíticos.',
      scheduled_at: '2026-11-02T08:15:00.000Z',
      status: 'no_iniciado',
      notes: 'Retirar termo antiguo perforado y dejar instalado nuevo equipo vitrificado.',
      amountCents: 29500,
      operatorIds: [operRaulId],
    },
    {
      seq: 10,
      customer: gesyre,
      planned_work:
        'Desatasco con máquina rotativa en colector general de saneamiento PVC 110mm y limpieza de arqueta sifónica.',
      scheduled_at: '2026-11-02T11:00:00.000Z',
      status: 'en_curso',
      notes: 'Inmueble gestionado por Gesyre. Operario realizando limpieza de arqueta de paso.',
      amountCents: 18000,
      operatorIds: [operMarcosId],
    },
    {
      seq: 11,
      customer: shuffledCustomers[6],
      planned_work:
        'Sustitución de grifo mezclador termostático de ducha con bloqueo a 38ºC y flexo reforzado de 1,75m.',
      scheduled_at: '2026-11-03T09:00:00.000Z',
      status: 'terminado',
      notes: 'Instalación finalizada con comprobación de temperatura y caudal en agua caliente.',
      amountCents: 14200,
      operatorIds: [operRaulId],
    },
    {
      seq: 12,
      customer: shuffledCustomers[7],
      planned_work:
        'Reparación de montante comunitaria en tubería multicapa 20x2mm y sustitución de dos llaves de corte de 1".',
      scheduled_at: '2026-11-03T15:30:00.000Z',
      status: 'cerrado',
      isArchived: false,
      notes: 'Corte de suministro programado de 15:30 a 17:00. Prueba de presión superada.',
      amountCents: 19800,
      operatorIds: [operRaulId, operMarcosId],
    },
    {
      seq: 13,
      customer: uclm,
      addressId: 'addr-uclm-fac-3',
      facultyNote: 'Facultad de Derecho y Ciencias Sociales',
      planned_work:
        '[Facultad de Derecho y Ciencias Sociales] Sustitución de fluxómetros y manguitos excéntricos en aseos de planta baja.',
      scheduled_at: '2026-11-04T08:45:00.000Z',
      status: 'reabierto',
      reopenReason: 'Conserjería de la Facultad de Derecho indica que uno de los pulsadores queda con retorno lento.',
      notes: 'Intervención en Facultad de Derecho y Ciencias Sociales (Aseos principales junto a Salón de Grados).',
      amountCents: 15800,
      operatorIds: [operMarcosId],
    },
    {
      seq: 14,
      customer: shuffledCustomers[8],
      planned_work:
        'Cambio de vaso de expansión de 24L en grupo térmico de ACS y sustitución de purgador automático de 1/2".',
      scheduled_at: '2026-11-04T12:00:00.000Z',
      status: 'cerrado',
      isArchived: true,
      notes: 'Precarga de nitrógeno tarada a 2,0 bar. Trabajo facturado y archivado.',
      amountCents: 13500,
      operatorIds: [operRaulId],
    },

    // ==================== SEMANA 2 (5 NOV - 13 NOV 2026) ====================
    {
      seq: 15,
      customer: shuffledCustomers[9],
      planned_work:
        'Sustitución de sifón doble de fregadero con toma de lavavajillas y sellado perimetral de encimera.',
      scheduled_at: '2026-11-05T09:15:00.000Z',
      status: 'terminado',
      notes: 'Comprobado desagüe a máxima carga sin pérdidas.',
      amountCents: 6500,
      operatorIds: [operMarcosId],
    },
    {
      seq: 16,
      customer: shuffledCustomers[10],
      planned_work:
        'Reparación de válvula de retención antirretorno de 3/4" y ajuste de presostato en grupo de presión.',
      scheduled_at: '2026-11-06T10:00:00.000Z',
      status: 'en_curso',
      notes: 'Comprobando arranque y paro de bombas en sala técnica.',
      amountCents: 11800,
      operatorIds: [operRaulId],
    },
    {
      seq: 17,
      customer: gesyre,
      planned_work:
        'Sustitución de resistencia blindada de 1500W, termostato de varilla y ánodo de magnesio en termo eléctrico.',
      scheduled_at: '2026-11-09T08:30:00.000Z',
      status: 'cerrado',
      isArchived: false,
      notes: 'Vivienda gestionada por Gesyre. Termo reparado y funcionando correctamente.',
      amountCents: 12900,
      operatorIds: [operRaulId],
    },
    {
      seq: 18,
      customer: shuffledCustomers[11],
      planned_work:
        'Cambio de llave de paso general de vivienda 3/4" y sustitución de grifo monomando de lavabo en aseo.',
      scheduled_at: '2026-11-10T11:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Llamar al cliente 20 minutos antes de llegar.',
      amountCents: 9800,
      operatorIds: [operMarcosId],
    },
    {
      seq: 19,
      customer: uclm,
      addressId: 'addr-uclm-fac-4',
      facultyNote: 'Facultad de Letras',
      planned_work:
        '[Facultad de Letras] Reparación de bajante pluvial y sustitución de llave de corte general 1" en aseos de 2ª planta.',
      scheduled_at: '2026-11-11T09:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Actuación programada en Facultad de Letras (avisar en conserjería del edificio a la llegada).',
      amountCents: 17400,
      operatorIds: [operRaulId, operMarcosId],
    },
    {
      seq: 20,
      customer: shuffledCustomers[12],
      planned_work:
        'Revisión de fuga en colector de suelo radiante, cambio de dos detentores y equilibrado de caudales.',
      scheduled_at: '2026-11-12T16:30:00.000Z',
      status: 'reabierto',
      reopenReason: 'El cliente indica que una habitación del fondo tarda más en calentar tras el purgado inicial.',
      notes: 'Reabierto para regular caudalímetro del circuito n.º 4.',
      amountCents: 11000,
      operatorIds: [operRaulId],
    },
    {
      seq: 21,
      customer: shuffledCustomers[13],
      planned_work:
        'Sustitución de manguito excéntrico de inodoro y fijación de taza sanitaria con tornillería inoxidable.',
      scheduled_at: '2026-11-13T10:15:00.000Z',
      status: 'terminado',
      notes: 'Trabajo terminado, sellado sanitario aplicado en base.',
      amountCents: 7400,
      operatorIds: [operMarcosId],
    },

    // ==================== SEMANA 3 (16 NOV - 20 NOV 2026) ====================
    {
      seq: 22,
      customer: shuffledCustomers[14],
      planned_work:
        'Instalación de válvula reductora de presión de 3/4" con manómetro en entrada general por exceso de presión.',
      scheduled_at: '2026-11-16T08:00:00.000Z',
      status: 'no_iniciado',
      notes: 'Tarar presión de salida a 3,0 bar para proteger el termo y los electrodomésticos.',
      amountCents: 13200,
      operatorIds: [operRaulId],
    },
    {
      seq: 23,
      customer: gesyre,
      planned_work:
        'Revisión de batería de contadores divisionarios, cambio de tres válvulas de retención y eliminación de goteo.',
      scheduled_at: '2026-11-17T12:15:00.000Z',
      status: 'no_iniciado',
      notes: 'Comunidad administrada por Gesyre. Recoger llaves de cuarto de contadores en portería.',
      amountCents: 15600,
      operatorIds: [operMarcosId],
    },
    {
      seq: 24,
      customer: shuffledCustomers[15],
      planned_work:
        'Sustitución de tramo de tubería de cobre de 15mm en galería de cocina y montaje de toma para lavadora.',
      scheduled_at: '2026-11-18T09:45:00.000Z',
      status: 'en_curso',
      notes: 'Realizando tendido visto con abrazaderas isofónicas.',
      amountCents: 10800,
      operatorIds: [operRaulId],
    },
    {
      seq: 25,
      customer: shuffledCustomers[16],
      planned_work:
        'Cambio de bote sifónico de PVC 110mm en cuarto de baño principal y conexión de desagües de ducha y lavabo.',
      scheduled_at: '2026-11-19T15:00:00.000Z',
      status: 'cerrado',
      isArchived: false,
      notes: 'Prueba de estanqueidad realizada y firmada por el propietario.',
      amountCents: 14800,
      operatorIds: [operMarcosId],
    },
    {
      seq: 26,
      customer: shuffledCustomers[17],
      planned_work:
        'Sustitución de válvula de seguridad de 3 bar y llenado automático en caldera mural mixta.',
      scheduled_at: '2026-11-20T11:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Comprobar presión en frío del circuito primario a 1,5 bar.',
      amountCents: 8400,
      operatorIds: [operRaulId],
    },

    // ==================== SEMANA 4 (23 NOV - 26 NOV 2026) ====================
    {
      seq: 27,
      customer: uclm,
      addressId: 'addr-uclm-fac-5',
      facultyNote: 'Facultad de Educación',
      planned_work:
        '[Facultad de Educación] Revisión de cambio de ánodo de magnesio en termos de vestuarios del gimnasio y cambio de grifos de ducha.',
      scheduled_at: '2026-11-23T08:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Intervención en Facultad de Educación (Pabellón Polideportivo y Vestuarios).',
      amountCents: 19200,
      operatorIds: [operRaulId, operMarcosId],
    },
    {
      seq: 28,
      customer: shuffledCustomers[18],
      planned_work:
        'Sustitución de grifo monomando de ducha, flexo de acero inoxidable y dos llaves de escuadra cromadas.',
      scheduled_at: '2026-11-24T10:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Cita confirmada con el cliente en horario de mañana.',
      amountCents: 10500,
      operatorIds: [operMarcosId],
    },
    {
      seq: 29,
      customer: shuffledCustomers[19],
      planned_work:
        'Desatasco de fregadero de cocina, limpieza de sifón y sustitución de racores de conexión de 3/8".',
      scheduled_at: '2026-11-25T13:15:00.000Z',
      status: 'no_iniciado',
      notes: 'Evacuación lenta en seno principal de cocina.',
      amountCents: 6800,
      operatorIds: [operRaulId],
    },
    {
      seq: 30,
      customer: shuffledCustomers[20],
      planned_work:
        'Revisión general de instalación de fontanería en local, cambio de purgadores automáticos y llaves de esfera.',
      scheduled_at: '2026-11-26T17:00:00.000Z',
      status: 'no_iniciado',
      notes: 'Intervención a última hora de la tarde al cierre de atención al público.',
      amountCents: 12400,
      operatorIds: [operMarcosId],
    },
  ];

  const work_orders: Omit<WorkOrder, 'admin_data'>[] = [];
  const work_order_admin: WorkOrderAdminData[] = [];
  const work_order_assignments: WorkOrderAssignment[] = [];
  const work_entries: WorkEntry[] = [];
  const work_sessions: WorkSession[] = [];
  const work_materials: WorkMaterial[] = [];
  const work_order_events: WorkOrderEvent[] = [];

  woSpecs.forEach((spec) => {
    const woId = `wo-roma-${spec.seq}`;
    const code = `PT-2026-${String(spec.seq).padStart(4, '0')}`;
    const addr =
      (spec.addressId ? addresses.find((a) => a.id === spec.addressId) : undefined) ||
      getPrimaryAddressForCustomer(spec.customer);

    const addressLineDisplay = spec.facultyNote
      ? `${addr.address_line} (${spec.facultyNote})`
      : addr.address_line || spec.customer.main_address || 'Ciudad Real';

    const isStarted = spec.status !== 'no_iniciado';
    const isFinishedOrClosed = spec.status === 'terminado' || spec.status === 'cerrado';
    const isClosed = spec.status === 'cerrado';

    const newWo: Omit<WorkOrder, 'admin_data'> = {
      id: woId,
      number_seq: spec.seq,
      code,
      version: 1,
      customer_id: spec.customer.id,
      customer_address_id: addr.id,
      snapshot_customer_name: spec.customer.name,
      snapshot_customer_tax_id: spec.customer.tax_id || '',
      snapshot_contact_name:
        addr.contact_name || spec.customer.contact_name || spec.customer.name,
      snapshot_contact_phone:
        addr.contact_phone || spec.customer.phones?.[0] || '+34 926 000 000',
      snapshot_contact_email:
        addr.contact_email || spec.customer.emails?.[0] || '',
      snapshot_address_line: addressLineDisplay,
      snapshot_postal_code: addr.postal_code || spec.customer.postal_code || '13001',
      snapshot_city: addr.city || spec.customer.city || 'Ciudad Real',
      snapshot_province: addr.province || spec.customer.province || 'Ciudad Real',
      planned_work: spec.planned_work,
      scheduled_at: spec.scheduled_at,
      initial_notes: spec.notes,
      origin_review_occurrence_id: null,
      status: spec.status,
      total_amount_cents: spec.amountCents,
      customer_requests_invoice: isFinishedOrClosed ? true : null,
      customer_has_paid: isClosed ? true : spec.status === 'terminado' ? false : null,
      final_observations: isFinishedOrClosed
        ? 'Trabajos de fontanería verificados sin fugas y con presión correcta.'
        : null,
      content_hash: computeWorkOrderContentHash({
        planned_work: spec.planned_work,
        total_amount_cents: spec.amountCents,
        entries: [],
        materials: [],
      }),
      created_by: adminId,
      created_at: nowIso,
      updated_at: nowIso,
      started_at: isStarted ? spec.scheduled_at : null,
      started_by: isStarted ? spec.operatorIds[0] : null,
      finished_at: isFinishedOrClosed
        ? new Date(new Date(spec.scheduled_at).getTime() + 60 * 60 * 1000).toISOString()
        : null,
      finished_by: isFinishedOrClosed ? spec.operatorIds[0] : null,
      closed_at: isClosed
        ? new Date(new Date(spec.scheduled_at).getTime() + 90 * 60 * 1000).toISOString()
        : null,
      closed_by: isClosed ? adminId : null,
      reopened_at: spec.status === 'reabierto' ? nowIso : null,
      reopened_by: spec.status === 'reabierto' ? adminId : null,
      reopen_reason: spec.reopenReason || null,
      archived_at: spec.isArchived
        ? new Date(new Date(spec.scheduled_at).getTime() + 120 * 60 * 1000).toISOString()
        : null,
      archived_by: spec.isArchived ? adminId : null,
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
    };

    work_orders.push(newWo);

    work_order_admin.push({
      work_order_id: woId,
      money_delivered: isClosed,
      money_delivered_at: isClosed ? nowIso : null,
      money_delivered_by: isClosed ? spec.operatorIds[0] : null,
      invoice_issued: isClosed,
      invoice_issued_at: isClosed ? nowIso : null,
      invoice_issued_by: isClosed ? adminId : null,
      invoice_number: isClosed ? `FRA-2026-${String(spec.seq).padStart(4, '0')}` : '',
      admin_notes: spec.facultyNote
        ? `UCLM - ${spec.facultyNote}`
        : `Parte asignado a ${spec.customer.name}`,
      updated_at: nowIso,
    });

    spec.operatorIds.forEach((opId, opIdx) => {
      work_order_assignments.push({
        id: `asg-roma-${spec.seq}-${opIdx + 1}`,
        work_order_id: woId,
        operator_id: opId,
        is_active: true,
        assigned_at: nowIso,
        assigned_by: adminId,
        unassigned_at: null,
        unassigned_by: null,
      });
    });

    if (isStarted) {
      work_entries.push({
        id: `we-roma-${spec.seq}`,
        work_order_id: woId,
        description: `Intervención técnica: ${spec.planned_work}`,
        observations: 'Comprobada estanqueidad de uniones y correcto funcionamiento.',
        created_by: spec.operatorIds[0],
        created_at: spec.scheduled_at,
        updated_at: spec.scheduled_at,
      });

      work_sessions.push({
        id: `ws-roma-${spec.seq}`,
        work_order_id: woId,
        operator_id: spec.operatorIds[0],
        started_at: spec.scheduled_at,
        ended_at: isFinishedOrClosed
          ? new Date(new Date(spec.scheduled_at).getTime() + 60 * 60 * 1000).toISOString()
          : null,
        notes: spec.facultyNote ? `Trabajo en ${spec.facultyNote}` : 'Desplazamiento e intervención técnica',
        created_by: spec.operatorIds[0],
        created_at: spec.scheduled_at,
        updated_at: spec.scheduled_at,
      });
    }

    if (isFinishedOrClosed) {
      const art = articles[(spec.seq - 1) % articles.length];
      work_materials.push({
        id: `wm-roma-${spec.seq}`,
        work_order_id: woId,
        article_id: art.id,
        article_name_snapshot: art.name,
        unit_snapshot: art.unit,
        quantity: 1,
        unit_price_cents: art.sale_price_cents,
        notes: 'Material instalado en la intervención',
        created_by: spec.operatorIds[0],
        created_at: spec.scheduled_at,
        updated_at: spec.scheduled_at,
      });
    }

    work_order_events.push({
      id: `woe-roma-${spec.seq}-1`,
      work_order_id: woId,
      event_type: 'creado',
      from_status: null,
      to_status: 'no_iniciado',
      reason: 'Alta de parte de trabajo',
      actor_id: adminId,
      metadata: { code },
      created_at: nowIso,
    });
  });

  return {
    ...state,
    company_settings: {
      ...state.company_settings,
      work_order_next_seq: 31,
      updated_at: nowIso,
    },
    customers,
    customer_addresses: addresses,
    suppliers,
    articles,
    review_types,
    installation_reviews,
    review_occurrences,
    work_orders,
    work_order_admin,
    work_order_assignments,
    work_entries,
    work_sessions,
    work_materials,
    work_order_events,
  };
}
