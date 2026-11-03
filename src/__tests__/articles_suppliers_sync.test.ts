import { describe, it, expect } from 'vitest';
import { parseEurosToCents, formatCentsToEUR } from '../utils/formatters';
import { sanitizeStateForCloudSync } from '../services/supabaseSyncEngine';
import { InstallationBackendEngine } from '../services/backendEngine';

describe('Corrección definitiva de artículos, proveedores y sincronización', () => {
  it('parseEurosToCents analiza correctamente todo tipo de números y formatos en euros', () => {
    // Números directos
    expect(parseEurosToCents(0.094)).toBe(9);
    expect(parseEurosToCents(0.21)).toBe(21);
    expect(parseEurosToCents(1.55)).toBe(155);
    expect(parseEurosToCents(24.23)).toBe(2423);
    expect(parseEurosToCents(0)).toBe(0);

    // Cadenas con formato estándar o decimal español
    expect(parseEurosToCents('0,094')).toBe(9);
    expect(parseEurosToCents('0.094')).toBe(9);
    expect(parseEurosToCents('12,50')).toBe(1250);
    expect(parseEurosToCents('12.50')).toBe(1250);

    // Con símbolo de euro o texto
    expect(parseEurosToCents('12,50 €')).toBe(1250);
    expect(parseEurosToCents('€ 12.50')).toBe(1250);
    expect(parseEurosToCents('24,00 EUR')).toBe(2400);
    expect(parseEurosToCents('0,21 euros')).toBe(21);
    expect(parseEurosToCents(' 0,21 ')).toBe(21);

    // Miles y enteros
    expect(parseEurosToCents('1.250,50')).toBe(125050);
    expect(parseEurosToCents('1,250.50')).toBe(125050);
    expect(parseEurosToCents('25')).toBe(2500);

    // Vacíos o inválidos
    expect(parseEurosToCents('')).toBeNull();
    expect(parseEurosToCents('   ')).toBeNull();
    expect(parseEurosToCents(null)).toBeNull();
    expect(parseEurosToCents(undefined)).toBeNull();
    expect(parseEurosToCents('abc')).toBeNull();
  });

  it('sanitizeStateForCloudSync elimina el payload masivo de backup_jobs para evitar timeouts en Supabase', () => {
    const heavyState: any = {
      installationId: 'fontaneria-roma',
      articles: [{ id: 'art-1', name: 'Tubo PVC' }],
      backup_jobs: [
        {
          id: 'bkp-1',
          filename: 'copia.json',
          created_at: '2026-11-03T10:00:00Z',
          status: 'completed',
          snapshot_payload: { massive: 'x'.repeat(100000) },
        },
      ],
    };

    const sanitized = sanitizeStateForCloudSync(heavyState);
    expect(sanitized.articles.length).toBe(1);
    expect(sanitized.backup_jobs.length).toBe(1);
    expect(sanitized.backup_jobs[0].id).toBe('bkp-1');
    expect(sanitized.backup_jobs[0].filename).toBe('copia.json');
    expect((sanitized.backup_jobs[0] as any).snapshot_payload).toBeUndefined();
  });

  it('Crea y asocia artículos con su proveedor habitual y precios sin dejarlos a 0', () => {
    const backend = new InstallationBackendEngine('test-art-supp-key');
    backend.login('admin@climalux-demo.es', 'Admin1234!');

    const supp = backend.saveSupplier({
      name: 'Distribuciones Fontanería Sur S.L.',
      tax_id: 'B12345678',
      contact_person: 'Pedro',
      phone: '600111222',
      email: 'pedro@fontasur.es',
      address: 'Polígono Industrial',
      postal_code: '13005',
      city: 'Ciudad Real',
      province: 'Ciudad Real',
      notes: '',
      is_active: true,
    });

    const art = backend.saveArticle({
      code: 'TUB-001',
      name: 'Tubo Cobre 15mm',
      description: 'Tubo rígido',
      unit: 'm',
      supplier_id: supp.id,
      purchase_price_cents: 350, // 3,50 €
      sale_price_cents: 620,     // 6,20 €
      is_active: true,
    });

    expect(art.supplier_id).toBe(supp.id);
    expect(art.purchase_price_cents).toBe(350);
    expect(art.sale_price_cents).toBe(620);
    expect(formatCentsToEUR(art.purchase_price_cents)).toBe('3,50\u00a0€');
    expect(formatCentsToEUR(art.sale_price_cents)).toBe('6,20\u00a0€');

    const articles = backend.getArticles(true);
    const found = articles.find((a) => a.id === art.id);
    expect(found).toBeDefined();
    expect(found!.supplier_id).toBe(supp.id);
  });
});
