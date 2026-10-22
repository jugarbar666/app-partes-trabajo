/**
 * Ejecutor de Servidor para Copias de Seguridad Integrales (Base de Datos + Storage Privado + Identidades Auth)
 *
 * Por qué un script ejecutor de servidor dedicado (D):
 * Los backups nativos de base de datos de Supabase no contienen los objetos binarios de Storage
 * (fotografías ni firmas manuscritas) y una Edge Function tiene límite de memoria/CPU/tiempo y no dispone
 * del binario `pg_dump`. Este ejecutor corre en un runner de servidor (GitHub Actions / Cron Server / contenedor)
 * o en administración local, verifica las herramientas, descarga objetos de Storage, exporta metadatos Auth,
 * genera un paquete con suma SHA-256 y actualiza el registro `backup_jobs` en Supabase.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

async function runFullBackup() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.SUPABASE_DB_URL;
  const backupJobId = process.env.BACKUP_JOB_ID;

  if (!supabaseUrl || !serviceRoleKey || !dbUrl) {
    console.error(
      '[ERROR] Faltan variables obligatorias de servidor: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o SUPABASE_DB_URL'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.resolve(process.cwd(), 'backups', `backup-${timestamp}`);
  fs.mkdirSync(outDir, { recursive: true });

  try {
    if (backupJobId) {
      await supabase
        .from('backup_jobs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', backupJobId);
    }

    // 1. Volcado completo de PostgreSQL con pg_dump
    console.log('[1/4] Ejecutando pg_dump de la base de datos...');
    const sqlDumpPath = path.join(outDir, 'database.dump');
    execSync(`pg_dump --format=custom --no-owner --no-acl --file="${sqlDumpPath}" "${dbUrl}"`, {
      stdio: 'inherit',
    });

    // 2. Exportación de metadatos de configuración de identidades Supabase Auth
    console.log('[2/4] Exportando metadatos de identidades Auth...');
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) throw usersErr;
    fs.writeFileSync(
      path.join(outDir, 'auth_identities_metadata.json'),
      JSON.stringify(usersData.users, null, 2),
      'utf-8'
    );

    // 3. Descarga de objetos binarios privados de Storage (fotografías y firmas)
    console.log('[3/4] Descargando archivos privados de Storage (work-files, work-signatures, company-assets)...');
    const buckets = ['work-files', 'work-signatures', 'company-assets'];
    for (const bucket of buckets) {
      const bucketDir = path.join(outDir, 'storage', bucket);
      fs.mkdirSync(bucketDir, { recursive: true });

      const { data: files } = await supabase.storage.from(bucket).list('', { limit: 1000 });
      for (const item of files || []) {
        if (!item.name) continue;
        const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(item.name);
        if (!dlErr && blob) {
          const buffer = Buffer.from(await blob.arrayBuffer());
          fs.writeFileSync(path.join(bucketDir, item.name), buffer);
        }
      }
    }

    // 4. Manifiesto de integridad y checksum SHA-256
    console.log('[4/4] Calculando manifiesto de verificación...');
    const dumpBuffer = fs.readFileSync(sqlDumpPath);
    const sha256 = crypto.createHash('sha256').update(dumpBuffer).digest('hex');

    const manifest = {
      created_at: new Date().toISOString(),
      installation_url: supabaseUrl,
      database_dump_sha256: sha256,
      database_dump_size_bytes: dumpBuffer.byteLength,
      buckets_included: buckets,
      auth_users_count: usersData.users.length,
    };
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    if (backupJobId) {
      await supabase
        .from('backup_jobs')
        .update({
          status: 'completed',
          artifact_path: outDir,
          size_bytes: dumpBuffer.byteLength,
          checksum_sha256: sha256,
          completed_at: new Date().toISOString(),
        })
        .eq('id', backupJobId);
    }

    console.log(`[OK] Copia de seguridad integral completada en: ${outDir} (SHA-256: ${sha256})`);
  } catch (err: any) {
    console.error('[ERROR BACKUP]', err);
    if (backupJobId) {
      await supabase
        .from('backup_jobs')
        .update({
          status: 'failed',
          error_message: err?.message || 'Error en ejecutor de backup',
          completed_at: new Date().toISOString(),
        })
        .eq('id', backupJobId);
    }
    process.exit(1);
  }
}

runFullBackup();
