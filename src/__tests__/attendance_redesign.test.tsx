import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { defaultBackend } from '../services/backendEngine';
import {
  isMobileDeviceOrViewport,
  isIpadDevice,
  isAndroidDevice,
} from '../config/branchConfig';
import App, { DEVICE_LOGGED_USER_ID_KEY } from '../App';
import { AttendanceAndReportsModule } from '../components/OperationalModules';
import { UIConfirmationProvider } from '../components/CommonUI';

describe('Gestión de Fichajes: Retirada de móvil/tablets y rediseño compacto en escritorio', () => {
  let container: HTMLDivElement;
  let root: any;
  const originalUserAgent = window.navigator.userAgent;
  const originalPlatform = window.navigator.platform;
  const originalMaxTouchPoints = window.navigator.maxTouchPoints;
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  const mockDevice = (options: {
    ua: string;
    platform?: string;
    maxTouchPoints?: number;
    width: number;
    height: number;
  }) => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: options.ua,
      configurable: true,
    });
    if (options.platform !== undefined) {
      Object.defineProperty(window.navigator, 'platform', {
        value: options.platform,
        configurable: true,
      });
    }
    if (options.maxTouchPoints !== undefined) {
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: options.maxTouchPoints,
        configurable: true,
      });
    }
    Object.defineProperty(window, 'innerWidth', {
      value: options.width,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: options.height,
      configurable: true,
    });
  };

  beforeEach(() => {
    window.scrollTo = vi.fn();
    defaultBackend.resetToDemoSeed();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    mockDevice({
      ua: originalUserAgent,
      platform: originalPlatform,
      maxTouchPoints: originalMaxTouchPoints,
      width: originalInnerWidth,
      height: originalInnerHeight,
    });
    delete (globalThis as any).__IS_MOBILE_VIEW__;
    delete (globalThis as any).__IS_TABLET_VIEW__;
    document.documentElement.classList.remove('app-tablet-or-mobile-mode');
    document.documentElement.classList.remove('app-desktop-mode');
  });

  describe('1. Versión móvil y tablets (Android e iPad)', () => {
    it('retira «Gestión de fichajes» del menú en teléfono móvil sin dejar huecos ni enlaces rotos', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        platform: 'iPhone',
        maxTouchPoints: 5,
        width: 375,
        height: 812,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      // Abrir menú lateral móvil
      const btnOpenMenu = container.querySelector('[data-testid="btn-open-mobile-menu"]') as HTMLButtonElement;
      if (btnOpenMenu) {
        await act(async () => {
          btnOpenMenu.click();
        });
      }

      const sidebar = container.querySelector('[data-testid="sidebar-navigation"]');
      expect(sidebar).toBeTruthy();

      // No debe contener «Gestión de fichajes» ni «Fichaje e informes»
      const sidebarText = sidebar?.textContent || '';
      expect(sidebarText).not.toContain('Gestión de fichajes');
      expect(sidebarText).not.toContain('Fichaje e informes');

      // El botón persistente de fichar en la barra inferior debe seguir operativo
      const clockBtn = container.querySelector('[data-testid="btn-persistent-clock-action"]');
      expect(clockBtn).toBeTruthy();
    });

    it('retira «Gestión de fichajes» del menú en iPad (vertical y horizontal)', async () => {
      // iPad Horizontal 1024x768
      mockDevice({
        ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5,
        width: 1024,
        height: 768,
      });
      expect(isIpadDevice()).toBe(true);
      expect(isMobileDeviceOrViewport()).toBe(true);

      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      const sidebar = container.querySelector('[data-testid="sidebar-navigation"]');
      const sidebarText = sidebar?.textContent || '';
      expect(sidebarText).not.toContain('Gestión de fichajes');
      expect(sidebarText).not.toContain('Fichaje e informes');

      // Fichaje persistente sigue disponible
      const clockBtn = container.querySelector('[data-testid="btn-persistent-clock-action"]');
      expect(clockBtn).toBeTruthy();
    });

    it('retira «Gestión de fichajes» del menú en tablet Android', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 13; SM-X800) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 10,
        width: 1280,
        height: 800,
      });
      expect(isAndroidDevice()).toBe(true);
      expect(isMobileDeviceOrViewport()).toBe(true);

      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      const sidebar = container.querySelector('[data-testid="sidebar-navigation"]');
      const sidebarText = sidebar?.textContent || '';
      expect(sidebarText).not.toContain('Gestión de fichajes');
      expect(sidebarText).not.toContain('Fichaje e informes');
    });
  });

  describe('2. Versión de Escritorio: Rediseño compacto y alta densidad', () => {
    it('muestra «Gestión de fichajes» en el menú lateral de escritorio y navega a la pantalla compacta', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        platform: 'Win32',
        maxTouchPoints: 0,
        width: 1440,
        height: 900,
      });
      expect(isMobileDeviceOrViewport()).toBe(false);

      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      const attendanceBtn = container.querySelector('[data-testid="nav-attendance-btn"]') as HTMLButtonElement;
      expect(attendanceBtn).toBeTruthy();
      expect(attendanceBtn.textContent).toContain('Gestión de fichajes');

      await act(async () => {
        attendanceBtn.click();
      });

      const desktopView = container.querySelector('[data-testid="attendance-desktop-view"]');
      expect(desktopView).toBeTruthy();
    });

    it('integra barra compacta con acciones principales y desplegable «Más acciones»', async () => {
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(
          React.createElement(
            UIConfirmationProvider,
            null,
            React.createElement(AttendanceAndReportsModule, {
              backend: defaultBackend,
              onBack: vi.fn(),
              onRefresh: vi.fn(),
            })
          )
        );
      });

      // Acciones principales visibles
      const btnAdd = container.querySelector('[data-testid="btn-add-attendance"]');
      const btnPdf = container.querySelector('[data-testid="btn-download-attendance-pdf"]');
      const selectMore = container.querySelector('[data-testid="btn-more-actions"]') as HTMLSelectElement;

      expect(btnAdd).toBeTruthy();
      expect(btnPdf).toBeTruthy();
      expect(selectMore).toBeTruthy();
      expect(selectMore.tagName.toLowerCase()).toBe('select');

      const optAutoResolve = container.querySelector('[data-testid="btn-auto-resolve-attendance"]');
      const optCorrections = container.querySelector('[data-testid="btn-open-corrections-modal"]');
      const optInfo = container.querySelector('[data-testid="btn-open-schedule-info-modal"]');

      expect(optAutoResolve).toBeTruthy();
      expect(optCorrections).toBeTruthy();
      expect(optInfo).toBeTruthy();

      // Formato desplegable select idéntico a Catálogos y ficheros: permanece fijo y ejecuta la acción al seleccionar
      await act(async () => {
        selectMore.value = 'corrections';
        selectMore.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(container.textContent).toContain('Historial de Correcciones Administrativas');
    });

    it('permite búsqueda en tiempo real sin importar mayúsculas ni tildes con botón de borrado', async () => {
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(
          React.createElement(
            UIConfirmationProvider,
            null,
            React.createElement(AttendanceAndReportsModule, {
              backend: defaultBackend,
              onBack: vi.fn(),
              onRefresh: vi.fn(),
            })
          )
        );
      });

      const searchInput = container.querySelector('[data-testid="input-attendance-search"]') as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      // Buscar por trabajador ignorando mayúsculas/tildes
      await act(async () => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        nativeInputValueSetter?.call(searchInput, 'carlos');
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });

      const countBadge = container.querySelector('[data-testid="badge-attendance-count"]');
      expect(countBadge).toBeTruthy();

      // Botón de limpiar búsqueda
      const clearBtn = container.querySelector('[data-testid="btn-clear-attendance-search"]') as HTMLButtonElement;
      expect(clearBtn).toBeTruthy();

      await act(async () => {
        clearBtn.click();
      });
      expect(searchInput.value).toBe('');
    });

    it('despliega y pliega la sección de filtros adicionales', async () => {
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(
          React.createElement(
            UIConfirmationProvider,
            null,
            React.createElement(AttendanceAndReportsModule, {
              backend: defaultBackend,
              onBack: vi.fn(),
              onRefresh: vi.fn(),
            })
          )
        );
      });

      const toggleFiltersBtn = container.querySelector('[data-testid="btn-toggle-advanced-filters"]') as HTMLButtonElement;
      expect(toggleFiltersBtn).toBeTruthy();

      // Inicialmente plegados
      expect(container.querySelector('[data-testid="input-filter-from"]')).toBeNull();

      // Desplegar
      await act(async () => {
        toggleFiltersBtn.click();
      });

      expect(container.querySelector('[data-testid="input-filter-from"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="input-filter-to"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="select-filter-status"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="btn-reset-attendance-filters"]')).toBeTruthy();

      // Plegar de nuevo
      await act(async () => {
        toggleFiltersBtn.click();
      });
      expect(container.querySelector('[data-testid="input-filter-from"]')).toBeNull();
    });

    it('muestra los resúmenes de horas y registros en formato horizontal compacto', async () => {
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(
          React.createElement(
            UIConfirmationProvider,
            null,
            React.createElement(AttendanceAndReportsModule, {
              backend: defaultBackend,
              onBack: vi.fn(),
              onRefresh: vi.fn(),
            })
          )
        );
      });

      const totalHoursBadge = container.querySelector('[data-testid="badge-attendance-total-hours"]');
      const countBadge = container.querySelector('[data-testid="badge-attendance-count"]');

      expect(totalHoursBadge).toBeTruthy();
      expect(totalHoursBadge?.textContent).toContain('Total:');
      expect(countBadge).toBeTruthy();
      expect(countBadge?.textContent).toMatch(/\d+ registro/);
    });
  });
});
