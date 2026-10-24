import {
  Article,
  Customer,
  CustomerAddress,
  InstallationReview,
  ReviewOccurrence,
  ReviewType,
  Supplier,
  UserProfile,
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

export function populateCiudadRealDemoData(state: DatabaseState): DatabaseState {
  const nowIso = '2026-10-24T18:00:00.000Z';

  // 1. GARANTIZAR PERFILES DE OPERARIOS PARA ASIGNACIONES
  let profiles = [...state.profiles];
  let passwords = { ...state.passwords };

  if (!profiles.some((p) => p.role === 'admin')) {
    profiles.unshift({
      id: 'usr-admin-1',
      full_name: 'Administración Fontanería Roma',
      dni: '12345678A',
      email: 'admin@climalux-demo.es',
      phone: '+34 600 111 222',
      role: 'admin',
      is_active: true,
      column_preferences: {},
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    });
    passwords['admin@climalux-demo.es'] = 'Admin1234!';
  }

  const existingOper1 = profiles.find((p) => p.email === 'carlos@climalux-demo.es');
  if (!existingOper1) {
    profiles.push({
      id: 'usr-oper-1',
      full_name: 'Carlos Gómez (Oficial 1ª Fontanero)',
      dni: '23456789B',
      email: 'carlos@climalux-demo.es',
      phone: '+34 655 223 344',
      role: 'operario',
      is_active: true,
      column_preferences: {},
      created_at: '2026-01-15T08:00:00.000Z',
      updated_at: '2026-01-15T08:00:00.000Z',
    });
    passwords['carlos@climalux-demo.es'] = 'Oper1234!';
  }

  const existingOper2 = profiles.find((p) => p.email === 'lucia@climalux-demo.es');
  if (!existingOper2) {
    profiles.push({
      id: 'usr-oper-2',
      full_name: 'Lucía Fernández (Técnica Instaladora)',
      dni: '34567890C',
      email: 'lucia@climalux-demo.es',
      phone: '+34 655 445 566',
      role: 'operario',
      is_active: true,
      column_preferences: {},
      created_at: '2026-01-15T08:00:00.000Z',
      updated_at: '2026-01-15T08:00:00.000Z',
    });
    passwords['lucia@climalux-demo.es'] = 'Oper1234!';
  }

  // 2. CLIENTES: UCLM, GESYRE Y CLIENTES EXISTENTES
  let customers = [...state.customers];
  let addresses = [...state.customer_addresses];

  let uclm = customers.find(
    (c) =>
      c.name.toLowerCase().includes('castilla') ||
      c.name.toLowerCase().includes('uclm') ||
      c.name.toLowerCase().includes('universidad')
  );

  if (!uclm) {
    uclm = {
      id: 'cust-uclm-cr',
      code: `CLI-${String(customers.length + 1).padStart(4, '0')}`,
      name: 'Universidad de Castilla-La Mancha (Campus de Ciudad Real)',
      tax_id: 'Q1318001F',
      contact_name: 'Unidad de Gestión de Infraestructuras y Mantenimiento UCLM',
      phones: ['+34 926 295 300', '+34 620 295 101'],
      emails: ['cau@uclm.es', 'infraestructuras.cr@uclm.es'],
      main_address: 'Avda. Camilo José Cela s/n (Campus Universitario)',
      postal_code: '13071',
      city: 'Ciudad Real',
      province: 'Ciudad Real',
      notes: 'Edificios y facultades universitarias del Campus de Ciudad Real. Todas las intervenciones exigen N.º de Ticket CAU.',
      is_active: true,
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    };
    customers.push(uclm);
  }

  // Direcciones UCLM con edificios y facultades reales de Ciudad Real
  const uclmBuildings = [
    {
      alias: 'Escuela Superior de Informática (ESI)',
      address: 'Paseo de la Universidad 4',
      contact: 'Conserjería ESI · Tel: 926 295 300 (Ext. 3700)',
    },
    {
      alias: 'Facultad de Medicina',
      address: 'Camino de Moledores s/n',
      contact: 'Conserjería Medicina · Tel: 926 295 300 (Ext. 6600)',
    },
    {
      alias: 'Edificio Politécnico (Ingenierías)',
      address: 'Avda. Camilo José Cela s/n',
      contact: 'Mantenimiento Politécnico · Tel: 926 295 300 (Ext. 3200)',
    },
    {
      alias: 'Facultad de Ciencias y Tecnologías Químicas',
      address: 'Avda. Camilo José Cela 10',
      contact: 'Conserjería Químicas · Tel: 926 295 300 (Ext. 3400)',
    },
    {
      alias: 'Paraninfo Luis Arroyo',
      address: 'Ronda de Toledo s/n',
      contact: 'Recepción Paraninfo · Tel: 926 295 300 (Ext. 3120)',
    },
    {
      alias: 'Facultad de Derecho y Ciencias Sociales',
      address: 'Ronda de Toledo 1',
      contact: 'Conserjería Derecho · Tel: 926 295 300 (Ext. 3500)',
    },
    {
      alias: 'Biblioteca General del Campus',
      address: 'Avda. Camilo José Cela s/n',
      contact: 'Mostrador Biblioteca · Tel: 926 295 300 (Ext. 3900)',
    },
    {
      alias: 'Edificio Francisco Javier de Moya (Servicios Generales)',
      address: 'Calle Altagracia 50',
      contact: 'Coordinador Infraestructuras · Tel: 926 295 300 (Ext. 3001)',
    },
  ];

  const uclmAddressIds: string[] = [];
  uclmBuildings.forEach((b, idx) => {
    let addr = addresses.find((a) => a.customer_id === uclm!.id && a.alias === b.alias);
    if (!addr) {
      addr = {
        id: `addr-uclm-${idx + 1}`,
        customer_id: uclm!.id,
        alias: b.alias,
        address_line: b.address,
        postal_code: '13071',
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        contact_name: b.contact,
        contact_phone: '+34 926 295 300',
        contact_email: 'cau@uclm.es',
        notes: `Intervención en ${b.alias}. Registrarse en conserjería del edificio.`,
        is_active: true,
        created_at: '2026-01-10T08:00:00.000Z',
        updated_at: '2026-01-10T08:00:00.000Z',
      };
      addresses.push(addr);
    }
    uclmAddressIds.push(addr.id);
  });

  // Cliente Gesyre
  let gesyre = customers.find((c) => c.name.toLowerCase().includes('gesyre'));
  if (!gesyre) {
    gesyre = {
      id: 'cust-gesyre-cr',
      code: `CLI-${String(customers.length + 1).padStart(4, '0')}`,
      name: 'Gesyre Mancha S.L.',
      tax_id: 'B13589012',
      contact_name: 'D. Antonio Morales (Gestión de Inmuebles)',
      phones: ['+34 926 221 144', '+34 620 445 566'],
      emails: ['administracion@gesyre-mancha.es', 'mantenimiento@gesyre-mancha.es'],
      main_address: 'Calle Toledo 42, Edificio Empresarial',
      postal_code: '13003',
      city: 'Ciudad Real',
      province: 'Ciudad Real',
      notes: 'Sociedad de gestión de inmuebles, locales comerciales y comunidades en Ciudad Real.',
      is_active: true,
      created_at: '2026-01-15T08:00:00.000Z',
      updated_at: '2026-01-15T08:00:00.000Z',
    };
    customers.push(gesyre);
  }

  const gesyreBuildings = [
    {
      alias: 'Oficinas Centrales Gesyre y Locales Comerciales',
      address: 'Calle Toledo 42',
      contact: 'Antonio Morales · Tel: 926 221 144',
    },
    {
      alias: 'Comunidad Residencial Puerta de Santa María',
      address: 'Calle Santa María del Prado 8',
      contact: 'Conserje Puerta Santa María · Tel: 620 445 566',
    },
    {
      alias: 'Local Comercial Restauración Plaza Mayor',
      address: 'Plaza Mayor 14',
      contact: 'Encargado Local · Tel: 926 211 890',
    },
  ];

  const gesyreAddressIds: string[] = [];
  gesyreBuildings.forEach((b, idx) => {
    let addr = addresses.find((a) => a.customer_id === gesyre!.id && a.alias === b.alias);
    if (!addr) {
      addr = {
        id: `addr-gesyre-${idx + 1}`,
        customer_id: gesyre!.id,
        alias: b.alias,
        address_line: b.address,
        postal_code: '13003',
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        contact_name: b.contact,
        contact_phone: '+34 926 221 144',
        contact_email: 'mantenimiento@gesyre-mancha.es',
        notes: `Inmueble gestionado por Gesyre en ${b.address}`,
        is_active: true,
        created_at: '2026-01-15T08:00:00.000Z',
        updated_at: '2026-01-15T08:00:00.000Z',
      };
      addresses.push(addr);
    }
    gesyreAddressIds.push(addr.id);
  });

  // 3. PROVEEDORES DE FONTANERÍA
  let suppliers = [...state.suppliers];
  if (suppliers.length === 0) {
    suppliers = [
      {
        id: 'sup-1',
        name: 'Suministros Hidráulicos y Fontanería Manchega S.L.',
        tax_id: 'B13445566',
        contact_person: 'Vicente Muñoz (Comercial)',
        phone: '+34 926 251 122',
        email: 'pedidos@fontaneriamanchega.es',
        address: 'Polígono Industrial Avanzado, Calle Gutenberg 14',
        postal_code: '13005',
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        notes: 'Proveedor principal de tubería, valvulería, desagües y material de fontanería general.',
        is_active: true,
        created_at: '2026-01-10T08:00:00.000Z',
        updated_at: '2026-01-10T08:00:00.000Z',
      },
      {
        id: 'sup-2',
        name: 'Salvador Escoda S.A. - Delegación La Mancha',
        tax_id: 'A08250000',
        contact_person: 'Javier Ramos (Ventas)',
        phone: '+34 926 273 000',
        email: 'ciudadreal@salvadorescoda.com',
        address: 'Calle Industria 8, Polígono Larache',
        postal_code: '13005',
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        notes: 'Distribuidor oficial termos eléctricos, ánodos de magnesio, grifería y sanitarios.',
        is_active: true,
        created_at: '2026-01-10T08:00:00.000Z',
        updated_at: '2026-01-10T08:00:00.000Z',
      },
      {
        id: 'sup-3',
        name: 'Distribuciones Térmicas y Clima Ciudad Real S.L.',
        tax_id: 'B13998877',
        contact_person: 'Elena Santos',
        phone: '+34 926 214 567',
        email: 'repuestos@climaciudadreal.es',
        address: 'Carretera de Fuensanta km 1',
        postal_code: '13004',
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        notes: 'Especialistas en repuestos de calderas, bombas circuladoras y grupos de presión.',
        is_active: true,
        created_at: '2026-01-10T08:00:00.000Z',
        updated_at: '2026-01-10T08:00:00.000Z',
      },
    ];
  }

  // 4. 25 ARTÍCULOS DE FONTANERÍA
  const plumbingCatalog = [
    {
      code: 'MAT-001',
      name: 'Grifo monomando lavabo caño medio cromado con aireador antical',
      description: 'Grifería monomando con cartucho cerámico 35mm y latiguillos flexibles homologados 3/8"',
      purchase: 2200,
      sale: 4500,
      unit: 'ud',
      supplier_id: suppliers[1]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-002',
      name: 'Grifo monomando ducha con flexo 1,75m y soporte mural',
      description: 'Cuerpo de latón cromado con inversor cerámico y mango de ducha antical 3 posiciones',
      purchase: 2850,
      sale: 5800,
      unit: 'ud',
      supplier_id: suppliers[1]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-003',
      name: 'Lavabo mural de porcelana vitrificada blanca 60x45cm',
      description: 'Lavabo con orificio central para grifería y rebosadero para fijación con varillas',
      purchase: 3400,
      sale: 6900,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-004',
      name: 'Inodoro completo salida vertical con cisterna economizadora',
      description: 'Taza con juego de fijación, cisterna 3/6 litros y asiento termoestable con caída amortiguada',
      purchase: 8900,
      sale: 16500,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-005',
      name: 'Mecanismo descargador cisterna universal doble pulsador',
      description: 'Descargador universal de pulsador interrumpible compatible con cisternas Roca y estándar',
      purchase: 950,
      sale: 2200,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-006',
      name: 'Grifo mezclador termostático ducha con bloqueo a 38ºC',
      description: 'Termostato antiescaldamiento con sistema CoolTouch y conexiones excéntricas de latón',
      purchase: 5200,
      sale: 9800,
      unit: 'ud',
      supplier_id: suppliers[1]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-007',
      name: 'Desagüe sifónico botella extensible PVC blanco 1 1/4" - 1 1/2"',
      description: 'Sifón curvo extensible de fácil limpieza con juntas labiadas cónicas estancas',
      purchase: 420,
      sale: 1100,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-008',
      name: 'Válvula de corte de escuadra antical 1/2" x 3/8"',
      description: 'Llave de escuadra cierre 1/4 vuelta antical con plafón embellecedor de acero',
      purchase: 310,
      sale: 850,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-009',
      name: 'Flexo de conexión acero inoxidable flexible 3/8" H-H 350mm',
      description: 'Latiguillo de fontanería trenzado de acero inoxidable para conexión de agua fría y caliente',
      purchase: 220,
      sale: 600,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-010',
      name: 'Bote sifónico registrable 110mm PVC con tapa acero inoxidable',
      description: 'Bote sifónico de 5 entradas 40mm y salida 50mm con tornillo central de apriete estanco',
      purchase: 1250,
      sale: 2600,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-011',
      name: 'Manguito extensible elástico inodoro toma 90-110mm',
      description: 'Manguito elástico de EVA con junta bilabiada para acometida de desagüe inodoro a bajante',
      purchase: 580,
      sale: 1450,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-012',
      name: 'Tubería multicapa aislada PE-RT/AL/PE-RT 16x2mm (rollo 50m)',
      description: 'Tubería multicapa corrugada de aluminio continuo con coquilla térmica para agua y calefacción',
      purchase: 4800,
      sale: 8900,
      unit: 'rollo',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-013',
      name: 'Tubería de cobre rígido homologado 15mm espesor 1mm (barra 2,5m)',
      description: 'Tubo de cobre desoxidado al fósforo Cu-DHP según norma UNE-EN 1057',
      purchase: 1450,
      sale: 2650,
      unit: 'barra',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-014',
      name: 'Tubería de cobre rígido homologado 18mm espesor 1mm (barra 2,5m)',
      description: 'Tubo de cobre de alta resistencia para montantes de distribución y calefacción',
      purchase: 1820,
      sale: 3250,
      unit: 'barra',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-015',
      name: 'Tubería de cobre rígido homologado 22mm espesor 1mm (barra 2,5m)',
      description: 'Tubo de cobre para colectores principales y circuitos generales de sala térmica',
      purchase: 2350,
      sale: 4100,
      unit: 'barra',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-016',
      name: 'Válvula de esfera palanca acero 3/4" H-H paso total para agua',
      description: 'Llave de bola en latón forjado cromado con maneta ergonómica plastificada',
      purchase: 590,
      sale: 1350,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-017',
      name: 'Válvula de esfera palanca acero 1" H-H paso total para agua',
      description: 'Llave de corte general para acometida con asiento de teflón PTFE de alta estanqueidad',
      purchase: 890,
      sale: 1950,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
    {
      code: 'MAT-018',
      name: 'Válvula reductora de presión latón 3/4" con manómetro de control',
      description: 'Regulador de presión de membrana compensada con escala de ajuste de 1 a 6 bar',
      purchase: 3100,
      sale: 6400,
      unit: 'ud',
      supplier_id: suppliers[2]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-019',
      name: 'Válvula de seguridad de sobrepresión 3 bar 1/2" M-H',
      description: 'Válvula de escape tarada a 3 bar para circuitos cerrados de calefacción y termos',
      purchase: 780,
      sale: 1750,
      unit: 'ud',
      supplier_id: suppliers[2]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-020',
      name: 'Ánodo de sacrificio de magnesio M8 rosca 3/4" x 400mm',
      description: 'Barra de ánodo de magnesio para protección galvánica contra corrosión en termos eléctricos',
      purchase: 920,
      sale: 2400,
      unit: 'ud',
      supplier_id: suppliers[1]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-021',
      name: 'Resistencia blindada de cobre sumergida 1500W para termo eléctrico',
      description: 'Elemento calefactor de repuesto con rosca 1 1/4" y vaina portasondas para termostato',
      purchase: 1650,
      sale: 3600,
      unit: 'ud',
      supplier_id: suppliers[1]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-022',
      name: 'Termostato varilla regulable rearme bipolar para termo eléctrico',
      description: 'Termostato de control con corte térmico de emergencia a 95ºC según normativa CE',
      purchase: 1100,
      sale: 2500,
      unit: 'ud',
      supplier_id: suppliers[1]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-023',
      name: 'Bomba circuladora electrónica calefacción y ACS alta eficiencia',
      description: 'Circulador de rotor húmedo con regulación por presión proporcional y display de consumo',
      purchase: 9200,
      sale: 17500,
      unit: 'ud',
      supplier_id: suppliers[2]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-024',
      name: 'Purgador automático de aire 1/2" latón niquelado con válvula',
      description: 'Desaireador automático vertical con boya de polipropileno y tapón de higroexpansión',
      purchase: 460,
      sale: 1150,
      unit: 'ud',
      supplier_id: suppliers[2]?.id || suppliers[0].id,
    },
    {
      code: 'MAT-025',
      name: 'Sifón registrable fregadero doble seno con tomas lavavajillas',
      description: 'Conjunto de tuberías de desagüe de polipropileno blanco con doble toma de electrodoméstico',
      purchase: 780,
      sale: 1800,
      unit: 'ud',
      supplier_id: suppliers[0].id,
    },
  ];

  let articles: Article[] = [...state.articles];
  plumbingCatalog.forEach((art, idx) => {
    let existing = articles.find((a) => a.code === art.code);
    if (!existing) {
      articles.push({
        id: `art-font-${idx + 1}`,
        code: art.code,
        name: art.name,
        description: art.description,
        supplier_id: art.supplier_id,
        purchase_price_cents: art.purchase,
        sale_price_cents: art.sale,
        unit: art.unit,
        is_active: true,
        created_at: '2026-01-10T08:00:00.000Z',
        updated_at: '2026-01-10T08:00:00.000Z',
      });
    }
  });

  // 5. TIPOS DE REVISIÓN
  const reviewTypes: ReviewType[] = [
    {
      id: 'rt-caldera',
      name: 'Revisión y Mantenimiento Periódico de Caldera y Circuito Térmico',
      suggested_price_cents: 14000,
      periodicity_unit: 'months',
      periodicity_value: 12,
      is_active: true,
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 'rt-anodo',
      name: 'Revisión y Cambio de Ánodo de Magnesio en Termo Eléctrico',
      suggested_price_cents: 6800,
      periodicity_unit: 'months',
      periodicity_value: 24,
      is_active: true,
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 'rt-fontaneria',
      name: 'Revisión Periódica de Redes de Fontanería y Grupo de Presión',
      suggested_price_cents: 16000,
      periodicity_unit: 'months',
      periodicity_value: 12,
      is_active: true,
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    },
    {
      id: 'rt-contadores',
      name: 'Revisión de Batería de Contadores, Válvulas y Retención de Agua',
      suggested_price_cents: 9500,
      periodicity_unit: 'months',
      periodicity_value: 12,
      is_active: true,
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    },
  ];

  // 6. 20 REVISIONES CON ÁNODOS Y CALDERAS
  const reviewDefinitions = [
    // UCLM Ánodos de magnesio en termos
    {
      cid: uclm.id,
      aid: uclmAddressIds[0],
      rt: 'rt-anodo',
      desc: 'Termo eléctrico 150L vestuarios ESI',
      last: '2024-11-05',
      next: '2026-11-05',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[1],
      rt: 'rt-anodo',
      desc: 'Termo 100L laboratorio de investigación Medicina',
      last: '2024-10-29',
      next: '2026-10-29',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[2],
      rt: 'rt-anodo',
      desc: 'Termo 200L cocina-cafetería Edificio Politécnico',
      last: '2024-11-12',
      next: '2026-11-12',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[3],
      rt: 'rt-anodo',
      desc: 'Termo 80L aseos planta baja Químicas',
      last: '2024-11-20',
      next: '2026-11-20',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[4],
      rt: 'rt-anodo',
      desc: 'Termo 100L vestuarios de personal Paraninfo Luis Arroyo',
      last: '2024-10-31',
      next: '2026-10-31',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[7],
      rt: 'rt-anodo',
      desc: 'Termo 80L taller de servicios generales Francisco Javier de Moya',
      last: '2024-11-15',
      next: '2026-11-15',
      status: 'pendiente',
    },
    // Gesyre Ánodos de magnesio
    {
      cid: gesyre.id,
      aid: gesyreAddressIds[0],
      rt: 'rt-anodo',
      desc: 'Termo 80L aseos oficinas Gesyre Calle Toledo 42',
      last: '2024-10-27',
      next: '2026-10-27',
      status: 'pendiente',
    },
    {
      cid: gesyre.id,
      aid: gesyreAddressIds[1],
      rt: 'rt-anodo',
      desc: 'Termo eléctrico 100L vivienda alquiler Santa María 8',
      last: '2024-11-08',
      next: '2026-11-08',
      status: 'pendiente',
    },

    // UCLM Revisiones de caldera
    {
      cid: uclm.id,
      aid: uclmAddressIds[0],
      rt: 'rt-caldera',
      desc: 'Sala técnica de calderas ESI - Generador modular gas',
      last: '2025-10-28',
      next: '2026-10-28',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[1],
      rt: 'rt-caldera',
      desc: 'Sala de calderas Facultad de Medicina - 2 calderas en cascada',
      last: '2025-11-02',
      next: '2026-11-02',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[2],
      rt: 'rt-caldera',
      desc: 'Sala de calefacción central Edificio Politécnico',
      last: '2025-11-10',
      next: '2026-11-10',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[3],
      rt: 'rt-caldera',
      desc: 'Sala térmica de calderas Ciencias Químicas',
      last: '2025-10-30',
      next: '2026-10-30',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[4],
      rt: 'rt-caldera',
      desc: 'Caldera de climatización Paraninfo Luis Arroyo',
      last: '2025-11-04',
      next: '2026-11-04',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[5],
      rt: 'rt-caldera',
      desc: 'Sala de calderas Facultad de Derecho y CC. Sociales',
      last: '2025-11-18',
      next: '2026-11-18',
      status: 'pendiente',
    },
    // Gesyre Revisiones de caldera
    {
      cid: gesyre.id,
      aid: gesyreAddressIds[0],
      rt: 'rt-caldera',
      desc: 'Caldera mural mixta gas oficinas Gesyre Calle Toledo',
      last: '2025-10-29',
      next: '2026-10-29',
      status: 'pendiente',
    },
    {
      cid: gesyre.id,
      aid: gesyreAddressIds[1],
      rt: 'rt-caldera',
      desc: 'Sala de calderas comunitaria Residencial Puerta Santa María 8',
      last: '2025-11-03',
      next: '2026-11-03',
      status: 'pendiente',
    },
    {
      cid: gesyre.id,
      aid: gesyreAddressIds[2],
      rt: 'rt-caldera',
      desc: 'Caldera mural estanca local comercial Plaza Mayor 14',
      last: '2025-11-22',
      next: '2026-11-22',
      status: 'pendiente',
    },

    // Redes de fontanería y grupos de presión
    {
      cid: uclm.id,
      aid: uclmAddressIds[2],
      rt: 'rt-fontaneria',
      desc: 'Grupo de presión de agua potable Edificio Politécnico',
      last: '2025-11-06',
      next: '2026-11-06',
      status: 'pendiente',
    },
    {
      cid: uclm.id,
      aid: uclmAddressIds[6],
      rt: 'rt-fontaneria',
      desc: 'Red general de distribución de agua y aljibe Biblioteca General',
      last: '2025-11-14',
      next: '2026-11-14',
      status: 'pendiente',
    },
    {
      cid: gesyre.id,
      aid: gesyreAddressIds[1],
      rt: 'rt-contadores',
      desc: 'Batería de 32 contadores divisionarios Residencial Santa María',
      last: '2025-11-09',
      next: '2026-11-09',
      status: 'pendiente',
    },
  ];

  let installation_reviews: InstallationReview[] = [];
  let review_occurrences: ReviewOccurrence[] = [];

  reviewDefinitions.forEach((def, idx) => {
    const revId = `rev-font-${idx + 1}`;
    const occId = `ro-font-${idx + 1}`;
    installation_reviews.push({
      id: revId,
      customer_id: def.cid,
      customer_address_id: def.aid,
      review_type_id: def.rt,
      last_review_date: def.last,
      next_review_date: def.next,
      status: 'pendiente',
      notes: def.desc,
      origin_work_order_id: null,
      is_active: true,
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    });

    review_occurrences.push({
      id: occId,
      installation_review_id: revId,
      due_date: def.next,
      status: 'pendiente',
      linked_work_order_id: null,
      completed_date: null,
      completed_by: null,
      notes: 'Vencimiento registrado para aviso previo y orden técnica.',
      created_at: '2026-01-10T08:00:00.000Z',
      updated_at: '2026-01-10T08:00:00.000Z',
    });
  });

  // 7. 25 PARTES DE TRABAJO (SEMANA PRÓXIMA 26 OCT - 1 NOV Y SIGUIENTE 2 NOV - 8 NOV 2026)
  // Estados requeridos: no_iniciado, en_curso, reabierto, terminado, cerrado
  const operators = profiles.filter((p) => p.role === 'operario');
  const oper1Id = operators[0]?.id || profiles[0].id;
  const oper2Id = operators[1]?.id || profiles[0].id;

  const workOrderDataList: Array<{
    seq: number;
    customer: Customer;
    addressId: string;
    planned_work: string;
    scheduled_at: string;
    status: WorkOrderStatus;
    notes: string;
    cau: string;
    buildingName: string;
    operatorIds: string[];
    reopenedReason?: string;
    totalAmountCents?: number;
    closedAt?: string;
  }> = [
    // --- SEMANA PRÓXIMA (26 OCT - 30 OCT 2026) ---
    // 1. UCLM ESI - En curso - Lunes 26 Oct 08:30
    {
      seq: 1,
      customer: uclm,
      addressId: uclmAddressIds[0],
      planned_work: 'Reparación de fuga en batería de lavabos aseo planta baja y sustitución de latiguillos flexibles.',
      scheduled_at: '2026-10-26T08:30:00.000Z',
      status: 'en_curso',
      notes: 'Aviso urgente de conserjería. Cortada llave de escuadra temporalmente.',
      cau: 'CAU-UCLM-2026-8491',
      buildingName: 'Escuela Superior de Informática (ESI) — Planta Baja, Aseo Alumnos',
      operatorIds: [oper1Id],
    },
    // 2. UCLM Medicina - En curso - Lunes 26 Oct 11:30
    {
      seq: 2,
      customer: uclm,
      addressId: uclmAddressIds[1],
      planned_work: 'Revisión y cambio de ánodo de magnesio 3/4" en termo eléctrico de 100L en laboratorio de prácticas.',
      scheduled_at: '2026-10-26T11:30:00.000Z',
      status: 'en_curso',
      notes: 'Descalcificar fondo de calderín y comprobar estanqueidad de brida con nueva junta.',
      cau: 'CAU-UCLM-2026-8494',
      buildingName: 'Facultad de Medicina — Laboratorio de Fisiología, Planta 1ª',
      operatorIds: [oper2Id],
    },
    // 3. UCLM Politécnico - Reabierto - Lunes 26 Oct 15:30
    {
      seq: 3,
      customer: uclm,
      addressId: uclmAddressIds[2],
      planned_work: 'Sustitución de mecanismo descargador de cisterna y flotador en aseos de personal docente.',
      scheduled_at: '2026-10-26T15:30:00.000Z',
      status: 'reabierto',
      reopenedReason: 'El operario cerró el trabajo pero la cisterna sigue perdiendo un hilo continuo de agua por la junta de cierre inferior.',
      notes: 'Revisado por conserjería tras la marcha del técnico. Requiere comprobar asiento de porcelana.',
      cau: 'CAU-UCLM-2026-8498',
      buildingName: 'Edificio Politécnico — Despachos Departamento Mecánica, Planta 2ª',
      operatorIds: [oper1Id],
    },
    // 4. Gesyre - Cerrado - Martes 27 Oct 09:00
    {
      seq: 4,
      customer: gesyre,
      addressId: gesyreAddressIds[0],
      planned_work: 'Sustitución de grifo monomando de lavabo y comprobación de presión en aseos de oficina central.',
      scheduled_at: '2026-10-27T09:00:00.000Z',
      status: 'cerrado',
      notes: 'Facturar según tarifa concertada con Gesyre. Firma del gestor D. Antonio Morales recogida.',
      cau: 'INC-GESYRE-2026-041',
      buildingName: 'Oficinas Centrales Gesyre — Calle Toledo 42, Planta 1ª',
      operatorIds: [oper1Id],
      totalAmountCents: 8500,
      closedAt: '2026-10-27T10:45:00.000Z',
    },
    // 5. UCLM Químicas - Terminado - Martes 27 Oct 12:00
    {
      seq: 5,
      customer: uclm,
      addressId: uclmAddressIds[3],
      planned_work: 'Desatasco de bote sifónico y tubería de desagüe de fregadero de laboratorio químico.',
      scheduled_at: '2026-10-27T12:00:00.000Z',
      status: 'terminado',
      notes: 'Desatascado mediante máquina de muelle espiral. Limpieza de residuos inertes completada.',
      cau: 'CAU-UCLM-2026-8503',
      buildingName: 'Facultad de Ciencias y Tecnologías Químicas — Laboratorio Química Analítica 204',
      operatorIds: [oper2Id],
      totalAmountCents: 11000,
    },
    // 6. UCLM Paraninfo - En curso - Martes 27 Oct 16:15
    {
      seq: 6,
      customer: uclm,
      addressId: uclmAddressIds[4],
      planned_work: 'Mantenimiento preventivo de válvulas de corte y reductora de presión en sala de contadores.',
      scheduled_at: '2026-10-27T16:15:00.000Z',
      status: 'en_curso',
      notes: 'Comprobación de presión estática a 3,5 bar antes del acto de apertura de curso.',
      cau: 'CAU-UCLM-2026-8508',
      buildingName: 'Paraninfo Luis Arroyo — Galería de Acometidas de Agua y Vestuarios',
      operatorIds: [oper1Id, oper2Id],
    },
    // 7. UCLM Derecho - Cerrado - Miércoles 28 Oct 08:45
    {
      seq: 7,
      customer: uclm,
      addressId: uclmAddressIds[5],
      planned_work: 'Sustitución de manguito de inodoro elástico y fijación de taza en aseos de alumnos.',
      scheduled_at: '2026-10-28T08:45:00.000Z',
      status: 'cerrado',
      notes: 'Sellado perimetral con silicona sanitaria antimoho blanca.',
      cau: 'CAU-UCLM-2026-8512',
      buildingName: 'Facultad de Derecho y Ciencias Sociales — Aseos Ala Norte, Planta Baja',
      operatorIds: [oper1Id],
      totalAmountCents: 9400,
      closedAt: '2026-10-28T10:30:00.000Z',
    },
    // 8. UCLM Biblioteca - Terminado - Miércoles 28 Oct 11:15
    {
      seq: 8,
      customer: uclm,
      addressId: uclmAddressIds[6],
      planned_work: 'Instalación de grifo temporizado en urinarios y sustitución de juntas de desagüe.',
      scheduled_at: '2026-10-28T11:15:00.000Z',
      status: 'terminado',
      notes: 'Regulación del caudal y tiempo de descarga a 6 segundos para ahorro de agua.',
      cau: 'CAU-UCLM-2026-8516',
      buildingName: 'Biblioteca General del Campus — Planta 1ª, Aseos Lectores',
      operatorIds: [oper2Id],
      totalAmountCents: 12500,
    },
    // 9. UCLM Servicios Generales - Reabierto - Miércoles 28 Oct 15:45
    {
      seq: 9,
      customer: uclm,
      addressId: uclmAddressIds[7],
      planned_work: 'Purgado y equilibrado de purgadores automáticos de aire en circuito de calefacción.',
      scheduled_at: '2026-10-28T15:45:00.000Z',
      status: 'reabierto',
      reopenedReason: 'Aparece goteo continuo en el purgador del tramo final y la presión del circuito ha bajado a 0,8 bar.',
      notes: 'Revisar apriete del asiento cónico y reponer presión a 1,5 bar en frío.',
      cau: 'CAU-UCLM-2026-8521',
      buildingName: 'Edificio Francisco Javier de Moya — Sala Térmica y Archivo General',
      operatorIds: [oper1Id],
    },
    // 10. Gesyre - En curso - Jueves 29 Oct 09:30
    {
      seq: 10,
      customer: gesyre,
      addressId: gesyreAddressIds[1],
      planned_work: 'Localización de humedad en falso techo y sustitución de codo de desagüe de bajante comunitaria.',
      scheduled_at: '2026-10-29T09:30:00.000Z',
      status: 'en_curso',
      notes: 'Coordinado con el seguro de la comunidad. Acceso acordado con vecinos de letra B.',
      cau: 'INC-GESYRE-2026-048',
      buildingName: 'Comunidad Residencial Puerta de Santa María — Calle Santa María del Prado 8, Portal 2',
      operatorIds: [oper1Id, oper2Id],
    },
    // 11. UCLM ESI - Terminado - Jueves 29 Oct 12:30
    {
      seq: 11,
      customer: uclm,
      addressId: uclmAddressIds[0],
      planned_work: 'Revisión y cambio de ánodo de magnesio 3/4" x 400mm en termo de vestuarios de conserjería.',
      scheduled_at: '2026-10-29T12:30:00.000Z',
      status: 'terminado',
      notes: 'El ánodo anterior presentaba desgaste del 90%. Instalado ánodo nuevo con teflón en rosca.',
      cau: 'CAU-UCLM-2026-8525',
      buildingName: 'Escuela Superior de Informática (ESI) — Cuarto de Instalaciones y Vestuarios',
      operatorIds: [oper2Id],
      totalAmountCents: 7500,
    },
    // 12. UCLM Medicina - Cerrado - Jueves 29 Oct 16:00
    {
      seq: 12,
      customer: uclm,
      addressId: uclmAddressIds[1],
      planned_work: 'Reparación de válvula de retención y purga de bomba circuladora de agua caliente sanitaria.',
      scheduled_at: '2026-10-29T16:00:00.000Z',
      status: 'cerrado',
      notes: 'Firma y sello digital del técnico de mantenimiento de Medicina obtenidos.',
      cau: 'CAU-UCLM-2026-8530',
      buildingName: 'Facultad de Medicina — Sala Central de Máquinas y Calderas',
      operatorIds: [oper1Id],
      totalAmountCents: 15800,
      closedAt: '2026-10-29T18:00:00.000Z',
    },
    // 13. UCLM Politécnico - En curso - Viernes 30 Oct 09:00
    {
      seq: 13,
      customer: uclm,
      addressId: uclmAddressIds[2],
      planned_work: 'Cambio de llave de paso general de 1" con palanca y sustitución de latiguillo de acometida.',
      scheduled_at: '2026-10-30T09:00:00.000Z',
      status: 'en_curso',
      notes: 'Corte de agua general avisado con 24h de antelación a dirección de la escuela.',
      cau: 'CAU-UCLM-2026-8534',
      buildingName: 'Edificio Politécnico — Acometida Principal, Nave de Ensayos de Estructuras',
      operatorIds: [oper1Id],
    },

    // --- SIGUIENTE SEMANA (2 NOV - 6 NOV 2026) ---
    // 14. UCLM Químicas - No iniciado - Lunes 2 Nov 08:30
    {
      seq: 14,
      customer: uclm,
      addressId: uclmAddressIds[3],
      planned_work: 'Revisión y puesta a punto de caldera de agua caliente y circuito térmico de laboratorios.',
      scheduled_at: '2026-11-02T08:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Comprobación anual RITE: combustión, estanqueidad de gas y tiro de chimenea.',
      cau: 'CAU-UCLM-2026-8540',
      buildingName: 'Facultad de Ciencias y Tecnologías Químicas — Sala Térmica Planta Sótano',
      operatorIds: [oper1Id, oper2Id],
    },
    // 15. UCLM Paraninfo - No iniciado - Lunes 2 Nov 11:45
    {
      seq: 15,
      customer: uclm,
      addressId: uclmAddressIds[4],
      planned_work: 'Sustitución de grifería monomando termostática en vestuarios de artistas y personal técnico.',
      scheduled_at: '2026-11-02T11:45:00.000Z',
      status: 'no_iniciado',
      notes: 'Instalar dos conjuntos termostáticos de ducha con cartucho antical.',
      cau: 'CAU-UCLM-2026-8544',
      buildingName: 'Paraninfo Luis Arroyo — Vestuarios de Escenario, Planta -1',
      operatorIds: [oper2Id],
    },
    // 16. Gesyre - No iniciado - Lunes 2 Nov 16:00
    {
      seq: 16,
      customer: gesyre,
      addressId: gesyreAddressIds[2],
      planned_work: 'Revisión de fuga de agua en desagüe de fregadero industrial y cambio de válvula de retención.',
      scheduled_at: '2026-11-02T16:00:00.000Z',
      status: 'no_iniciado',
      notes: 'Intervención en horario de cierre de cocina (de 16:00 a 19:00).',
      cau: 'INC-GESYRE-2026-052',
      buildingName: 'Local Comercial Restauración Plaza Mayor — Plaza Mayor 14, Planta Baja',
      operatorIds: [oper1Id],
    },
    // 17. UCLM Derecho - Terminado - Martes 3 Nov 09:15
    {
      seq: 17,
      customer: uclm,
      addressId: uclmAddressIds[5],
      planned_work: 'Cambio de ánodo de sacrificio de magnesio y resistencia sumergida 1500W en termo eléctrico.',
      scheduled_at: '2026-11-03T09:15:00.000Z',
      status: 'terminado',
      notes: 'Termo de 80 litros completamente operativo y calentando a 60ºC.',
      cau: 'CAU-UCLM-2026-8549',
      buildingName: 'Facultad de Derecho y Ciencias Sociales — Cuarto de Limpieza y Servicios, Planta 1ª',
      operatorIds: [oper1Id],
      totalAmountCents: 9200,
    },
    // 18. UCLM Biblioteca - Cerrado - Martes 3 Nov 12:15
    {
      seq: 18,
      customer: uclm,
      addressId: uclmAddressIds[6],
      planned_work: 'Sustitución de válvula de esfera de 3/4" y racores de conexión en montante de sala de lectura.',
      scheduled_at: '2026-11-03T12:15:00.000Z',
      status: 'cerrado',
      notes: 'Prueba de estanqueidad a 4 bar durante 30 minutos sin caída de presión.',
      cau: 'CAU-UCLM-2026-8552',
      buildingName: 'Biblioteca General del Campus — Hemeroteca y Sala de Estudios 3ª',
      operatorIds: [oper2Id],
      totalAmountCents: 11400,
      closedAt: '2026-11-03T14:00:00.000Z',
    },
    // 19. UCLM Servicios Generales - No iniciado - Martes 3 Nov 16:30
    {
      seq: 19,
      customer: uclm,
      addressId: uclmAddressIds[7],
      planned_work: 'Instalación de válvula reductora de presión de latón 3/4" con manómetro en ramal de oficinas.',
      scheduled_at: '2026-11-03T16:30:00.000Z',
      status: 'no_iniciado',
      notes: 'La presión de red municipal supera los 6 bar en horario nocturno provocando golpes de ariete.',
      cau: 'CAU-UCLM-2026-8556',
      buildingName: 'Edificio Francisco Javier de Moya — Entrada de Acometida, Calle Altagracia 50',
      operatorIds: [oper1Id],
    },
    // 20. UCLM ESI - Reabierto - Miércoles 4 Nov 08:30
    {
      seq: 20,
      customer: uclm,
      addressId: uclmAddressIds[0],
      planned_work: 'Ajuste de fluxómetros temporizados y estanqueidad en batería de inodoros masculinos.',
      scheduled_at: '2026-11-04T08:30:00.000Z',
      status: 'reabierto',
      reopenedReason: 'Dos de los fluxómetros siguen quedando abiertos después de la pulsación y no cierran por falta de retroceso en el émbolo.',
      notes: 'Requiere sustituir los dos cartuchos interiores de membrana.',
      cau: 'CAU-UCLM-2026-8561',
      buildingName: 'Escuela Superior de Informática (ESI) — Planta 1ª, Ala Este',
      operatorIds: [oper2Id],
    },
    // 21. UCLM Medicina - No iniciado - Miércoles 4 Nov 11:30
    {
      seq: 21,
      customer: uclm,
      addressId: uclmAddressIds[1],
      planned_work: 'Revisión técnica periódica de sala de calderas en cascada y prueba de quemadores modulantes.',
      scheduled_at: '2026-11-04T11:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Revisión reglamentaria anual con emisión de certificado de rendimiento energético.',
      cau: 'CAU-UCLM-2026-8565',
      buildingName: 'Facultad de Medicina — Sala de Calderas Principal, Edificio de Decanato',
      operatorIds: [oper1Id, oper2Id],
    },
    // 22. UCLM Politécnico - Terminado - Jueves 5 Nov 09:00
    {
      seq: 22,
      customer: uclm,
      addressId: uclmAddressIds[2],
      planned_work: 'Sustitución de purgadores automáticos y reposición de presión en colector de planta 3ª.',
      scheduled_at: '2026-11-05T09:00:00.000Z',
      status: 'terminado',
      notes: 'Cambiados dos purgadores automáticos de 1/2" con válvula de retención de cierre rápido.',
      cau: 'CAU-UCLM-2026-8570',
      buildingName: 'Edificio Politécnico — Pasillo de Aulas de Teoría, Planta 3ª',
      operatorIds: [oper1Id],
      totalAmountCents: 8700,
    },
    // 23. Gesyre - No iniciado - Jueves 5 Nov 12:30
    {
      seq: 23,
      customer: gesyre,
      addressId: gesyreAddressIds[0],
      planned_work: 'Instalación de válvula de seguridad de 3 bar y manómetro en circuito cerrado de calefacción.',
      scheduled_at: '2026-11-05T12:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Avisar a portería de Calle Toledo antes de intervenir en la sala de contadores.',
      cau: 'INC-GESYRE-2026-059',
      buildingName: 'Oficinas Centrales Gesyre — Calle Toledo 42, Cuarto de Instalaciones',
      operatorIds: [oper2Id],
    },
    // 24. UCLM Químicas - Cerrado - Viernes 6 Nov 09:30
    {
      seq: 24,
      customer: uclm,
      addressId: uclmAddressIds[3],
      planned_work: 'Sustitución de sifón curvo doble con toma auxiliar y valvulería de corte en laboratorio de síntesis.',
      scheduled_at: '2026-11-06T09:30:00.000Z',
      status: 'cerrado',
      notes: 'Firma electrónica del responsable del departamento de Química Orgánica obtenida.',
      cau: 'CAU-UCLM-2026-8575',
      buildingName: 'Facultad de Ciencias y Tecnologías Químicas — Módulo de Investigación 115',
      operatorIds: [oper1Id],
      totalAmountCents: 13900,
      closedAt: '2026-11-06T11:45:00.000Z',
    },
    // 25. UCLM ESI - No iniciado - Viernes 6 Nov 12:00
    {
      seq: 25,
      customer: uclm,
      addressId: uclmAddressIds[0],
      planned_work: 'Revisión y sustitución de ánodo de magnesio 3/4" en termo eléctrico de vestuarios de conserjería.',
      scheduled_at: '2026-11-06T12:00:00.000Z',
      status: 'no_iniciado',
      notes: 'Comprobar corrosión galvánica y medir consumo eléctrico con pinza amperimétrica.',
      cau: 'CAU-UCLM-2026-8580',
      buildingName: 'Escuela Superior de Informática (ESI) — Planta Baja, Vestuarios Personal de Servicio',
      operatorIds: [oper2Id],
    },
  ];

  let work_orders: Omit<WorkOrder, 'admin_data'>[] = [];
  let work_order_admin: WorkOrderAdminData[] = [];
  let work_order_assignments: WorkOrderAssignment[] = [];
  let work_entries: WorkEntry[] = [];
  let work_sessions: WorkSession[] = [];
  let work_materials: WorkMaterial[] = [];
  let work_order_events: WorkOrderEvent[] = [];

  workOrderDataList.forEach((item) => {
    const woId = `wo-${item.seq}`;
    const code = `PT-2026-${String(item.seq).padStart(4, '0')}`;
    const targetAddr = addresses.find((a) => a.id === item.addressId);

    const fullObservations = `[${item.cau}] Edificio / Ubicación: ${item.buildingName}. ${item.notes}`;

    const newWo: Omit<WorkOrder, 'admin_data'> = {
      id: woId,
      number_seq: item.seq,
      code,
      version: 1,
      customer_id: item.customer.id,
      customer_address_id: item.addressId,
      snapshot_customer_name: item.customer.name,
      snapshot_customer_tax_id: item.customer.tax_id,
      snapshot_contact_name: targetAddr?.contact_name || item.customer.contact_name || 'Contacto UCLM',
      snapshot_contact_phone: targetAddr?.contact_phone || item.customer.phones[0] || '926 295 300',
      snapshot_contact_email: targetAddr?.contact_email || item.customer.emails[0] || 'cau@uclm.es',
      snapshot_address_line: targetAddr ? `${targetAddr.address_line} (${item.buildingName})` : item.customer.main_address,
      snapshot_postal_code: targetAddr?.postal_code || item.customer.postal_code || '13071',
      snapshot_city: targetAddr?.city || item.customer.city || 'Ciudad Real',
      snapshot_province: targetAddr?.province || item.customer.province || 'Ciudad Real',
      planned_work: item.planned_work,
      scheduled_at: item.scheduled_at,
      initial_notes: fullObservations,
      origin_review_occurrence_id: null,
      status: item.status,
      total_amount_cents: item.totalAmountCents ?? null,
      customer_requests_invoice: item.status === 'terminado' || item.status === 'cerrado' ? true : null,
      customer_has_paid: item.status === 'cerrado' ? true : item.status === 'terminado' ? false : null,
      content_hash: computeWorkOrderContentHash({
        planned_work: item.planned_work,
        total_amount_cents: item.totalAmountCents ?? null,
        entries: [],
        materials: [],
      }),
      created_by: 'usr-admin-1',
      created_at: '2026-10-21T08:00:00.000Z',
      updated_at: nowIso,
      started_at: item.status !== 'no_iniciado' ? item.scheduled_at : null,
      started_by: item.status !== 'no_iniciado' ? item.operatorIds[0] : null,
      finished_at: item.status === 'terminado' || item.status === 'cerrado' ? item.scheduled_at : null,
      finished_by: item.status === 'terminado' || item.status === 'cerrado' ? item.operatorIds[0] : null,
      closed_at: item.closedAt || null,
      closed_by: item.closedAt ? 'usr-admin-1' : null,
      reopened_at: item.status === 'reabierto' ? '2026-10-24T17:00:00.000Z' : null,
      reopened_by: item.status === 'reabierto' ? 'usr-admin-1' : null,
      reopen_reason: item.reopenedReason || null,
      archived_at: null,
      archived_by: null,
      deleted_at: null,
      deleted_by: null,
      delete_reason: null,
    };
    work_orders.push(newWo);

    work_order_admin.push({
      work_order_id: woId,
      money_delivered: false,
      money_delivered_at: null,
      money_delivered_by: null,
      invoice_issued: item.status === 'cerrado',
      invoice_issued_at: item.status === 'cerrado' ? item.scheduled_at : null,
      invoice_issued_by: item.status === 'cerrado' ? 'usr-admin-1' : null,
      invoice_number: item.status === 'cerrado' ? `FRA-2026-${String(item.seq).padStart(4, '0')}` : '',
      admin_notes: `Gestión administrativa: ${item.cau}. Tarifa oficial homologada UCLM / Gesyre.`,
      updated_at: item.scheduled_at,
    });

    item.operatorIds.forEach((opId, opIdx) => {
      work_order_assignments.push({
        id: `asg-${item.seq}-${opIdx + 1}`,
        work_order_id: woId,
        operator_id: opId,
        assigned_by: 'usr-admin-1',
        is_active: true,
        assigned_at: '2026-10-21T08:00:00.000Z',
        unassigned_at: null,
        unassigned_by: null,
      });
    });

    if (item.status === 'en_curso' || item.status === 'reabierto' || item.status === 'terminado' || item.status === 'cerrado') {
      work_entries.push({
        id: `ent-${item.seq}-1`,
        work_order_id: woId,
        description: `Trabajos de fontanería ejecutados conforme a ${item.cau} en ${item.buildingName}.`,
        observations: 'Comprobación de estanqueidad sin fugas ni pérdidas de presión.',
        created_by: item.operatorIds[0],
        created_at: item.scheduled_at,
        updated_at: item.scheduled_at,
      });

      work_sessions.push({
        id: `ses-${item.seq}-1`,
        work_order_id: woId,
        operator_id: item.operatorIds[0],
        started_at: item.scheduled_at,
        ended_at: new Date(new Date(item.scheduled_at).getTime() + 75 * 60 * 1000).toISOString(),
        notes: `Jornada técnica en ${item.buildingName} vinculada a ${item.cau}`,
        created_by: item.operatorIds[0],
        created_at: item.scheduled_at,
        updated_at: item.scheduled_at,
      });
    }

    if (item.status === 'terminado' || item.status === 'cerrado') {
      const artSample = articles[item.seq % articles.length];
      work_materials.push({
        id: `mat-${item.seq}-1`,
        work_order_id: woId,
        article_id: artSample.id,
        article_name_snapshot: artSample.name,
        unit_snapshot: artSample.unit,
        quantity: 1,
        unit_price_cents: artSample.sale_price_cents,
        notes: `Material empleado según orden ${item.cau}`,
        created_by: item.operatorIds[0],
        created_at: item.scheduled_at,
        updated_at: item.scheduled_at,
      });
    }

    work_order_events.push({
      id: `woe-${item.seq}-1`,
      work_order_id: woId,
      event_type: 'creado',
      from_status: null,
      to_status: 'no_iniciado',
      reason: `Alta inicial vinculada al ticket ${item.cau}`,
      actor_id: 'usr-admin-1',
      metadata: { code, cau: item.cau },
      created_at: '2026-10-21T08:00:00.000Z',
    });

    if (item.status === 'reabierto') {
      work_order_events.push({
        id: `woe-${item.seq}-2`,
        work_order_id: woId,
        event_type: 'reabierto',
        from_status: 'terminado',
        to_status: 'reabierto',
        reason: item.reopenedReason || 'Revisión técnica solicitada tras reapertura',
        actor_id: 'usr-admin-1',
        metadata: { code, cau: item.cau },
        created_at: '2026-10-24T17:00:00.000Z',
      });
    }
  });

  return {
    ...state,
    company_settings: {
      ...state.company_settings,
      company_name: 'Fontanería Roma S.L.',
      work_order_prefix: 'PT',
      work_order_next_seq: 26,
    },
    profiles,
    passwords,
    customers,
    customer_addresses: addresses,
    suppliers,
    articles,
    review_types: reviewTypes,
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
