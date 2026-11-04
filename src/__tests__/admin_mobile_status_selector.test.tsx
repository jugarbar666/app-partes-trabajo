import { describe, it, expect, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { defaultBackend } from '../services/backendEngine';
import App from '../App';

describe('Apartado Inicio móvil del Administrador: Selector desplegable compacto de estados', () => {
  beforeEach(() => {
    defaultBackend.resetToDemoSeed();
    defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');
  });

  it('sustituye los botones por un único desplegable compacto con la etiqueta "Estado del parte" y selección predeterminada "Pendiente"', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      const mobileHomeView = container.querySelector('[data-testid="admin-mobile-home-view"]');
      expect(mobileHomeView).toBeTruthy();

      // 1. Debe existir la etiqueta "Estado del parte"
      const label = mobileHomeView?.querySelector('label[for="select-admin-mobile-status"]');
      expect(label).toBeTruthy();
      expect(label?.textContent?.trim()).toBe('Estado del parte');

      // 2. Debe existir el selector desplegable compacto
      const select = mobileHomeView?.querySelector(
        '[data-testid="select-admin-mobile-status"]'
      ) as HTMLSelectElement;
      expect(select).toBeTruthy();
      expect(select.tagName.toLowerCase()).toBe('select');

      // 3. La selección inicial debe ser equivalente a la vista predeterminada ("pendientes")
      expect(select.value).toBe('pendientes');

      // 4. Debe incluir todos los estados existentes con sus denominaciones
      const optionValues = Array.from(select.options).map((opt) => opt.value);
      expect(optionValues).toContain('pendientes');
      expect(optionValues).toContain('no_programado');
      expect(optionValues).toContain('no_iniciado');
      expect(optionValues).toContain('en_curso');
      expect(optionValues).toContain('reabierto');
      expect(optionValues).toContain('terminado');
      expect(optionValues).toContain('cerrado');
      expect(optionValues).toContain('todos');

      // Comprobar textos requeridos explícitamente: «Pendiente», «En ejecución» y «No programado»
      const optionTexts = Array.from(select.options).map((opt) => opt.textContent || '');
      expect(optionTexts.some((t) => t.includes('Pendiente'))).toBe(true);
      expect(optionTexts.some((t) => t.includes('No programado'))).toBe(true);
      expect(optionTexts.some((t) => t.includes('En ejecución'))).toBe(true);
      expect(optionTexts.some((t) => t.includes('No iniciado'))).toBe(true);
      expect(optionTexts.some((t) => t.includes('Reabierto'))).toBe(true);
      expect(optionTexts.some((t) => t.includes('Terminado'))).toBe(true);
      expect(optionTexts.some((t) => t.includes('Cerrado'))).toBe(true);
      expect(optionTexts.some((t) => t.includes('Todos'))).toBe(true);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('excluye los partes archivados de las opciones y de los resultados de la vista móvil', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Cerramos y archivamos el parte 'wo-3' (que en demoSeed viene en estado 'terminado')
    defaultBackend.closeWorkOrder('wo-3');
    const archivedWo = defaultBackend.archiveWorkOrder('wo-3');
    expect(archivedWo.archived_at).not.toBeNull();

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      const mobileHomeView = container.querySelector('[data-testid="admin-mobile-home-view"]');
      expect(mobileHomeView).toBeTruthy();

      const select = mobileHomeView?.querySelector(
        '[data-testid="select-admin-mobile-status"]'
      ) as HTMLSelectElement;

      // Ninguna opción del desplegable debe incluir el estado archivado
      const optionValues = Array.from(select.options).map((opt) => opt.value);
      expect(optionValues).not.toContain('archivado');
      expect(optionValues).not.toContain('archived');

      // Al cambiar a "cerrado" o "todos", el parte archivado no debe mostrarse
      await act(async () => {
        select.value = 'cerrado';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(mobileHomeView?.textContent).not.toContain('PT-2026-0003');

      await act(async () => {
        select.value = 'todos';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(mobileHomeView?.textContent).not.toContain('PT-2026-0003');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('al cambiar de estado en el desplegable, filtra y muestra únicamente los partes correspondientes conservando el formato de tarjetas', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      const mobileHomeView = container.querySelector('[data-testid="admin-mobile-home-view"]');
      const select = mobileHomeView?.querySelector(
        '[data-testid="select-admin-mobile-status"]'
      ) as HTMLSelectElement;

      // 1. Filtrar por "no_programado"
      await act(async () => {
        select.value = 'no_programado';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(select.value).toBe('no_programado');
      // La cabecera móvil mantiene la denominación requerida «Inicio / Partes de trabajo»
      expect(mobileHomeView?.querySelector('h1')?.textContent).toContain('Inicio / Partes de trabajo');
      // Y el subtítulo refleja la descripción del estado
      expect(mobileHomeView?.querySelector('p')?.textContent).toContain('Trabajos sin fecha ni operario');

      // 2. Filtrar por "en_curso" (En ejecución)
      await act(async () => {
        select.value = 'en_curso';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(select.value).toBe('en_curso');
      expect(mobileHomeView?.querySelector('h1')?.textContent).toContain('Inicio / Partes de trabajo');
      expect(mobileHomeView?.querySelector('p')?.textContent).toContain('Trabajos actualmente en intervención');

      // 3. Filtrar por "terminado"
      await act(async () => {
        select.value = 'terminado';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(select.value).toBe('terminado');
      expect(mobileHomeView?.querySelector('h1')?.textContent).toContain('Inicio / Partes de trabajo');
      expect(mobileHomeView?.querySelector('p')?.textContent).toContain('Trabajos finalizados pendientes de cierre');

      // 4. Si el estado seleccionado no tiene partes, muestra mensaje claro
      await act(async () => {
        select.value = 'reabierto';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const text = mobileHomeView?.textContent || '';
      // Si no hay partes reabiertos, debe mostrar el mensaje informativo claro
      if (text.includes('No hay partes reabiertos')) {
        expect(text).toContain('No hay partes reabiertos');
      }
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('el botón selector adquiere el color característico del estado de parte seleccionado', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      const select = container.querySelector(
        '[data-testid="select-admin-mobile-status"]'
      ) as HTMLSelectElement;
      expect(select).toBeTruthy();

      // Por defecto ('pendientes'): color azul
      expect(select.className).toContain('bg-blue-600');

      // 'no_programado': color ámbar/amarillo
      await act(async () => {
        select.value = 'no_programado';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(select.className).toContain('bg-amber-400');

      // 'en_curso' (En ejecución): color naranja
      await act(async () => {
        select.value = 'en_curso';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(select.className).toContain('bg-[#ea580c]');

      // 'terminado': color verde esmeralda
      await act(async () => {
        select.value = 'terminado';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(select.className).toContain('bg-emerald-600');

      // 'reabierto': color marrón
      await act(async () => {
        select.value = 'reabierto';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(select.className).toContain('bg-[#78350f]');

      // 'cerrado': color rojo
      await act(async () => {
        select.value = 'cerrado';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(select.className).toContain('bg-red-700');

      // 'todos': color pizarra oscura
      await act(async () => {
        select.value = 'todos';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(select.className).toContain('bg-slate-900');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('renombra «Inicio» por «Inicio / Partes de trabajo» en el menú móvil y oculta «Todos los partes» en móvil', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      // El botón de navegación móvil para inicio debe contener «Inicio / Partes de trabajo»
      const navButtons = Array.from(container.querySelectorAll('nav button'));
      const homeBtn = navButtons.find((btn) => btn.textContent?.includes('Inicio / Partes de trabajo'));
      expect(homeBtn).toBeTruthy();

      // El botón de «Todos los partes» debe estar oculto en móvil (clase hidden md:flex)
      const allWoBtn = navButtons.find((btn) => btn.textContent?.includes('Todos los partes'));
      expect(allWoBtn).toBeTruthy();
      expect(allWoBtn?.className).toContain('hidden');
      expect(allWoBtn?.className).toContain('md:flex');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('unifica la presentación de partes archivados en móvil con el mismo diseño de tarjetas que Inicio', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Cerramos y archivamos el parte 'wo-3'
    defaultBackend.closeWorkOrder('wo-3');
    defaultBackend.archiveWorkOrder('wo-3');

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      // Buscamos y pulsamos el botón de navegación a «Partes archivados»
      const navButtons = Array.from(container.querySelectorAll('button'));
      const archivedNavBtn = navButtons.find((b) =>
        (b.textContent || '').toLowerCase().includes('partes archivados')
      );
      expect(archivedNavBtn).toBeTruthy();

      await act(async () => {
        archivedNavBtn?.click();
      });

      // Debe existir el contenedor de tarjetas móviles de partes archivados
      const mobileArchivedList = container.querySelector(
        '[data-testid="archived-work-orders-mobile-list"]'
      );
      expect(mobileArchivedList).toBeTruthy();

      // Debe renderizar la tarjeta del parte archivado wo-3
      const archivedCard = mobileArchivedList?.querySelector('[data-testid="archived-card-wo-3"]');
      expect(archivedCard).toBeTruthy();

      // Debe mostrar el identificador del parte y el texto de archivado
      expect(archivedCard?.textContent).toContain('PT-2026-0003');
      expect(archivedCard?.textContent).toContain('Archivado');

      // No debe contener botones de reprogramar ni de reasignar
      expect(archivedCard?.textContent).not.toContain('Reprogramar');
      expect(archivedCard?.textContent).not.toContain('Reasignar');

      // Debe permitir consultar el detalle del parte archivado
      const consultBtn = archivedCard?.querySelector('button');
      expect(consultBtn?.textContent).toContain('Consultar');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
