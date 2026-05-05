import { Client } from 'minio';
import dotenv from 'dotenv';

dotenv.config();

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || '',
  secretKey: process.env.MINIO_SECRET_KEY || '',
});

export const BUCKETS = {
  STUDY_MATERIALS: process.env.MINIO_BUCKET_STUDY_MATERIALS || 'study-materials',
  NOTICES: process.env.MINIO_BUCKET_NOTICES || 'notices',
  SUBMISSIONS: process.env.MINIO_BUCKET_SUBMISSIONS || 'submissions',
};

export async function ensureBucketsExist(): Promise<void> {
  for (const bucket of Object.values(BUCKETS)) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket, 'us-east-1');
      console.log(`[MinIO] Created bucket: ${bucket}`);
    } else {
      console.log(`[MinIO] Bucket exists: ${bucket}`);
    }
  }
}

export default minioClient;
