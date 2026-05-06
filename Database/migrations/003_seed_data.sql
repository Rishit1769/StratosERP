USE StratosERP;

-- Remove old seed users so only the admin seed account remains.
DELETE FROM tg_assignment
WHERE student_uid = '2021-CE-A-01-2025'
   OR faculty_id IN (
    SELECT faculty_id
    FROM faculty
    WHERE email_id IN (
      'hod@stratoserp.edu',
      'classincharge@stratoserp.edu',
      'subjectincharge@stratoserp.edu',
      'tg@stratoserp.edu'
    )
  );

DELETE FROM student_subject_record
WHERE student_uid = '2021-CE-A-01-2025';

DELETE FROM student
WHERE uid = '2021-CE-A-01-2025'
   OR email_id = 'student@stratoserp.edu';

DELETE FROM faculty
WHERE email_id IN (
  'hod@stratoserp.edu',
  'classincharge@stratoserp.edu',
  'subjectincharge@stratoserp.edu',
  'tg@stratoserp.edu'
);

-- Migrate old admin seed email to approved domain if it exists.
UPDATE faculty
SET email_id = 'admin@tcetmumbai.in',
    designation_role = 'Subject Incharge',
    is_admin = 1,
    is_hod = 0,
    password_hash = '$2a$12$nn/xiUipmVBXCKhlOUuWeOjT3.5VL.k5GypuT0swQoDRR2mabqtW2'
WHERE email_id = 'admin@stratoserp.edu'
  AND NOT EXISTS (
    SELECT 1
    FROM faculty
    WHERE email_id = 'admin@tcetmumbai.in'
  );

DELETE FROM faculty
WHERE email_id = 'admin@stratoserp.edu';

-- Admin faculty (is_admin=1)
INSERT INTO faculty (name, email_id, designation_role, is_admin, is_hod, password_hash)
VALUES ('Admin User', 'admin@tcetmumbai.in', 'Subject Incharge', 1, 0,
        '$2a$12$nn/xiUipmVBXCKhlOUuWeOjT3.5VL.k5GypuT0swQoDRR2mabqtW2')
ON DUPLICATE KEY UPDATE
  name='Admin User',
  designation_role='Subject Incharge',
  is_admin=1,
  is_hod=0,
  password_hash='$2a$12$nn/xiUipmVBXCKhlOUuWeOjT3.5VL.k5GypuT0swQoDRR2mabqtW2';

-- Global config (active_semester_type must be 'ODD' or 'EVEN')
INSERT INTO global_config (active_semester_type, start_date, end_date)
VALUES ('ODD', '2024-07-01', '2024-11-30');

-- Test subject
INSERT INTO subject (name, semester_level, has_lab, lab_marks_weight)
VALUES ('Data Structures', 3, TRUE, 30)
ON DUPLICATE KEY UPDATE has_lab=TRUE;

SELECT 'Seed data applied successfully.' AS status;
