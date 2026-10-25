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
  if (typeof window !== 'undefined') {
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
  if (typeof window !== 'undefined') {
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
