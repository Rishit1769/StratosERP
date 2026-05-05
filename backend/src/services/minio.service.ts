import minioClient, { BUCKETS } from '../config/minio';
import { Readable } from 'stream';

export async function uploadStudyMaterial(
  buffer: Buffer,
  objectName: string,
  contentType: string
): Promise<string> {
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
  return minioClient.presignedGetObject(bucket, objectName, expirySeconds);
}

export async function deleteObject(bucket: string, objectName: string): Promise<void> {
  await minioClient.removeObject(bucket, objectName);
}

export async function listObjects(bucket: string, prefix?: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const objects: string[] = [];
    const stream = minioClient.listObjects(bucket, prefix || '', true);
    stream.on('data', (obj) => { if (obj.name) objects.push(obj.name); });
    stream.on('end', () => resolve(objects));
    stream.on('error', reject);
  });
}
