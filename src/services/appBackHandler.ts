/**
 * Servicio centralizado para gestionar el botón y gesto de retroceso en móviles y tablets
 * (Android hardware back, gestos laterales en iOS/iPadOS y evento popstate).
 *
 * REGLAS DE NEGOCIO:
 * 1. Si hay menús, desplegables o ventanas emergentes abiertas, cerrarlas primero.
 * 2. Si no hay overlays, volver a la pantalla anterior de la aplicación (routeStack).
 * 3. Al llegar a la pantalla inicial, el retroceso no realiza ninguna acción y evita salir
 *    de la aplicación o regresar a la pantalla de acceso.
 * 4. Evita bucles, pantallas duplicadas y acumulación artificial del historial.
 */

export type BackAction = () => boolean | void;

export interface RegisteredOverlayAction {
  id: string;
  action: BackAction;
  priority: number;
}

class AppBackHandlerService {
  private overlayActions: RegisteredOverlayAction[] = [];
  private isInitialized = false;
  private onNavigateBack: (() => boolean) | null = null;
  private onRootBack: (() => void) | null = null;

  /**
   * Registra un interceptor para cerrar un menú, modal o desplegable abierto.
   * Devuelve una función para desregistrarlo al cerrar el overlay.
   */
  public register(id: string, action: BackAction, priority: number = 10): () => void {
    this.overlayActions = this.overlayActions.filter((a) => a.id !== id);
    this.overlayActions.push({ id, action, priority });
    // Ordenar por prioridad descendente, y en caso de empate LIFO (último en llegar primero en salir)
    this.overlayActions.sort((a, b) => b.priority - a.priority);

    // Empujar un estado al historial si estamos en entorno navegador
    if (typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState({ appId: 'pt_roma', overlayId: id }, '');
      } catch {
        // Ignorar en entornos de test
      }
    }

    return () => {
      this.unregister(id);
    };
  }

  public unregister(id: string): void {
    this.overlayActions = this.overlayActions.filter((a) => a.id !== id);
  }

  public hasActiveOverlays(): boolean {
    return this.overlayActions.length > 0;
  }

  public setNavigationHandlers(handlers: {
    onNavigateBack: () => boolean;
    onRootBack: () => void;
  }): void {
    this.onNavigateBack = handlers.onNavigateBack;
    this.onRootBack = handlers.onRootBack;
  }

  /**
   * Ejecuta la lógica de retroceso con el orden de prioridad estricto:
   * 1. Cerrar overlay abierto.
   * 2. Si no hay overlay, retroceder en la pila de navegación de la aplicación.
   * 3. Si ya está en la pantalla inicial, atrapar el evento sin salir ni cerrar sesión.
   */
  public handleBack(): boolean {
    // Prioridad 1: Cerrar el overlay más reciente
    if (this.overlayActions.length > 0) {
      const topAction = this.overlayActions.pop();
      if (topAction) {
        try {
          topAction.action();
        } catch (err) {
          console.error('Error al ejecutar retroceso de overlay:', err);
        }
        return true;
      }
    }

    // Prioridad 2: Navegar a la pantalla anterior
    if (this.onNavigateBack) {
      const navigated = this.onNavigateBack();
      if (navigated) return true;
    }

    // Prioridad 3: Pantalla inicial (dashboard) -> atrapar retroceso sin salir
    if (this.onRootBack) {
      this.onRootBack();
      return true;
    }

    return false;
  }

  /**
   * Inicializa la captura de popstate en el navegador/dispositivo
   */
  public init(): () => void {
    if (typeof window === 'undefined') return () => {};
    if (this.isInitialized) return () => {};
    this.isInitialized = true;

    // Colocar centinela inicial en el historial para evitar salida accidental
    try {
      if (!window.history.state || window.history.state.appId !== 'pt_roma') {
        window.history.replaceState({ appId: 'pt_roma', level: 0 }, '');
        window.history.pushState({ appId: 'pt_roma', level: 1 }, '');
      }
    } catch {
      // Ignorar errores en entornos simulados
    }

    const onPopState = () => {
      this.handleBack();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      this.isInitialized = false;
    };
  }

  public resetForTesting(): void {
    this.overlayActions = [];
    this.isInitialized = false;
    this.onNavigateBack = null;
    this.onRootBack = null;
  }
}

export const appBackHandler = new AppBackHandlerService();
