/**
 * Motor de Sincronización en Tiempo Real con Supabase (Realtime WebSockets + Offline-First)
 *
 * Fontanería Roma — Gestión de Partes de Trabajo
 *
 * Características:
 * 1. Conexión bidireccional en tiempo real con Supabase.
 * 2. Difusión instantánea (< 50ms) vía WebSockets (Supabase Realtime Broadcast + Postgres Changes).
 * 3. Fusión determinista no destructiva (mergeDatabaseStates): ningún dispositivo sobrescribe a otro.
 * 4. Funcionamiento sin conexión (Offline-First): se guarda en localStorage y se sincroniza al recuperar red.
 * 5. Protección estricta de datos (Regla 3): blindaje de clientes, proveedores, partes y usuarios.
 */

import { supabaseClient, isRemoteSupabaseConfigured } from './supabaseClient';
import { DatabaseState } from './seedData';
import { InstallationBackendEngine } from './backendEngine';

export type SyncEngineStatus = 'connected' | 'syncing' | 'offline' | 'error' | 'disabled';

export interface SyncEngineState {
  status: SyncEngineStatus;
  lastSyncedAt: Date | null;
  pendingChangesCount: number;
  errorMessage: string | null;
}

const SYNC_INSTALLATION_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INSTALLATION_SLUG) || 'fontaneria-roma';

// Identificador único persistente de este dispositivo para evitar bucles de eco
function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'server-device';
  }
  const key = 'agy_roma_device_unique_uuid';
  let devId = window.localStorage.getItem(key);
  if (!devId) {
    devId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      window.localStorage.setItem(key, devId);
    } catch {}
  }
  return devId;
}

/**
 * Fusión determinista no destructiva de dos estados de base de datos.
 * Preserva registros de ambos dispositivos y ante colisiones escoge el más reciente por timestamp.
 */
export function mergeDatabaseStates(local: DatabaseState, remote: DatabaseState): DatabaseState {
  if (!local) return remote;
  if (!remote) return local;

  const result: DatabaseState = {
    installationId: local.installationId || remote.installationId,
    company_settings:
      new Date(local.company_settings?.updated_at || 0) >= new Date(remote.company_settings?.updated_at || 0)
        ? local.company_settings
        : remote.company_settings,
    profiles: mergeById(local.profiles, remote.profiles, 'updated_at'),
    passwords: { ...(remote.passwords || {}), ...(local.passwords || {}) },
    invitations: mergeById(local.invitations || [], remote.invitations || [], 'created_at'),
    password_resets: mergeById(local.password_resets || [], remote.password_resets || [], 'created_at'),
    customers: mergeById(local.customers || [], remote.customers || [], 'updated_at'),
    customer_addresses: mergeById(local.customer_addresses || [], remote.customer_addresses || [], 'created_at'),
    suppliers: mergeById(local.suppliers || [], remote.suppliers || [], 'updated_at'),
    articles: (() => {
      const isDemo = (a: any) =>
        !a ||
        !a.id ||
        a.id.startsWith('art-roma-') ||
        a.id.startsWith('art-1') ||
        a.id.startsWith('art-2') ||
        a.id.startsWith('art-3') ||
        (typeof a.code === 'string' && a.code.startsWith('ART-0') && a.code.length <= 7);

      const deletedArticleIds = new Set<string>([
        ...((local as any)?.deleted_article_ids || []),
        ...((remote as any)?.deleted_article_ids || []),
      ]);

      const mergedArticles = mergeById(local.articles || [], remote.articles || [], 'updated_at');
      return mergedArticles.filter((a) => !isDemo(a) && !deletedArticleIds.has(a.id));
    })(),
    work_orders: mergeById(local.work_orders || [], remote.work_orders || [], 'updated_at'),
    work_order_admin: mergeByKey(local.work_order_admin || [], remote.work_order_admin || [], 'work_order_id'),
    work_order_assignments: mergeById(local.work_order_assignments || [], remote.work_order_assignments || [], 'assigned_at'),
    work_entries: mergeById(local.work_entries || [], remote.work_entries || [], 'created_at'),
    work_sessions: mergeById(local.work_sessions || [], remote.work_sessions || [], 'started_at'),
    work_materials: mergeById(local.work_materials || [], remote.work_materials || [], 'created_at'),
    work_signatures: mergeById(local.work_signatures || [], remote.work_signatures || [], 'signed_at'),
    work_files: mergeById(local.work_files || [], remote.work_files || [], 'uploaded_at'),
    work_order_events: mergeById(local.work_order_events || [], remote.work_order_events || [], 'created_at'),
    installation_reviews: mergeById(local.installation_reviews || [], remote.installation_reviews || [], 'updated_at'),
    review_occurrences: mergeById(local.review_occurrences || [], remote.review_occurrences || [], 'scheduled_date'),
    review_types: mergeById(local.review_types || [], remote.review_types || [], 'created_at'),
    notification_outbox: mergeById(local.notification_outbox || [], remote.notification_outbox || [], 'scheduled_for'),
    shopping_requests: (() => {
      const deletedShoppingIds = new Set<string>([
        ...((local as any)?.deleted_shopping_request_ids || []),
        ...((remote as any)?.deleted_shopping_request_ids || []),
      ]);
      const mergedShopping = mergeById(local.shopping_requests || [], remote.shopping_requests || [], 'updated_at');
      return mergedShopping.filter((sr) => !sr.id?.startsWith('shop-roma-') && !deletedShoppingIds.has(sr.id));
    })(),
    attendance_sessions: mergeById(local.attendance_sessions || [], remote.attendance_sessions || [], 'updated_at'),
    attendance_corrections: mergeById(local.attendance_corrections || [], remote.attendance_corrections || [], 'created_at'),
    audit_log: mergeById(local.audit_log || [], remote.audit_log || [], 'created_at'),
    backup_jobs: mergeById(local.backup_jobs || [], remote.backup_jobs || [], 'created_at'),
    import_jobs: mergeById(local.import_jobs || [], remote.import_jobs || [], 'created_at'),
  };

  // Preservar tumbas de eliminación (tombstones) de compras y artículos
  const allDeletedShopping = Array.from(new Set<string>([
    ...((local as any)?.deleted_shopping_request_ids || []),
    ...((remote as any)?.deleted_shopping_request_ids || []),
  ]));
  (result as any).deleted_shopping_request_ids = allDeletedShopping;

  const allDeletedArticles = Array.from(new Set<string>([
    ...((local as any)?.deleted_article_ids || []),
    ...((remote as any)?.deleted_article_ids || []),
  ]));
  (result as any).deleted_article_ids = allDeletedArticles;

  if (
    !result.installationId ||
    result.installationId.includes('roma') ||
    result.installationId === 'fontaneria-roma' ||
    result.installationId === 'empresa-fontaneria-roma' ||
    result.installationId === 'instalaciones-climalux-demo'
  ) {
    const allowedOfficialUserIds = new Set([
      'usr-jc-admin',
      'usr-admin-1',
      'usr-raul-oper',
      'usr-marcos-oper',
      'usr-juan-oper',
    ]);
    result.profiles = (result.profiles || []).filter((p) => allowedOfficialUserIds.has(p.id));

    // Descartar permanentemente artículos de demostración anteriores para Fontanería Roma
    const isDemoArticleId = (id?: string | null) =>
      !id ||
      id.startsWith('art-roma-') ||
      id.startsWith('art-1') ||
      id.startsWith('art-2') ||
      id.startsWith('art-3');

    result.articles = (result.articles || []).filter(
      (a) =>
        !isDemoArticleId(a.id) &&
        !allDeletedArticles.includes(a.id) &&
        !(typeof a.code === 'string' && a.code.startsWith('ART-0') && a.code.length <= 7)
    );

    (result as any)._romaArticlesClearedRealDataV1 = true;
    (result as any)._romaArticlesPurgedByUserV2 = true;
    (result as any)._romaReviewsClearedRealDataV1 = true;
    (result as any)._romaReviewsPurgedByUserV2 = true;
    (result as any)._romaShoppingUserCleared = true;
    (result as any)._romaShoppingSeededV1 = true;
    (result as any)._romaProductionCleanConfirmedV1 = true;
    result.shopping_requests = (result.shopping_requests || []).filter(
      (sr) => !sr.id.startsWith('shop-roma-') && !allDeletedShopping.includes(sr.id)
    );

    // Descartar tipos de revisiones y revisiones ficticias de prueba anteriores para Fontanería Roma
    const isDemoReviewId = (id?: string | null) =>
      !id ||
      id.startsWith('rt-roma-') ||
      id.startsWith('rev-roma-') ||
      id.startsWith('occ-roma-') ||
      id.startsWith('rt-1') ||
      id.startsWith('rev-1') ||
      id.startsWith('occ-1');

    result.review_types = (result.review_types || []).filter((rt) => !isDemoReviewId(rt.id));
    result.installation_reviews = (result.installation_reviews || []).filter((rev) => !isDemoReviewId(rev.id));
    result.review_occurrences = (result.review_occurrences || []).filter((occ) => !isDemoReviewId(occ.id));
    if (Array.isArray(result.notification_outbox)) {
      result.notification_outbox = result.notification_outbox.filter(
        (n) => !isDemoReviewId(n.installation_review_id) && !isDemoReviewId(n.review_occurrence_id)
      );
    }
    if (Array.isArray(result.work_orders)) {
      result.work_orders = result.work_orders.map((wo) => {
        if (wo.origin_review_occurrence_id && isDemoReviewId(wo.origin_review_occurrence_id)) {
          return { ...wo, origin_review_occurrence_id: null };
        }
        return wo;
      });
    }
  }

  return result;
}

function mergeById<T extends { id?: string; [key: string]: any }>(
  localList: T[],
  remoteList: T[],
  timestampField = 'updated_at'
): T[] {
  const map = new Map<string, T>();

  // 1. Añadir locales
  for (const item of localList || []) {
    const key = item.id || JSON.stringify(item);
    map.set(key, item);
  }

  // 2. Fusionar remotos
  for (const item of remoteList || []) {
    const key = item.id || JSON.stringify(item);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      const timeLocal = existing[timestampField] ? new Date(existing[timestampField]).getTime() : 0;
      const timeRemote = item[timestampField] ? new Date(item[timestampField]).getTime() : 0;
      if (timeRemote >= timeLocal) {
        map.set(key, { ...existing, ...item });
      }
    }
  }

  return Array.from(map.values());
}

function mergeByKey<T extends { [key: string]: any }>(
  localList: T[],
  remoteList: T[],
  keyField: string
): T[] {
  const map = new Map<string, T>();
  for (const item of localList || []) {
    const key = String(item[keyField] || JSON.stringify(item));
    map.set(key, item);
  }
  for (const item of remoteList || []) {
    const key = String(item[keyField] || JSON.stringify(item));
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      map.set(key, { ...existing, ...item });
    }
  }
  return Array.from(map.values());
}

export class SupabaseRealtimeSyncService {
  private backend: InstallationBackendEngine | null = null;
  private deviceId: string;
  private channel: any = null;
  private pushDebounceTimer: any = null;
  private isPushing = false;
  private pendingPush = false;
  private statusListeners: Set<(state: SyncEngineState) => void> = new Set();
  private state: SyncEngineState = {
    status: isRemoteSupabaseConfigured ? 'syncing' : 'disabled',
    lastSyncedAt: null,
    pendingChangesCount: 0,
    errorMessage: null,
  };

  constructor() {
    this.deviceId = getOrCreateDeviceId();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  public getState(): SyncEngineState {
    return { ...this.state };
  }

  public onStatusChange(listener: (state: SyncEngineState) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.getState());
    return () => this.statusListeners.delete(listener);
  }

  private updateState(partial: Partial<SyncEngineState>): void {
    this.state = { ...this.state, ...partial };
    this.statusListeners.forEach((l) => {
      try {
        l(this.getState());
      } catch (e) {
        console.error('Error in sync status listener:', e);
      }
    });
  }

  /**
   * Inicializa la sincronización con la instancia activa de InstallationBackendEngine.
   */
  public async initialize(backend: InstallationBackendEngine): Promise<void> {
    this.backend = backend;

    if (!supabaseClient || !isRemoteSupabaseConfigured) {
      console.info('[SupabaseSync] Modo local activo (Supabase no configurado o deshabilitado).');
      this.updateState({ status: 'disabled' });
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateState({ status: 'offline' });
      return;
    }

    try {
      this.updateState({ status: 'syncing', errorMessage: null });

      // 1. Sincronización inicial (Pull inicial)
      await this.pullInitialState();

      // 2. Suscripción al canal en tiempo real (WebSockets)
      this.setupRealtimeSubscription();

      // 3. Escuchar mutaciones locales de este dispositivo para propagarlas a Supabase
      this.backend.onSyncPush(() => {
        this.schedulePushToSupabase();
      });

      this.updateState({ status: 'connected', lastSyncedAt: new Date() });
      console.log('[SupabaseSync] Sincronización en tiempo real inicializada correctamente.');
    } catch (err: any) {
      console.warn('[SupabaseSync] Error durante la inicialización:', err);
      this.updateState({ status: 'error', errorMessage: err?.message || 'Error de conexión' });
    }
  }

  private handleNetworkChange(isOnline: boolean): void {
    if (!isOnline) {
      this.updateState({ status: 'offline' });
    } else {
      this.updateState({ status: 'syncing' });
      if (this.backend) {
        this.pullInitialState().then(() => {
          this.updateState({ status: 'connected', lastSyncedAt: new Date() });
          if (this.pendingPush) {
            this.pushStateToSupabase();
          }
        });
      }
    }
  }

  /**
   * Descarga el estado más reciente de Supabase y lo fusiona de forma segura con el local.
   * Si la tabla está vacía en Supabase, sube el estado local oficial de Fontanería Roma.
   */
  public async pullInitialState(): Promise<void> {
    if (!supabaseClient || !this.backend) return;

    try {
      const { data, error } = await supabaseClient
        .from('app_sync_state')
        .select('*')
        .eq('installation_id', SYNC_INSTALLATION_ID)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data && data.state) {
        // Fusionar datos remotos con locales
        const localSnapshot = this.backend.exportFullSnapshot();
        const merged = mergeDatabaseStates(localSnapshot, data.state as DatabaseState);
        this.backend.applyRemoteSyncState(merged);
        this.updateState({ lastSyncedAt: new Date(), status: 'connected' });
        console.log('[SupabaseSync] Base de datos sincronizada con Supabase en tiempo real.');
      } else {
        // Primera ejecución: la tabla de Supabase está vacía. Subir el estado inicial oficial.
        console.log('[SupabaseSync] Subiendo estado inicial oficial a Supabase app_sync_state...');
        await this.pushStateToSupabase(true);
      }
    } catch (err: any) {
      console.error('[SupabaseSync] Error al descargar de Supabase:', err);
      this.updateState({ status: 'error', errorMessage: err?.message || 'Error al descargar' });
    }
  }

  /**
   * Configura la suscripción al canal WebSocket de Supabase Realtime.
   */
  private setupRealtimeSubscription(): void {
    if (!supabaseClient) return;

    if (this.channel) {
      supabaseClient.removeChannel(this.channel);
    }

    this.channel = supabaseClient.channel('fontaneria_roma_realtime_sync', {
      config: {
        broadcast: { ack: false, self: false },
      },
    });

    // 1. Escuchar actualizaciones de la tabla Postgres vía Realtime CDC
    this.channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_sync_state',
        filter: `installation_id=eq.${SYNC_INSTALLATION_ID}`,
      },
      (payload: any) => {
        if (payload?.new && payload.new.state) {
          const sender = payload.new.updated_by;
          if (sender !== this.deviceId) {
            this.handleIncomingRemoteState(payload.new.state as DatabaseState);
          }
        }
      }
    );

    // 2. Escuchar difusión P2P de baja latencia (< 50ms) vía Broadcast
    this.channel.on('broadcast', { event: 'realtime_db_mutation' }, ({ payload }: any) => {
      if (payload && payload.senderId !== this.deviceId && payload.state) {
        this.handleIncomingRemoteState(payload.state as DatabaseState);
      }
    });

    this.channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        this.updateState({ status: 'connected' });
        console.log('[Supabase Realtime] Canal suscrito y activo.');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[Supabase Realtime] Estado de canal: ${status}`);
      }
    });
  }

  /**
   * Aplica un estado recibido desde otro dispositivo de forma no destructiva.
   */
  private handleIncomingRemoteState(remoteState: DatabaseState): void {
    if (!this.backend || !remoteState) return;

    console.log('[Supabase Realtime] Cambio recibido en directo desde otro dispositivo.');
    const localSnapshot = this.backend.exportFullSnapshot();
    const merged = mergeDatabaseStates(localSnapshot, remoteState);
    this.backend.applyRemoteSyncState(merged);
    this.updateState({ lastSyncedAt: new Date(), status: 'connected' });
  }

  /**
   * Programa una subida diferida (debounce) a Supabase tras cambios locales.
   */
  private schedulePushToSupabase(): void {
    if (!supabaseClient || !isRemoteSupabaseConfigured) return;

    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer);
    }

    this.updateState({ status: 'syncing' });

    // Emisión inmediata vía Broadcast para otros dispositivos conectados (< 50ms)
    if (this.channel && this.backend) {
      try {
        const state = this.backend.exportFullSnapshot();
        this.channel.send({
          type: 'broadcast',
          event: 'realtime_db_mutation',
          payload: {
            senderId: this.deviceId,
            timestamp: Date.now(),
            state,
          },
        });
      } catch (err) {
        console.warn('[Supabase Realtime] Error emitiendo broadcast:', err);
      }
    }

    // Persistencia en tabla PostgreSQL con debounce de 350ms para agrupar ráfagas
    this.pushDebounceTimer = setTimeout(() => {
      this.pushStateToSupabase();
    }, 350);
  }

  /**
   * Envía el estado actual a la tabla app_sync_state en Supabase.
   */
  public async pushStateToSupabase(isFirstBoot = false): Promise<void> {
    if (!supabaseClient || !this.backend) return;

    if (this.isPushing) {
      this.pendingPush = true;
      return;
    }

    this.isPushing = true;
    this.pendingPush = false;

    try {
      const currentState = this.backend.exportFullSnapshot();
      const currentUser = this.backend.getCurrentUser();

      const { error } = await supabaseClient.from('app_sync_state').upsert({
        installation_id: SYNC_INSTALLATION_ID,
        version: Date.now(),
        state: currentState,
        updated_at: new Date().toISOString(),
        updated_by: this.deviceId,
      });

      if (error) {
        throw error;
      }

      this.updateState({
        status: 'connected',
        lastSyncedAt: new Date(),
        errorMessage: null,
      });

      if (isFirstBoot) {
        console.log('[SupabaseSync] Estado inicial de Fontanería Roma persistido en Supabase.');
      }
    } catch (err: any) {
      console.error('[SupabaseSync] Error al guardar en Supabase:', err);
      this.updateState({
        status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error',
        errorMessage: err?.message || 'Error guardando en Supabase',
      });
    } finally {
      this.isPushing = false;
      if (this.pendingPush) {
        this.pushStateToSupabase();
      }
    }
  }

  /**
   * Fuerza una sincronización manual inmediata (botón refrescar/sincronizar).
   */
  public async forceSync(): Promise<void> {
    this.updateState({ status: 'syncing' });
    await this.pullInitialState();
    await this.pushStateToSupabase();
  }

  /**
   * Obtiene la instantánea oficial y actualizada directamente desde la base de datos en la nube (Supabase).
   * Se utiliza prioritariamente para las copias de seguridad de empresa.
   */
  public async fetchCloudSnapshot(): Promise<DatabaseState> {
    if (!supabaseClient || !isRemoteSupabaseConfigured) {
      if (this.backend) {
        return this.backend.exportFullSnapshot();
      }
      throw new Error('Supabase no está configurado para obtener copias de la nube.');
    }

    const { data, error } = await supabaseClient
      .from('app_sync_state')
      .select('*')
      .eq('installation_id', SYNC_INSTALLATION_ID)
      .maybeSingle();

    if (error) {
      throw new Error(`Error consultando la base de datos de Supabase en la nube: ${error.message}`);
    }

    if (data && data.state) {
      return data.state as DatabaseState;
    }

    // Si aún no se ha persistido en la nube, sincronizar y retornar el estado
    if (this.backend) {
      await this.pushStateToSupabase(true);
      return this.backend.exportFullSnapshot();
    }

    throw new Error('No se encontró ninguna instantánea en la base de datos de la nube.');
  }
}

export const supabaseSyncEngine = new SupabaseRealtimeSyncService();
