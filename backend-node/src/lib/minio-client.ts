import * as Minio from 'minio';
import { createHash } from 'crypto';
import { env }    from '../config/env';
import { logger } from './logger';

// ─── Client ──────────────────────────────────────────────────────────────────

export const minioClient = new Minio.Client({
  endPoint:  env.MINIO_ENDPOINT,
  port:      env.MINIO_PORT,
  useSSL:    env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

// ─── Init buckets ────────────────────────────────────────────────────────────

export async function initBuckets(): Promise<void> {
  const buckets = [env.MINIO_BUCKET_KYC, env.MINIO_BUCKET_ASSETS];
  for (const bucket of buckets) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket, 'eu-west-1');
      logger.info(`[MinIO] Created bucket: ${bucket}`);
    }
  }
}

// ─── Upload helpers ───────────────────────────────────────────────────────────

export interface UploadResult {
  bucket:    string;
  path:      string;
  sha256:    string;
  sizeBytes: number;
  mimeType:  string;
}

/**
 * Upload a buffer to MinIO.
 * Returns the path, SHA-256 hash and size.
 */
export async function uploadBuffer(
  bucket:   string,
  path:     string,
  buffer:   Buffer,
  mimeType: string,
): Promise<UploadResult> {
  const sha256 = createHash('sha256').update(buffer).digest('hex');

  await minioClient.putObject(bucket, path, buffer, buffer.length, {
    'Content-Type':   mimeType,
    'x-sha256':       sha256,
  });

  logger.debug(`[MinIO] Uploaded ${path} (${buffer.length} bytes) to ${bucket}`);

  return {
    bucket,
    path,
    sha256,
    sizeBytes: buffer.length,
    mimeType,
  };
}

/**
 * Generate a pre-signed GET URL (expires in 1 hour by default).
 */
export async function getSignedUrl(
  bucket:     string,
  objectPath: string,
  expirySeconds = 3600,
): Promise<string> {
  return minioClient.presignedGetObject(bucket, objectPath, expirySeconds);
}

/**
 * Build the MinIO object path for a KYC document.
 * Pattern: {partner-uuid}/{document-type}/{uuid}.{ext}
 */
export function kycDocumentPath(
  partnerUuid:  string,
  documentType: string,
  fileUuid:     string,
  ext:          string,
): string {
  return `${partnerUuid}/${documentType}/${fileUuid}.${ext}`;
}

/**
 * Determine file extension from MIME type.
 */
export function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg':      'jpg',
    'image/png':       'png',
    'image/webp':      'webp',
  };
  return map[mime] ?? 'bin';
}
