USE StratosERP;
CREATE INDEX idx_lab_sess_date ON lab_session(subject_id, session_date);
CREATE INDEX idx_lab_marks_stu ON lab_marks(student_uid);
CREATE INDEX idx_lab_att_sess ON lab_attendance(session_id);
CREATE INDEX idx_aicte_stu ON aicte_points(student_uid);
CREATE INDEX idx_tga_fac ON tg_assignment(faculty_id);
CREATE INDEX idx_tga_stu ON tg_assignment(student_uid);
SELECT 'Indexes created.' AS status;
