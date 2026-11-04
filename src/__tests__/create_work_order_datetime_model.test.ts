import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { DateTimePickerField } from '../components/CommonUI';
import { DateTimeWheelModal } from '../components/DateTimeWheelModal';

describe('Modelo unificado de fecha y hora en creación de partes (Escritorio y Móvil)', () => {
  it('DateTimePickerField abre la ventana emergente con formato de ruedas de referencia', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let selectedValue = '';
    const handleChange = vi.fn((val: string) => {
      selectedValue = val;
    });

    try {
      await act(async () => {
        root.render(
          React.createElement(DateTimePickerField, {
            value: selectedValue,
            onChange: handleChange,
            testId: 'test-create-wo-dtp',
            placeholder: 'Pendiente de programar (pulsa para establecer)',
            title: 'Establecer fecha y hora',
            subtitle: 'Alta de nuevo parte de trabajo',
          })
        );
      });

      // El disparador debe mostrar el placeholder inicial
      const triggerBtn = container.querySelector('[data-testid="test-create-wo-dtp"]') as HTMLElement;
      expect(triggerBtn).toBeTruthy();
      expect(triggerBtn.textContent).toContain('Pendiente de programar');

      // Modal debe estar cerrado inicialmente
      expect(container.querySelector('[data-testid="test-create-wo-dtp-picker-popover"]')).toBeNull();

      // Al pulsar el disparador, se abre el modal emergente con formato de ruedas
      await act(async () => {
        triggerBtn.click();
      });

      const modal = container.querySelector('[data-testid="test-create-wo-dtp-picker-popover"]');
      expect(modal).toBeTruthy();
      expect(modal?.textContent).toContain('Establecer fecha y hora');
      expect(modal?.textContent).toContain('Alta de nuevo parte de trabajo');

      // Debe contener las ruedas de Día, Mes, Año y Hora, Minuto
      expect(container.querySelector('[data-testid="wheel-column-day"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="wheel-column-month"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="wheel-column-year"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="wheel-column-hour"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="wheel-column-minute"]')).toBeTruthy();

      // Debe contener los botones Establecer, Cancelar y Borrar
      const establishBtn = container.querySelector('[data-testid="test-create-wo-dtp-accept-btn"]') as HTMLButtonElement;
      expect(establishBtn).toBeTruthy();
      expect(establishBtn.textContent).toContain('Establecer');

      const cancelBtn = container.querySelector('[data-testid="test-create-wo-dtp-cancel-btn"]') as HTMLButtonElement;
      expect(cancelBtn).toBeTruthy();
      expect(cancelBtn.textContent).toContain('Cancelar');

      const clearBtn = container.querySelector('[data-testid="test-create-wo-dtp-clear-action-btn"]') as HTMLButtonElement;
      expect(clearBtn).toBeTruthy();
      expect(clearBtn.textContent).toContain('Borrar');

      // Pulsar Establecer
      await act(async () => {
        establishBtn.click();
      });

      // Debe haber llamado a handleChange con una fecha válida
      expect(handleChange).toHaveBeenCalled();
      expect(handleChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it('el botón Borrar del modal limpia la fecha seleccionada para dejarla como pendiente de programar', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    let selectedValue = '2026-11-20T10:30';
    const handleChange = vi.fn((val: string) => {
      selectedValue = val;
    });

    try {
      await act(async () => {
        root.render(
          React.createElement(DateTimePickerField, {
            value: selectedValue,
            onChange: handleChange,
            testId: 'test-create-wo-clear',
          })
        );
      });

      const triggerBtn = container.querySelector('[data-testid="test-create-wo-clear"]') as HTMLElement;
      expect(triggerBtn.textContent).toContain('20/11/2026');
      expect(triggerBtn.textContent).toContain('10:30');

      // Abrir modal
      await act(async () => {
        triggerBtn.click();
      });

      // Pulsar Borrar
      const clearBtn = container.querySelector('[data-testid="test-create-wo-clear-clear-action-btn"]') as HTMLButtonElement;
      expect(clearBtn).toBeTruthy();

      await act(async () => {
        clearBtn.click();
      });

      expect(handleChange).toHaveBeenCalledWith('');
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
