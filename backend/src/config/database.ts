import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'StratosERP',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  console.log('[DB] MySQL connection established successfully.');
  conn.release();
}

async function tableExists(tableName: string): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT 1 AS exists_flag
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const [rows] = await pool.query(
    `SELECT 1 AS exists_flag
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return Array.isArray(rows) && rows.length > 0;
}

export async function ensureAuthSchema(): Promise<void> {
  if (!(await tableExists('admin_user'))) {
    await pool.query(`
      CREATE TABLE admin_user (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email_id VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL
      )
    `);
    console.log('[DB] Created missing table: admin_user');
  }

  if (await tableExists('faculty')) {
    if (!(await columnExists('faculty', 'password_hash'))) {
      await pool.query("ALTER TABLE faculty ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''");
      console.log('[DB] Added missing column: faculty.password_hash');
    }

    if (!(await columnExists('faculty', 'is_hod'))) {
      await pool.query('ALTER TABLE faculty ADD COLUMN is_hod BOOLEAN NOT NULL DEFAULT FALSE');
      console.log('[DB] Added missing column: faculty.is_hod');
    }
  }

  if (await tableExists('student') && !(await columnExists('student', 'password_hash'))) {
    await pool.query("ALTER TABLE student ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''");
    console.log('[DB] Added missing column: student.password_hash');
  }
}

export default pool;
