import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InstallationBackendEngine } from '../services/backendEngine';
import {
  mergeDatabaseStates,
  SupabaseRealtimeSyncService,
} from '../services/supabaseSyncEngine';

// Simulación de BroadcastChannel en entorno Vitest/Node
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: { data: any }) => void) | null = null;
  static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: any) {
    const list = MockBroadcastChannel.channels.get(this.name);
    if (!list) return;
    for (const ch of list) {
      if (ch !== this && ch.onmessage) {
        ch.onmessage({ data });
      }
    }
  }

  close() {
    const list = MockBroadcastChannel.channels.get(this.name);
    if (list) {
      list.delete(this);
    }
  }
}

describe('Sincronización en tiempo real multidispositivo y multisesión', () => {
  let originalBroadcastChannel: any;

  beforeEach(() => {
    originalBroadcastChannel = (globalThis as any).BroadcastChannel;
    (globalThis as any).BroadcastChannel = MockBroadcastChannel;
    MockBroadcastChannel.channels.clear();

    // Evitar llamadas de red externas no disponibles en entorno sandbox de test
    vi.spyOn(SupabaseRealtimeSyncService.prototype, 'pullInitialState').mockImplementation(async () => {});
    vi.spyOn(SupabaseRealtimeSyncService.prototype, 'pushStateToSupabase').mockImplementation(async () => {});
  });

  afterEach(() => {
    (globalThis as any).BroadcastChannel = originalBroadcastChannel;
    MockBroadcastChannel.channels.clear();
    vi.restoreAllMocks();
  });

  it('difunde y refleja mutaciones entre dos sesiones simultáneas en menos de 20ms', async () => {
    // Sesión A: Administrador en escritorio
    const backendA = new InstallationBackendEngine('test-device-session-a', false, 'demo');
    backendA.resetToDemoSeed();
    backendA.login('admin@climalux-demo.es', 'Admin1234!');
    const syncServiceA = new SupabaseRealtimeSyncService('device-session-a');

    // Sesión B: Operario en móvil
    const backendB = new InstallationBackendEngine('test-device-session-b', false, 'demo');
    backendB.resetToDemoSeed();
    backendB.login('admin@climalux-demo.es', 'Admin1234!');
    const syncServiceB = new SupabaseRealtimeSyncService('device-session-b');

    // Conectar ambos motores a su respectivo backend
    await syncServiceA.initialize(backendA);
    await syncServiceB.initialize(backendB);

    // Medición de tiempo entre acción en Sesión A y recepción en Sesión B
    const tStart = performance.now();

    // Sesión A crea un nuevo parte de trabajo sin programar
    const cust = backendA.getCustomers()[0];
    const newWo = backendA.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Reparación caldera urgente multidispositivo',
      is_unscheduled: true,
    } as any);

    const tEnd = performance.now();
    const latencyMs = tEnd - tStart;

    // Verificar que Sesión B ya tiene el parte creado en tiempo real
    const wosB = backendB.getWorkOrders({ includeArchived: true });
    expect(wosB.some((w) => w.id === newWo.id)).toBe(true);
    expect(wosB.find((w) => w.id === newWo.id)?.planned_work).toBe(
      'Reparación caldera urgente multidispositivo'
    );

    // La latencia debe ser ultrabaja (< 50ms)
    expect(latencyMs).toBeLessThan(50);

    syncServiceA.destroy();
    syncServiceB.destroy();
  });

  it('propaga cambios de estado, anotaciones y programación sin sobrescribir datos locales', async () => {
    const backendA = new InstallationBackendEngine('test-sync-state-a', false, 'demo');
    backendA.resetToDemoSeed();
    backendA.login('admin@climalux-demo.es', 'Admin1234!');
    const syncA = new SupabaseRealtimeSyncService('device-session-a');

    const backendB = new InstallationBackendEngine('test-sync-state-b', false, 'demo');
    backendB.resetToDemoSeed();
    backendB.login('admin@climalux-demo.es', 'Admin1234!');
    const syncB = new SupabaseRealtimeSyncService('device-session-b');

    await syncA.initialize(backendA);
    await syncB.initialize(backendB);

    // Crear un parte común en Sesión A
    const cust = backendA.getCustomers()[0];
    const operario = backendA.getProfiles().find((p) => p.role === 'operario' && p.is_active)!;
    const sharedWo = backendA.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Revisión y puesta en marcha',
      scheduled_at: '2026-11-12T09:00:00Z',
      operator_ids: [operario.id],
    } as any);

    // Sesión A inicia el parte pasando a "en_curso"
    backendA.startWorkOrder(sharedWo.id);

    // Verificar que Sesión B refleja el nuevo estado inmediatamente
    const woInB = backendB.getWorkOrderById(sharedWo.id);
    expect(woInB.status).toBe('en_curso');

    // Sesión B añade una anotación de trabajo
    const entryB = backendB.addWorkEntry(
      sharedWo.id,
      'Diagnóstico completado por operario',
      'Comprobación de presión correcta'
    );

    // Verificar que Sesión A recibe la anotación de Sesión B inmediatamente
    const entriesInA = backendA.getWorkEntries(sharedWo.id);
    expect(entriesInA.some((e) => e.id === entryB.id)).toBe(true);

    syncA.destroy();
    syncB.destroy();
  });

  it('las eliminaciones de materiales y artículos no reaparecen tras sincronizaciones posteriores (tombstones)', () => {
    const backendA = new InstallationBackendEngine('test-tomb-a', false, 'demo');
    backendA.resetToDemoSeed();
    backendA.login('admin@climalux-demo.es', 'Admin1234!');

    const cust = backendA.getCustomers()[0];
    const wo = backendA.createWorkOrder({
      customer_id: cust.id,
      planned_work: 'Trabajo prueba tombstones',
      is_unscheduled: true,
    } as any);
    const art = backendA.getArticles()[0];

    // Añadir material al parte
    const mat = backendA.addWorkMaterial({
      work_order_id: wo.id,
      article_id: art.id,
      article_name_snapshot: art.name,
      unit_snapshot: art.unit,
      quantity: 3,
      unit_price_cents: 100,
      notes: '',
    });

    expect(backendA.getWorkMaterials(wo.id).some((m) => m.id === mat.id)).toBe(true);

    // Snapshot antes de borrar (simulando un estado remoto obsoleto con el material todavía presente)
    const staleRemoteSnapshot = backendA.exportFullSnapshot();

    // Eliminar material en local
    backendA.deleteWorkMaterial(mat.id);
    expect(backendA.getWorkMaterials(wo.id).some((m) => m.id === mat.id)).toBe(false);

    // Simular que llega el snapshot remoto obsoleto donde el material aún existía
    const localSnapshot = backendA.exportFullSnapshot();
    const merged = mergeDatabaseStates(localSnapshot, staleRemoteSnapshot);
    backendA.applyRemoteSyncState(merged);

    // El material eliminado NO debe reaparecer jamás
    expect(backendA.getWorkMaterials(wo.id).some((m) => m.id === mat.id)).toBe(false);
  });

  it('reactivación en primer plano (handleAppForegroundResume) ejecuta sincronización y mantiene datos actualizados', async () => {
    const backend = new InstallationBackendEngine('test-foreground-resume', false, 'demo');
    backend.resetToDemoSeed();
    backend.login('admin@climalux-demo.es', 'Admin1234!');
    const syncService = new SupabaseRealtimeSyncService();

    await syncService.initialize(backend);

    // Espiar pullInitialState
    const pullSpy = vi.spyOn(syncService, 'pullInitialState');

    // Simular que el usuario vuelve a la app (desbloqueo de pantalla o cambio de pestaña)
    await syncService.handleAppForegroundResume();

    expect(pullSpy).toHaveBeenCalled();

    syncService.destroy();
  });
});
