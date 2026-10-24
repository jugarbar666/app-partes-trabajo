declare const __APP_GIT_BRANCH__: string | undefined;
declare const __SHOW_MOBILE_SIMULATOR__: boolean | undefined;

/**
 * Determina si las herramientas de desarrollo y diseño (como el selector y simulador
 * de versiones móviles en la cabecera) deben estar activas.
 *
 * - En la rama 'pruebas': ACTIVO (permite cambiar entre versiones móviles de terminal y operarios).
 * - En la rama 'empresa-fontaneria-roma': INACTIVO (versión de producción limpia para Fontanería Roma).
 * - Al realizar fusiones (git merge): la regla se conserva automáticamente y sin conflictos.
 */
export function isMobilePreviewEnabled(): boolean {
  // 1. Variable de entorno explícita (p. ej. en Netlify o .env)
  if (import.meta.env.VITE_SHOW_MOBILE_PREVIEW === 'false') {
    return false;
  }
  if (import.meta.env.VITE_SHOW_MOBILE_PREVIEW === 'true') {
    return true;
  }

  // 2. Parámetro de depuración en URL (?preview=1 para forzar o ?preview=0 para ocultar)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === '0') return false;
    if (params.get('preview') === '1') return true;
  }

  // 3. Flag inyectado en tiempo de compilación por vite.config.ts según la rama git activa
  if (typeof __SHOW_MOBILE_SIMULATOR__ !== 'undefined') {
    return __SHOW_MOBILE_SIMULATOR__;
  }

  // 4. Comprobación directa sobre la rama git detectada
  if (typeof __APP_GIT_BRANCH__ !== 'undefined' && __APP_GIT_BRANCH__) {
    return __APP_GIT_BRANCH__ !== 'empresa-fontaneria-roma';
  }

  // Por defecto en local/desarrollo: activo
  return true;
}

export function getActiveBranchName(): string {
  if (import.meta.env.VITE_BRANCH) {
    return import.meta.env.VITE_BRANCH;
  }
  if (typeof __APP_GIT_BRANCH__ !== 'undefined' && __APP_GIT_BRANCH__) {
    return __APP_GIT_BRANCH__;
  }
  return 'pruebas';
}
