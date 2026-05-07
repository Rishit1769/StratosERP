-- =============================================================
-- StratosERP Phase-I — Full Schema Migration (MySQL 8.0 compatible)
-- Migration: 002_full_schema_apply.sql
-- Applies all missing tables & columns to bring DB up to date
-- Run AFTER schema.sql base tables have been applied
-- =============================================================

USE StratosERP;

-- =============================================================
-- STEP 1: Conditionally add columns to FACULTY
-- =============================================================
DROP PROCEDURE IF EXISTS sp_migrate_faculty;
DELIMITER $$
CREATE PROCEDURE sp_migrate_faculty()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='StratosERP' AND TABLE_NAME='faculty' AND COLUMN_NAME='password_hash') THEN
    ALTER TABLE faculty ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='StratosERP' AND TABLE_NAME='faculty' AND COLUMN_NAME='is_hod') THEN
    ALTER TABLE faculty ADD COLUMN is_hod BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END$$
DELIMITER ;
CALL sp_migrate_faculty();
DROP PROCEDURE IF EXISTS sp_migrate_faculty;

-- =============================================================
-- STEP 1A: Ensure ADMIN_USER table exists
-- =============================================================
CREATE TABLE IF NOT EXISTS admin_user (
  admin_id      INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email_id      VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

-- =============================================================
-- STEP 2: Conditionally add password_hash to STUDENT
-- =============================================================
DROP PROCEDURE IF EXISTS sp_migrate_student;
DELIMITER $$
CREATE PROCEDURE sp_migrate_student()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='StratosERP' AND TABLE_NAME='student' AND COLUMN_NAME='password_hash') THEN
    ALTER TABLE student ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '';
  END IF;
END$$
DELIMITER ;
CALL sp_migrate_student();
DROP PROCEDURE IF EXISTS sp_migrate_student;

-- =============================================================
-- STEP 3: Conditionally add lab columns to SUBJECT
-- =============================================================
DROP PROCEDURE IF EXISTS sp_migrate_subject;
DELIMITER $$
CREATE PROCEDURE sp_migrate_subject()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='StratosERP' AND TABLE_NAME='subject' AND COLUMN_NAME='has_lab') THEN
    ALTER TABLE subject ADD COLUMN has_lab BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA='StratosERP' AND TABLE_NAME='subject' AND COLUMN_NAME='lab_marks_weight') THEN
    ALTER TABLE subject ADD COLUMN lab_marks_weight INT NULL;
  END IF;
END$$
DELIMITER ;
CALL sp_migrate_subject();
DROP PROCEDURE IF EXISTS sp_migrate_subject;

-- =============================================================
-- TABLE 11: LAB_BATCH
-- =============================================================
CREATE TABLE IF NOT EXISTS lab_batch (
  batch_id   INT         AUTO_INCREMENT PRIMARY KEY,
  subject_id INT         NOT NULL,
  batch_name VARCHAR(20) NOT NULL,
  faculty_id INT         NOT NULL,
  CONSTRAINT fk_batch_subject FOREIGN KEY (subject_id) REFERENCES subject(subject_id) ON DELETE CASCADE,
  CONSTRAINT fk_batch_faculty FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id),
  UNIQUE KEY uq_subject_batch (subject_id, batch_name)
);

-- =============================================================
-- TABLE 12: EXPERIMENT
-- =============================================================
CREATE TABLE IF NOT EXISTS experiment (
  experiment_id INT          AUTO_INCREMENT PRIMARY KEY,
  subject_id    INT          NOT NULL,
  experiment_no INT          NOT NULL,
  title         VARCHAR(255) NOT NULL,
  max_marks     INT          NOT NULL,
  CONSTRAINT fk_experiment_subject FOREIGN KEY (subject_id) REFERENCES subject(subject_id) ON DELETE CASCADE,
  UNIQUE KEY uq_experiment (subject_id, experiment_no)
);

-- =============================================================
-- TABLE 13: LAB_SESSION
-- =============================================================
CREATE TABLE IF NOT EXISTS lab_session (
  session_id          INT         AUTO_INCREMENT PRIMARY KEY,
  subject_id          INT         NOT NULL,
  batch_id            INT         NOT NULL,
  session_date        DATE        NOT NULL,
  assigned_faculty_id INT         NOT NULL,
  original_faculty_id INT,
  is_substitute       BOOLEAN     NOT NULL DEFAULT FALSE,
  status              VARCHAR(15) NOT NULL DEFAULT 'Pending',
  CONSTRAINT fk_session_subject FOREIGN KEY (subject_id)          REFERENCES subject(subject_id),
  CONSTRAINT fk_session_batch   FOREIGN KEY (batch_id)            REFERENCES lab_batch(batch_id),
  CONSTRAINT fk_session_faculty FOREIGN KEY (assigned_faculty_id) REFERENCES faculty(faculty_id),
  CONSTRAINT chk_session_status CHECK (status IN ('Pending','Completed','Locked'))
);

-- =============================================================
-- TABLE 14: LAB_ATTENDANCE
-- =============================================================
CREATE TABLE IF NOT EXISTS lab_attendance (
  attendance_id INT         AUTO_INCREMENT PRIMARY KEY,
  session_id    INT         NOT NULL,
  student_uid   VARCHAR(30) NOT NULL,
  status        VARCHAR(10) NOT NULL,
  CONSTRAINT fk_la_session FOREIGN KEY (session_id)  REFERENCES lab_session(session_id) ON DELETE CASCADE,
  CONSTRAINT fk_la_student FOREIGN KEY (student_uid) REFERENCES student(uid)            ON DELETE CASCADE,
  CONSTRAINT chk_la_status CHECK (status IN ('Present','Absent')),
  UNIQUE KEY uq_lab_attendance (session_id, student_uid)
);

-- =============================================================
-- TABLE 15: LAB_MARKS
-- =============================================================
CREATE TABLE IF NOT EXISTS lab_marks (
  mark_id         INT           AUTO_INCREMENT PRIMARY KEY,
  student_uid     VARCHAR(30)   NOT NULL,
  subject_id      INT           NOT NULL,
  experiment_id   INT           NOT NULL,
  session_id      INT           NOT NULL,
  viva_marks      DECIMAL(5,2),
  execution_marks DECIMAL(5,2),
  journal_marks   DECIMAL(5,2),
  total_marks     DECIMAL(5,2),
  remarks         TEXT,
  updated_by      INT,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lm_student    FOREIGN KEY (student_uid)   REFERENCES student(uid)          ON DELETE CASCADE,
  CONSTRAINT fk_lm_subject    FOREIGN KEY (subject_id)    REFERENCES subject(subject_id),
  CONSTRAINT fk_lm_experiment FOREIGN KEY (experiment_id) REFERENCES experiment(experiment_id),
  CONSTRAINT fk_lm_session    FOREIGN KEY (session_id)    REFERENCES lab_session(session_id),
  CONSTRAINT fk_lm_faculty    FOREIGN KEY (updated_by)    REFERENCES faculty(faculty_id),
  UNIQUE KEY uq_lab_marks (student_uid, experiment_id)
);

-- =============================================================
-- TABLE 16: LAB_SUBMISSION
-- =============================================================
CREATE TABLE IF NOT EXISTS lab_submission (
  submission_id INT         AUTO_INCREMENT PRIMARY KEY,
  student_uid   VARCHAR(30) NOT NULL,
  experiment_id INT         NOT NULL,
  file_url      TEXT,
  submitted_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        VARCHAR(15),
  CONSTRAINT fk_ls_student    FOREIGN KEY (student_uid)   REFERENCES student(uid),
  CONSTRAINT fk_ls_experiment FOREIGN KEY (experiment_id) REFERENCES experiment(experiment_id),
  CONSTRAINT chk_ls_status    CHECK (status IN ('Submitted','Late','Missing')),
  UNIQUE KEY uq_lab_submission (student_uid, experiment_id)
);

-- =============================================================
-- TABLE 17: AICTE_POINTS
-- =============================================================
CREATE TABLE IF NOT EXISTS aicte_points (
  record_id   INT          AUTO_INCREMENT PRIMARY KEY,
  student_uid VARCHAR(30)  NOT NULL,
  activity    VARCHAR(255) NOT NULL,
  points      INT          NOT NULL,
  awarded_by  INT          NOT NULL,
  awarded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ap_student FOREIGN KEY (student_uid) REFERENCES student(uid)        ON DELETE CASCADE,
  CONSTRAINT fk_ap_faculty FOREIGN KEY (awarded_by)  REFERENCES faculty(faculty_id),
  CONSTRAINT chk_ap_points CHECK (points > 0)
);

-- =============================================================
-- TABLE 18: TG_ASSIGNMENT
-- =============================================================
CREATE TABLE IF NOT EXISTS tg_assignment (
  assignment_id INT         AUTO_INCREMENT PRIMARY KEY,
  faculty_id    INT         NOT NULL,
  student_uid   VARCHAR(30) NOT NULL,
  semester      INT         NOT NULL,
  CONSTRAINT fk_tga_faculty FOREIGN KEY (faculty_id)  REFERENCES faculty(faculty_id) ON DELETE CASCADE,
  CONSTRAINT fk_tga_student FOREIGN KEY (student_uid) REFERENCES student(uid)        ON DELETE CASCADE,
  UNIQUE KEY uq_tga (faculty_id, student_uid, semester)
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_lab_sess_date   ON lab_session(subject_id, session_date);
CREATE INDEX IF NOT EXISTS idx_lab_marks_stu   ON lab_marks(student_uid);
CREATE INDEX IF NOT EXISTS idx_lab_att_sess    ON lab_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_aicte_stu       ON aicte_points(student_uid);
CREATE INDEX IF NOT EXISTS idx_tga_fac         ON tg_assignment(faculty_id);
CREATE INDEX IF NOT EXISTS idx_tga_stu         ON tg_assignment(student_uid);

SELECT 'Migration 002 applied successfully.' AS migration_status;
