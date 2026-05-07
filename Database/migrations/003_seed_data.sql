USE StratosERP;

-- Remove legacy student seed data.
DELETE FROM tg_assignment
WHERE student_uid = '2021-CE-A-01-2025';

DELETE FROM student_subject_record
WHERE student_uid = '2021-CE-A-01-2025';

DELETE FROM student
WHERE uid = '2021-CE-A-01-2025'
  OR email_id = 'student@stratoserp.edu'
  OR email_id = 'student@tcetmumbai.in';

-- Ensure only one seeded login account is maintained: admin@tcetmumbai.in
-- Seed password: 159753
CREATE TABLE IF NOT EXISTS admin_user (
  admin_id      INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email_id      VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

UPDATE admin_user
SET name = 'Admin User',
    email_id = 'admin@tcetmumbai.in',
    password_hash = '$2a$12$MH8yz58CwaYYWPklBq5g4OVfMkpP.jD6XIbZxFnFefj5k.4c6gq7K'
WHERE email_id IN ('admin@tcetmumbai.in', 'admin@stratoserp.edu');

INSERT INTO admin_user (name, email_id, password_hash)
SELECT 'Admin User', 'admin@tcetmumbai.in',
       '$2a$12$MH8yz58CwaYYWPklBq5g4OVfMkpP.jD6XIbZxFnFefj5k.4c6gq7K'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_user
  WHERE email_id = 'admin@tcetmumbai.in'
);

DELETE FROM faculty
WHERE email_id IN ('admin@tcetmumbai.in', 'admin@stratoserp.edu');

-- Global config (active_semester_type must be 'ODD' or 'EVEN')
INSERT INTO global_config (active_semester_type, start_date, end_date)
VALUES ('ODD', '2024-07-01', '2024-11-30');

-- Test subject
INSERT INTO subject (name, semester_level, has_lab, lab_marks_weight)
VALUES ('Data Structures', 3, TRUE, 30)
ON DUPLICATE KEY UPDATE has_lab=TRUE;

SELECT 'Seed data applied successfully.' AS status;
