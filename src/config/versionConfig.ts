/**
 * Control de versión instalada en el dispositivo y detección de nuevas versiones disponibles.
 */

export const LATEST_APP_VERSION = '1.9.0';
export const INITIAL_DEVICE_VERSION = '1.8.0';
export const DEVICE_INSTALLED_VERSION_KEY = 'agy_roma_device_installed_version';

export function getInstalledDeviceVersion(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(DEVICE_INSTALLED_VERSION_KEY);
      if (saved && saved.trim().length > 0) {
        return saved.trim();
      }
    } catch {
      // ignore storage errors
    }
  }
  return INITIAL_DEVICE_VERSION;
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
