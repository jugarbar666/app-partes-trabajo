import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { InstallationBackendEngine } from '../services/backendEngine';
import { ReviewsAndNotificationsModule } from '../components/OperationalModules';
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

describe('Rediseño de Pantallas de Revisiones Periódicas (Móvil, Tablet y Escritorio)', () => {
  let backend: InstallationBackendEngine;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    backend = new InstallationBackendEngine();
    backend.resetToDemoSeed();
    backend.login('admin@climalux-demo.es', 'Admin1234!');

    // Creamos revisiones de prueba específicas
    const cust = backend.saveCustomer({
      code: 'CLI-REV-01',
      name: 'Residencial Los Álamos',
      tax_id: 'H98765432',
      contact_name: 'Administrador D. Sánchez',
      phones: ['926112233'],
      emails: ['alamos@comunidad.es'],
      main_address: 'Avda. del Rey 12',
      postal_code: '13004',
      city: 'Ciudad Real',
      province: 'Ciudad Real',
      notes: '',
      is_active: true,
    });

    const addr = backend.saveCustomerAddress({
      customer_id: cust.id,
      alias: 'Sala Calderas Central',
      address_line: 'Avda. del Rey 12, Sótano -1',
      postal_code: '13004',
      city: 'Ciudad Real',
      province: 'Ciudad Real',
      contact_name: 'D. Sánchez',
      contact_phone: '926112233',
      contact_email: 'alamos@comunidad.es',
      notes: '',
      is_active: true,
    });

    const rt = backend.getReviewTypes()[0];

    // 1. Revisión caducada
    backend.saveInstallationReview({
      customer_id: cust.id,
      customer_address_id: addr.id,
      review_type_id: rt.id,
      origin_work_order_id: null,
      last_review_date: null,
      next_review_date: '2026-10-15', // Caducada respecto a 2026-11-04
      status: 'pendiente',
      notes: 'Revisión anual obligatoria',
    });

    // 2. Revisión urgente (en plazo corto)
    backend.saveInstallationReview({
      customer_id: cust.id,
      customer_address_id: addr.id,
      review_type_id: rt.id,
      origin_work_order_id: null,
      last_review_date: null,
      next_review_date: '2026-11-08', // 4 días restante
      status: 'pendiente',
      notes: 'Comprobar presiones y válvulas',
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
    document.querySelectorAll('[data-testid^="modal-"]').forEach((el) => el.remove());
  });

  const renderModule = async (onRefresh = vi.fn(), onOpenCreateWorkOrderFromReview = vi.fn()) => {
    await act(async () => {
      root.render(
        <UIConfirmationProvider>
          <ReviewsAndNotificationsModule
            backend={backend}
            onBack={vi.fn()}
            onRefresh={onRefresh}
            onOpenCreateWorkOrderFromReview={onOpenCreateWorkOrderFromReview}
          />
        </UIConfirmationProvider>
      );
    });
  };

  it('1. muestra la cabecera compacta con buscador, selector rápido, botón filtros y más acciones', async () => {
    await renderModule();

    // Botón volver y título
    expect(container.querySelector('[data-testid="btn-reviews-back"]')).toBeTruthy();
    expect(container.textContent).toContain('Revisiones periódicas y avisos');

    // Buscador en tiempo real
    const searchInput = container.querySelector('[data-testid="input-review-search"]') as HTMLInputElement;
    expect(searchInput).toBeTruthy();
    expect(searchInput.placeholder).toContain('Buscar cliente');

    // Selector rápido de situación
    const selectStatus = container.querySelector('[data-testid="select-review-status-filter"]') as HTMLSelectElement;
    expect(selectStatus).toBeTruthy();

    // Botón de filtros adicionales
    const toggleFiltersBtn = container.querySelector('[data-testid="btn-toggle-filters"]');
    expect(toggleFiltersBtn).toBeTruthy();

    // Botón + Nueva Revisión
    const createBtn = container.querySelector('[data-testid="btn-create-review"]');
    expect(createBtn).toBeTruthy();

    // Desplegable «Más acciones»
    const moreActionsBtn = container.querySelector('[data-testid="btn-more-actions"]') as HTMLButtonElement;
    expect(moreActionsBtn).toBeTruthy();

    // Abrir Más acciones
    await act(async () => {
      moreActionsBtn.click();
    });

    const processQueueBtn = container.querySelector('[data-testid="btn-process-notification-queue"]');
    expect(processQueueBtn).toBeTruthy();
    expect(processQueueBtn?.textContent).toContain('Ejecutar Cola de Avisos Ahora');
  });

  it('2. el buscador localiza revisiones con coincidencias parciales ignorando mayúsculas y tildes', async () => {
    await renderModule();

    const searchInput = container.querySelector('[data-testid="input-review-search"]') as HTMLInputElement;

    // Búsqueda sin tilde: "alamos" encuentra "Residencial Los Álamos"
    await act(async () => {
      setInputValue(searchInput, 'alamos');
    });

    expect(container.textContent).toContain('Residencial Los Álamos');

    // Búsqueda por notas o dirección: "calderas"
    await act(async () => {
      setInputValue(searchInput, 'calderas');
    });
    expect(container.textContent).toContain('Residencial Los Álamos');

    // Botón de limpiar búsqueda
    const clearBtn = container.querySelector('[data-testid="btn-clear-review-search"]') as HTMLButtonElement;
    expect(clearBtn).toBeTruthy();
    await act(async () => {
      clearBtn.click();
    });
    expect(searchInput.value).toBe('');

    // Búsqueda sin coincidencias muestra mensaje amigable
    await act(async () => {
      setInputValue(searchInput, 'termino_inexistente_xyz');
    });
    expect(container.querySelector('[data-testid="review-empty-state"]')).toBeTruthy();
    expect(container.textContent).toContain('No hay revisiones que coincidan con los filtros');
  });

  it('3. los indicadores KPI compactos son interactivos y filtran el listado con un clic', async () => {
    await renderModule();

    const chipCaducadas = container.querySelector('[data-testid="chip-stat-caducadas"]') as HTMLButtonElement;
    expect(chipCaducadas).toBeTruthy();

    // Hacer clic en Caducadas filtra por vencidas
    await act(async () => {
      chipCaducadas.click();
    });

    const selectStatus = container.querySelector('[data-testid="select-review-status-filter"]') as HTMLSelectElement;
    expect(selectStatus.value).toBe('vencidas');

    // Muestra chip de filtro activo
    const chipsBar = container.querySelector('[data-testid="active-filters-chips"]');
    expect(chipsBar).toBeTruthy();
    expect(chipsBar?.textContent).toContain('Estado: Caducadas/Vencidas');

    // Botón limpiar todos los filtros restablece la vista
    const clearAllBtn = container.querySelector('[data-testid="btn-clear-all-filters"]') as HTMLButtonElement;
    await act(async () => {
      clearAllBtn.click();
    });

    expect(selectStatus.value).toBe('all');
    expect(container.querySelector('[data-testid="active-filters-chips"]')).toBeNull();
  });

  it('4. el panel de filtros adicionales se pliega y despliega con selector de cliente y fechas', async () => {
    await renderModule();

    // Por defecto está plegado
    expect(container.querySelector('[data-testid="panel-advanced-filters"]')).toBeNull();

    const toggleBtn = container.querySelector('[data-testid="btn-toggle-filters"]') as HTMLButtonElement;
    await act(async () => {
      toggleBtn.click();
    });

    // Ahora está visible
    expect(container.querySelector('[data-testid="panel-advanced-filters"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="select-filter-customer"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="input-filter-city"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="input-filter-date-from"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="input-filter-date-to"]')).toBeTruthy();
  });

  it('5. cada fila muestra información destacada y acciones operativas compactas con paginación', async () => {
    const onOpenCreateWo = vi.fn();
    await renderModule(vi.fn(), onOpenCreateWo);

    const occurrences = backend.getReviewOccurrences();
    expect(occurrences.length).toBeGreaterThan(0);

    const firstOcc = occurrences[0];
    const row = container.querySelector(`[data-testid="review-row-${firstOcc.id}"]`);
    expect(row).toBeTruthy();

    // Badge de alerta
    const badge = container.querySelector(`[data-testid="review-alert-badge-${firstOcc.id}"]`);
    expect(badge).toBeTruthy();

    // Botón reprogramar
    const rescheduleBtn = container.querySelector(`[data-testid="btn-reschedule-review-${firstOcc.id}"]`);
    expect(rescheduleBtn).toBeTruthy();

    // Selector de paginación
    const pageSizeSelect = container.querySelector('[data-testid="select-review-page-size"]') as HTMLSelectElement;
    expect(pageSizeSelect).toBeTruthy();

    // Botón generar parte
    const generateWoBtn = container.querySelector(`[data-testid="btn-create-wo-from-review-${firstOcc.id}"]`) as HTMLButtonElement;
    if (generateWoBtn) {
      await act(async () => {
        generateWoBtn.click();
      });
      expect(onOpenCreateWo).toHaveBeenCalled();
    }
  });
});
