# StratosERP

StratosERP is a Next.js 16 application backed by MySQL. The app currently uses `mysql2` for most runtime queries and keeps Prisma as the source of truth for schema management, migrations, Prisma Client generation, and development seeding.

## Prerequisites

- Node.js `>=20.9.0` (required by Next.js 16; the current repo is working on Node `v24.14.0`)
- npm `>=10`
- MySQL `8.0+`
- Optional: MinIO and a Gemini API key for the storage and AI features

## Environment setup

1. Copy `.env.example` to `.env`.
2. Fill in your local values.

Required database variables:

- `DATABASE_URL`
- Or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`

Other required app variables:

- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET_STUDY_MATERIALS`
- `MINIO_BUCKET_NOTICES`
- `MINIO_BUCKET_SUBMISSIONS`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

Optional development variables:

- `SKIP_DB_PREPARE=true`
  Skips Prisma generate, migration deployment, and seeding when running `npm run dev`.
- `SEED_DEFAULT_PASSWORD`
  Overrides the default local seeded password.

## Local development

Install dependencies once:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

`npm run dev` now performs the following steps before starting Next.js:

1. Loads `.env` and verifies database configuration.
2. Verifies that Prisma dependencies are installed.
3. Generates Prisma Client from `prisma/schema.prisma`.
4. Checks database connectivity.
5. If the database already contains StratosERP tables but no `_prisma_migrations` history, baselines the existing database with the checked-in initial migration without touching data.
6. Applies checked-in migrations with `prisma migrate deploy`.
7. Runs the Prisma seed script.
8. Starts the existing Next.js dev server with Turbopack.

The prepare step refuses to run when `NODE_ENV=production`.

## Database commands

```bash
npm run db:generate
npm run db:migrate:dev
npm run db:deploy
npm run db:status
npm run db:seed
npm run db:push
npm run db:studio
```

Usage notes:

- `npm run db:migrate:dev`
  Use this only when you are intentionally creating a new named migration during development.
- `npm run db:deploy`
  Applies existing migrations only. This is the safe command used by `npm run dev`.
- `npm run db:status`
  Shows whether migrations are applied.

## Seeding

The seed is idempotent and non-destructive:

- Existing matching users are skipped instead of overwritten.
- The script logs created, skipped, and legacy seed records.
- Legacy seed users from older email domains are reported but not deleted automatically.

Default local seeded users:

| Email | Role | Default password |
| --- | --- | --- |
| `admin@tcetmumbai.in` | Admin | `Password@123` |
| `hodcomp@tcetmumbai.in` | HOD | `Password@123` |
| `subjectinchargecomp@tcetmumbai.in` | SubjectIncharge | `Password@123` |
| `classinchargecomp@tcetmumbai.in` | ClassIncharge | `Password@123` |
| `teacherguardiancomp@tcetmumbai.in` | TG | `Password@123` |
| `studentcomp@tcetmumbai.in` | Student | `Password@123` |

If you set `SEED_DEFAULT_PASSWORD`, that value is used for newly created seed users.

## Creating a new migration

When the Prisma schema changes intentionally, create a named migration explicitly:

```bash
npx prisma migrate dev --name descriptive_migration_name --schema prisma/schema.prisma
```

Do not rely on `npm run dev` to create migrations automatically.

## Production

Do not run `prisma migrate dev` in production.

Apply production migrations with:

```bash
npm run db:deploy
```

## Troubleshooting

Migration history missing but tables already exist:

- `npm run dev` will baseline the existing local database only when all expected StratosERP tables already exist and only the checked-in initial migration is present.
- If the database is only partially populated, the prepare step stops and asks for manual review instead of guessing.

Database connection failure:

- Verify `DATABASE_URL`, or the `DB_*` variables.
- Confirm MySQL is reachable from your machine.

Schema drift:

- Run `npm run db:status`.
- If Prisma reports drift or conflicts that require a reset, stop and inspect manually.
- Do not run `prisma migrate reset` against a database that contains data you care about.

Skip local DB automation temporarily:

```bash
set SKIP_DB_PREPARE=true
npm run dev
```
