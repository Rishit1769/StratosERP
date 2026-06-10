import minioClient, { BUCKETS, MINIO_PUBLIC_BASE_URL, isMinioAvailable } from '../config/minio';
import { Readable } from 'stream';

const PRESIGNED_URL_EXPIRY_SECONDS = 60 * 15;

type PresignedAction = 'upload' | 'download';

type PresignedUrlRequest = {
  action: PresignedAction;
  bucketName?: string;
  fileName: string;
  fileType?: string;
  userId: string | number;
};

export class MinioUnavailableError extends Error {
  constructor(message = 'MinIO service is currently unavailable.') {
    super(message);
    this.name = 'MinioUnavailableError';
  }
}

function assertMinioAvailable(): void {
  if (!isMinioAvailable()) {
    throw new MinioUnavailableError();
  }
}

function sanitizePathSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  const lastDotIndex = trimmed.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? trimmed.slice(0, lastDotIndex) : trimmed;
  const extension = lastDotIndex > 0 ? trimmed.slice(lastDotIndex).replace(/[^a-zA-Z0-9.]+/g, '') : '';
  const safeBase = sanitizePathSegment(baseName) || 'file';
  return `${safeBase}${extension.toLowerCase()}`;
}

function resolveBucketName(bucketName?: string): string {
  if (!bucketName) {
    return BUCKETS.STUDY_MATERIALS;
  }

  const normalized = bucketName.trim();
  const allowedBuckets = new Set(Object.values(BUCKETS));
  if (!allowedBuckets.has(normalized)) {
    throw new Error(`Unsupported bucket: ${bucketName}`);
  }

  return normalized;
}

function buildObjectKey(userId: string | number, fileName: string): string {
  const safeUserId = sanitizePathSegment(String(userId)) || 'anonymous';
  const safeFileName = sanitizeFileName(fileName);
  return `uploads/${safeUserId}/${Date.now()}-${safeFileName}`;
}

function toPublicPresignedUrl(url: string): string {
  if (!MINIO_PUBLIC_BASE_URL) {
    return url;
  }

  const source = new URL(url);
  const targetBase = new URL(MINIO_PUBLIC_BASE_URL);
  source.protocol = targetBase.protocol;
  source.username = targetBase.username;
  source.password = targetBase.password;
  source.hostname = targetBase.hostname;
  source.port = targetBase.port;
  return source.toString();
}

export async function uploadStudyMaterial(
  buffer: Buffer,
  objectName: string,
  contentType: string
): Promise<string> {
  assertMinioAvailable();
  const stream = Readable.from(buffer);
  await minioClient.putObject(BUCKETS.STUDY_MATERIALS, objectName, stream, buffer.length, {
    'Content-Type': contentType,
  });
  return `${BUCKETS.STUDY_MATERIALS}/${objectName}`;
}

export async function uploadNotice(
  buffer: Buffer,
  objectName: string,
  contentType: string
): Promise<string> {
  assertMinioAvailable();
  const stream = Readable.from(buffer);
  await minioClient.putObject(BUCKETS.NOTICES, objectName, stream, buffer.length, {
    'Content-Type': contentType,
  });
  return `${BUCKETS.NOTICES}/${objectName}`;
}

export async function uploadSubmission(
  buffer: Buffer,
  objectName: string,
  contentType: string
): Promise<string> {
  assertMinioAvailable();
  const stream = Readable.from(buffer);
  await minioClient.putObject(BUCKETS.SUBMISSIONS, objectName, stream, buffer.length, {
    'Content-Type': contentType,
  });
  return `${BUCKETS.SUBMISSIONS}/${objectName}`;
}

export async function getPresignedDownloadUrl(
  objectName: string,
  bucket: string = BUCKETS.STUDY_MATERIALS,
  expirySeconds: number = 3600
): Promise<string> {
  assertMinioAvailable();
  const url = await minioClient.presignedGetObject(bucket, objectName, expirySeconds);
  return toPublicPresignedUrl(url);
}

export async function generatePresignedObjectUrl({
  action,
  bucketName,
  fileName,
  userId,
}: PresignedUrlRequest): Promise<{ fileKey: string; bucketName: string; url: string }> {
  assertMinioAvailable();

  const resolvedBucketName = resolveBucketName(bucketName);
  const fileKey = buildObjectKey(userId, fileName);
  const url =
    action === 'upload'
      ? await minioClient.presignedPutObject(resolvedBucketName, fileKey, PRESIGNED_URL_EXPIRY_SECONDS)
      : await minioClient.presignedGetObject(resolvedBucketName, fileKey, PRESIGNED_URL_EXPIRY_SECONDS);

  return {
    fileKey,
    bucketName: resolvedBucketName,
    url: toPublicPresignedUrl(url),
  };
}

export async function deleteObject(bucket: string, objectName: string): Promise<void> {
  assertMinioAvailable();
  await minioClient.removeObject(bucket, objectName);
}

export async function listObjects(bucket: string, prefix?: string): Promise<string[]> {
  assertMinioAvailable();
  return new Promise((resolve, reject) => {
    const objects: string[] = [];
    const stream = minioClient.listObjects(bucket, prefix || '', true);
    stream.on('data', (obj) => { if (obj.name) objects.push(obj.name); });
    stream.on('end', () => resolve(objects));
    stream.on('error', reject);
  });
}
