USE StratosERP;

-- Admin faculty (is_admin=1)
INSERT INTO faculty (name, email_id, designation_role, is_admin, is_hod, password_hash)
VALUES ('Admin User', 'admin@stratoserp.edu', 'Subject Incharge', 1, 0,
        '$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW')
ON DUPLICATE KEY UPDATE is_admin=1, password_hash='$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW';

-- HOD faculty (is_hod=1)
INSERT INTO faculty (name, email_id, designation_role, is_admin, is_hod, password_hash)
VALUES ('HOD User', 'hod@stratoserp.edu', 'Subject Incharge', 0, 1,
        '$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW')
ON DUPLICATE KEY UPDATE is_hod=1, password_hash='$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW';

-- Class Incharge faculty
INSERT INTO faculty (name, email_id, designation_role, is_admin, is_hod, password_hash)
VALUES ('Class Incharge User', 'classincharge@stratoserp.edu', 'Class Incharge', 0, 0,
        '$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW')
ON DUPLICATE KEY UPDATE designation_role='Class Incharge', password_hash='$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW';

-- Subject Incharge faculty
INSERT INTO faculty (name, email_id, designation_role, is_admin, is_hod, password_hash)
VALUES ('Subject Incharge User', 'subjectincharge@stratoserp.edu', 'Subject Incharge', 0, 0,
        '$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW')
ON DUPLICATE KEY UPDATE designation_role='Subject Incharge', password_hash='$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW';

-- Teacher Guardian faculty
INSERT INTO faculty (name, email_id, designation_role, is_admin, is_hod, password_hash)
VALUES ('Teacher Guardian User', 'tg@stratoserp.edu', 'TG', 0, 0,
        '$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW')
ON DUPLICATE KEY UPDATE designation_role='TG', password_hash='$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW';

-- Test student (academic_year must be '1st','2nd','3rd','4th','Alumni')
INSERT INTO student (uid, email_id, current_semester, academic_year, password_hash)
VALUES ('2021-CE-A-01-2025', 'student@stratoserp.edu', 3, '2nd',
        '$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW')
ON DUPLICATE KEY UPDATE password_hash='$2a$12$E87XuicdvkMftW3WMhiNIuVIybMz/RteWTPR5JnE7TJJYgnChk3oW';

-- Global config (active_semester_type must be 'ODD' or 'EVEN')
INSERT INTO global_config (active_semester_type, start_date, end_date)
VALUES ('ODD', '2024-07-01', '2024-11-30');

-- Test subject
INSERT INTO subject (name, semester_level, has_lab, lab_marks_weight)
VALUES ('Data Structures', 3, TRUE, 30)
ON DUPLICATE KEY UPDATE has_lab=TRUE;

-- Timetable slot (link subject and Subject Incharge faculty)
INSERT INTO timetable_slot (day_of_week, start_time, end_time, subject_id, faculty_id)
SELECT 'Monday', '09:00:00', '10:00:00', s.subject_id, f.faculty_id
FROM subject s, faculty f
WHERE s.name='Data Structures' AND f.email_id='subjectincharge@stratoserp.edu'
LIMIT 1;

-- Student subject record
INSERT INTO student_subject_record (student_uid, subject_id, status, marks)
SELECT '2021-CE-A-01-2025', s.subject_id, 'Active', 75.00
FROM subject s WHERE s.name='Data Structures'
ON DUPLICATE KEY UPDATE marks=75.00;

-- TG assignment
INSERT INTO tg_assignment (faculty_id, student_uid, semester)
SELECT f.faculty_id, '2021-CE-A-01-2025', 3
FROM faculty f WHERE f.email_id='tg@stratoserp.edu'
ON DUPLICATE KEY UPDATE semester=3;

SELECT 'Seed data applied successfully.' AS status;
