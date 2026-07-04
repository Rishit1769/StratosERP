import { prisma } from '@stratoserp/database';
import dotenv from 'dotenv';

dotenv.config();

export async function testConnection(): Promise<void> {
  await prisma.$connect();
  console.log('[DB] Prisma connection established successfully.');
}

export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
