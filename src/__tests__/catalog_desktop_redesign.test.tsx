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

describe('Rediseño del Catálogo de Ficheros (Escritorio y Tablet)', () => {
  let backend: InstallationBackendEngine;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // Modo escritorio por defecto en estas pruebas
    (globalThis as any).__IS_MOBILE_VIEW__ = false;
    (globalThis as any).__IS_TABLET_VIEW__ = false;

    backend = new InstallationBackendEngine();
    backend.resetToDemoSeed();
    backend.login('admin@climalux-demo.es', 'Admin1234!');

    // Registros de prueba
    backend.saveArticle({
      code: 'TER-DIG-01',
      name: 'Termostato Digital Programable V2',
      description: 'Termostato digital con pantalla LCD retroiluminada',
      unit: 'ud',
      purchase_price_cents: 3500,
      sale_price_cents: 7200,
      supplier_id: null,
      is_active: true,
    });

    backend.saveCustomer({
      code: 'CLI-DESK-01',
      name: 'Comunidad de Propietarios Alcalá 45',
      tax_id: 'H12345678',
      contact_name: 'Presidente F. Gómez',
      phones: ['912345678'],
      emails: ['alcala45@comunidad.es'],
      main_address: 'Calle Alcalá 45',
      postal_code: '13002',
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

  it('1. muestra la cabecera compacta con desplegables, buscador y botón nuevo en escritorio reduciendo el espacio vertical', async () => {
    await renderModule('articles');

    // Debe mostrar la cabecera compacta
    const compactHeader = container.querySelector('[data-testid="catalog-mobile-compact-header"]');
    expect(compactHeader).toBeTruthy();

    // Desplegable Tipo de Fichero
    const selectType = container.querySelector('[data-testid="select-catalog-type"]') as HTMLSelectElement;
    expect(selectType).toBeTruthy();
    expect(selectType.value).toBe('articles');

    // Desplegable Acción con las operaciones disponibles
    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    expect(selectAction).toBeTruthy();
    expect(selectAction.innerHTML).toContain('Exportar Artículos (Excel)');
    expect(selectAction.innerHTML).toContain('Imprimir / Descargar Listado (PDF)');

    // Botón Ejecutar Acción
    const executeBtn = container.querySelector('[data-testid="btn-execute-catalog-action"]');
    expect(executeBtn).toBeTruthy();

    // Botón Nuevo Artículo
    const newBtn = container.querySelector('[data-testid="btn-catalog-create-new"]');
    expect(newBtn).toBeTruthy();
    expect(newBtn?.textContent).toContain('Nuevo Artículo');

    // Buscador visible y compacto con contador
    const searchInput = container.querySelector('[data-testid="input-catalog-search"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();

    const searchCount = container.querySelector('[data-testid="catalog-search-count"]');
    expect(searchCount).toBeTruthy();

    // No debe existir el grupo voluminoso de pestañas tipo botón ni barras secundarias de botones
    expect(container.querySelector('[data-testid="tab-articles"]')).toBeNull();
    expect(container.textContent).not.toContain('Acciones con Artículos:');
  });

  it('2. en tablet renderiza los mismos controles compactos optimizados para pantalla táctil', async () => {
    (globalThis as any).__IS_TABLET_VIEW__ = true;
    await renderModule('customers');

    const selectType = container.querySelector('[data-testid="select-catalog-type"]') as HTMLSelectElement;
    expect(selectType).toBeTruthy();
    expect(selectType.value).toBe('customers');

    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    expect(selectAction.innerHTML).toContain('Exportar Clientes (Excel)');
    expect(selectAction.innerHTML).toContain('Imprimir / Descargar Listado (PDF)');
    expect(selectAction.innerHTML).toContain('Vaciar catálogo');

    expect(container.textContent).not.toContain('Acciones con Clientes:');
  });

  it('3. el buscador en escritorio filtra por coincidencias parciales ignorando mayúsculas y tildes', async () => {
    await renderModule('articles');

    const searchInput = container.querySelector('[data-testid="input-catalog-search"]') as HTMLInputElement;

    // Búsqueda sin tilde: "termostato" debe encontrar "Termostato Digital Programable V2"
    await act(async () => {
      setInputValue(searchInput, 'termostato');
    });

    expect(container.textContent).toContain('Termostato Digital Programable V2');

    // Búsqueda en mayúsculas: "TER-DIG"
    await act(async () => {
      setInputValue(searchInput, 'TER-DIG');
    });
    expect(container.textContent).toContain('Termostato Digital Programable V2');

    // Búsqueda sin resultados: mensaje amigable y limpiar
    await act(async () => {
      setInputValue(searchInput, 'no_existe_nada');
    });

    const emptyBox = container.querySelector('[data-testid="catalog-empty-search-results"]');
    expect(emptyBox).toBeTruthy();
    expect(emptyBox?.textContent).toContain('No se encontraron registros para «no_existe_nada»');

    const clearBtn = container.querySelector('[data-testid="btn-clear-search-empty-state"]') as HTMLButtonElement;
    await act(async () => {
      clearBtn.click();
    });

    expect(container.textContent).toContain('Termostato Digital Programable V2');
  });

  it('4. vaciar catálogo muestra exactamente dos ventanas emergentes consecutivas en rojo y borra permanentemente del servidor', async () => {
    const onRefresh = vi.fn();
    await renderModule('articles', onRefresh);

    const initialCount = backend.getArticles().length;
    expect(initialCount).toBeGreaterThan(0);

    // Seleccionar acción "clear_catalog"
    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    await act(async () => {
      setSelectValue(selectAction, 'clear_catalog');
    });

    const executeBtn = container.querySelector('[data-testid="btn-execute-catalog-action"]') as HTMLButtonElement;
    expect(executeBtn.textContent).toContain('Vaciar');

    await act(async () => {
      executeBtn.click();
    });

    // VENTANA 1 EN ROJO
    const step1 = document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]');
    expect(step1).toBeTruthy();
    expect(step1?.textContent).toContain('Confirmación 1 de 2 · Alcance y Dependencias');
    expect(step1?.textContent).toContain('¿Vaciar catálogo de Artículos?');
    expect(step1?.textContent).toContain('⚠️ El vaciado afectará a TODOS los registros del fichero');
    expect(step1?.textContent).toContain('Alcance del purgado y respaldos:');

    // Pulsar "Continuar" para ir al Paso 2
    const continueBtn = step1?.querySelector('[data-testid="btn-empty-catalog-continue"]') as HTMLButtonElement;
    await act(async () => {
      continueBtn.click();
    });

    // VENTANA 2 EN ROJO
    expect(document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]')).toBeNull();
    const step2 = document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]');
    expect(step2).toBeTruthy();
    expect(step2?.textContent).toContain('Confirmación 2 de 2 · Advertencia Irreversible');
    expect(step2?.textContent).toContain('Eliminación definitiva de Artículos');
    expect(step2?.textContent).toContain('¡ESTA ACCIÓN ES TOTALMENTE IRREVERSIBLE!');

    // Pulsar "Vaciar definitivamente"
    const confirmBtn = step2?.querySelector('[data-testid="btn-empty-catalog-confirm-step2"]') as HTMLButtonElement;
    await act(async () => {
      confirmBtn.click();
    });

    // Verificamos que se han eliminado del servidor/backend y registrado lápidas
    expect(backend.getArticles().length).toBe(0);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('5. vaciar catálogo con una búsqueda activa afecta a todos los registros del fichero tal como se advierte', async () => {
    const onRefresh = vi.fn();
    await renderModule('customers', onRefresh);

    const initialTotal = backend.getCustomers().length;
    expect(initialTotal).toBeGreaterThan(0);

    // Aplicar búsqueda que solo coincide con 1 cliente
    const searchInput = container.querySelector('[data-testid="input-catalog-search"]') as HTMLInputElement;
    await act(async () => {
      setInputValue(searchInput, 'Alcalá 45');
    });

    // Seleccionar Vaciar catálogo
    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    await act(async () => {
      setSelectValue(selectAction, 'clear_catalog');
    });

    const executeBtn = container.querySelector('[data-testid="btn-execute-catalog-action"]') as HTMLButtonElement;
    await act(async () => {
      executeBtn.click();
    });

    const step1 = document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]');
    expect(step1?.textContent).toContain(`${initialTotal} registros`);

    const continueBtn = step1?.querySelector('[data-testid="btn-empty-catalog-continue"]') as HTMLButtonElement;
    await act(async () => {
      continueBtn.click();
    });

    const step2 = document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]');
    const confirmBtn = step2?.querySelector('[data-testid="btn-empty-catalog-confirm-step2"]') as HTMLButtonElement;
    await act(async () => {
      confirmBtn.click();
    });

    // Se han vaciado TODOS los clientes del catálogo, no solo el filtrado
    expect(backend.getCustomers().length).toBe(0);
  });

  it('6. comunica errores del servidor en la segunda ventana emergente sin bloquear la interfaz', async () => {
    await renderModule('articles');

    const selectAction = container.querySelector('[data-testid="select-catalog-action"]') as HTMLSelectElement;
    await act(async () => {
      setSelectValue(selectAction, 'clear_catalog');
    });

    const executeBtn = container.querySelector('[data-testid="btn-execute-catalog-action"]') as HTMLButtonElement;
    await act(async () => {
      executeBtn.click();
    });

    const step1 = document.body.querySelector('[data-testid="modal-empty-catalog-step-1"]');
    const continueBtn = step1?.querySelector('[data-testid="btn-empty-catalog-continue"]') as HTMLButtonElement;
    await act(async () => {
      continueBtn.click();
    });

    // Simulamos fallo del servidor en clearCatalog
    vi.spyOn(backend, 'clearCatalog').mockImplementationOnce(() => {
      throw new Error('Fallo simulado de comunicación con el servidor central');
    });

    const step2 = document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]');
    const confirmBtn = step2?.querySelector('[data-testid="btn-empty-catalog-confirm-step2"]') as HTMLButtonElement;
    await act(async () => {
      confirmBtn.click();
    });

    // La ventana muestra el error
    expect(step2?.textContent).toContain('Fallo simulado de comunicación con el servidor central');

    // Los botones siguen habilitados y permiten cancelar
    const cancelBtn2 = step2?.querySelector('[data-testid="btn-empty-catalog-cancel-step2"]') as HTMLButtonElement;
    expect(cancelBtn2.disabled).toBe(false);
    await act(async () => {
      cancelBtn2.click();
    });
    expect(document.body.querySelector('[data-testid="modal-empty-catalog-step-2"]')).toBeNull();
  });
});
