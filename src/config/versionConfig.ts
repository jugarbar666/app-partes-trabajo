/**
 * Control de versión instalada en el dispositivo y detección de nuevas versiones disponibles.
 */

export const LATEST_APP_VERSION = '1.9.3';
export const INITIAL_DEVICE_VERSION = '1.9.2';
export const DEVICE_INSTALLED_VERSION_KEY = 'agy_roma_device_installed_version';

/**
 * Compara dos versiones semánticas (ej: '1.9.3' vs '1.9.2').
 * Retorna true únicamente si remoteVersion es estrictamente superior a currentVersion.
 */
export function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
  if (!remoteVersion || !currentVersion) return false;
  const remoteClean = remoteVersion.trim().replace(/^v/i, '');
  const currentClean = currentVersion.trim().replace(/^v/i, '');

  if (remoteClean === currentClean) return false;

  const parseParts = (v: string): number[] => {
    const main = v.split('-')[0].split('+')[0];
    return main.split('.').map((p) => {
      const n = parseInt(p, 10);
      return isNaN(n) ? 0 : n;
    });
  };

  const remoteParts = parseParts(remoteClean);
  const currentParts = parseParts(currentClean);
  const maxLength = Math.max(remoteParts.length, currentParts.length);

  for (let i = 0; i < maxLength; i++) {
    const r = remoteParts[i] || 0;
    const c = currentParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }

  return false;
}

export function getInstalledDeviceVersion(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(DEVICE_INSTALLED_VERSION_KEY);
      if (saved && saved.trim().length > 0) {
        return saved.trim();
      }
      // En una instalación limpia, primera apertura o tras reinstalar la aplicación,
      // la versión instalada en este dispositivo es la versión empaquetada que se acaba de descargar.
      window.localStorage.setItem(DEVICE_INSTALLED_VERSION_KEY, LATEST_APP_VERSION);
      return LATEST_APP_VERSION;
    } catch {
      // ignore storage errors
    }
  }
  return LATEST_APP_VERSION;
}

export function setInstalledDeviceVersion(version: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(DEVICE_INSTALLED_VERSION_KEY, version.trim());
    } catch {
      // ignore storage errors
    }
  }
}

export async function fetchRemoteLatestVersion(): Promise<string> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return LATEST_APP_VERSION;
  }
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.version === 'string' && data.version.trim().length > 0) {
        return data.version.trim();
      }
    }
  } catch {
    // Si no hay red o falla la petición, mantener la versión empaquetada
  }
  return LATEST_APP_VERSION;
}
