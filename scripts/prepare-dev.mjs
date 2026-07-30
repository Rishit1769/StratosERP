import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const schemaArg = "prisma/schema.prisma";
const schemaPath = path.join(rootDir, "prisma", "schema.prisma");
const migrationsDir = path.join(rootDir, "prisma", "migrations");
const migrationEntries = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const expectedTables = [
  "admin_user",
  "aicte_points",
  "experiment",
  "faculty",
  "global_config",
  "grievance_ticket",
  "lab_attendance",
  "lab_batch",
  "lab_marks",
  "lab_session",
  "lab_submission",
  "leave_substitution",
  "lecture_log",
  "notice_board",
  "student",
  "student_subject_record",
  "subject",
  "tg_assignment",
  "timetable_slot",
];

dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config();

function logStep(message) {
  console.log(`[db:prepare] ${message}`);
}

function fail(message) {
  console.error(`[db:prepare] ${message}`);
  process.exit(1);
}

function run(command, args, label) {
  logStep(label);

  const result =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", `${command} ${args.join(" ")}`], {
          cwd: rootDir,
          env: process.env,
          stdio: "inherit",
        })
      : spawnSync(command, args, {
          cwd: rootDir,
          env: process.env,
          stdio: "inherit",
        });

  if (result.status !== 0) {
    fail(`${label} failed.`);
  }
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) {
    fail(
      "Missing database configuration. Set DATABASE_URL or the DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME variables."
    );
  }

  const port = DB_PORT || "3306";
  const encodedPassword = encodeURIComponent(DB_PASSWORD ?? "");
  process.env.DATABASE_URL = `mysql://${DB_USER}:${encodedPassword}@${DB_HOST}:${port}/${DB_NAME}`;
  return process.env.DATABASE_URL;
}

function verifyFiles() {
  if (!fs.existsSync(schemaPath)) {
    fail(`Prisma schema not found at ${schemaPath}.`);
  }

  if (migrationEntries.length === 0) {
    fail(`No Prisma migrations were found in ${migrationsDir}.`);
  }
}

function ensurePrismaDependencies() {
  const missingRuntime = !fs.existsSync(path.join(rootDir, "node_modules", "@prisma", "client", "package.json"));
  const missingCli = !fs.existsSync(path.join(rootDir, "node_modules", "prisma", "package.json"));
  const missingTsx = !fs.existsSync(path.join(rootDir, "node_modules", "tsx", "package.json"));

  if (!missingRuntime && !missingCli && !missingTsx) {
    logStep("Prisma dependencies already installed.");
    return;
  }

  if (missingRuntime) {
    run(npmCommand, ["install", "@prisma/client"], "Installing @prisma/client");
  }

  if (missingCli || missingTsx) {
    run(npmCommand, ["install", "-D", "prisma", "tsx"], "Installing Prisma CLI tooling");
  }
}

async function inspectDatabase(databaseUrl) {
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const [migrationTableRows] = await connection.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations'"
    );
    const [tableRows] = await connection.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
    );

    const tableNames = new Set(tableRows.map((row) => row.TABLE_NAME));
    return {
      hasMigrationTable: migrationTableRows.length > 0,
      existingTables: [...tableNames],
      hasAnyAppTables: expectedTables.some((tableName) => tableNames.has(tableName)),
      hasAllAppTables: expectedTables.every((tableName) => tableNames.has(tableName)),
    };
  } finally {
    await connection.end();
  }
}

async function baselineMigrationsIfNeeded(databaseUrl) {
  const inspection = await inspectDatabase(databaseUrl);

  logStep(`Database connectivity check passed (${inspection.existingTables.length} base tables found).`);

  if (inspection.hasMigrationTable) {
    return;
  }

  if (!inspection.hasAnyAppTables) {
    logStep("No existing application tables found. Prisma can apply the baseline migration normally.");
    return;
  }

  if (!inspection.hasAllAppTables) {
    fail(
      "The database already contains some StratosERP tables but is missing others, and there is no Prisma migration history. Review the schema manually before running migrations."
    );
  }

  if (migrationEntries.length !== 1) {
    fail(
      "Cannot safely baseline Prisma migrations automatically because the database has existing tables and more than one migration directory is present."
    );
  }

  const baselineMigration = migrationEntries[0];
  run(
    "npx",
    ["prisma", "migrate", "resolve", "--applied", baselineMigration, "--schema", schemaArg],
    `Baselining existing database with migration ${baselineMigration}`
  );
}

async function main() {
  if (process.env.SKIP_DB_PREPARE === "true") {
    logStep("Skipping database preparation because SKIP_DB_PREPARE=true.");
    return;
  }

  if (process.env.NODE_ENV === "production") {
    fail("Refusing to run development database preparation when NODE_ENV=production.");
  }

  verifyFiles();
  ensurePrismaDependencies();

  const databaseUrl = ensureDatabaseUrl();

  run("npx", ["prisma", "generate", "--schema", schemaArg], "Generating Prisma Client");

  await baselineMigrationsIfNeeded(databaseUrl);

  run(
    "npx",
    ["prisma", "migrate", "deploy", "--schema", schemaArg],
    "Applying existing Prisma migrations"
  );
  run("npx", ["prisma", "db", "seed", "--schema", schemaArg], "Running Prisma seed");
}

main().catch((error) => {
  console.error("[db:prepare] Unexpected failure:", error);
  process.exit(1);
});
