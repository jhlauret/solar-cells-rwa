import { v4 as uuid } from 'uuid';
import { env }    from '../config/env';
import { logger } from '../lib/logger';
import {
  uploadBuffer, getSignedUrl, kycDocumentPath, mimeToExt, UploadResult,
} from '../lib/minio-client';

const ALLOWED_MIMES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Upload un document KYC depuis un buffer multer.
 * Valide la taille et le type MIME, écrit sur MinIO, retourne le path et le hash.
 */
export async function uploadKycDocument(opts: {
  partnerUuid:  string;
  documentType: string;
  buffer:       Buffer;
  mimeType:     string;
  originalName: string;
}): Promise<UploadResult & { path: string; sha256: string }> {
  const { partnerUuid, documentType, buffer, mimeType } = opts;

  // Validation
  if (!ALLOWED_MIMES.has(mimeType)) {
    throw Object.assign(
      new Error(`Type de fichier non autorisé: ${mimeType}`),
      { status: 400 },
    );
  }
  if (buffer.length > MAX_SIZE_BYTES) {
    throw Object.assign(
      new Error(`Fichier trop volumineux (max 10 MB).`),
      { status: 400 },
    );
  }

  const fileUuid = uuid();
  const ext      = mimeToExt(mimeType);
  const path     = kycDocumentPath(partnerUuid, documentType, fileUuid, ext);

  const result = await uploadBuffer(env.MINIO_BUCKET_KYC, path, buffer, mimeType);
  logger.info(`[MinIO] KYC document uploaded: ${path}`);

  return { ...result, path, sha256: result.sha256 };
}

/**
 * Génère une URL signée pour consulter un document KYC (1 heure).
 */
export async function getKycDocumentUrl(minioPath: string): Promise<string> {
  return getSignedUrl(env.MINIO_BUCKET_KYC, minioPath, 3600);
}
