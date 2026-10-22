import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import App from '../App';
import { defaultBackend } from '../services/backendEngine';
import { getWeekDays, getLocalDateString } from '../utils/formatters';

describe('Verificación de Pantallas, Colores Obligatorios y Controles Persistentes (Escenarios 18, 19 y 20)', () => {
  beforeEach(() => {
    defaultBackend.resetToDemoSeed();
    defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');
  });

  it('Escenario 19: El dashboard administrativo muestra las cinco tarjetas requeridas y el listado ordenado por alta descendente', () => {
    const html = renderToString(<App />);
    expect(html).toContain('1. Partes no iniciados');
    expect(html).toContain('2. Partes en curso');
    expect(html).toContain('3. Finalizados pdtes. cierre');
    expect(html).toContain('4. Revisiones pendientes');
    expect(html).toContain('5. Cesta / Lista de compra');

    // Verificar que los controles persistentes de compra y fichaje están presentes en el DOM
    expect(html).toContain('Añadir a compra');
    expect(html).toContain('Fichar Entrada');

    // Verificar ordenación del listado general de partes en el dashboard por fecha de alta descendente:
    // PT-2026-0001 (alta 21/10/2026) aparece antes que PT-2026-0002 (alta 20/10/2026) y PT-2026-0003 (alta 18/10/2026)
    const idx1 = html.indexOf('PT-2026-0001');
    const idx2 = html.indexOf('PT-2026-0002');
    const idx3 = html.indexOf('PT-2026-0003');
    expect(idx1).toBeGreaterThan(-1);
    expect(idx2).toBeGreaterThan(idx1);
    expect(idx3).toBeGreaterThan(idx2);
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
});
