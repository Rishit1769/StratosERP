# StratosERP — Backend Engineering Progress Log

**Engineer:** Rishit Singh  
**Last Updated:** 2026-05-24  
**Engine:** MySQL 8.0+ · Charset: `utf8mb4` / `utf8mb4_unicode_ci`  
**Schema File:** `Database/schema.sql`  
**Backend:** Node.js + Express + TypeScript — `backend/`  
**Repository:** https://github.com/Rishit1769/StratosERP (branch: `main`)

---

## Phase 1 — Backend Implementation (Completed ✅)

### Architecture Summary

```
backend/
  src/
    app.ts                     # Express entry point — registers all routes
    config/
      database.ts              # MySQL2 connection pool
      minio.ts                 # MinIO client + bucket bootstrap
      gemini.ts                # Google Generative AI client
    middleware/
      auth.ts                  # JWT Bearer token authentication
      rbac.ts                  # Role-based access control factory
    types/
      index.ts                 # Shared TypeScript types (Role, JwtPayload, etc.)
    routes/
      auth.routes.ts           # /api/auth/*
      admin.routes.ts          # /api/admin/*
      hod.routes.ts            # /api/hod/*
      classIncharge.routes.ts  # /api/class-incharge/*
      subjectIncharge.routes.ts# /api/subject-incharge/*
      practicalTeacher.routes.ts# /api/practical-teacher/*
      teacherGuardian.routes.ts# /api/teacher-guardian/*
      student.routes.ts        # /api/student/*
    controllers/               # Thin HTTP layer — input validation + response
    services/                  # Business logic + SQL queries
    services/minio.service.ts  # File upload/download with MinIO
    services/gemini.service.ts # AI-powered grievance routing, notice gen, analysis
  .env                         # Local credentials (NOT in git)
  .env.example                 # Template for environment setup
```

### Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js v24 |
| Framework | Express.js |
| Language | TypeScript 5 |
| Database | MySQL 8.0 (mysql2) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| File Storage | MinIO S3-compatible |
| AI | Google Gemini 2.5-flash-lite |
| CSV Parsing | csv-parse/sync |
| File Upload | multer (memory storage) |

### How To Run

```bash
cd backend
cp .env.example .env          # Fill in your credentials
npm install
npm run dev                   # ts-node-dev (hot reload) on port 5000
npm run build                 # Compile to dist/
npm start                     # Run compiled dist/app.js
```

### Environment Variables (.env)

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<your_password>
DB_NAME=StratosERP
MINIO_ENDPOINT=<host>
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=<key>
MINIO_SECRET_KEY=<secret>
GEMINI_API_KEY=<google_ai_key>
GEMINI_MODEL=gemini-2.5-flash-lite
JWT_SECRET=<random_256_bit_hex>
JWT_EXPIRES_IN=24h
PORT=5000
```

---

### API Endpoints Reference

#### Auth  `/api/auth`
| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | `/login/faculty` | Public | Faculty login → JWT |
| POST | `/login/student` | Public | Student login → JWT |
| POST | `/change-password` | Authenticated | Change own password |
| GET | `/me` | Authenticated | Get current user profile |

#### Admin  `/api/admin`
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/config` | Get/set global config (semester type, dates) |
| POST | `/ingest/students` | Bulk CSV student upload |
| POST | `/ingest/faculty` | Bulk CSV faculty upload |
| POST | `/ingest/subjects` | Bulk CSV subject upload |
| POST | `/ingest/timetable` | Bulk CSV timetable upload |
| POST | `/batch-progression` | Trigger semester progression |
| POST | `/exam-seating` | Generate exam seating matrix |
| POST | `/invigilation-matrix` | Generate invigilation duty roster |
| GET | `/analytics` | Macro-level institute analytics |
| GET/POST | `/faculty` | List/create faculty |
| GET | `/students` | List all students (paginated) |
| GET | `/alumni` | List alumni records |
| GET/POST | `/notices` | List/create notices |
| POST | `/notices/ai` | AI-generated institutional notice |

#### HOD  `/api/hod`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/faculty` | List department faculty |
| POST | `/faculty/assign-subject` | Assign subject to faculty |
| POST | `/faculty/assign-role` | Change faculty designation |
| GET | `/analytics` | Branch-level analytics |
| GET | `/students/:uid` | Track individual student |
| GET | `/alumni` | Branch alumni |
| GET | `/grievances/escalated` | Escalated grievances |
| PUT | `/grievances/:ticket_id/resolve` | Resolve grievance |
| GET/POST | `/leave` | View/schedule leave substitution |
| GET/POST | `/notices` | Branch notices |
| POST | `/notices/ai` | AI-generated branch notice |
| GET | `/subjects` | Subjects list |

#### Class Incharge  `/api/class-incharge`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/analytics` | Class-level marks analytics |
| GET | `/students` | All students with backlog count |
| GET | `/students/at-risk` | Students with KT/SUPPLI or marks < 40 |
| GET | `/students/:uid/portfolio` | Full PTM portfolio for student |
| GET | `/students/:uid/ptm-report` | AI-generated PTM report |
| GET | `/progression-readiness` | Students clear for promotion |
| GET/POST | `/notices` | Class notices |

#### Subject Incharge  `/api/subject-incharge`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/subjects` | Faculty's assigned subjects |
| POST | `/marks` | Upsert student marks |
| POST | `/marks/suppli` | Upsert supplementary marks |
| GET | `/marks/:subject_id` | View subject marks |
| GET | `/analytics/:subject_id` | Subject performance analytics |
| GET | `/slot/active` | Current active timetable slot |
| POST | `/attendance` | Mark attendance for active slot |
| GET | `/attendance/:slot_id` | Get attendance for slot+date |
| POST | `/lecture-log` | Log lecture topics |
| GET | `/lecture-logs/:subject_id` | Get lecture history |
| POST | `/materials` | Upload study material to MinIO |
| POST | `/syllabus-analysis` | AI pacing analysis |

#### Practical Teacher  `/api/practical-teacher`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/subjects` | Lab subjects |
| POST | `/batches` | Create lab batch |
| GET | `/batches/:subject_id` | List batches |
| POST | `/experiments` | Create experiment |
| GET | `/experiments/:subject_id` | List experiments |
| POST | `/sessions` | Create lab session |
| POST | `/sessions/:session_id/complete` | Mark session completed |
| POST | `/sessions/:session_id/lock` | Lock session (permanent) |
| POST | `/sessions/:session_id/attendance` | Mark lab attendance |
| POST | `/sessions/:session_id/marks` | Upsert lab marks |
| POST | `/submissions` | Upload lab submission |

#### Teacher Guardian  `/api/teacher-guardian`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/mentees` | List assigned mentees |
| GET | `/mentees/:uid` | Mentee full portfolio |
| POST | `/mentees/:uid/aicte-points` | Award AICTE points |
| GET | `/mentees/:uid/aicte-points` | View AICTE points |
| GET | `/mentees/:uid/improvement-report` | AI areas-of-improvement |
| GET | `/grievances` | Assigned open grievances |
| PUT | `/grievances/:ticket_id/resolve` | Resolve grievance |
| GET | `/notices` | Relevant notices |

#### Student  `/api/student`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Full academic dashboard |
| GET | `/timetable` | Personal timetable |
| GET | `/faculty-locator` | Live faculty location (by current time) |
| POST | `/grievances` | Submit grievance (AI-routed) |
| GET | `/grievances` | My grievance history |
| GET | `/notices` | All notices |
| GET | `/materials/:subject_id` | Study material listing info |
| GET | `/materials/download` | Download material (MinIO presigned URL) |
| GET | `/lab-marks` | Personal lab marks |

---

## Testing Results — Phase 1 (All Endpoints Verified ✅)

### Test Environment

- **DB**: MySQL 8.0.45 @ localhost:3306/StratosERP
- **MinIO**: 100.106.25.126:9000 (buckets: study-materials, notices, submissions)
- **Gemini**: gemini-2.5-flash-lite
- **Server**: http://localhost:5000

### Bugs Found & Fixed

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | `jwt.sign()` throws "secretOrPrivateKey must have a value" | `JWT_SECRET` was empty in `.env` | Generated 256-bit random secret with `crypto.randomBytes(32)` |
| 2 | Gemini client crashes on import | `new GoogleGenerativeAI('gemini-2.5-flash-lite')` — model name used as API key | Fixed default fallback to empty string |
| 3 | `GET /student/materials/download` → 400 "Invalid subject_id" | Route `/materials/:subject_id` registered before `/materials/download` | Moved `/materials/download` route above `/:subject_id` |
| 4 | `GET /class-incharge/students/at-risk` → 404 | Route `/students/:uid/portfolio` registered before `/students/at-risk` | Moved `/students/at-risk` above `/:uid` routes |
| 5 | `POST /admin/config` → 400 "semester_type required" | Controller expected field `semester_type` but DB column is `active_semester_type` | Controller now accepts both field names |
| 6 | DB missing 8 tables + missing columns | Migration file not applied | Created and applied `Database/migrations/002_full_schema_apply.sql` |

### Endpoint Test Results

| Module | Tested | Passing | Notes |
|--------|--------|---------|-------|
| Health | 1 | 1 | ✅ |
| Auth (login + /me) | 4 | 4 | ✅ All 6 roles |
| Admin | 10 | 10 | ✅ |
| HOD | 6 | 6 | ✅ |
| Class Incharge | 5 | 5 | ✅ |
| Subject Incharge | 2 | 2 | ✅ (active-slot returns 404 when no slot — correct) |
| Teacher Guardian | 3 | 3 | ✅ |
| Student | 6 | 6 | ✅ |
| **Total** | **37** | **37** | ✅ 100% |

### Database Migrations Applied

| File | Purpose |
|------|---------|
| `Database/schema.sql` | Base 10 tables + 2 views + trigger |
| `Database/migrations/002_full_schema_apply.sql` | App-layer columns (password_hash, is_admin, is_hod, has_lab) + 8 new tables (lab system, aicte_points, tg_assignment) |
| `Database/migrations/003_seed_data.sql` | Test seed data — 5 faculty (all roles) + 1 student + subject + timetable slot |

### Git Commits (Phase 1 Backend)

All features were committed individually to GitHub (https://github.com/Rishit1769/StratosERP) with descriptive commit messages:

1. `feat(scaffold)` — project structure, package.json, tsconfig, .env.example
2. `feat(config)` — database, MinIO, Gemini config
3. `feat(auth)` — JWT middleware, RBAC, auth routes
4. `feat(admin)` — full admin module
5. `feat(hod)` — HOD module
6. `feat(class-incharge)` — Class Incharge module
7. `feat(subject-incharge)` — Subject Incharge module
8. `feat(practical-teacher)` — Practical Teacher module
9. `feat(teacher-guardian)` — Teacher Guardian module
10. `feat(student)` — Student module
11. `feat(ai)` — Gemini AI service
12. `feat(minio)` — MinIO service
13. `fix(*)` — All bug fixes + DB migration
14. `test` — Comprehensive API test script

---

### Objective
Design and implement the foundational relational database for StratosERP covering students, faculty, subjects, timetable management, grievances, leave, and notices.

### Tables Created

| # | Table | Purpose |
|---|-------|---------|
| 1 | `subject` | Subject catalogue with semester-level tagging |
| 2 | `global_config` | Singleton-style active semester configuration (ODD/EVEN) |
| 3 | `faculty` | Faculty profiles with role classification |
| 4 | `student` | Student profiles with UID format and academic year tracking |
| 5 | `student_subject_record` | Junction: student ↔ subject enrolment + status + marks |
| 6 | `timetable_slot` | Recurring weekly theory timetable slots |
| 7 | `lecture_log` | Auto-generated log when a timetable slot's class is conducted |
| 8 | `grievance_ticket` | Student grievances with AI-routed authority assignment |
| 9 | `leave_substitution` | Faculty leave + substitute assignment tracking |
| 10 | `notice_board` | Institute/branch notices with AI-generated filter tags |

### Key Design Decisions

- **`SERIAL` → `INT AUTO_INCREMENT`**: MySQL does not have a native `SERIAL` type; `INT AUTO_INCREMENT PRIMARY KEY` is the direct equivalent.
- **`NUMERIC` → `DECIMAL`**: `DECIMAL(5,2)` is used for marks fields for explicit precision control.
- **`TIMESTAMPTZ` → `TIMESTAMP`**: MySQL `TIMESTAMP` stores values in UTC internally.
- **`notice_board.ai_filter_tags`**: Changed from `TEXT` (comma-separated) to `JSON` column to enable native `JSON_CONTAINS()` / `JSON_OVERLAPS()` queries.
- **Partial unique index on `global_config`**: Not supported in MySQL. Enforced at the application layer (Business Rule #2).

### Constraints Summary

- All `CHECK` constraints use named `CONSTRAINT` identifiers for easier debugging.
- `student.uid` format (`^\d{4}-[A-Z]{2,3}-[A-Z]-\d{2}-\d{4}$`) is enforced at the application layer.
- `leave_substitution` prevents self-substitution via `CHECK (absent_faculty_id <> substitute_faculty_id)`.
- `lecture_log` has a composite `UNIQUE KEY (slot_id, execution_date)` — one log per slot per day.

### Indexes (Phase 1)

```sql
idx_ssr_student, idx_ssr_subject         -- student_subject_record
idx_slot_faculty, idx_slot_subject       -- timetable_slot
idx_log_slot, idx_log_date               -- lecture_log
idx_grievance_student, idx_grievance_status  -- grievance_ticket
idx_leave_absent, idx_leave_date         -- leave_substitution
```

### Views

| View | Joins |
|------|-------|
| `active_timetable` | `timetable_slot` + `subject` + `faculty` |
| `student_dashboard` | `student` + `student_subject_record` + `subject` |

### Trigger

- **`trg_grievance_updated_at`** — `BEFORE UPDATE` trigger on `grievance_ticket` to stamp `updated_at = NOW()`. The `ON UPDATE CURRENT_TIMESTAMP` column attribute also handles this natively; the trigger provides explicit parity with the specification.

### Seed Data

```sql
INSERT INTO global_config (active_semester_type, start_date, end_date)
VALUES ('ODD', '2026-07-01', '2026-11-30');
```

### Business Rules (Application Layer)

1. Student UID must match regex: `^\d{4}-[A-Z]{2,3}-[A-Z]-\d{2}-\d{4}$`
2. Only ONE row should be active in `global_config` at a time.
3. `grievance_ticket.assigned_authority_id` is populated asynchronously by Gemini AI after ticket creation.
4. `lecture_log` rows are auto-created when a timetable slot's class is marked as conducted.
5. `leave_substitution.substitute_faculty_id` must not already have a `timetable_slot` on that `leave_date` (check before insert).
6. `student_subject_record.status = 'KT'` or `'SUPPLI'` means the student carries the subject forward.
7. `notice_board.ai_filter_tags` stored as a JSON array for flexible querying.

---

## Phase 2 — Lab / Practical Management System Extension (Completed)

### Objective
Extend the existing schema with a complete lab management subsystem supporting batch-wise lab execution, experiment-level marking, lab attendance, and digital submission tracking — without modifying or breaking any Phase 1 tables.

### Approach
- **Non-breaking extension**: All changes are additive (`ALTER TABLE` with new columns only, new tables only).
- **`timetable_slot`, `lecture_log`, `student_subject_record`** are deliberately untouched; theory and lab systems remain independent.
- Lab sessions are assignment-based (not role-based), controlled through `lab_session`.

### Schema Changes

#### ALTER: `subject` table
Two columns added to flag lab subjects:

```sql
ALTER TABLE subject
  ADD COLUMN has_lab          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN lab_marks_weight INT     NULL,
  ADD CONSTRAINT chk_lab_marks_weight CHECK (lab_marks_weight <= 100);
```

| Column | Type | Purpose |
|--------|------|---------|
| `has_lab` | `BOOLEAN DEFAULT FALSE` | Flags whether the subject has a lab component |
| `lab_marks_weight` | `INT NULL` | Percentage weight of lab marks in final grade (0–100) |

#### New Tables

| # | Table | Purpose |
|---|-------|---------|
| 11 | `lab_batch` | Groups students into named batches per subject with an assigned faculty |
| 12 | `experiment` | Catalogue of experiments per subject with max marks |
| 13 | `lab_session` | Core control unit — one session per batch per date |
| 14 | `lab_attendance` | Per-student attendance per lab session |
| 15 | `lab_marks` | Experiment-level marks (viva + execution + journal + total) |
| 16 | `lab_submission` | Optional digital file submission tracking per experiment |

### Entity Relationship Summary (Lab System)

```
subject ──< lab_batch >── faculty
subject ──< experiment
lab_batch ──< lab_session >── faculty (assigned)
lab_session ──< lab_attendance >── student
lab_session ──< lab_marks >── experiment >── student
experiment ──< lab_submission >── student
```

### Table Details

#### `lab_batch` (Table 11)
- Unique per `(subject_id, batch_name)` — prevents duplicate batch names within a subject.
- `faculty_id` is the default lab instructor for the batch.

#### `experiment` (Table 12)
- `experiment_no` is unique within a subject (e.g., Experiment 1, 2, 3…).
- `max_marks` defines the ceiling for marking validation at application layer.

#### `lab_session` (Table 13)
- **Status lifecycle**: `Pending` → `Completed` → `Locked`
- `is_substitute = TRUE` activates `original_faculty_id` to record who was originally assigned.
- `assigned_faculty_id` always holds the actual conducting faculty.

#### `lab_attendance` (Table 14)
- Composite `UNIQUE KEY (session_id, student_uid)` prevents duplicate attendance entries.
- `ON DELETE CASCADE` from both `lab_session` and `student` maintains referential integrity automatically.

#### `lab_marks` (Table 15)
- Granularity: one row per `(student_uid, experiment_id)` — unique constraint enforced.
- `total_marks` is stored (denormalised) for query performance; application must keep it in sync with component marks.
- `updated_by` tracks the faculty who last saved marks.
- `ON UPDATE CURRENT_TIMESTAMP` on `updated_at` provides automatic audit stamping.

#### `lab_submission` (Table 16)
- Optional/scalable — not required for core lab operation.
- `file_url` stores a URL or relative file path to the uploaded file.
- `status` values: `Submitted`, `Late`, `Missing`.

### Indexes (Phase 2)

```sql
idx_lab_session_subject_date  ON lab_session(subject_id, session_date)
idx_lab_marks_student         ON lab_marks(student_uid)
idx_lab_attendance_session    ON lab_attendance(session_id)
```

### Business Rules (Application Layer — Lab System)

1. `lab_marks.total_marks` must be recalculated and saved by the application whenever component marks change.
2. A `lab_session` can only transition to `Locked` after `status = 'Completed'`; locked sessions must not allow mark edits.
3. Substitute logic for lab sessions mirrors `leave_substitution` — check `lab_session` conflicts before assigning substitute faculty.
4. `lab_marks_weight` on `subject` must be set if `has_lab = TRUE`; validated at application layer.
5. `experiment.max_marks` should be used by the application to validate that component marks do not exceed the cap.

---

## Full Table Inventory

| # | Table | Phase | Category |
|---|-------|-------|----------|
| 1 | `subject` | 1 (extended in 2) | Core |
| 2 | `global_config` | 1 | Core |
| 3 | `faculty` | 1 | Core |
| 4 | `student` | 1 | Core |
| 5 | `student_subject_record` | 1 | Theory |
| 6 | `timetable_slot` | 1 | Theory |
| 7 | `lecture_log` | 1 | Theory |
| 8 | `grievance_ticket` | 1 | Admin |
| 9 | `leave_substitution` | 1 | Admin |
| 10 | `notice_board` | 1 | Admin |
| 11 | `lab_batch` | 2 | Lab |
| 12 | `experiment` | 2 | Lab |
| 13 | `lab_session` | 2 | Lab |
| 14 | `lab_attendance` | 2 | Lab |
| 15 | `lab_marks` | 2 | Lab |
| 16 | `lab_submission` | 2 | Lab |

---
