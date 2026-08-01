/**
 * backup.js — SQLite Backup Module
 *
 * Strategy:
 *  1. Use better-sqlite3's native .backup() for a hot, consistent snapshot.
 *  2. Store compressed copies in server/backups/ with ISO timestamp.
 *  3. Rotate: keep only the last MAX_LOCAL_BACKUPS files.
 *  4. Optional: upload to S3 if AWS credentials are present in .env.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { createReadStream, createWriteStream } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH       = path.join(__dirname, 'data', 'saas.db');
const BACKUPS_DIR   = path.join(__dirname, 'backups');
const MAX_LOCAL     = 14; // keep last 14 daily backups

if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });

// ─── Helpers ────────────────────────────────────────────────────────────────

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function allBackups() {
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('saas_') && f.endsWith('.db.gz'))
    .sort(); // oldest first (ISO names sort chronologically)
}

async function compressFile(src, dst) {
  const gzip = zlib.createGzip({ level: 9 });
  await pipeline(createReadStream(src), gzip, createWriteStream(dst));
}

async function uploadToS3(filePath, fileName) {
  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_S3_BUCKET,
  } = process.env;

  if (!AWS_ACCESS_KEY_ID || !AWS_S3_BUCKET) return false;

  try {
    // Dynamic import so the module is optional — won't crash if not installed
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3').catch(() => ({ S3Client: null }));
    if (!S3Client) {
      console.warn('⚠️  Backup: @aws-sdk/client-s3 não instalado. Pulando upload S3.');
      return false;
    }

    const client = new S3Client({
      region: AWS_REGION || 'us-east-1',
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    });

    const body = fs.readFileSync(filePath);
    await client.send(new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: `backups/${fileName}`,
      Body: body,
      ContentType: 'application/gzip',
    }));

    console.log(`☁️  Backup enviado para S3: s3://${AWS_S3_BUCKET}/backups/${fileName}`);
    return true;
  } catch (err) {
    console.error('❌ Erro no upload S3:', err.message);
    return false;
  }
}

function rotateOldBackups() {
  const files = allBackups();
  const excess = files.length - MAX_LOCAL;
  if (excess > 0) {
    const toDelete = files.slice(0, excess);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUPS_DIR, f));
      console.log(`🗑️  Backup antigo removido: ${f}`);
    });
  }
}

// ─── Main Export ────────────────────────────────────────────────────────────

/**
 * runBackup() — perform a full backup cycle.
 * Returns: { fileName, filePath, sizeKb, uploadedToS3 }
 */
export async function runBackup() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Banco de dados não encontrado em: ${DB_PATH}`);
  }

  const stamp     = isoStamp();
  const rawName   = `saas_${stamp}.db`;
  const gzName    = `saas_${stamp}.db.gz`;
  const rawPath   = path.join(BACKUPS_DIR, rawName);
  const gzPath    = path.join(BACKUPS_DIR, gzName);

  // 1. Hot backup via better-sqlite3 native API
  const db = new Database(DB_PATH, { readonly: true });
  await db.backup(rawPath);
  db.close();

  // 2. Compress
  await compressFile(rawPath, gzPath);
  fs.unlinkSync(rawPath); // remove uncompressed copy

  const { size } = fs.statSync(gzPath);
  const sizeKb = (size / 1024).toFixed(1);

  console.log(`✅ Backup criado: ${gzName} (${sizeKb} KB)`);

  // 3. Upload to S3 (optional)
  const uploadedToS3 = await uploadToS3(gzPath, gzName);

  // 4. Rotate old backups
  rotateOldBackups();

  return { fileName: gzName, filePath: gzPath, sizeKb, uploadedToS3 };
}

/**
 * getBackupList() — returns metadata about stored local backups.
 */
export function getBackupList() {
  return allBackups()
    .reverse() // newest first
    .map(f => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, f));
      return {
        fileName: f,
        sizeKb: (stat.size / 1024).toFixed(1),
        createdAt: stat.mtime.toISOString(),
      };
    });
}

/**
 * getBackupPath(fileName) — resolves and validates a backup file path.
 */
export function getBackupPath(fileName) {
  // Security: ensure no path traversal
  const safe = path.basename(fileName);
  if (!safe.startsWith('saas_') || !safe.endsWith('.db.gz')) return null;
  const resolved = path.join(BACKUPS_DIR, safe);
  return fs.existsSync(resolved) ? resolved : null;
}
