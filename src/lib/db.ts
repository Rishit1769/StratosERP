import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

export const db = mysql.createPool({
  host: "100.83.134.27",
  user: "rishit",
  password: "159753AA",
  database: "StratosERP",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
});

export type DbExecutor = Pool | PoolConnection;
export type DbRow = RowDataPacket & Record<string, unknown>;

export async function selectRows<T extends DbRow>(
  executor: DbExecutor,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const [rows] = await executor.execute<T[]>(sql, params);
  return rows;
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
  const [result] = await executor.execute<ResultSetHeader>(sql, params);
  return result;
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
