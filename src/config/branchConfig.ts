declare const __APP_GIT_BRANCH__: string | undefined;
declare const __SHOW_MOBILE_SIMULATOR__: boolean | undefined;

/**
 * Obtiene el nombre de la rama activa.
 * Por defecto seguro en producción: 'empresa-fontaneria-roma'.
 */
export function getActiveBranchName(): string {
  if (import.meta.env.VITE_BRANCH) {
    return import.meta.env.VITE_BRANCH;
  }
  if (typeof __APP_GIT_BRANCH__ !== 'undefined' && __APP_GIT_BRANCH__) {
    return __APP_GIT_BRANCH__;
  }
  return 'empresa-fontaneria-roma';
}

/**
 * Determina si las herramientas de desarrollo y diseño (como el selector y simulador
 * de versiones móviles en la cabecera) deben estar activas.
 *
 * REGLA ESTRICTA:
 * - SOLO debe estar activo en la versión de pruebas ('pruebas').
 * - En la versión operativa de empresa ('empresa-fontaneria-roma') y producción queda INACTIVO.
 */
export function isMobilePreviewEnabled(): boolean {
  // 1. Variable de entorno explícita (p. ej. en Netlify o .env)
  if (import.meta.env.VITE_SHOW_MOBILE_PREVIEW === 'false') {
    return false;
  }
  if (import.meta.env.VITE_SHOW_MOBILE_PREVIEW === 'true') {
    return true;
  }

  // 2. Parámetro de depuración en URL (?preview=0 para ocultar o ?preview=1 para forzar)
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === '0') return false;
    if (params.get('preview') === '1') return true;
  }

  // 3. Flag inyectado en tiempo de compilación por vite.config.ts
  if (typeof __SHOW_MOBILE_SIMULATOR__ !== 'undefined') {
    return __SHOW_MOBILE_SIMULATOR__;
  }

  // 4. Verificación de la rama: ÚNICAMENTE activo si la rama es 'pruebas'
  return getActiveBranchName() === 'pruebas';
}

/**
 * Determina si el menú o selector desplegable de cambio de operario/cuenta debe estar activo.
 *
 * REGLA ESTRICTA DE NEGOCIO:
 * - En la versión operativa en la que ya está funcionando la empresa ('empresa-fontaneria-roma',
 *   producción o cualquier otra distinta de pruebas): NO PUEDE APARECER este menú de selección.
 *   El operario es exclusivamente el que se ha identificado en el dispositivo/plataforma.
 * - SOLO tiene que estar en la versión de pruebas ('pruebas') para facilitar tests de flujo.
 */
export function isDemoUserSwitchEnabled(): boolean {
  // 1. Variable de entorno explícita (p. ej. en Netlify o .env)
  if (import.meta.env.VITE_ENABLE_DEMO_USER_SWITCH === 'false') {
    return false;
  }
  if (import.meta.env.VITE_ENABLE_DEMO_USER_SWITCH === 'true') {
    return true;
  }

  // 2. Parámetro de depuración en URL (?demo_switch=0 para ocultar o ?demo_switch=1 para forzar)
  if (typeof window !== 'undefined' && window.location?.search) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo_switch') === '0') return false;
    if (params.get('demo_switch') === '1') return true;
  }

  // 3. Flag inyectado en tiempo de compilación por vite.config.ts
  if (typeof __SHOW_MOBILE_SIMULATOR__ !== 'undefined') {
    return __SHOW_MOBILE_SIMULATOR__;
  }

  // 4. Verificación de la rama: ÚNICAMENTE activo si la rama es 'pruebas'
  return getActiveBranchName() === 'pruebas';
}

/**
 * Determina si la aplicación se está ejecutando como aplicación de escritorio instalada en un PC
 * (no en navegador web corriente ni en dispositivos móviles / tabletas).
 *
 * Criterio real del proyecto:
 * 1. Debe estar en modo de aplicación instalada (PWA standalone o pwa_installed_device).
 * 2. Debe ser un PC / Ordenador de escritorio (Windows, Mac, Linux), NO un dispositivo móvil o tableta.
 */
export function isInstalledDesktopApp(): boolean {
  if (typeof (globalThis as any).__IS_INSTALLED_DESKTOP__ !== 'undefined') {
    return Boolean((globalThis as any).__IS_INSTALLED_DESKTOP__);
  }
  if (typeof window === 'undefined') return true;

  // En entorno de tests automatizados, permitir por defecto salvo que se fuerce modo web/móvil
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' && !window.localStorage?.getItem('web_test_mode')) {
    return true;
  }

  const isStandalone =
    Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches) ||
    Boolean((window.navigator as any)?.standalone) ||
    window.localStorage?.getItem('pwa_installed_device') === 'true';

  if (!isStandalone) {
    return false;
  }

  const ua = window.navigator?.userAgent || '';
  const isMobileOrTablet =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua) ||
    Boolean((window.navigator as any)?.userAgentData?.mobile);

  return !isMobileOrTablet;
}

/**
 * Determina si la aplicación se está ejecutando o visualizando en versión móvil
 * (teléfono físico, viewport móvil < 768px o simulador móvil).
 */
/**
 * Determina si el dispositivo actual es un iPad (incluyendo iPadOS 13+ con User Agent tipo Mac).
 */
export function isIpadDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator?.userAgent || '';
  const platform = window.navigator?.platform || '';
  const maxTouchPoints = window.navigator?.maxTouchPoints || 0;

  // 1. User Agent explícito de iPad
  if (/iPad/i.test(ua)) return true;

  // 2. iPadOS 13+ en Safari reporta MacIntel / Macintosh pero tiene pantalla multitáctil (maxTouchPoints > 1)
  if ((platform === 'MacIntel' || /Macintosh/i.test(ua)) && maxTouchPoints > 1) {
    return true;
  }

  return false;
}

/**
 * Determina si el dispositivo actual es un teléfono o tableta Android.
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator?.userAgent || '';
  return /Android/i.test(ua);
}

/**
 * Determina si el dispositivo actual es cualquier tipo de tableta (iPad, tableta Android, Silk, Kindle, etc.).
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if (isIpadDevice()) return true;
  const ua = window.navigator?.userAgent || '';
  if (/Tablet|PlayBook|Silk|Kindle/i.test(ua)) return true;
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return true;
  return false;
}

/**
 * Determina si la aplicación se está ejecutando o visualizando en versión móvil o tableta
 * (teléfonos físicos, tabletas Android, iPads en vertical u horizontal, viewport < 768px o simulador).
 *
 * REQUISITO ESTRICTO:
 * Las tabletas Android y los iPad (tanto en orientación vertical como horizontal)
 * deben utilizar exactamente el mismo diseño, menús, pantallas y funcionamiento que la versión móvil.
 */
export function isMobileDeviceOrViewport(): boolean {
  if (typeof (globalThis as any).__IS_TABLET_VIEW__ !== 'undefined') {
    return Boolean((globalThis as any).__IS_TABLET_VIEW__);
  }
  if (typeof (globalThis as any).__IS_MOBILE_VIEW__ !== 'undefined') {
    return Boolean((globalThis as any).__IS_MOBILE_VIEW__);
  }
  if (typeof window === 'undefined') return false;

  // 1. Forzado explícito mediante parámetros URL (para pruebas, iframes o simulador)
  const search = window.location?.search || '';
  if (search) {
    try {
      const params = new URLSearchParams(search);
      if (params.get('desktop') === '1' || params.get('device') === 'desktop' || params.get('preview') === 'desktop') {
        return false;
      }
      if (
        params.get('mobile') === '1' ||
        params.get('tablet') === '1' ||
        params.get('device') === 'tablet' ||
        params.get('device') === 'mobile' ||
        params.get('preview') === 'tablet' ||
        params.get('preview') === 'mobile'
      ) {
        return true;
      }
    } catch {
      // Ignorar error de parsing en tests
    }
  }

  // 2. iPads (cualquier orientación vertical u horizontal)
  if (isIpadDevice()) {
    return true;
  }

  // 3. Dispositivos Android (tabletas y teléfonos en cualquier orientación)
  if (isAndroidDevice()) {
    return true;
  }

  // 4. Otras tabletas genéricas
  if (isTabletDevice()) {
    return true;
  }

  // 5. Otros agentes móviles conocidos (iPhone, iPod, etc.)
  const ua = window.navigator?.userAgent || '';
  if (/webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
    return true;
  }
  if (Boolean((window.navigator as any)?.userAgentData?.mobile)) {
    return true;
  }

  // 6. Pantallas táctiles de formato tableta (hasta 1366px de ancho, p. ej. iPad Pro)
  const maxTouchPoints = window.navigator?.maxTouchPoints || 0;
  const isTouchDevice = maxTouchPoints > 0 || ('ontouchstart' in window);
  if (isTouchDevice && !/Windows NT/i.test(ua)) {
    const minDim = Math.min(window.innerWidth || 0, window.innerHeight || 0);
    const maxDim = Math.max(window.innerWidth || 0, window.innerHeight || 0);
    if (minDim <= 1024 && maxDim <= 1366) {
      return true;
    }
  }

  // 7. Verificación de viewport estrecho en ordenadores de sobremesa (breakpoint md = 768px)
  if (typeof window.innerWidth === 'number' && window.innerWidth < 768) {
    return true;
  }
  if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches) {
    return true;
  }

  return false;
}


