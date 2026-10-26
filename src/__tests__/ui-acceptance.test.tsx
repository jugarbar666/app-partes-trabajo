import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from '../App';
import { WorkOrderStatusBadge, UIConfirmationProvider } from '../components/CommonUI';
import { isMobilePreviewEnabled, isDemoUserSwitchEnabled } from '../config/branchConfig';
import { defaultBackend } from '../services/backendEngine';
import { getWeekDays, getLocalDateString } from '../utils/formatters';
import { MasterDataAndUsersModule } from '../components/AdminAndMasterModules';

describe('Verificación de Pantallas, Colores Obligatorios y Controles Persistentes (Escenarios 18, 19 y 20)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T10:00:00.000Z'));
    defaultBackend.resetToDemoSeed();
    defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');
  });

  it('Escenario 19: El dashboard administrativo muestra las cinco tarjetas requeridas y el listado ordenado por fecha prevista ascendente', () => {
    const html = renderToString(<App />);
    expect(html).toContain('1. Partes no iniciados');
    expect(html).toContain('2. Partes en curso');
    expect(html).toContain('3. Finalizados pdtes. cierre');
    expect(html).toContain('4. Revisiones pendientes');
    expect(html).toContain('5. Cesta / Lista de compra');

    // Verificar que los controles persistentes de compra y fichaje están presentes en el DOM
    expect(html).toContain('Añadir a compra');
    expect(html).toContain('Fichar Entrada');

    // Verificar ordenación del listado general de partes en el dashboard por fecha prevista ascendente:
    // PT-2026-0002 (previsto 21/10/2026) aparece antes que PT-2026-0001 (previsto 22/10/2026) y PT-2026-0003 (terminado al final)
    // Verificar ordenación del listado general de partes en el dashboard por fecha prevista estrictamente ascendente (sin tener en cuenta el estado)
    const listHtml = html.slice(html.indexOf('data-testid="dashboard-wo-list"'));
    const idx3 = listHtml.indexOf('PT-2026-0003');
    const idx2 = listHtml.indexOf('PT-2026-0002');
    const idx1 = listHtml.indexOf('PT-2026-0001');
    expect(idx3).toBeGreaterThan(-1);
    expect(idx2).toBeGreaterThan(idx3);
    expect(idx1).toBeGreaterThan(idx2);
  });

  it('Escenario 18 y 20: Colores obligatorios de estados (Azul, Naranja, Verde) y controles persistentes utilizables', () => {
    const html = renderToString(<App />);
    expect(html).toContain('Trabajo no iniciado');
    expect(html).toContain('Trabajo en curso');
    expect(html).toContain('Trabajo terminado');
    expect(html).toContain('bg-blue-600');
    expect(html).toContain('bg-amber-500');
    expect(html).toContain('bg-emerald-600');
  });

  it('Escenario Planing Semanal en Agenda Operativa: genera los 7 días y permite alternar entre semana actual y siguiente con horas', () => {
    // Semana actual con referencia 22/10/2026 (Jueves)
    const currentWeek = getWeekDays('2026-10-22', 0);
    expect(currentWeek).toHaveLength(7);
    expect(currentWeek[0].weekdayName).toBe('Lunes');
    expect(currentWeek[0].dateStr).toBe('2026-10-19');
    expect(currentWeek[3].weekdayName).toBe('Jueves');
    expect(currentWeek[3].isToday).toBe(true);
    expect(currentWeek[6].weekdayName).toBe('Domingo');
    expect(currentWeek[6].dateStr).toBe('2026-10-25');

    // Semana siguiente con offset 1
    const nextWeek = getWeekDays('2026-10-22', 1);
    expect(nextWeek).toHaveLength(7);
    expect(nextWeek[0].weekdayName).toBe('Lunes');
    expect(nextWeek[0].dateStr).toBe('2026-10-26');
    expect(nextWeek[6].weekdayName).toBe('Domingo');
    expect(nextWeek[6].dateStr).toBe('2026-11-01');

    // Verificación de extracción de fecha local para ordenación por horas
    const localDate = getLocalDateString('2026-10-22T09:30:00.000Z', 'Europe/Madrid');
    expect(localDate).toBe('2026-10-22');

    // Días laborables (Lunes a Viernes, excluyendo Sábado y Domingo)
    const workWeek = getWeekDays('2026-10-22', 0, 'Europe/Madrid', true);
    expect(workWeek).toHaveLength(5);
    expect(workWeek[0].weekdayName).toBe('Lunes');
    expect(workWeek[4].weekdayName).toBe('Viernes');

    // Verificación de visualización de operarios asignados en las tarjetas del planing semanal
    const html = renderToString(<App />);
    expect(html).toContain('data-testid="weekly-planning-board"');
    expect(html).toContain('planning-wo-operators-');
    expect(html).toContain('Op:');
  });

  it('Escenario Agenda: los partes terminados o cerrados pasan al final del día después de los pendientes', () => {
    const isWoFinished = (status: string) => status === 'terminado' || status === 'cerrado';
    const dayWos = [
      { id: '1', scheduled_at: '2026-10-22T08:00:00.000Z', status: 'terminado', code: 'PT-01' },
      { id: '2', scheduled_at: '2026-10-22T10:30:00.000Z', status: 'no_iniciado', code: 'PT-02' },
      { id: '3', scheduled_at: '2026-10-22T16:00:00.000Z', status: 'en_curso', code: 'PT-03' },
      { id: '4', scheduled_at: '2026-10-22T09:15:00.000Z', status: 'cerrado', code: 'PT-04' },
    ];

    dayWos.sort((a, b) => {
      const finA = isWoFinished(a.status);
      const finB = isWoFinished(b.status);
      if (finA !== finB) return finA ? 1 : -1;
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    });

    // Los pendientes van primero (PT-02 a las 10:30, luego PT-03 a las 16:00)
    expect(dayWos[0].code).toBe('PT-02');
    expect(dayWos[1].code).toBe('PT-03');
    // Los realizados pasan al final del día (PT-01 a las 08:00, luego PT-04 a las 09:15)
    expect(dayWos[2].code).toBe('PT-01');
    expect(dayWos[3].code).toBe('PT-04');
  });

  it('Verificación de Badge Reabierto: muestra texto Reabierto con fondo marrón (#78350f) y letras en negrita', () => {
    // 1. Con status reabierto directo
    const html1 = renderToString(<WorkOrderStatusBadge status="reabierto" compact />);
    expect(html1).toContain('Reabierto');
    expect(html1).toContain('bg-[#78350f]');
    expect(html1).toContain('font-bold');
    expect(html1).toContain('text-white');
    expect(html1).not.toContain('Cerrado');

    // 2. Con status cerrado pero habiendo sido reabierto posteriormente
    const html2 = renderToString(
      <WorkOrderStatusBadge
        status="cerrado"
        reopenedAt="2026-10-23T12:00:00.000Z"
        closedAt="2026-10-23T10:00:00.000Z"
        reopenReason="Revisar caldera de nuevo"
        compact
      />
    );
    expect(html2).toContain('Reabierto');
    expect(html2).toContain('bg-[#78350f]');
    expect(html2).toContain('font-bold');
    expect(html2).not.toContain('Cerrado');

    // 3. Versión extendida
    const html3 = renderToString(<WorkOrderStatusBadge status="reabierto" />);
    expect(html3).toContain('Parte reabierto');
    expect(html3).toContain('bg-[#78350f]');
    expect(html3).toContain('font-bold');
  });

  it('Control de selector de versiones móviles por rama: activo en pruebas y deshabilitado en empresa-fontaneria-roma', () => {
    const originalEnv = import.meta.env.VITE_SHOW_MOBILE_PREVIEW;
    try {
      // 1. En entorno de desarrollo / rama pruebas está activo
      (import.meta.env as any).VITE_SHOW_MOBILE_PREVIEW = 'true';
      expect(isMobilePreviewEnabled()).toBe(true);

      const htmlPruebas = renderToString(<App />);
      expect(htmlPruebas).toContain('Vista Móvil');
      expect(htmlPruebas).toContain('iPhone 15 Pro');

      // 2. Comprobación de que si se fuerza desactivación (como en producción fontanería roma), no aparece en el DOM
      (import.meta.env as any).VITE_SHOW_MOBILE_PREVIEW = 'false';
      expect(isMobilePreviewEnabled()).toBe(false);

      const htmlProd = renderToString(<App />);
      expect(htmlProd).not.toContain('header-mobile-view-container');
      expect(htmlProd).not.toContain('header-mobile-view-link');
    } finally {
      (import.meta.env as any).VITE_SHOW_MOBILE_PREVIEW = originalEnv;
    }
  });

  it('Control de selector de cambio de usuario por rama: activo en pruebas y bloqueado en empresa-fontaneria-roma (identificado fijo)', () => {
    const originalEnv = import.meta.env.VITE_ENABLE_DEMO_USER_SWITCH;
    try {
      // 1. En entorno de desarrollo / rama pruebas está activo para permitir pruebas
      (import.meta.env as any).VITE_ENABLE_DEMO_USER_SWITCH = 'true';
      expect(isDemoUserSwitchEnabled()).toBe(true);

      const htmlPruebas = renderToString(<App />);
      expect(htmlPruebas).toContain('select-active-session-user');

      // 2. Comprobación de que si se desactiva (como en producción fontanería roma), no aparece ningún desplegable de cambio de cuenta
      (import.meta.env as any).VITE_ENABLE_DEMO_USER_SWITCH = 'false';
      expect(isDemoUserSwitchEnabled()).toBe(false);

      const htmlProd = renderToString(<App />);
      expect(htmlProd).not.toContain('select-active-session-user');
      expect(htmlProd).not.toContain('Cambiar cuenta activa (Admin u Operario)');
      expect(htmlProd).toContain('header-identified-user-badge');
      expect(htmlProd).toContain('sidebar-identified-user-display');
    } finally {
      (import.meta.env as any).VITE_ENABLE_DEMO_USER_SWITCH = originalEnv;
    }
  });

  it('Botones de edición y capacidad de modificar en todos los ficheros maestros (clientes, domicilios, artículos, proveedores, tipos de revisión y usuarios)', () => {
    const html = renderToString(
      <UIConfirmationProvider>
        <MasterDataAndUsersModule backend={defaultBackend} onBack={() => {}} onRefresh={() => {}} />
      </UIConfirmationProvider>
    );
    // Verificamos que se renderizan botones con la acción Editar
    expect(html).toContain('Editar');
    expect(html).toContain('btn-edit-customer-');

    // 1. Edición de Cliente
    const customer = defaultBackend.getCustomers()[0];
    expect(customer).toBeDefined();
    const updatedCust = defaultBackend.saveCustomer({
      ...customer,
      name: customer.name + ' - Modificado',
      notes: 'Nota editada en test',
    });
    expect(updatedCust.id).toBe(customer.id);
    expect(updatedCust.name).toContain('- Modificado');

    // 2. Edición de Domicilio
    const address = defaultBackend.getCustomerAddresses(customer.id)[0];
    if (address) {
      const updatedAddr = defaultBackend.saveCustomerAddress({
        ...address,
        alias: address.alias + ' (Editado)',
      });
      expect(updatedAddr.id).toBe(address.id);
      expect(updatedAddr.alias).toContain('(Editado)');
    }

    // 3. Edición de Artículo
    const article = defaultBackend.getArticles()[0];
    expect(article).toBeDefined();
    const updatedArt = defaultBackend.saveArticle({
      ...article,
      purchase_price_cents: article.purchase_price_cents ?? 0,
      name: article.name + ' (Revisado)',
      sale_price_cents: 9999,
    });
    expect(updatedArt.id).toBe(article.id);
    expect(updatedArt.name).toContain('(Revisado)');
    expect(updatedArt.sale_price_cents).toBe(9999);

    // 4. Edición de Proveedor
    const supplier = defaultBackend.getSuppliers()[0];
    expect(supplier).toBeDefined();
    const updatedSup = defaultBackend.saveSupplier({
      ...supplier,
      notes: 'Condiciones renegociadas 2026',
    });
    expect(updatedSup.id).toBe(supplier.id);
    expect(updatedSup.notes).toBe('Condiciones renegociadas 2026');

    // 5. Edición de Tipo de Revisión
    const reviewType = defaultBackend.getReviewTypes()[0];
    expect(reviewType).toBeDefined();
    const updatedRt = defaultBackend.saveReviewType({
      ...reviewType,
      suggested_price_cents: 18500,
    });
    expect(updatedRt.id).toBe(reviewType.id);
    expect(updatedRt.suggested_price_cents).toBe(18500);

    // 6. Edición de Usuario
    const operario = defaultBackend.getProfiles().find((p) => p.role === 'operario');
    expect(operario).toBeDefined();
    if (operario) {
      const updatedUser = defaultBackend.updateUserProfile(operario.id, {
        full_name: operario.full_name + ' Modificado',
        phone: '600123456',
      });
      expect(updatedUser.id).toBe(operario.id);
      expect(updatedUser.full_name).toContain('Modificado');
      expect(updatedUser.phone).toBe('600123456');
    }
  });

  it('Aviso parpadeante de revisión próxima a realizar al lado del número en la tarjeta 4 del dashboard', () => {
    // 1. Con el dataset demo, existen revisiones pendientes para el 29 y 30 de octubre de 2026 (dentro de la ventana de 7 días)
    const htmlWithUpcoming = renderToString(<App />);
    expect(htmlWithUpcoming).toContain('4. Revisiones pendientes');
    expect(htmlWithUpcoming).toContain('Revisión próxima a realizar');
    expect(htmlWithUpcoming).toContain('animacion-parpadeo');

    // 2. Si las revisiones de esa ventana se marcan como realizadas, el aviso desaparece
    const occurrences = defaultBackend.getReviewOccurrences();
    occurrences.forEach((occ) => {
      defaultBackend.completeReviewOccurrenceAndScheduleNext({
        occurrence_id: occ.id,
        completed_date: '2026-10-25',
        next_due_date: '2027-10-25',
        notes: 'Revisión periódica ejecutada satisfactoriamente',
      });
    });

    const htmlCompleted = renderToString(<App />);
    expect(htmlCompleted).not.toContain('Revisión próxima a realizar');
  });
});

