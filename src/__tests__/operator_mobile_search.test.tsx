import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { defaultBackend } from '../services/backendEngine';
import App, { DEVICE_LOGGED_USER_ID_KEY } from '../App';

beforeEach(() => {
  window.scrollTo = vi.fn();
});

function typeIntoInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Buscador en cabecera para la versión móvil del Operador', () => {
  it('permite buscar partes asignados por cualquier campo, ver resultados rápidos y navegar al detalle', async () => {
    defaultBackend.resetToDemoSeed();
    defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

    const operario = defaultBackend.getProfiles().find((p) => p.role === 'operario' && p.is_active);
    expect(operario).toBeTruthy();

    // Asignar un parte al operario como admin antes de iniciar sesión con él
    const allWos = defaultBackend.getWorkOrders({ includeArchived: false });
    expect(allWos.length).toBeGreaterThan(0);
    defaultBackend.updateWorkOrderPlanningAndAssignments(allWos[0].id, {
      operator_ids: [operario!.id],
    });

    window.localStorage.setItem(DEVICE_LOGGED_USER_ID_KEY, operario!.id);
    defaultBackend.setSessionUser(operario!.id);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      // 1. Verificar que la vista de inicio del operario se muestra
      const operatorHomeView = container.querySelector('[data-testid="operator-home-view"]');
      expect(operatorHomeView).toBeTruthy();

      // 2. Verificar que el botón de búsqueda está presente en la cabecera
      const searchToggleBtn = container.querySelector(
        '[data-testid="btn-toggle-operator-mobile-search"]'
      ) as HTMLButtonElement;
      expect(searchToggleBtn).toBeTruthy();
      expect(searchToggleBtn.textContent).toContain('Buscar');

      // 3. Abrir el buscador desplegable pulsando el botón
      await act(async () => {
        searchToggleBtn.click();
      });

      const searchDropdown = container.querySelector(
        '[data-testid="operator-mobile-search-dropdown"]'
      );
      expect(searchDropdown).toBeTruthy();

      const searchInput = container.querySelector(
        '[data-testid="input-operator-mobile-search"]'
      ) as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      // 4. Escribir un término que coincida con un parte (ej. por código, cliente o trabajo)
      const operatorWos = defaultBackend.getWorkOrders();
      expect(operatorWos.length).toBeGreaterThan(0);
      const targetWo = operatorWos[0];
      const searchTerm = targetWo.code;

      await act(async () => {
        typeIntoInput(searchInput, searchTerm);
      });

      // Debe aparecer el resultado en la lista rápida desplegable
      const quickResultBtn = container.querySelector(
        `[data-testid="operator-mobile-search-result-${targetWo.id}"]`
      ) as HTMLButtonElement;
      expect(quickResultBtn).toBeTruthy();
      expect(quickResultBtn.textContent).toContain(targetWo.code);

      // 5. Pulsar sobre el resultado rápido: debe cerrar el buscador y navegar al detalle
      await act(async () => {
        quickResultBtn.click();
      });

      // El desplegable de búsqueda debe haberse cerrado
      expect(container.querySelector('[data-testid="operator-mobile-search-dropdown"]')).toBeNull();

      // Debe estar en el detalle del parte
      const detailContainer = container.querySelector('[data-testid="work-order-detail-top-container"]');
      expect(detailContainer).toBeTruthy();
      expect(detailContainer?.textContent).toContain(targetWo.code);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('muestra chip de filtro activo, permite borrar búsqueda y muestra estado vacío sin coincidencias', async () => {
    defaultBackend.resetToDemoSeed();
    defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');
    const operario = defaultBackend.getProfiles().find((p) => p.role === 'operario' && p.is_active);
    expect(operario).toBeTruthy();

    const allWos = defaultBackend.getWorkOrders({ includeArchived: false });
    defaultBackend.updateWorkOrderPlanningAndAssignments(allWos[0].id, {
      operator_ids: [operario!.id],
    });

    window.localStorage.setItem(DEVICE_LOGGED_USER_ID_KEY, operario!.id);
    defaultBackend.setSessionUser(operario!.id);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      const searchToggleBtn = container.querySelector(
        '[data-testid="btn-toggle-operator-mobile-search"]'
      ) as HTMLButtonElement;
      expect(searchToggleBtn).toBeTruthy();

      // Abrir buscador
      await act(async () => {
        searchToggleBtn.click();
      });

      const searchInput = container.querySelector(
        '[data-testid="input-operator-mobile-search"]'
      ) as HTMLInputElement;

      // Buscar término inexistente
      await act(async () => {
        typeIntoInput(searchInput, 'XYZ_TERMINO_INEXISTENTE_9999');
      });

      // Cerrar buscador con el botón Cerrar para verificar el chip de filtro activo
      const closeBtn = container.querySelector(
        '[data-testid="btn-close-operator-mobile-search"]'
      ) as HTMLButtonElement;
      await act(async () => {
        closeBtn.click();
      });

      // El panel desplegable está cerrado
      expect(container.querySelector('[data-testid="operator-mobile-search-dropdown"]')).toBeNull();

      // Debe mostrar el chip con "Filtro activo: XYZ_TERMINO_INEXISTENTE_9999"
      expect(container.textContent).toContain('Filtro activo:');
      expect(container.textContent).toContain('XYZ_TERMINO_INEXISTENTE_9999');

      // Debe mostrar el estado de búsqueda vacía
      const emptySearchBox = container.querySelector('[data-testid="operator-mobile-empty-search"]');
      expect(emptySearchBox).toBeTruthy();
      expect(emptySearchBox?.textContent).toContain('No se encontraron partes de trabajo que coincidan');

      // Pulsar botón de borrar búsqueda en el estado vacío
      const clearBtn = emptySearchBox?.querySelector('button') as HTMLButtonElement;
      expect(clearBtn).toBeTruthy();
      await act(async () => {
        clearBtn.click();
      });

      // El listado debe restablecerse y el estado vacío desaparecer
      expect(container.querySelector('[data-testid="operator-mobile-empty-search"]')).toBeNull();
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
