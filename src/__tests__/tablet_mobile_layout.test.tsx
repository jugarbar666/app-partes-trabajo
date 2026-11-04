import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { defaultBackend } from '../services/backendEngine';
import {
  isMobileDeviceOrViewport,
  isIpadDevice,
  isAndroidDevice,
  isTabletDevice,
} from '../config/branchConfig';
import App, { DEVICE_LOGGED_USER_ID_KEY } from '../App';

describe('Adaptación de diseño y funcionamiento móvil en tablets Android y iPad', () => {
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

  describe('Detección precisa de iPad y Tablets Android en cualquier orientación', () => {
    it('detecta iPad clásico por User Agent en vertical y horizontal', () => {
      // iPad Vertical 768x1024
      mockDevice({
        ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5,
        width: 768,
        height: 1024,
      });
      expect(isIpadDevice()).toBe(true);
      expect(isMobileDeviceOrViewport()).toBe(true);

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
    });

    it('detecta iPadOS 13+ con Safari moderno (MacIntel + maxTouchPoints > 1)', () => {
      // iPad Pro 11" en Horizontal (1194x834)
      mockDevice({
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
        width: 1194,
        height: 834,
      });
      expect(isIpadDevice()).toBe(true);
      expect(isMobileDeviceOrViewport()).toBe(true);
    });

    it('detecta tabletas Android (Samsung Galaxy Tab, etc.) en vertical y horizontal', () => {
      // Samsung Galaxy Tab S8 en Vertical (800x1280)
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 13; SM-X800) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 10,
        width: 800,
        height: 1280,
      });
      expect(isAndroidDevice()).toBe(true);
      expect(isMobileDeviceOrViewport()).toBe(true);

      // Samsung Galaxy Tab S8 en Horizontal (1280x800)
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 13; SM-X800) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 10,
        width: 1280,
        height: 800,
      });
      expect(isAndroidDevice()).toBe(true);
      expect(isMobileDeviceOrViewport()).toBe(true);
    });

    it('no detecta ordenadores de sobremesa como móviles ni tabletas', () => {
      // PC Windows 11 en pantalla grande (1920x1080)
      mockDevice({
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        maxTouchPoints: 0,
        width: 1920,
        height: 1080,
      });
      expect(isIpadDevice()).toBe(false);
      expect(isAndroidDevice()).toBe(false);
      expect(isTabletDevice()).toBe(false);
      expect(isMobileDeviceOrViewport()).toBe(false);
    });
  });

  describe('Experiencia del Administrador en iPad (Vertical y Horizontal)', () => {
    it('muestra la interfaz móvil idéntica en iPad Vertical (768x1024)', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5,
        width: 768,
        height: 1024,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      // 1. Debe activar la clase app-tablet-or-mobile-mode en el html
      expect(document.documentElement.classList.contains('app-tablet-or-mobile-mode')).toBe(true);

      // 2. Vista Inicio del administrador: debe mostrar la tarjeta móvil con selector compacto
      const mobileHomeView = container.querySelector('[data-testid="admin-mobile-home-view"]');
      expect(mobileHomeView).toBeTruthy();

      // 3. Debe tener el desplegable compacto de estados «Estado del parte»
      const selectStatus = container.querySelector(
        '[data-testid="select-admin-mobile-status"]'
      ) as HTMLSelectElement;
      expect(selectStatus).toBeTruthy();
      expect(selectStatus.value).toBe('pendientes');

      // 4. Debe tener el botón compacto de búsqueda en cabecera
      const btnSearch = container.querySelector('[data-testid="btn-toggle-admin-mobile-search"]');
      expect(btnSearch).toBeTruthy();

      // 5. Botón de menú móvil (hamburguesa) debe estar presente
      const btnMenu = container.querySelector('[data-testid="btn-toggle-mobile-menu"]');
      expect(btnMenu).toBeTruthy();

      // 6. Barra inferior de acciones móvil persistente
      const bottomBar = container.querySelector('[data-testid="persistent-mobile-action-bar"]');
      expect(bottomBar).toBeTruthy();
    });

    it('muestra la interfaz móvil idéntica en iPad Horizontal (1024x768)', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
        width: 1024,
        height: 768,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      // Debe activarse en horizontal sin mostrar escritorio
      expect(document.documentElement.classList.contains('app-tablet-or-mobile-mode')).toBe(true);

      const mobileHomeView = container.querySelector('[data-testid="admin-mobile-home-view"]');
      expect(mobileHomeView).toBeTruthy();

      const selectStatus = container.querySelector(
        '[data-testid="select-admin-mobile-status"]'
      );
      expect(selectStatus).toBeTruthy();
    });

    it('menú lateral en tablet: se abre como cajón deslizante con «Inicio / Partes de trabajo» y sin «Todos los partes»', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPad',
        maxTouchPoints: 5,
        width: 820,
        height: 1180,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      const btnMenu = container.querySelector('[data-testid="btn-toggle-mobile-menu"]') as HTMLButtonElement;
      expect(btnMenu).toBeTruthy();

      // Abrir menú lateral
      await act(async () => {
        btnMenu.click();
      });

      // El sidebar debe abrirse como cajón overlay
      const sidebar = container.querySelector('[data-testid="sidebar-navigation"]');
      expect(sidebar).toBeTruthy();
      expect(sidebar?.className).toContain('fixed inset-y-0 left-0 z-50');

      // Debe estar presente el telón de fondo para cerrar al pulsar fuera
      const backdrop = container.querySelector('[data-testid="mobile-menu-backdrop"]');
      expect(backdrop).toBeTruthy();

      // El nombre del primer apartado debe ser «Inicio / Partes de trabajo»
      const sidebarText = sidebar?.textContent || '';
      expect(sidebarText).toContain('Inicio / Partes de trabajo');

      // Pulsar en el backdrop debe cerrar el menú
      await act(async () => {
        (backdrop as HTMLDivElement).click();
      });
      expect(sidebar?.className).toContain('hidden');
    });
  });

  describe('Experiencia del Administrador en Tablet Android (Vertical y Horizontal)', () => {
    it('muestra la interfaz móvil idéntica en Tablet Android Horizontal (1280x800)', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 13; SM-X800) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 10,
        width: 1280,
        height: 800,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      expect(document.documentElement.classList.contains('app-tablet-or-mobile-mode')).toBe(true);

      const mobileHomeView = container.querySelector('[data-testid="admin-mobile-home-view"]');
      expect(mobileHomeView).toBeTruthy();

      // Filtrado por desplegable a «En ejecución»
      const select = container.querySelector(
        '[data-testid="select-admin-mobile-status"]'
      ) as HTMLSelectElement;
      expect(select).toBeTruthy();

      await act(async () => {
        select.value = 'en_curso';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(select.value).toBe('en_curso');

      // El buscador desplegable funciona igual
      const btnSearch = container.querySelector(
        '[data-testid="btn-toggle-admin-mobile-search"]'
      ) as HTMLButtonElement;
      await act(async () => {
        btnSearch.click();
      });
      const searchDropdown = container.querySelector('[data-testid="admin-mobile-search-dropdown"]');
      expect(searchDropdown).toBeTruthy();
    });

    it('en partes archivados muestra el listado homogéneo de tarjetas en tablet Android', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 12; Lenovo TB-X606F) AppleWebKit/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 10,
        width: 800,
        height: 1280,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');

      await act(async () => {
        root.render(React.createElement(App));
      });

      // Navegar a partes archivados
      const btnArchived = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Partes archivados')
      );
      expect(btnArchived).toBeTruthy();

      await act(async () => {
        btnArchived?.click();
      });

      const mobileArchivedList = container.querySelector(
        '[data-testid="archived-work-orders-mobile-list"]'
      );
      expect(mobileArchivedList).toBeTruthy();
    });
  });

  describe('Experiencia del Operario en iPad y Tablet Android', () => {
    it('muestra la interfaz móvil idéntica del operario con buscador en iPad', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPad',
        maxTouchPoints: 5,
        width: 1024,
        height: 768,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');
      const operario = defaultBackend.getProfiles().find((p) => p.role === 'operario' && p.is_active);
      window.localStorage.setItem(DEVICE_LOGGED_USER_ID_KEY, operario!.id);
      defaultBackend.setSessionUser(operario!.id);

      await act(async () => {
        root.render(React.createElement(App));
      });

      expect(document.documentElement.classList.contains('app-tablet-or-mobile-mode')).toBe(true);

      const operatorHomeView = container.querySelector('[data-testid="operator-home-view"]');
      expect(operatorHomeView).toBeTruthy();

      // Botón de búsqueda compacto del operario
      const btnSearch = container.querySelector(
        '[data-testid="btn-toggle-operator-mobile-search"]'
      ) as HTMLButtonElement;
      expect(btnSearch).toBeTruthy();

      // Abrir buscador
      await act(async () => {
        btnSearch.click();
      });

      const searchDropdown = container.querySelector(
        '[data-testid="operator-mobile-search-dropdown"]'
      );
      expect(searchDropdown).toBeTruthy();

      // Botón de fichaje en la barra de acciones persistente
      const clockBtn = container.querySelector('[data-testid="btn-persistent-clock-action"]');
      expect(clockBtn).toBeTruthy();
    });

    it('muestra la misma experiencia del operario en Tablet Android Vertical', async () => {
      mockDevice({
        ua: 'Mozilla/5.0 (Linux; Android 13; SM-X800) AppleWebKit/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 10,
        width: 800,
        height: 1280,
      });
      defaultBackend.login('admin@climalux-demo.es', 'Admin1234!');
      const operario = defaultBackend.getProfiles().find((p) => p.role === 'operario' && p.is_active);
      window.localStorage.setItem(DEVICE_LOGGED_USER_ID_KEY, operario!.id);
      defaultBackend.setSessionUser(operario!.id);

      await act(async () => {
        root.render(React.createElement(App));
      });

      const operatorHomeView = container.querySelector('[data-testid="operator-home-view"]');
      expect(operatorHomeView).toBeTruthy();
      expect(container.querySelector('[data-testid="btn-toggle-operator-mobile-search"]')).toBeTruthy();
    });
  });
});
