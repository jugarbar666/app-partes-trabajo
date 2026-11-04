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
import { appBackHandler } from '../services/appBackHandler';

describe('Navegación con retroceso de dispositivo/gestos y botón «X / Salir» en móviles y tablets', () => {
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
    appBackHandler.resetForTesting();
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
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.classList.remove('app-tablet-or-mobile-mode');
      document.documentElement.classList.remove('app-desktop-mode');
    }
  });

  describe('1. Comportamiento del retroceso (Botón físico, gestos laterales y popstate)', () => {
    it('cierra primero el menú lateral si está abierto, sin cambiar de pantalla', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPhone',
        maxTouchPoints: 5,
        width: 390,
        height: 844,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      // Abrir menú lateral
      const btnMenu = container.querySelector('[data-testid="btn-toggle-mobile-menu"]') as HTMLButtonElement;
      expect(btnMenu).toBeTruthy();
      await act(async () => {
        btnMenu.click();
      });

      const sidebar = container.querySelector('[data-testid="sidebar-navigation"]');
      expect(sidebar?.className).toContain('fixed inset-y-0 left-0 z-50');

      // Simular botón de retroceso (disparo de popstate)
      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // El menú debe haberse cerrado y la pantalla sigue siendo Inicio
      expect(sidebar?.className).toContain('hidden');
      const mobileHome = container.querySelector('[data-testid="admin-mobile-home-view"]');
      expect(mobileHome).toBeTruthy();
    });

    it('cierra primero el buscador desplegable en móvil antes de retroceder de pantalla', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
        width: 412,
        height: 915,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      // Abrir buscador desplegable
      const btnSearch = container.querySelector('[data-testid="btn-toggle-admin-mobile-search"]') as HTMLButtonElement;
      expect(btnSearch).toBeTruthy();
      await act(async () => {
        btnSearch.click();
      });

      const searchDropdown = container.querySelector('[data-testid="admin-mobile-search-dropdown"]');
      expect(searchDropdown).toBeTruthy();

      // Pulsar retroceso
      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // El buscador debe cerrarse primero
      expect(container.querySelector('[data-testid="admin-mobile-search-dropdown"]')).toBeNull();
      // Permanece en la pantalla
      expect(container.querySelector('[data-testid="admin-mobile-home-view"]')).toBeTruthy();
    });

    it('retrocede en orden entre varias pantallas de la aplicación conservando filtros y datos', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPad',
        maxTouchPoints: 5,
        width: 800,
        height: 1060,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      // Seleccionar un filtro en Inicio móvil (p. ej. 'en_curso')
      const selectStatus = container.querySelector('[data-testid="select-admin-mobile-status"]') as HTMLSelectElement;
      expect(selectStatus).toBeTruthy();
      await act(async () => {
        selectStatus.value = 'en_curso';
        selectStatus.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(selectStatus.value).toBe('en_curso');

      // Navegar a partes archivados
      const btnArchived = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Partes archivados')
      );
      expect(btnArchived).toBeTruthy();
      await act(async () => {
        btnArchived?.click();
      });

      expect(container.querySelector('[data-testid="archived-work-orders-mobile-list"]')).toBeTruthy();

      // Ejecutar retroceso
      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Vuelve a Inicio móvil y conserva el filtro 'en_curso'
      const backHome = container.querySelector('[data-testid="admin-mobile-home-view"]');
      expect(backHome).toBeTruthy();
      const reSelectStatus = container.querySelector('[data-testid="select-admin-mobile-status"]') as HTMLSelectElement;
      expect(reSelectStatus.value).toBe('en_curso');
    });

    it('en la pantalla inicial el retroceso repetido no realiza acción alguna ni sale de la aplicación', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 13; SM-X800) AppleWebKit/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 10,
        width: 1280,
        height: 800,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      // Ya estamos en la pantalla inicial (Dashboard / Inicio móvil)
      const homeView = container.querySelector('[data-testid="admin-mobile-home-view"]');
      expect(homeView).toBeTruthy();

      // Simular múltiples retrocesos consecutivos
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          window.dispatchEvent(new PopStateEvent('popstate'));
        });
      }

      // La aplicación sigue abierta en Inicio, no va a login ni a pantalla en blanco
      expect(container.querySelector('[data-testid="admin-mobile-home-view"]')).toBeTruthy();
      expect(container.querySelector('[data-testid="app-exited-screen"]')).toBeNull();
    });
  });

  describe('2. Botón de Salida «X / Salir»', () => {
    it('muestra el botón «X / Salir» visible con tamaño táctil y accesible en cabecera', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPhone',
        maxTouchPoints: 5,
        width: 390,
        height: 844,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      const btnExit = container.querySelector('[data-testid="btn-exit-app"]') as HTMLButtonElement;
      expect(btnExit).toBeTruthy();
      expect(btnExit.textContent).toContain('Salir');
      expect(btnExit.getAttribute('aria-label')).toBe('Salir de la aplicación');
    });

    it('al pulsar «Salir» muestra ventana de confirmación y permite cancelar', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPad',
        maxTouchPoints: 5,
        width: 768,
        height: 1024,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      const btnExit = container.querySelector('[data-testid="btn-exit-app"]') as HTMLButtonElement;
      await act(async () => {
        btnExit.click();
      });

      const confirmModal = container.querySelector('[data-testid="modal-exit-app-confirm"]');
      expect(confirmModal).toBeTruthy();
      expect(confirmModal?.textContent).toContain('¿Deseas salir de la aplicación?');

      // Cancelar
      const btnCancel = container.querySelector('[data-testid="btn-cancel-exit-app"]') as HTMLButtonElement;
      expect(btnCancel).toBeTruthy();
      await act(async () => {
        btnCancel.click();
      });

      expect(container.querySelector('[data-testid="modal-exit-app-confirm"]')).toBeNull();
      expect(container.querySelector('[data-testid="admin-mobile-home-view"]')).toBeTruthy();
    });

    it('al confirmar la salida muestra la pantalla de salida conservando la autenticación y permite volver', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
        width: 412,
        height: 915,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      const btnExit = container.querySelector('[data-testid="btn-exit-app"]') as HTMLButtonElement;
      await act(async () => {
        btnExit.click();
      });

      const btnConfirm = container.querySelector('[data-testid="btn-confirm-exit-app"]') as HTMLButtonElement;
      expect(btnConfirm).toBeTruthy();

      await act(async () => {
        btnConfirm.click();
      });

      // Pantalla de salida mostrada
      const exitedScreen = container.querySelector('[data-testid="app-exited-screen"]');
      expect(exitedScreen).toBeTruthy();
      expect(exitedScreen?.textContent).toContain('Has salido de la aplicación');

      // La sesión del usuario permanece guardada (distinción de logout)
      expect(defaultBackend.getCurrentUser()).toBeTruthy();
      expect(defaultBackend.getCurrentUser().id).toBeTruthy();

      // Botón para volver a entrar inmediatamente
      const btnReenter = container.querySelector('[data-testid="btn-reenter-app"]') as HTMLButtonElement;
      expect(btnReenter).toBeTruthy();

      await act(async () => {
        btnReenter.click();
      });

      // Vuelve a estar en la app con sesión iniciada
      expect(container.querySelector('[data-testid="app-exited-screen"]')).toBeNull();
      expect(container.querySelector('[data-testid="admin-mobile-home-view"]')).toBeTruthy();
    });
  });
});
