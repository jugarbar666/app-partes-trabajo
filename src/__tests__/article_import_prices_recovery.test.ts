import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as XLSX from 'xlsx';
import { InstallationBackendEngine } from '../services/backendEngine';
import {
  extractValueFromRaw,
  validateAndPreviewImport,
  buildDefaultEntityMapping,
  executeValidatedImportAsync,
  executeValidatedImport,
} from '../utils/exportImportUtils';
import { OFFICIAL_ROMA_ARTICLE_PRICES } from '../services/officialArticlesCatalog';
import { formatCentsToEUR } from '../utils/formatters';

describe('Blindaje y recuperación de precios de compra y venta en artículos', () => {
  it('extractValueFromRaw extrae importes de compra y venta ante variaciones de cabecera, espacios o sinónimos', () => {
    // 1. Variaciones con espacios extras
    const rawWithSpaces = {
      ' Codigo_Articulo ': 'MAT-0002',
      'Precio_Compra ': '0,13',
      'Precio_Venta  ': '0,29',
    };
    expect(extractValueFromRaw(rawWithSpaces, 'Precio_Compra', 'purchase_price')).toBe('0,13');
    expect(extractValueFromRaw(rawWithSpaces, 'Precio_Venta', 'sale_price')).toBe('0,29');
    expect(extractValueFromRaw(rawWithSpaces, 'Codigo_Articulo', 'code')).toBe('MAT-0002');

    // 2. Variaciones con sinónimos habituales (Coste, PVP, Tarifa)
    const rawSynonyms = {
      'Referencia': 'MAT-0099',
      'Coste': '12,50',
      'PVP': '25,00',
    };
    expect(extractValueFromRaw(rawSynonyms, 'Precio_Compra', 'purchase_price')).toBe('12,50');
    expect(extractValueFromRaw(rawSynonyms, 'Precio_Venta', 'sale_price')).toBe('25,00');
    expect(extractValueFromRaw(rawSynonyms, 'Codigo_Articulo', 'code')).toBe('MAT-0099');

    // 3. Variaciones con texto en euros en la cabecera
    const rawWithCurrencyHeader = {
      'Precio de Compra (€)': '1,49',
      'Precio de Venta (€)': '2,87',
    };
    expect(extractValueFromRaw(rawWithCurrencyHeader, 'Precio_Compra', 'purchase_price')).toBe('1,49');
    expect(extractValueFromRaw(rawWithCurrencyHeader, 'Precio_Venta', 'sale_price')).toBe('2,87');
  });

  it('artículos existentes en la base de datos sin precios recuperan automáticamente los importes oficiales de catálogo', () => {
    const backend = new InstallationBackendEngine('test-recovery-inst', false, 'clean');
    backend.login('jugarbar@gmail.com', 'anromago678*');

    // Simular que en la base de datos existen artículos con purchase_price_cents y sale_price_cents en null (como en el pantallazo)
    const art1 = backend.saveArticle({
      code: 'MAT-0002',
      name: 'Abrazadera atornillar M/6 32',
      description: '',
      supplier_id: null,
      purchase_price_cents: null,
      sale_price_cents: null,
      unit: 'ud',
      is_active: true,
    });

    const art2 = backend.saveArticle({
      code: 'MAT-0003',
      name: 'Abrazadera desagüe M8 d.110',
      description: '',
      supplier_id: null,
      purchase_price_cents: null,
      sale_price_cents: null,
      unit: 'ud',
      is_active: true,
    });

    const articles = backend.getArticles(true);
    const mat0002 = articles.find((a) => a.code === 'MAT-0002');
    const mat0003 = articles.find((a) => a.code === 'MAT-0003');

    // Deben haberse recuperado automáticamente de OFFICIAL_ROMA_ARTICLE_PRICES
    expect(mat0002).toBeDefined();
    expect(mat0002?.purchase_price_cents).toBe(13);
    expect(mat0002?.sale_price_cents).toBe(29);
    expect(formatCentsToEUR(mat0002?.purchase_price_cents)).toBe('0,13\u00A0€');
    expect(formatCentsToEUR(mat0002?.sale_price_cents)).toBe('0,29\u00A0€');

    expect(mat0003).toBeDefined();
    expect(mat0003?.purchase_price_cents).toBe(93);
    expect(mat0003?.sale_price_cents).toBe(155);
    expect(formatCentsToEUR(mat0003?.purchase_price_cents)).toBe('0,93\u00A0€');
    expect(formatCentsToEUR(mat0003?.sale_price_cents)).toBe('1,55\u00A0€');
  });

  it('si se importa un Excel con celdas de precios vacías, se preservan los precios existentes y no se sobrescriben a null', async () => {
    const backend = new InstallationBackendEngine('test-preserve-prices', false, 'clean');
    backend.login('jugarbar@gmail.com', 'anromago678*');

    // Artículo con precio existente
    const art = backend.saveArticle({
      code: 'MAT-0999',
      name: 'Tubo multicapa 16mm',
      description: 'Alta resistencia',
      supplier_id: null,
      purchase_price_cents: 120, // 1,20 €
      sale_price_cents: 240,     // 2,40 €
      unit: 'm',
      is_active: true,
    });

    // Re-importar el mismo artículo pero con las columnas de precio vacías
    const rawRows = [
      {
        Codigo_Articulo: 'MAT-0999',
        Unidad_Medida: 'm',
        Nombre_Articulo: 'Tubo multicapa 16mm (Modificado)',
        Precio_Compra: '',
        Precio_Venta: '',
        Proveedor_Habitual: '',
      },
    ];

    const preview = validateAndPreviewImport({
      backend,
      entityType: 'articles',
      rawRows,
      receivedHeaders: Object.keys(rawRows[0]),
    });

    const res = await executeValidatedImportAsync({
      backend,
      entityType: 'articles',
      fileName: 'actualizacion_sin_precios.xlsx',
      conflictPolicy: 'update_existing',
      preview,
    });

    expect(res.updated).toBe(1);

    const updated = backend.getArticles(true).find((a) => a.code === 'MAT-0999');
    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Tubo multicapa 16mm (Modificado)');
    // No debe haberse vaciado a null, se conservan sus importes previos
    expect(updated?.purchase_price_cents).toBe(120);
    expect(updated?.sale_price_cents).toBe(240);
  });

  it('importación completa del archivo real media_1793466083473_50075272.xlsx con Uint8Array y asignación correcta de precios', async () => {
    const backend = new InstallationBackendEngine('test-real-file-import', false, 'clean');
    backend.login('jugarbar@gmail.com', 'anromago678*');
    const path = 'C:/Users/programador/.gemini/antigravity/brain/f76cf416-b716-4620-a14c-724802dd3902/.user_uploaded/media_1793466083473_50075272.xlsx';
    if (!fs.existsSync(path)) return;

    const fileBuf = fs.readFileSync(path);
    const uint8 = new Uint8Array(fileBuf);

    const wb = XLSX.read(uint8, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];

    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
    const headers = (grid[0] || []).map((h) => String(h || '').trim());
    const jsonRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    const mapping = buildDefaultEntityMapping('articles', headers);

    const preview = validateAndPreviewImport({
      backend,
      entityType: 'articles',
      rawRows: jsonRaw,
      columnMapping: mapping,
      receivedHeaders: headers,
    });

    expect(preview.totalRows).toBe(265);
    expect(preview.errorCount).toBe(0);

    const res = await executeValidatedImportAsync({
      backend,
      entityType: 'articles',
      fileName: 'media_1793466083473_50075272.xlsx',
      conflictPolicy: 'update_existing',
      preview,
    });

    expect(res.inserted + res.updated).toBe(265);

    const articles = backend.getArticles(true);
    expect(articles.length).toBe(265);

    // Comprobar los artículos señalados en el pantallazo
    const mat0002 = articles.find((a) => a.code === 'MAT-0002');
    expect(mat0002).toBeDefined();
    expect(mat0002?.purchase_price_cents).toBe(13);
    expect(mat0002?.sale_price_cents).toBe(29);
    expect(formatCentsToEUR(mat0002?.purchase_price_cents)).not.toBe('—');
    expect(formatCentsToEUR(mat0002?.sale_price_cents)).not.toBe('—');

    const mat0003 = articles.find((a) => a.code === 'MAT-0003');
    expect(mat0003).toBeDefined();
    expect(mat0003?.purchase_price_cents).toBe(93); // 0.928333 redondeado
    expect(mat0003?.sale_price_cents).toBe(155);

    const mat0004 = articles.find((a) => a.code === 'MAT-0004');
    expect(mat0004).toBeDefined();
    expect(mat0004?.purchase_price_cents).toBe(14);
    expect(mat0004?.sale_price_cents).toBe(32);

    const mat0258 = articles.find((a) => a.code === 'MAT-0258');
    expect(mat0258).toBeDefined();
    expect(mat0258?.purchase_price_cents).toBe(149);
    expect(mat0258?.sale_price_cents).toBe(287);
  });
});
