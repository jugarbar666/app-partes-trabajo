import { describe, it, expect, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchableSelect, SearchableSelectOption } from '../components/CommonUI';
import { defaultBackend } from '../services/backendEngine';
import App from '../App';

function typeIntoInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Selector de materiales con búsqueda integrada (Escritorio y Móvil)', () => {
  const sampleOptions: SearchableSelectOption[] = [
    {
      value: 'art-1',
      label: 'MAT-0001 — Abrazadera atornillar M/6 12 (ud)',
      sublabel: 'Abrazadera metálica M/6',
      keywords: ['MAT-0001', 'Abrazadera atornillar M/6 12', 'ud'],
    },
    {
      value: 'art-2',
      label: 'MAT-0002 — Abrazadera plastificada negra 18 (ud)',
      sublabel: 'Plastificada fontanería',
      keywords: ['MAT-0002', 'Abrazadera plastificada negra 18', 'ud'],
    },
    {
      value: 'art-3',
      label: 'MAT-0003 — Tubería de cobre 15 mm (m)',
      sublabel: 'Cobre rígido para agua sanitaria',
      keywords: ['MAT-0003', 'Tubería de cobre 15 mm', 'm'],
    },
    {
      value: 'art-4',
      label: 'MAT-0004 — Válvula de esfera 1/2 pulgada (ud)',
      sublabel: 'Corte de agua roscada',
      keywords: ['MAT-0004', 'Válvula de esfera 1/2 pulgada', 'ud'],
    },
  ];

  it('filtra opciones en tiempo real por texto parcial, código y sublabel ignorando mayúsculas y tildes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let selected = '';
    const handleChange = vi.fn((val: string) => {
      selected = val;
    });

    try {
      await act(async () => {
        root.render(
          React.createElement(SearchableSelect, {
            'data-testid': 'test-material-select',
            options: sampleOptions,
            value: selected,
            onChange: handleChange,
            placeholder: 'Escribe para buscar...',
          })
        );
      });

      const input = container.querySelector(
        '[data-testid="test-material-select-search-input"]'
      ) as HTMLInputElement;
      expect(input).toBeTruthy();

      // Abrir haciendo focus en el input
      await act(async () => {
        input.focus();
      });

      let dropdown = container.querySelector(
        '[data-testid="test-material-select-dropdown-list"]'
      );
      expect(dropdown).toBeTruthy();
      expect(dropdown?.querySelectorAll('[data-option-index]').length).toBe(4);

      // 1. Filtrar por texto parcial con tilde omitida: "tuberia" debe coincidir con "Tubería de cobre"
      await act(async () => {
        typeIntoInput(input, 'tuberia');
      });
      dropdown = container.querySelector(
        '[data-testid="test-material-select-dropdown-list"]'
      );
      expect(dropdown?.textContent).toContain('Tubería de cobre');
      expect(dropdown?.textContent).not.toContain('Abrazadera atornillar');

      // 2. Probar coincidencia por código: "0002"
      await act(async () => {
        typeIntoInput(input, '0002');
      });
      dropdown = container.querySelector(
        '[data-testid="test-material-select-dropdown-list"]'
      );
      expect(dropdown?.textContent).toContain('MAT-0002');
      expect(dropdown?.textContent).not.toContain('MAT-0001');

      // 3. Probar mayúsculas: "VALVULA"
      await act(async () => {
        typeIntoInput(input, 'VALVULA');
      });
      dropdown = container.querySelector(
        '[data-testid="test-material-select-dropdown-list"]'
      );
      expect(dropdown?.textContent).toContain('Válvula de esfera');
      expect(dropdown?.textContent).not.toContain('Abrazadera');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('muestra mensaje claro cuando no hay coincidencias y permite borrar la búsqueda', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let selected = '';
    const handleChange = vi.fn((val: string) => {
      selected = val;
    });

    try {
      await act(async () => {
        root.render(
          React.createElement(SearchableSelect, {
            'data-testid': 'test-material-select-empty',
            options: sampleOptions,
            value: selected,
            onChange: handleChange,
            placeholder: 'Buscar material...',
          })
        );
      });

      const input = container.querySelector(
        '[data-testid="test-material-select-empty-search-input"]'
      ) as HTMLInputElement;

      await act(async () => {
        input.focus();
        typeIntoInput(input, 'producto-inexistente-xyz');
      });

      const dropdown = container.querySelector(
        '[data-testid="test-material-select-empty-dropdown-list"]'
      );
      expect(dropdown?.textContent).toContain('No se encontraron artículos');
      expect(dropdown?.textContent).toContain('producto-inexistente-xyz');
      expect(dropdown?.textContent).toContain('Restablecer búsqueda');

      // Pulsar botón de borrar búsqueda del input
      const clearSearchBtn = container.querySelector(
        '[data-testid="test-material-select-empty-clear-search"]'
      ) as HTMLButtonElement;
      expect(clearSearchBtn).toBeTruthy();

      await act(async () => {
        clearSearchBtn.click();
      });

      // Tras limpiar la búsqueda, deben volver a mostrarse las 4 opciones
      const updatedDropdown = container.querySelector(
        '[data-testid="test-material-select-empty-dropdown-list"]'
      );
      expect(updatedDropdown?.querySelectorAll('[data-option-index]').length).toBe(4);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('permite navegación con teclado en escritorio (Flechas Arriba/Abajo, Enter y Escape)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let selected = '';
    const handleChange = vi.fn((val: string) => {
      selected = val;
    });

    try {
      await act(async () => {
        root.render(
          React.createElement(SearchableSelect, {
            'data-testid': 'test-material-select-kb',
            options: sampleOptions,
            value: selected,
            onChange: handleChange,
            placeholder: 'Seleccione artículo',
          })
        );
      });

      const input = container.querySelector(
        '[data-testid="test-material-select-kb-search-input"]'
      ) as HTMLInputElement;

      // 1. Abrir con ArrowDown
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      });

      let dropdown = container.querySelector(
        '[data-testid="test-material-select-kb-dropdown-list"]'
      );
      expect(dropdown).toBeTruthy();

      // 2. Moverse hacia abajo con ArrowDown
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      });

      // 3. Confirmar con Enter
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });

      // Debe haber seleccionado una opción y cerrado el desplegable
      expect(handleChange).toHaveBeenCalled();
      dropdown = container.querySelector(
        '[data-testid="test-material-select-kb-dropdown-list"]'
      );
      expect(dropdown).toBeNull();

      // 4. Probar Escape para cerrar
      await act(async () => {
        input.focus();
      });
      expect(container.querySelector('[data-testid="test-material-select-kb-dropdown-list"]')).toBeTruthy();

      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(container.querySelector('[data-testid="test-material-select-kb-dropdown-list"]')).toBeNull();
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('permite selección manual con clic del ratón o toque', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let selected = '';
    const handleChange = vi.fn((val: string) => {
      selected = val;
    });

    try {
      await act(async () => {
        root.render(
          React.createElement(SearchableSelect, {
            'data-testid': 'test-material-select-click',
            options: sampleOptions,
            value: selected,
            onChange: handleChange,
            placeholder: 'Seleccione artículo',
          })
        );
      });

      const input = container.querySelector(
        '[data-testid="test-material-select-click-search-input"]'
      ) as HTMLInputElement;

      await act(async () => {
        input.focus();
      });

      const option3 = container.querySelector(
        '[data-testid="test-material-select-click-option-art-3"]'
      ) as HTMLElement;
      expect(option3).toBeTruthy();

      await act(async () => {
        option3.click();
      });

      expect(handleChange).toHaveBeenCalledWith('art-3');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('integra el selector de materiales con buscador en el modal rápido de lista de compra de App', async () => {
    defaultBackend.resetToDemoSeed();
    defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(React.createElement(App));
      });

      // Abrir el modal rápido pulsando el botón persistente "Añadir a compra"
      const quickShopBtn = container.querySelector(
        '[data-testid="btn-persistent-add-to-shopping"]'
      ) as HTMLButtonElement;
      expect(quickShopBtn).toBeTruthy();

      await act(async () => {
        quickShopBtn.click();
      });

      // El modal debe contener el SearchableSelect con data-testid="select-quick-shop-article"
      const searchInput = container.querySelector(
        '[data-testid="select-quick-shop-article-search-input"]'
      ) as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      // Abrir desplegable
      await act(async () => {
        searchInput.focus();
      });

      const dropdown = container.querySelector(
        '[data-testid="select-quick-shop-article-dropdown-list"]'
      );
      expect(dropdown).toBeTruthy();

      // Buscar por tilde/parcial: "tubo"
      await act(async () => {
        typeIntoInput(searchInput, 'tubo');
      });

      // Debe haber opciones filtradas
      const filteredItems = dropdown?.querySelectorAll('[data-option-index]');
      expect(filteredItems && filteredItems.length > 0).toBe(true);

      // Seleccionar la primera opción
      const firstOption = filteredItems![0] as HTMLElement;
      await act(async () => {
        firstOption.click();
      });

      // Enviar el formulario del modal
      const form = container.querySelector('form') as HTMLFormElement;
      expect(form).toBeTruthy();

      await act(async () => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });

      // Comprobar que el artículo se ha registrado en la lista de compra
      const shoppingList = defaultBackend.getShoppingRequests();
      expect(shoppingList.length).toBeGreaterThan(0);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
