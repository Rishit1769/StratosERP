import mysql, {
  type Pool,
  type PoolConnection,
  type PoolOptions,
  type ResultSetHeader,
} from "mysql2/promise";

function buildDatabaseUrlFromParts(): string | null {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    return null;
  }

  const port = DB_PORT || "3306";
  const encodedPassword = encodeURIComponent(DB_PASSWORD ?? "");
  return `mysql://${DB_USER}:${encodedPassword}@${DB_HOST}:${port}/${DB_NAME}`;
}

function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL || buildDatabaseUrlFromParts();
  if (!databaseUrl) {
    throw new Error(
      "Missing database configuration. Set DATABASE_URL or the DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME variables."
    );
  }

  process.env.DATABASE_URL = databaseUrl;
  return databaseUrl;
}

function buildPoolOptions(): PoolOptions {
  const url = new URL(resolveDatabaseUrl());
  const databaseName = url.pathname.replace(/^\//, "");

  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
  };
}

export const db = mysql.createPool(buildPoolOptions());

export type DbExecutor = Pool | PoolConnection;
export type DbParam = string | number | boolean | Date | null;
export type DbRow = Record<string, unknown>;

export async function selectRows<T extends DbRow>(
  executor: DbExecutor,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await executor.execute(sql, params as DbParam[]);
  return rows as T[];
}

export async function selectOne<T extends DbRow>(
  executor: DbExecutor,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await selectRows<T>(executor, sql, params);
  return rows[0] ?? null;
}

export async function run(
  executor: DbExecutor,
  sql: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const [result] = await executor.execute(sql, params as DbParam[]);
  return result as ResultSetHeader;
}

export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((entry): entry is string => typeof entry === "string")
        : [];
    } catch {
      return [];
    }
  }

  return [];
}
