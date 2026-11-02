/**
 * Servicio integral de actualización de PWA, Service Worker y Gestión de Caché.
 * 
 * Garantiza:
 * 1. Detección fiable de nuevas versiones publicadas sin respuestas obsoletas (cache-busting).
 * 2. Transición coordinada entre Service Workers (SKIP_WAITING y claim).
 * 3. Purga selectiva de cachés de recursos estáticos sin tocar datos de usuario (localStorage / IndexedDB).
 * 4. Coordinación entre pestañas abiertas mediante BroadcastChannel.
 * 5. Estados de actualización claros para la interfaz de usuario (comprobando, descargando, aplicando, reiniciando).
 */

import {
  LATEST_APP_VERSION,
  DEVICE_INSTALLED_VERSION_KEY,
  isNewerVersion,
  fetchRemoteLatestVersion,
} from '../config/versionConfig';

export type UpdatePhase = 'idle' | 'checking' | 'downloading' | 'applying' | 'reloading' | 'error';

export interface UpdateState {
  phase: UpdatePhase;
  message: string;
  error?: string;
}

type UpdateStateListener = (state: UpdateState) => void;
type CrossTabUpdateListener = (remoteVersion: string) => void;

class PwaUpdateService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private listeners: Set<UpdateStateListener> = new Set();
  private crossTabListeners: Set<CrossTabUpdateListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private currentState: UpdateState = { phase: 'idle', message: '' };
  private unsavedChangesCheck: (() => boolean) | null = null;

  constructor() {
    this.initBroadcastChannel();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('roma_pwa_update_bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'APP_UPDATED_IN_ANOTHER_TAB') {
            const ver = event.data.version || '';
            this.crossTabListeners.forEach((l) => l(ver));
          }
        };
      } catch {
        // Fallback silencioso si el navegador no permite BroadcastChannel
      }
    }
  }

  public registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return Promise.resolve(null);
    }

    return navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        this.swRegistration = registration;

        // Escuchar si se detecta un nuevo Service Worker en segundo plano
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nuevo service worker listo y en espera
                this.notifyUpdateState({
                  phase: 'idle',
                  message: 'Nueva versión lista para instalar.',
                });
              }
            });
          }
        });

        return registration;
      })
      .catch((err) => {
        // En desarrollo o entornos no seguros puede fallar silenciosamente
        return null;
      });
  }

  public setUnsavedChangesCheck(checkFn: () => boolean) {
    this.unsavedChangesCheck = checkFn;
  }

  public hasUnsavedChanges(): boolean {
    return this.unsavedChangesCheck ? this.unsavedChangesCheck() : false;
  }

  public subscribe(listener: UpdateStateListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeCrossTab(listener: CrossTabUpdateListener): () => void {
    this.crossTabListeners.add(listener);
    return () => {
      this.crossTabListeners.delete(listener);
    };
  }

  private notifyUpdateState(state: UpdateState) {
    this.currentState = state;
    this.listeners.forEach((l) => l(state));
  }

  /**
   * Ejecuta el ciclo de actualización integral:
   * 1. Comprobación en red
   * 2. Descarga y preparación
   * 3. Activación de Service Worker y purga de cachés de recursos
   * 4. Recarga controlada de la página
   */
  public async executeAppUpdate(targetVersion: string): Promise<boolean> {
    if (this.currentState.phase !== 'idle' && this.currentState.phase !== 'error') {
      return false; // Evitar ejecuciones simultáneas o dobles pulsaciones
    }

    // Fase 1: Comprobando en el servidor
    this.notifyUpdateState({
      phase: 'checking',
      message: 'Comprobando versión publicada en el servidor...',
    });

    let remoteVersion = targetVersion;
    try {
      const verifiedVersion = await fetchRemoteLatestVersion();
      if (verifiedVersion) {
        remoteVersion = verifiedVersion;
      }
    } catch {
      // Si falla la verificación pero el usuario ya tenía targetVersion, continuamos con targetVersion
    }

    // Fase 2: Descargando y preparando
    this.notifyUpdateState({
      phase: 'downloading',
      message: 'Descargando y preparando recursos de la nueva versión...',
    });

    try {
      // Forzar verificación de SW en el servidor
      if (this.swRegistration) {
        try {
          await this.swRegistration.update();
        } catch {
          // Ignorar fallo de actualización de SW si no hay red
        }
      }

      // Pre-verificar carga fresca de HTML sin caché
      try {
        await fetch(`/index.html?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        });
      } catch {
        // En caso de corte puntual
      }

      // Fase 3: Aplicando y purgando cachés obsoletas de la app
      this.notifyUpdateState({
        phase: 'applying',
        message: 'Aplicando actualización y retirando archivos obsoletos...',
      });

      // Si hay un SW esperando, indicarle que salte la espera
      if (this.swRegistration && this.swRegistration.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }

      // Purgar CacheStorage de recursos de la aplicación (conservando datos locales)
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(
            cacheKeys
              .filter(
                (key) =>
                  key.startsWith('roma-') ||
                  key.startsWith('partes-trabajo-') ||
                  key.includes('static') ||
                  key.includes('runtime')
              )
              .map((key) => window.caches.delete(key))
          );
        } catch {
          // Continuar aunque falle el borrado de caches
        }
      }

      // Actualizar la versión guardada en localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(DEVICE_INSTALLED_VERSION_KEY, remoteVersion.trim());
          // Marcar en sessionStorage para mostrar aviso de éxito tras la recarga
          window.sessionStorage.setItem('roma_app_just_updated_version', remoteVersion.trim());
        } catch {
          // Ignorar errores de storage
        }
      }

      // Fase 4: Reiniciando
      this.notifyUpdateState({
        phase: 'reloading',
        message: 'Reiniciando la aplicación con la nueva versión...',
      });

      // Notificar a otras pestañas abiertas para que no mantengan versiones incompatibles
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'APP_UPDATED_IN_ANOTHER_TAB',
            version: remoteVersion,
          });
        } catch {
          // Ignorar error de mensajería
        }
      }

      // Breve pausa para asegurar propagación y recarga limpia
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Recarga forzada de la ventana
      if (typeof window !== 'undefined') {
        // Limpiamos parámetros de URL para no acumular hashes
        const cleanUrl = window.location.origin + window.location.pathname;
        window.location.replace(cleanUrl);
      }

      return true;
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        'No se ha podido completar la actualización. Comprueba la conexión e inténtalo de nuevo.';
      this.notifyUpdateState({
        phase: 'error',
        message: 'Error al aplicar la actualización.',
        error: errorMsg,
      });
      return false;
    }
  }

  public resetState() {
    this.notifyUpdateState({ phase: 'idle', message: '' });
  }
}

export const pwaUpdateService = new PwaUpdateService();
