/**
 * Ejecutor de Restauración de Copia de Seguridad en Entorno Aislado o con Autorización Explícita
 * Verifica el manifiesto SHA-256, exige confirmación de seguridad para evitar sobrescribir
 * producción accidentalmente y restaura la base de datos y los archivos privados de Storage.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

async function runRestore() {
  const backupDir = process.env.RESTORE_BACKUP_DIR;
  const targetDbUrl = process.env.TARGET_SUPABASE_DB_URL;
  const targetSupabaseUrl = process.env.TARGET_SUPABASE_URL;
  const targetServiceRoleKey = process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;
  const confirmToken = process.env.CONFIRM_RESTORE_AUTHORIZATION;

  if (!backupDir || !targetDbUrl || !targetSupabaseUrl || !targetServiceRoleKey) {
    console.error(
      '[ERROR] Faltan parámetros: RESTORE_BACKUP_DIR, TARGET_SUPABASE_DB_URL, TARGET_SUPABASE_URL, TARGET_SUPABASE_SERVICE_ROLE_KEY'
    );
    process.exit(1);
  }

  if (confirmToken !== 'AUTORIZO_RESTAURACION_VERIFICADA') {
    console.error(
      '[BLOQUEADO] Por seguridad, no se permite restaurar sin establecer CONFIRM_RESTORE_AUTHORIZATION="AUTORIZO_RESTAURACION_VERIFICADA".'
    );
    process.exit(1);
  }

  const manifestPath = path.join(backupDir, 'manifest.json');
  const dumpPath = path.join(backupDir, 'database.dump');

  if (!fs.existsSync(manifestPath) || !fs.existsSync(dumpPath)) {
    console.error('[ERROR] El directorio indicado no contiene manifest.json ni database.dump');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const dumpBuffer = fs.readFileSync(dumpPath);
  const actualSha256 = crypto.createHash('sha256').update(dumpBuffer).digest('hex');

  if (actualSha256 !== manifest.database_dump_sha256) {
    console.error('[ERROR] Fallo de verificación de integridad SHA-256 del volcado de base de datos.');
    process.exit(1);
  }

  console.log('[1/2] Verificación SHA-256 correcta. Restaurando base de datos PostgreSQL...');
  execSync(`pg_restore --clean --if-exists --no-owner --no-acl --dbname="${targetDbUrl}" "${dumpPath}"`, {
    stdio: 'inherit',
  });

  console.log('[2/2] Restaurando objetos privados en Storage...');
  const supabase = createClient(targetSupabaseUrl, targetServiceRoleKey);
  for (const bucket of manifest.buckets_included || []) {
    const bucketPath = path.join(backupDir, 'storage', bucket);
    if (!fs.existsSync(bucketPath)) continue;

    const files = fs.readdirSync(bucketPath);
    for (const fileName of files) {
      const fileBuffer = fs.readFileSync(path.join(bucketPath, fileName));
      await supabase.storage.from(bucket).upload(fileName, fileBuffer, { upsert: true });
    }
  }

  console.log('[OK] Restauración completada y verificada.');
}

runRestore();
