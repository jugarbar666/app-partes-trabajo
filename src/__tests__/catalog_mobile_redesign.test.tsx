import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { InstallationBackendEngine } from '../services/backendEngine';
import { MasterDataAndUsersModule } from '../components/AdminAndMasterModules';
import { UIConfirmationProvider } from '../components/CommonUI';

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Rediseño del Catálogo de Ficheros (Móvil y Tablet)', () => {
  let backend: InstallationBackendEngine;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).__IS_MOBILE_VIEW__ = true;
    (globalThis as any).__IS_TABLET_VIEW__ = true;

    backend = new InstallationBackendEngine();
    backend.resetToDemoSeed();
    backend.login('admin@climalux-demo.es', 'Admin1234!');

    // Poblamos datos de prueba específicos con tildes y mayúsculas
    backend.saveArticle({
      code: 'TUB-01',
      name: 'Tubería de Cobre Reforzada 15mm',
      description: 'Tubería estándar para fontanería y calefacción',
      unit: 'm',
      purchase_price_cents: 250,
      sale_price_cents: 500,
      supplier_id: null,
      is_active: true,
    });

    backend.saveArticle({
      code: 'COD-90',
      name: 'Codo Cobre Hembra 90º',
      description: 'Accesorio de fontanería',
      unit: 'ud',
      purchase_price_cents: 80,
      sale_price_cents: 180,
      supplier_id: null,
      is_active: true,
    });

    backend.saveCustomer({
      code: 'CLI-001',
      name: 'Álvaro Giménez García',
      tax_id: '12345678Z',
      contact_name: 'Álvaro',
      phones: ['600112233'],
      emails: ['alvaro@ejemplo.es'],
      main_address: 'Calle Mayor 14, 2ºB',
      postal_code: '13001',
      city: 'Ciudad Real',
      province: 'Ciudad Real',
      notes: '',
      is_active: true,
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.remove();
    }
    // Limpiar modales abiertos en document.body
    document.querySelectorAll('[data-testid^="modal-empty-catalog"]').forEach((el) => el.remove());
  });

  const renderModule = async (initialTab: any = 'articles', onRefresh = vi.fn()) => {
    await act(async () => {
      root.render(
        <UIConfirmationProvider>
          <MasterDataAndUsersModule
            backend={backend}
            initialTab={initialTab}
            onBack={vi.fn()}
            onRefresh={onRefresh}
          />
        </UIConfirmationProvider>
      );
    });
  };

  it('1. muestra la cabecera compacta con desplegables y buscador visible en móvil/tablet', async () => {
    await renderModule('articles');

    // Debe mostrar la cabecera compacta móvil
    const compactHeader = container.querySelector('[data-testid="catalog-mobile-compact-header"]');
    expect(compactHeader).toBeTruthy();

    // Desplegable Tipo de Fichero
    const selectType = container.querySelector('[data-testid="select-catalog-type"]') as HTMLSelectElement;
    expect(selectType).toBeTruthy();
    expect(selectType.value).toBe('articles');

    // Desplegable Acción
    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    expect(selectAction).toBeTruthy();

    // Botón Ejecutar Acción
    const executeBtn = container.querySelector('[data-testid="btn-execute-catalog-action"]');
    expect(executeBtn).toBeTruthy();

    // Buscador visible con contador
    const searchInput = container.querySelector('[data-testid="input-catalog-search"]');
    expect(searchInput).toBeTruthy();

    const searchCount = container.querySelector('[data-testid="catalog-search-count"]');
    expect(searchCount).toBeTruthy();
    expect(searchCount?.textContent).toContain(' / ');

    // No debe mostrar la barra de pestañas voluminosa de escritorio
    expect(container.querySelector('[data-testid="tab-articles"]')).toBeNull();
  });

  it('2. el buscador localiza registros con coincidencias parciales ignorando mayúsculas y tildes', async () => {
    await renderModule('articles');

    const searchInput = container.querySelector('[data-testid="input-catalog-search"]') as HTMLInputElement;

    // Búsqueda sin tildes: "tuberia" encuentra "Tubería de Cobre Reforzada 15mm"
    await act(async () => {
      setInputValue(searchInput, 'tuberia');
    });

    expect(container.textContent).toContain('Tubería de Cobre Reforzada 15mm');
    expect(container.textContent).not.toContain('Codo Cobre Hembra 90º');

    // Búsqueda en mayúsculas: "TUB"
    await act(async () => {
      setInputValue(searchInput, 'TUB');
    });
    expect(container.textContent).toContain('Tubería de Cobre Reforzada 15mm');
    expect(container.textContent).not.toContain('Codo Cobre Hembra 90º');

    // Búsqueda sin resultados: muestra mensaje amigable y botón para limpiar
    await act(async () => {
      setInputValue(searchInput, 'producto_inexistente_xyz');
    });

    const emptyBox = container.querySelector('[data-testid="catalog-empty-search-results"]');
    expect(emptyBox).toBeTruthy();
    expect(emptyBox?.textContent).toContain('No se encontraron registros para «producto_inexistente_xyz»');

    // Pulsar botón de limpiar búsqueda en el mensaje
    const clearBtn = container.querySelector('[data-testid="btn-clear-search-empty-state"]') as HTMLButtonElement;
    await act(async () => {
      clearBtn.click();
    });

    expect(container.textContent).toContain('Tubería de Cobre Reforzada 15mm');
    expect(container.textContent).toContain('Codo Cobre Hembra 90º');
  });

  it('3. buscar en clientes con tildes y nombres parciales funciona con acentos', async () => {
    await renderModule('customers');

    const searchInput = container.querySelector('[data-testid="input-catalog-search"]') as HTMLInputElement;

    // Búsqueda sin tildes: "alvaro gimenez" debe encontrar a "Álvaro Giménez García"
    await act(async () => {
      setInputValue(searchInput, 'alvaro gimenez');
    });
    expect(container.textContent).toContain('Álvaro Giménez García');

    // Búsqueda por NIF
    await act(async () => {
      setInputValue(searchInput, '12345678Z');
    });
    expect(container.textContent).toContain('Álvaro Giménez García');

    // Botón X de limpiar búsqueda
    const clearIconBtn = container.querySelector('[data-testid="btn-clear-catalog-search"]') as HTMLButtonElement;
    expect(clearIconBtn).toBeTruthy();
    await act(async () => {
      clearIconBtn.click();
    });
    expect(searchInput.value).toBe('');
  });

  it('4. cambiar de fichero en el desplegable actualiza las opciones de acción y el listado', async () => {
    await renderModule('articles');

    const selectType = container.querySelector('[data-testid="select-catalog-type"]') as HTMLSelectElement;

    // Cambiar a clientes
    await act(async () => {
      setSelectValue(selectType, 'customers');
    });

    expect(container.textContent).toContain('Álvaro Giménez García');

    // Cambiar a proveedores
    await act(async () => {
      setSelectValue(selectType, 'suppliers');
    });

    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    expect(selectAction.innerHTML).toContain('Exportar Proveedores');
  });

  it('5. vaciar catálogo muestra exactamente dos ventanas emergentes consecutivas en rojo', async () => {
    const onRefresh = vi.fn();
    await renderModule('articles', onRefresh);

    // Seleccionar acción "clear_catalog"
    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    await act(async () => {
      setSelectValue(selectAction, 'clear_catalog');
    });

    // El botón se transforma en "Vaciar" en rojo
    const executeBtn = container.querySelector('[data-testid="btn-execute-catalog-action"]') as HTMLButtonElement;
    expect(executeBtn.textContent).toContain('Vaciar');

    await act(async () => {
      executeBtn.click();
    });

    // VENTANA 1 EN ROJO (Paso 1)
    const step1 = document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]');
    expect(step1).toBeTruthy();
    expect(step1?.textContent).toContain('Confirmación 1 de 2 · Alcance y Dependencias');
    expect(step1?.textContent).toContain('¿Vaciar catálogo de Artículos?');

    // Cancelar en Paso 1 no modifica nada
    const cancelBtn1 = step1?.querySelector('[data-testid="btn-empty-catalog-cancel"]') as HTMLButtonElement;
    await act(async () => {
      cancelBtn1.click();
    });
    expect(document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]')).toBeNull();
    expect(backend.getArticles(true).length).toBeGreaterThan(0);

    // Reabrir y pulsar Continuar -> Paso 2
    await act(async () => {
      executeBtn.click();
    });
    const step1Reopened = document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]');
    const continueBtn = step1Reopened?.querySelector('[data-testid="btn-empty-catalog-continue"]') as HTMLButtonElement;
    await act(async () => {
      continueBtn.click();
    });

    // VENTANA 2 EN ROJO OSCURO (Paso 2)
    expect(document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]')).toBeNull();
    const step2 = document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]');
    expect(step2).toBeTruthy();
    expect(step2?.textContent).toContain('Confirmación 2 de 2 · Advertencia Irreversible');
    expect(step2?.textContent).toContain('¡ESTA ACCIÓN ES TOTALMENTE IRREVERSIBLE!');

    // Cancelar en Paso 2 no modifica nada
    const cancelBtn2 = step2?.querySelector('[data-testid="btn-empty-catalog-cancel-step2"]') as HTMLButtonElement;
    await act(async () => {
      cancelBtn2.click();
    });
    expect(document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]')).toBeNull();
    expect(backend.getArticles(true).length).toBeGreaterThan(0);

    // Reabrir, avanzar y confirmar definitivamente
    await act(async () => {
      executeBtn.click();
    });
    const step1Final = document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]');
    await act(async () => {
      (step1Final?.querySelector('[data-testid="btn-empty-catalog-continue"]') as HTMLButtonElement).click();
    });

    const step2Final = document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]');
    const confirmFinalBtn = step2Final?.querySelector('[data-testid="btn-empty-catalog-confirm-step2"]') as HTMLButtonElement;
    await act(async () => {
      confirmFinalBtn.click();
    });

    // Se cierra y el catálogo de artículos queda vacío
    expect(document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]')).toBeNull();
    expect(backend.getArticles(true).length).toBe(0);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('6. vaciar un catálogo que ya está vacío se ejecuta de forma segura sin fallos', async () => {
    backend.clearCatalog('articles');
    expect(backend.getArticles(true).length).toBe(0);

    await renderModule('articles');

    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    await act(async () => {
      setSelectValue(selectAction, 'clear_catalog');
    });

    const executeBtn = container.querySelector('[data-testid="btn-execute-catalog-action"]') as HTMLButtonElement;
    await act(async () => {
      executeBtn.click();
    });

    // Paso 1 muestra 0 registros
    const step1 = document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]');
    expect(step1?.textContent).toContain('0 registros');

    // Avanzar y confirmar
    await act(async () => {
      (step1?.querySelector('[data-testid="btn-empty-catalog-continue"]') as HTMLButtonElement).click();
    });

    const step2 = document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]');
    await act(async () => {
      (step2?.querySelector('[data-testid="btn-empty-catalog-confirm-step2"]') as HTMLButtonElement).click();
    });

    expect(document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]')).toBeNull();
    expect(backend.getArticles(true).length).toBe(0);
  });

  it('7. el vaciado afecta a todos los registros aunque exista una búsqueda activa', async () => {
    await renderModule('articles');

    // Filtramos para ver solo "codo"
    const searchInput = container.querySelector('[data-testid="input-catalog-search"]') as HTMLInputElement;
    await act(async () => {
      setInputValue(searchInput, 'codo');
    });

    // La lista muestra solo 1 artículo
    expect(container.textContent).toContain('Codo Cobre Hembra 90º');
    expect(container.textContent).not.toContain('Tubería de Cobre Reforzada 15mm');

    // Abrimos vaciar catálogo
    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    await act(async () => {
      setSelectValue(selectAction, 'clear_catalog');
    });
    const executeBtn = container.querySelector('[data-testid="btn-execute-catalog-action"]') as HTMLButtonElement;
    await act(async () => {
      executeBtn.click();
    });

    // El Paso 1 indica el total real y advierte sobre el alcance global
    const step1 = document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]');
    expect(step1?.textContent).toContain('El vaciado afectará a TODOS los registros del fichero, independientemente de que tengas una búsqueda o filtros activos');

    // Avanzar y confirmar
    await act(async () => {
      (step1?.querySelector('[data-testid="btn-empty-catalog-continue"]') as HTMLButtonElement).click();
    });
    const step2 = document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]');
    await act(async () => {
      (step2?.querySelector('[data-testid="btn-empty-catalog-confirm-step2"]') as HTMLButtonElement).click();
    });

    // TODOS los artículos eliminados
    expect(backend.getArticles(true).length).toBe(0);
  });
});
