import {
  Article,
  Customer,
  CustomerAddress,
  InstallationReview,
  ReviewOccurrence,
  ReviewType,
  ShoppingRequest,
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
import { REAL_SUPPLIERS_FROM_FILE } from './realSuppliersData';

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

  // 2.3 OTROS CLIENTES DIVERSOS DE CIUDAD REAL
  const otherClientsDefs = [
    {
      key: 'cp-carmen',
      name: 'Comunidad de Propietarios Ronda del Carmen 14',
      tax_id: 'H13298711',
      contact_name: 'Dña. Carmen Morales (Presidenta)',
      phone: '+34 926 214 550',
      email: 'cp.carmen14.cr@gmail.com',
      address: 'Ronda del Carmen 14',
      postal_code: '13002',
      notes: 'Edificio residencial de 24 viviendas con cuarto de calderas y garajes.',
      alias: 'Edificio y Garajes Comunitarios',
    },
    {
      key: 'meson-octavio',
      name: 'Restaurante Mesón Octavio',
      tax_id: 'B13451299',
      contact_name: 'José Antonio García (Gerente)',
      phone: '+34 926 256 000',
      email: 'administracion@mesonoctavio.com',
      address: 'Calle Severo Ochoa 6',
      postal_code: '13005',
      notes: 'Restaurante de referencia con cocina industrial, campana y separador de grasas.',
      alias: 'Restaurante y Cocina Principal',
    },
    {
      key: 'clinica-alarcos',
      name: 'Clínica Dental Alarcos',
      tax_id: 'B13889021',
      contact_name: 'Dra. Elena Ballesteros',
      phone: '+34 926 218 901',
      email: 'info@clinicadentalalarcos.es',
      address: 'Calle Alarcos 12, 1º B',
      postal_code: '13001',
      notes: 'Clínica dental con 4 gabinetes, red de agua purificada/ósmosis y aspiración.',
      alias: 'Gabinete Dental y Quirófano',
    },
    {
      key: 'res-puerta-toledo',
      name: 'Residencial Puerta de Toledo',
      tax_id: 'H13445566',
      contact_name: 'D. Manuel Sánchez (Administrador de Fincas)',
      phone: '+34 926 220 331',
      email: 'fincas.sanchez@administracionesmancha.com',
      address: 'Ronda de Toledo 32',
      postal_code: '13005',
      notes: 'Urbanización con grupo de presión doble, depósito aljibe y bombas de achique.',
      alias: 'Aljibe y Sala de Bombas',
    },
    {
      key: 'part-francisco',
      name: 'D. Francisco García Moreno (Particular)',
      tax_id: '05678123K',
      contact_name: 'Francisco García',
      phone: '+34 670 551 234',
      email: 'f.garcia.cr@gmail.com',
      address: 'Calle Ciruela 18, 3º A',
      postal_code: '13001',
      notes: 'Vivienda unifamiliar con calefacción individual y termo eléctrico.',
      alias: 'Vivienda Particular 3º A',
    },
  ];

  const otherCustomers: Array<{ customer: Customer; addressId: string; alias: string }> = [];

  otherClientsDefs.forEach((def) => {
    let cust = customers.find(
      (c) => c.tax_id === def.tax_id || c.name.toLowerCase().includes(def.name.toLowerCase().slice(0, 15))
    );
    if (!cust) {
      cust = {
        id: `cust-${def.key}`,
        code: `CLI-${String(customers.length + 1).padStart(4, '0')}`,
        name: def.name,
        tax_id: def.tax_id,
        contact_name: def.contact_name,
        phones: [def.phone],
        emails: [def.email],
        main_address: def.address,
        postal_code: def.postal_code,
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        notes: def.notes,
        is_active: true,
        created_at: '2026-01-20T08:00:00.000Z',
        updated_at: '2026-01-20T08:00:00.000Z',
      };
      customers.push(cust);
    }
    let addr = addresses.find((a) => a.customer_id === cust!.id);
    if (!addr) {
      addr = {
        id: `addr-${def.key}-1`,
        customer_id: cust.id,
        alias: def.alias,
        address_line: def.address,
        postal_code: def.postal_code,
        city: 'Ciudad Real',
        province: 'Ciudad Real',
        contact_name: def.contact_name,
        contact_phone: def.phone,
        contact_email: def.email,
        notes: `Ubicación principal de ${def.name}`,
        is_active: true,
        created_at: '2026-01-20T08:00:00.000Z',
        updated_at: '2026-01-20T08:00:00.000Z',
      };
      addresses.push(addr);
    }
    otherCustomers.push({ customer: cust, addressId: addr.id, alias: def.alias });
  });

  // Si el usuario ya había introducido clientes propios en el estado (distintos de UCLM y Gesyre), los incluimos también
  const userEnteredCustomers = customers.filter(
    (c) =>
      c.id !== uclm!.id &&
      c.id !== gesyre!.id &&
      !otherClientsDefs.some((d) => d.tax_id === c.tax_id)
  );
  userEnteredCustomers.forEach((c) => {
    let addr = addresses.find((a) => a.customer_id === c.id);
    if (!addr) {
      addr = {
        id: `addr-user-${c.id}`,
        customer_id: c.id,
        alias: 'Sede Principal',
        address_line: c.main_address || 'Ciudad Real',
        postal_code: c.postal_code || '13001',
        city: c.city || 'Ciudad Real',
        province: c.province || 'Ciudad Real',
        contact_name: c.contact_name || c.name,
        contact_phone: c.phones[0] || '+34 926 000 000',
        contact_email: c.emails[0] || 'info@cliente.es',
        notes: c.notes || 'Cliente registrado en la base de datos',
        is_active: true,
        created_at: c.created_at || '2026-01-20T08:00:00.000Z',
        updated_at: c.updated_at || '2026-01-20T08:00:00.000Z',
      };
      addresses.push(addr);
    }
    otherCustomers.unshift({ customer: c, addressId: addr.id, alias: addr.alias });
  });

  // 3. PROVEEDORES DEL FICHERO REAL DE PROVEEDORES (Plantilla_Proveedores.xlsx)
  const fakeNames = [
    'suministros hidráulicos y fontanería manchega',
    'salvador escoda s.a. - delegación la mancha',
    'distribuciones térmicas y clima ciudad real',
    'suministros manchega',
    'clima ciudad real',
  ];
  let suppliers = (state.suppliers || []).filter(
    (s) => !fakeNames.some((fake) => s.name.toLowerCase().includes(fake))
  );

  // Cargamos los 186 proveedores del fichero real de proveedores
  REAL_SUPPLIERS_FROM_FILE.forEach((realSup) => {
    if (!suppliers.some((s) => s.tax_id === realSup.tax_id || s.name.toLowerCase() === realSup.name.toLowerCase())) {
      suppliers.push(realSup);
    }
  });

  const getRealSup = (namePart: string, fallbackIdx = 0): string => {
    const found = suppliers.find((s) => s.name.toLowerCase().includes(namePart.toLowerCase()));
    return found ? found.id : (suppliers[fallbackIdx]?.id || suppliers[0]?.id || 'sup-1');
  };

  const supAquagrif = getRealSup('Aquagrif');
  const supTeyma = getRealSup('TEYMA');
  const supHidrofil = getRealSup('HIDROFIL');
  const supTradesa = getRealSup('TRADESA');
  const supTecnifrio = getRealSup('TECNIFRIO');
  const supAlfesa = getRealSup('ALFESA');
  const supConducciones = getRealSup('CONDUCCIONES Y SANEAMIENTOS');
  const supFluidra = getRealSup('FLUIDRA');
  const supAguaMaq = getRealSup('AGUA Y MAQUINARIA');

  // 4. 25 ARTÍCULOS DE FONTANERÍA (ASOCIADOS A PROVEEDORES REALES DEL FICHERO)
  const plumbingCatalog = [
    {
      code: 'MAT-001',
      name: 'Grifo monomando lavabo caño medio cromado con aireador antical',
      description: 'Grifería monomando con cartucho cerámico 35mm y latiguillos flexibles homologados 3/8"',
      purchase: 2200,
      sale: 4500,
      unit: 'ud',
      supplier_id: supAquagrif,
    },
    {
      code: 'MAT-002',
      name: 'Grifo monomando ducha con flexo 1,75m y soporte mural',
      description: 'Cuerpo de latón cromado con inversor cerámico y mango de ducha antical 3 posiciones',
      purchase: 2850,
      sale: 5800,
      unit: 'ud',
      supplier_id: supAquagrif,
    },
    {
      code: 'MAT-003',
      name: 'Lavabo mural de porcelana vitrificada blanca 60x45cm',
      description: 'Lavabo con orificio central para grifería y rebosadero para fijación con varillas',
      purchase: 3400,
      sale: 6900,
      unit: 'ud',
      supplier_id: supAquagrif,
    },
    {
      code: 'MAT-004',
      name: 'Inodoro completo salida vertical con cisterna economizadora',
      description: 'Taza con juego de fijación, cisterna 3/6 litros y asiento termoestable con caída amortiguada',
      purchase: 8900,
      sale: 16500,
      unit: 'ud',
      supplier_id: supAquagrif,
    },
    {
      code: 'MAT-005',
      name: 'Mecanismo descargador cisterna universal doble pulsador',
      description: 'Descargador universal de pulsador interrumpible compatible con cisternas Roca y estándar',
      purchase: 950,
      sale: 2200,
      unit: 'ud',
      supplier_id: supTeyma,
    },
    {
      code: 'MAT-006',
      name: 'Grifo mezclador termostático ducha con bloqueo a 38ºC',
      description: 'Termostato antiescaldamiento con sistema CoolTouch y conexiones excéntricas de latón',
      purchase: 5200,
      sale: 9800,
      unit: 'ud',
      supplier_id: supAquagrif,
    },
    {
      code: 'MAT-007',
      name: 'Desagüe sifónico botella extensible PVC blanco 1 1/4" - 1 1/2"',
      description: 'Sifón curvo extensible de fácil limpieza con juntas labiadas cónicas estancas',
      purchase: 420,
      sale: 1100,
      unit: 'ud',
      supplier_id: supTeyma,
    },
    {
      code: 'MAT-008',
      name: 'Válvula de corte de escuadra antical 1/2" x 3/8"',
      description: 'Llave de escuadra cierre 1/4 vuelta antical con plafón embellecedor de acero',
      purchase: 310,
      sale: 850,
      unit: 'ud',
      supplier_id: supAlfesa,
    },
    {
      code: 'MAT-009',
      name: 'Flexo de conexión acero inoxidable flexible 3/8" H-H 350mm',
      description: 'Latiguillo de fontanería trenzado de acero inoxidable para conexión de agua fría y caliente',
      purchase: 220,
      sale: 600,
      unit: 'ud',
      supplier_id: supAlfesa,
    },
    {
      code: 'MAT-010',
      name: 'Bote sifónico registrable 110mm PVC con tapa acero inoxidable',
      description: 'Bote sifónico de 5 entradas 40mm y salida 50mm con tornillo central de apriete estanco',
      purchase: 1250,
      sale: 2600,
      unit: 'ud',
      supplier_id: supConducciones,
    },
    {
      code: 'MAT-011',
      name: 'Manguito extensible elástico inodoro toma 90-110mm',
      description: 'Manguito elástico de EVA con junta bilabiada para acometida de desagüe inodoro a bajante',
      purchase: 580,
      sale: 1450,
      unit: 'ud',
      supplier_id: supConducciones,
    },
    {
      code: 'MAT-012',
      name: 'Tubería multicapa aislada PE-RT/AL/PE-RT 16x2mm (rollo 50m)',
      description: 'Tubería multicapa corrugada de aluminio continuo con coquilla térmica para agua y calefacción',
      purchase: 4800,
      sale: 8900,
      unit: 'rollo',
      supplier_id: supTeyma,
    },
    {
      code: 'MAT-013',
      name: 'Tubería de cobre rígido homologado 15mm espesor 1mm (barra 2,5m)',
      description: 'Tubo de cobre desoxidado al fósforo Cu-DHP según norma UNE-EN 1057',
      purchase: 1450,
      sale: 2650,
      unit: 'barra',
      supplier_id: supTeyma,
    },
    {
      code: 'MAT-014',
      name: 'Tubería de cobre rígido homologado 18mm espesor 1mm (barra 2,5m)',
      description: 'Tubo de cobre de alta resistencia para montantes de distribución y calefacción',
      purchase: 1820,
      sale: 3250,
      unit: 'barra',
      supplier_id: supTeyma,
    },
    {
      code: 'MAT-015',
      name: 'Tubería de cobre rígido homologado 22mm espesor 1mm (barra 2,5m)',
      description: 'Tubo de cobre para colectores principales y circuitos generales de sala térmica',
      purchase: 2350,
      sale: 4100,
      unit: 'barra',
      supplier_id: supTeyma,
    },
    {
      code: 'MAT-016',
      name: 'Válvula de esfera palanca acero 3/4" H-H paso total para agua',
      description: 'Llave de bola en latón forjado cromado con maneta ergonómica plastificada',
      purchase: 590,
      sale: 1350,
      unit: 'ud',
      supplier_id: supFluidra,
    },
    {
      code: 'MAT-017',
      name: 'Válvula de esfera palanca acero 1" H-H paso total para agua',
      description: 'Llave de corte general para acometida con asiento de teflón PTFE de alta estanqueidad',
      purchase: 890,
      sale: 1950,
      unit: 'ud',
      supplier_id: supFluidra,
    },
    {
      code: 'MAT-018',
      name: 'Válvula reductora de presión latón 3/4" con manómetro de control',
      description: 'Regulador de presión de membrana compensada con escala de ajuste de 1 a 6 bar',
      purchase: 3100,
      sale: 6400,
      unit: 'ud',
      supplier_id: supAguaMaq,
    },
    {
      code: 'MAT-019',
      name: 'Válvula de seguridad de sobrepresión 3 bar 1/2" M-H',
      description: 'Válvula de escape tarada a 3 bar para circuitos cerrados de calefacción y termos',
      purchase: 780,
      sale: 1750,
      unit: 'ud',
      supplier_id: supTradesa,
    },
    {
      code: 'MAT-020',
      name: 'Ánodo de sacrificio de magnesio M8 rosca 3/4" x 400mm',
      description: 'Barra de ánodo de magnesio para protección galvánica contra corrosión en termos eléctricos',
      purchase: 920,
      sale: 2400,
      unit: 'ud',
      supplier_id: supHidrofil,
    },
    {
      code: 'MAT-021',
      name: 'Resistencia blindada de cobre sumergida 1500W para termo eléctrico',
      description: 'Elemento calefactor de repuesto con rosca 1 1/4" y vaina portasondas para termostato',
      purchase: 1650,
      sale: 3600,
      unit: 'ud',
      supplier_id: supTecnifrio,
    },
    {
      code: 'MAT-022',
      name: 'Termostato varilla regulable rearme bipolar para termo eléctrico',
      description: 'Termostato de control con corte térmico de emergencia a 95ºC según normativa CE',
      purchase: 1100,
      sale: 2500,
      unit: 'ud',
      supplier_id: supTecnifrio,
    },
    {
      code: 'MAT-023',
      name: 'Bomba circuladora electrónica calefacción y ACS alta eficiencia',
      description: 'Circulador de rotor húmedo con regulación por presión proporcional y display de consumo',
      purchase: 9200,
      sale: 17500,
      unit: 'ud',
      supplier_id: supTradesa,
    },
    {
      code: 'MAT-024',
      name: 'Purgador automático de aire 1/2" latón niquelado con válvula',
      description: 'Desaireador automático vertical con boya de polipropileno y tapón de higroexpansión',
      purchase: 460,
      sale: 1150,
      unit: 'ud',
      supplier_id: supHidrofil,
    },
    {
      code: 'MAT-025',
      name: 'Sifón registrable fregadero doble seno con tomas lavavajillas',
      description: 'Conjunto de tuberías de desagüe de polipropileno blanco con doble toma de electrodoméstico',
      purchase: 780,
      sale: 1800,
      unit: 'ud',
      supplier_id: supTeyma,
    },
  ];

  let articles: Article[] = [...state.articles];
  plumbingCatalog.forEach((art, idx) => {
    let existing = articles.find((a) => a.code === art.code);
    if (existing) {
      existing.supplier_id = art.supplier_id;
      existing.name = art.name;
      existing.description = art.description;
      existing.purchase_price_cents = art.purchase;
      existing.sale_price_cents = art.sale;
      existing.unit = art.unit;
    } else {
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

  const operators = profiles.filter((p) => p.role === 'operario');
  const oper1Id = operators[0]?.id || profiles[0].id;
  const oper2Id = operators[1]?.id || profiles[0].id;

  // 6.5 SOLICITUDES DE LA CESTA DE LA COMPRA (STOCK Y PEDIDOS URGENTES)
  const shopping_requests: ShoppingRequest[] = [
    {
      id: 'shop-cr-1',
      article_id: articles.find((a) => a.code === 'MAT-020')?.id || articles[19].id, // Ánodo de sacrificio
      supplier_id: supHidrofil,
      purchase_price_cents: 920,
      sale_price_cents: 2400,
      quantity: 6,
      status: 'pending_purchase',
      requested_by: oper1Id,
      requested_at: '2026-10-23T07:45:00.000Z',
      additional_requesters: [
        {
          user_id: oper2Id,
          requested_at: '2026-10-23T09:10:00.000Z',
          note: 'También hacen falta 2 para furgoneta taller 2 (rutas campus UCLM)',
        },
      ],
      purchased_by: null,
      purchased_at: null,
      notes: 'Reposición urgente para vehículos taller: sustitución en termos programada para la próxima semana (HIDROFIL)',
      updated_at: '2026-10-23T09:10:00.000Z',
    },
    {
      id: 'shop-cr-2',
      article_id: articles.find((a) => a.code === 'MAT-005')?.id || articles[4].id, // Mecanismo cisterna
      supplier_id: supTeyma,
      purchase_price_cents: 950,
      sale_price_cents: 2200,
      quantity: 8,
      status: 'pending_purchase',
      requested_by: oper2Id,
      requested_at: '2026-10-22T16:20:00.000Z',
      additional_requesters: [],
      purchased_by: null,
      purchased_at: null,
      notes: 'Averías reiteradas de cisternas que no cierran en aseos de ESI y Politécnico (TEYMA)',
      updated_at: '2026-10-22T16:20:00.000Z',
    },
    {
      id: 'shop-cr-3',
      article_id: articles.find((a) => a.code === 'MAT-001')?.id || articles[0].id, // Grifo lavabo
      supplier_id: supAquagrif,
      purchase_price_cents: 2200,
      sale_price_cents: 4500,
      quantity: null,
      status: 'pending_quantity',
      requested_by: oper1Id,
      requested_at: '2026-10-24T11:15:00.000Z',
      additional_requesters: [],
      purchased_by: null,
      purchased_at: null,
      notes: 'Solicitado sobre la marcha en intervención por cuerpo agrietado en lavabo (Aquagrif SL). Pendiente fijar cantidad.',
      updated_at: '2026-10-24T11:15:00.000Z',
    },
    {
      id: 'shop-cr-4',
      article_id: articles.find((a) => a.code === 'MAT-009')?.id || articles[8].id, // Latiguillo / flexo
      supplier_id: supAlfesa,
      purchase_price_cents: 220,
      sale_price_cents: 600,
      quantity: 20,
      status: 'pending_purchase',
      requested_by: 'usr-admin-1',
      requested_at: '2026-10-21T18:00:00.000Z',
      additional_requesters: [],
      purchased_by: null,
      purchased_at: null,
      notes: 'Lote de reposición general para almacén central (ALFESA Ferretería Industrial)',
      updated_at: '2026-10-21T18:00:00.000Z',
    },
    {
      id: 'shop-cr-5',
      article_id: articles.find((a) => a.code === 'MAT-019')?.id || articles[18].id, // Válvula seguridad
      supplier_id: supTradesa,
      purchase_price_cents: 780,
      sale_price_cents: 1750,
      quantity: 3,
      status: 'pending_purchase',
      requested_by: oper2Id,
      requested_at: '2026-10-23T14:30:00.000Z',
      additional_requesters: [],
      purchased_by: null,
      purchased_at: null,
      notes: 'Válvulas de seguridad y sobrepresión para salas de calderas (TRADESA)',
      updated_at: '2026-10-23T14:30:00.000Z',
    },
    {
      id: 'shop-cr-6',
      article_id: articles.find((a) => a.code === 'MAT-008')?.id || articles[7].id, // Llaves escuadra
      supplier_id: supAlfesa,
      purchase_price_cents: 310,
      sale_price_cents: 850,
      quantity: 15,
      status: 'pending_purchase',
      requested_by: oper1Id,
      requested_at: '2026-10-20T08:00:00.000Z',
      additional_requesters: [],
      purchased_by: null,
      purchased_at: null,
      notes: 'Pack de llaves de corte de escuadra antical para vehículos de asistencia (ALFESA)',
      updated_at: '2026-10-20T08:00:00.000Z',
    },
    {
      id: 'shop-cr-7',
      article_id: articles.find((a) => a.code === 'MAT-004')?.id || articles[3].id, // Inodoro
      supplier_id: supAquagrif,
      purchase_price_cents: 8900,
      sale_price_cents: 16500,
      quantity: null,
      status: 'pending_quantity',
      requested_by: oper2Id,
      requested_at: '2026-10-24T09:40:00.000Z',
      additional_requesters: [],
      purchased_by: null,
      purchased_at: null,
      notes: 'Taza rota por impacto en aseo de Facultad de Medicina (Aquagrif SL). Pendiente de confirmación de modelo.',
      updated_at: '2026-10-24T09:40:00.000Z',
    },
    {
      id: 'shop-cr-8',
      article_id: articles.find((a) => a.code === 'MAT-012')?.id || articles[11].id, // Tubo multicapa
      supplier_id: supTeyma,
      purchase_price_cents: 4800,
      sale_price_cents: 8900,
      quantity: 2,
      status: 'purchased',
      requested_by: oper1Id,
      requested_at: '2026-10-24T08:00:00.000Z',
      additional_requesters: [],
      purchased_by: 'usr-admin-1',
      purchased_at: '2026-10-24T10:15:00.000Z',
      notes: 'Comprado esta mañana en mostrador de TEYMA para batería de contadores',
      updated_at: '2026-10-24T10:15:00.000Z',
    },
  ];

  // 7. 25 PARTES DE TRABAJO (SEMANA PRÓXIMA 26 OCT - 1 NOV Y SIGUIENTE 2 NOV - 8 NOV 2026)
  // Repartidos entre UCLM (Campus Ciudad Real con CAU), Gesyre y otros clientes diversos de la base de datos
  // Estados requeridos: no_iniciado, en_curso, reabierto, terminado, cerrado
  const oc0 = otherCustomers[0] || { customer: uclm, addressId: uclmAddressIds[0], alias: 'Sede Principal' };
  const oc1 = otherCustomers[1 % otherCustomers.length] || oc0;
  const oc2 = otherCustomers[2 % otherCustomers.length] || oc0;
  const oc3 = otherCustomers[3 % otherCustomers.length] || oc0;
  const oc4 = otherCustomers[4 % otherCustomers.length] || oc0;

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
    // 2. UCLM Medicina - No iniciado - Lunes 26 Oct 11:30
    {
      seq: 2,
      customer: uclm,
      addressId: uclmAddressIds[1],
      planned_work: 'Revisión y cambio de ánodo de magnesio 3/4" en termo eléctrico de 100L en laboratorio de prácticas.',
      scheduled_at: '2026-10-26T11:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Descalcificar fondo de calderín y comprobar estanqueidad de brida con nueva junta.',
      cau: 'CAU-UCLM-2026-8492',
      buildingName: 'Facultad de Medicina — Laboratorio de Fisiología, Planta 1ª',
      operatorIds: [oper2Id],
    },
    // 3. UCLM Politécnico - Terminado - Lunes 26 Oct 15:30
    {
      seq: 3,
      customer: uclm,
      addressId: uclmAddressIds[2],
      planned_work: 'Sustitución de mecanismo descargador de cisterna y grifo de llenado en aseos de vestuarios deportivos.',
      scheduled_at: '2026-10-26T15:30:00.000Z',
      status: 'terminado',
      notes: 'Trabajos finalizados sin fugas. Mecanismo economizador regulado a 3 y 6 litros.',
      cau: 'CAU-UCLM-2026-8493',
      buildingName: 'Edificio Politécnico — Vestuarios Pistas Deportivas',
      operatorIds: [oper1Id],
      totalAmountCents: 9800,
    },
    // 4. UCLM Químicas - Reabierto - Martes 27 Oct 09:00
    {
      seq: 4,
      customer: uclm,
      addressId: uclmAddressIds[3],
      planned_work: 'Reparación de grifo monomando de caño alto con fuga en junta de rótula en laboratorio de investigación.',
      scheduled_at: '2026-10-27T09:00:00.000Z',
      status: 'reabierto',
      reopenedReason: 'Conserjería y profesorado comunican que al someter el caño a presión máxima se desprende la junta del aireador.',
      notes: 'Pieza de recambio original solicitada al distribuidor para ensamblar ajuste a presión.',
      cau: 'CAU-UCLM-2026-8494',
      buildingName: 'Facultad de Ciencias y Tecnologías Químicas — Laboratorio de Química Orgánica',
      operatorIds: [oper1Id],
    },
    // 5. UCLM Paraninfo - Cerrado - Martes 27 Oct 12:00
    {
      seq: 5,
      customer: uclm,
      addressId: uclmAddressIds[4],
      planned_work: 'Instalación de 4 fluxómetros automáticos antical en batería de urinarios de aseos públicos del vestíbulo.',
      scheduled_at: '2026-10-27T12:00:00.000Z',
      status: 'cerrado',
      notes: 'Facturado conforme a pliego de mantenimiento preventivo UCLM. Recibo de conformidad firmado.',
      cau: 'CAU-UCLM-2026-8495',
      buildingName: 'Paraninfo Luis Arroyo — Vestíbulo Principal, Aseos Públicos',
      operatorIds: [oper1Id, oper2Id],
      totalAmountCents: 32000,
      closedAt: '2026-10-27T14:30:00.000Z',
    },
    // 6. UCLM Derecho - En curso - Miércoles 28 Oct 08:30
    {
      seq: 6,
      customer: uclm,
      addressId: uclmAddressIds[5],
      planned_work: 'Desatasco mecánico de arqueta sifónica y desagües de pluviales en patio interior de la facultad.',
      scheduled_at: '2026-10-28T08:30:00.000Z',
      status: 'en_curso',
      notes: 'Operario trabajando con guía espiral y tobera rotativa. Evacuación restablecida al 70%.',
      cau: 'CAU-UCLM-2026-8496',
      buildingName: 'Facultad de Derecho y Ciencias Sociales — Patio Central y Galería Aseos',
      operatorIds: [oper2Id],
    },
    // 7. UCLM Biblioteca - No iniciado - Miércoles 28 Oct 11:30
    {
      seq: 7,
      customer: uclm,
      addressId: uclmAddressIds[6],
      planned_work: 'Sustitución de inodoro de tanque bajo adaptado a normativa de accesibilidad en aseo PMR.',
      scheduled_at: '2026-10-28T11:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Material en almacén de Fontanería Roma preparado para desplazamiento.',
      cau: 'CAU-UCLM-2026-8497',
      buildingName: 'Biblioteca General del Campus — Planta Baja, Aseo Accesible',
      operatorIds: [oper1Id],
    },
    // 8. UCLM Servicios Generales - Terminado - Jueves 29 Oct 09:15
    {
      seq: 8,
      customer: uclm,
      addressId: uclmAddressIds[7],
      planned_work: 'Revisión y purgado de vaso de expansión de 24L en circuito cerrado de agua caliente sanitaria.',
      scheduled_at: '2026-10-29T09:15:00.000Z',
      status: 'terminado',
      notes: 'Presión de precarga ajustada a 1,8 bar. Comprobación de manómetros satisfactoria.',
      cau: 'CAU-UCLM-2026-8498',
      buildingName: 'Edificio Francisco Javier de Moya — Sala Técnica Clima y ACS',
      operatorIds: [oper2Id],
      totalAmountCents: 11500,
    },
    // 9. UCLM ESI Comedor - Cerrado - Jueves 29 Oct 14:00
    {
      seq: 9,
      customer: uclm,
      addressId: uclmAddressIds[0],
      planned_work: 'Sustitución de válvula mezcladora termostática 1" en línea de fregaderos del comedor universitario.',
      scheduled_at: '2026-10-29T14:00:00.000Z',
      status: 'cerrado',
      notes: 'Trabajo facturado y certificado. Temperatura de distribución regulada a 50ºC para evitar legionela.',
      cau: 'CAU-UCLM-2026-8499',
      buildingName: 'Escuela Superior de Informática (ESI) — Zona de Comedor y Office',
      operatorIds: [oper1Id],
      totalAmountCents: 21000,
      closedAt: '2026-10-29T16:00:00.000Z',
    },
    // 10. UCLM Medicina Pabellón Docente - En curso - Viernes 30 Oct 08:30
    {
      seq: 10,
      customer: uclm,
      addressId: uclmAddressIds[1],
      planned_work: 'Localización y reparación de pérdida en conducción de cobre 18mm empotrada en falso techo.',
      scheduled_at: '2026-10-30T08:30:00.000Z',
      status: 'en_curso',
      notes: 'Técnico localizando punto de goteo con detector acústico y cámara termográfica.',
      cau: 'CAU-UCLM-2026-8500',
      buildingName: 'Facultad de Medicina — Pabellón Docente, Distribuidor Planta 2ª',
      operatorIds: [oper1Id, oper2Id],
    },
    // --- SEMANA SIGUIENTE (2 NOV - 8 NOV 2026) ---
    // 11. UCLM Politécnico Talleres - Reabierto - Lunes 2 Nov 08:30
    {
      seq: 11,
      customer: uclm,
      addressId: uclmAddressIds[2],
      planned_work: 'Sustitución de grifería mural de 2 aguas en pilas de limpieza de piezas de taller de ingeniería.',
      scheduled_at: '2026-11-02T08:30:00.000Z',
      status: 'reabierto',
      reopenedReason: 'Se observa pequeña vibración de golpe de ariete al cortar rápidamente el caudal de la pila izquierda.',
      notes: 'Se programa instalación de amortiguador de golpe de ariete de 1/2" para eliminar sobrepresiones.',
      cau: 'CAU-UCLM-2026-8501',
      buildingName: 'Edificio Politécnico — Talleres Mecánicos y Nave de Ensayos',
      operatorIds: [oper1Id],
    },
    // 12. UCLM Químicas Planta Piloto - No iniciado - Lunes 2 Nov 11:30
    {
      seq: 12,
      customer: uclm,
      addressId: uclmAddressIds[3],
      planned_work: 'Revisión y cambio de ánodo de magnesio 26x400mm en acumulador de agua caliente de 200L.',
      scheduled_at: '2026-11-02T11:30:00.000Z',
      status: 'no_iniciado',
      notes: 'Cita acordada con el técnico de laboratorio D. Carlos Redondo.',
      cau: 'CAU-UCLM-2026-8502',
      buildingName: 'Facultad de Ciencias y Tecnologías Químicas — Nave de Planta Piloto',
      operatorIds: [oper2Id],
    },
    // 13. UCLM Paraninfo Camerinos - No iniciado - Martes 3 Nov 09:00
    {
      seq: 13,
      customer: uclm,
      addressId: uclmAddressIds[4],
      planned_work: 'Desmontaje, saneado y sellado de plato de ducha y mampara con silicona antimoho en camerinos.',
      scheduled_at: '2026-11-03T09:00:00.000Z',
      status: 'no_iniciado',
      notes: 'Actuación previa a los actos de graduación de fin de trimestre.',
      cau: 'CAU-UCLM-2026-8503',
      buildingName: 'Paraninfo Luis Arroyo — Zona Técnica de Camerinos Subsuelo',
      operatorIds: [oper1Id],
    },
    // 14. Gesyre Oficinas Centrales - Terminado - Martes 3 Nov 11:30
    {
      seq: 14,
      customer: gesyre,
      addressId: gesyreAddressIds[0],
      planned_work: 'Sustitución de grifo monomando de lavabo y comprobación de presión en aseos de oficina central.',
      scheduled_at: '2026-11-03T11:30:00.000Z',
      status: 'terminado',
      notes: 'Facturar según tarifa concertada con Gesyre. Firma del gestor D. Antonio Morales recogida.',
      cau: 'INC-GESYRE-2026-0412',
      buildingName: 'Oficinas Centrales Gesyre — Calle Toledo 42, Planta 1ª',
      operatorIds: [oper1Id],
      totalAmountCents: 8500,
    },
    // 15. Gesyre Residencial Santa María - Cerrado - Miércoles 4 Nov 09:00
    {
      seq: 15,
      customer: gesyre,
      addressId: gesyreAddressIds[1],
      planned_work: 'Reparación de arqueta de saneamiento comunitaria y sustitución de tramo de tubo PVC de 110mm.',
      scheduled_at: '2026-11-04T09:00:00.000Z',
      status: 'cerrado',
      notes: 'Factura abonada mediante transferencia por Gesyre Administración de Fincas.',
      cau: 'INC-GESYRE-2026-0413',
      buildingName: 'Comunidad Residencial Puerta de Santa María — C/ Santa María del Prado 8',
      operatorIds: [oper1Id, oper2Id],
      totalAmountCents: 27500,
      closedAt: '2026-11-04T12:00:00.000Z',
    },
    // 16. Gesyre Local Plaza Mayor - En curso - Miércoles 4 Nov 14:30
    {
      seq: 16,
      customer: gesyre,
      addressId: gesyreAddressIds[2],
      planned_work: 'Sustitución de batería de llaves de corte y desatasco de bote sifónico en cocina de restaurante arrendado.',
      scheduled_at: '2026-11-04T14:30:00.000Z',
      status: 'en_curso',
      notes: 'Intervención en horario de cierre de cocina para no entorpecer el servicio de almuerzo.',
      cau: 'INC-GESYRE-2026-0414',
      buildingName: 'Local Comercial Restauración Plaza Mayor — Plaza Mayor 14',
      operatorIds: [oper2Id],
    },
    // 17. Comunidad Ronda del Carmen 14 - En curso - Jueves 5 Nov 08:30
    {
      seq: 17,
      customer: oc0.customer,
      addressId: oc0.addressId,
      planned_work: 'Reparación de rotura en bajante vertical comunitaria de aguas residuales en falso techo de garaje.',
      scheduled_at: '2026-11-05T08:30:00.000Z',
      status: 'en_curso',
      notes: 'Aviso urgente de la presidenta. Fuga que gotea sobre plaza de estacionamiento n.º 4.',
      cau: 'AVISO-CP-2026-088',
      buildingName: String(oc0.alias) + ' — Garaje Comunitario Planta Sótano',
      operatorIds: [oper1Id],
    },
    // 18. Comunidad Ronda del Carmen 14 - Terminado - Jueves 5 Nov 12:00
    {
      seq: 18,
      customer: oc0.customer,
      addressId: oc0.addressId,
      planned_work: 'Desatasco con tobera de alta presión y cámara de inspección en arqueta sinfónica general de salida.',
      scheduled_at: '2026-11-05T12:00:00.000Z',
      status: 'terminado',
      notes: 'Retirada de tapón de residuos sólidos. Sellado hermético de tapa de registro.',
      cau: 'AVISO-CP-2026-089',
      buildingName: String(oc0.alias) + ' — Pozo y Arqueta General de Salida a Calle',
      operatorIds: [oper1Id, oper2Id],
      totalAmountCents: 18500,
    },
    // 19. Restaurante Mesón Octavio - Reabierto - Viernes 6 Nov 09:00
    {
      seq: 19,
      customer: oc1.customer,
      addressId: oc1.addressId,
      planned_work: 'Sustitución de grifo caño pedal en fregadero industrial y revisión de estanqueidad de racorería.',
      scheduled_at: '2026-11-06T09:00:00.000Z',
      status: 'reabierto',
      reopenedReason: 'El cliente comunica goteo persistente en junta de cierre del pulsador de pie tras servicio de comidas.',
      notes: 'Intervención en cocina principal. El personal no puede fregar vajilla con normalidad.',
      cau: 'INC-REST-2026-042',
      buildingName: String(oc1.alias) + ' — Cocina Industrial y Zona de Lavavajillas',
      operatorIds: [oper2Id],
    },
    // 20. Restaurante Mesón Octavio - Cerrado - Viernes 6 Nov 12:30
    {
      seq: 20,
      customer: oc1.customer,
      addressId: oc1.addressId,
      planned_work: 'Mantenimiento y limpieza de separador de grasas bajo fregaderos de preparación previa a inspección.',
      scheduled_at: '2026-11-06T12:30:00.000Z',
      status: 'cerrado',
      notes: 'Vaciado de lodos, desengrasado con producto homologado y emisión de certificado de limpieza técnica.',
      cau: 'INC-REST-2026-043',
      buildingName: String(oc1.alias) + ' — Cuarto de Residuos y Separador de Grasas',
      operatorIds: [oper1Id],
      totalAmountCents: 24000,
      closedAt: '2026-11-06T14:30:00.000Z',
    },
    // 21. Clínica Dental Alarcos - No iniciado - Viernes 6 Nov 16:00
    {
      seq: 21,
      customer: oc2.customer,
      addressId: oc2.addressId,
      planned_work: 'Sustitución de electroválvula de corte general y renovación de cartuchos filtrantes de equipo de ósmosis.',
      scheduled_at: '2026-11-06T16:00:00.000Z',
      status: 'no_iniciado',
      notes: 'Cita acordada fuera de horario de consulta para no interrumpir la atención a pacientes.',
      cau: 'INC-CLIN-2026-019',
      buildingName: String(oc2.alias) + ' — Sala de Esterilización y Autoclaves',
      operatorIds: [oper1Id],
    },
    // 22. Clínica Dental Alarcos - Terminado - Sábado 7 Nov 09:30
    {
      seq: 22,
      customer: oc2.customer,
      addressId: oc2.addressId,
      planned_work: 'Reparación de red de aspiración quirúrgica y sustitución de sifón en escupidera de Gabinete 2.',
      scheduled_at: '2026-11-07T09:30:00.000Z',
      status: 'terminado',
      notes: 'Comprobación de vacío y estanqueidad sin pérdidas. Funcionamiento óptimo verificado con doctora.',
      cau: 'INC-CLIN-2026-020',
      buildingName: String(oc2.alias) + ' — Gabinete Dental N.º 2',
      operatorIds: [oper2Id],
      totalAmountCents: 16000,
    },
    // 23. Residencial Puerta de Toledo - No iniciado - Sábado 7 Nov 12:00
    {
      seq: 23,
      customer: oc3.customer,
      addressId: oc3.addressId,
      planned_work: 'Revisión y tarado de presostato en grupo de presión de agua potable y comprobación de clapetas.',
      scheduled_at: '2026-11-07T12:00:00.000Z',
      status: 'no_iniciado',
      notes: 'Mantenimiento preventivo anual acordado con el administrador de la finca.',
      cau: 'AVISO-MANC-2026-104',
      buildingName: String(oc3.alias) + ' — Sala de Bombas y Aljibe Comunitario',
      operatorIds: [oper1Id],
    },
    // 24. Residencial Puerta de Toledo - En curso - Domingo 8 Nov 10:00
    {
      seq: 24,
      customer: oc3.customer,
      addressId: oc3.addressId,
      planned_work: 'Avería urgente en foso de ascensor bloque B: sustitución de electrobomba sumergible de achique.',
      scheduled_at: '2026-11-08T10:00:00.000Z',
      status: 'en_curso',
      notes: 'Acumulación de agua en foso. Ascensor bloqueado por seguridad hasta finalizar achique.',
      cau: 'AVISO-MANC-2026-105',
      buildingName: String(oc3.alias) + ' — Foso de Ascensor Bloque B',
      operatorIds: [oper1Id, oper2Id],
    },
    // 25. Particular D. Francisco García - Cerrado - Domingo 8 Nov 16:00
    {
      seq: 25,
      customer: oc4.customer,
      addressId: oc4.addressId,
      planned_work: 'Sustitución urgente de termo eléctrico de 80L por fuga en brida y cambio de llave de corte general.',
      scheduled_at: '2026-11-08T16:00:00.000Z',
      status: 'cerrado',
      notes: 'Vivienda sin suministro de agua caliente. Desmontaje de termo viejo y montaje de nuevo termo con latiguillos homologados.',
      cau: 'AVISO-PART-2026-015',
      buildingName: String(oc4.alias) + ' — Cocina y Cuarto de Baño',
      operatorIds: [oper1Id],
      totalAmountCents: 31000,
      closedAt: '2026-11-08T18:00:00.000Z',
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
    shopping_requests,
  };
}
