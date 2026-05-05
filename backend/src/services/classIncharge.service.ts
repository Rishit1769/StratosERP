import pool from '../config/database';

export async function getClassAnalytics(classId?: string) {
  const [[stats]] = await pool.query<any[]>(`
    SELECT
      COUNT(DISTINCT s.uid)                     AS total_students,
      AVG(ssr.marks)                            AS avg_marks,
      SUM(CASE WHEN ssr.status = 'KT'     THEN 1 ELSE 0 END) AS total_kt,
      SUM(CASE WHEN ssr.status = 'SUPPLI' THEN 1 ELSE 0 END) AS total_suppli,
      SUM(CASE WHEN ssr.status = 'Cleared' THEN 1 ELSE 0 END) AS total_cleared
    FROM student s
    LEFT JOIN student_subject_record ssr ON s.uid = ssr.student_uid
    WHERE s.academic_year != 'Alumni'
  `);
  return stats;
}

export async function getAtRiskStudents(): Promise<any[]> {
  // Students with KT/SUPPLI status or marks < 40 in any subject
  const [rows] = await pool.query<any[]>(`
    SELECT DISTINCT s.uid, s.email_id, s.current_semester, s.academic_year,
           GROUP_CONCAT(sub.name ORDER BY sub.name SEPARATOR ', ') AS backlog_subjects
    FROM student s
    JOIN student_subject_record ssr ON s.uid = ssr.student_uid
    JOIN subject sub ON ssr.subject_id = sub.subject_id
    WHERE (ssr.status IN ('KT', 'SUPPLI') OR (ssr.marks IS NOT NULL AND ssr.marks < 40))
      AND s.academic_year != 'Alumni'
    GROUP BY s.uid
    ORDER BY s.uid
  `);
  return rows;
}

export async function getStudentPortfolio(uid: string) {
  // Full academic snapshot for PTM
  const [[student]] = await pool.query<any[]>('SELECT * FROM student WHERE uid = ?', [uid]);
  if (!student) return null;

  const [subjects] = await pool.query<any[]>(`
    SELECT sub.name, sub.semester_level, ssr.marks, ssr.status
    FROM student_subject_record ssr
    JOIN subject sub ON ssr.subject_id = sub.subject_id
    WHERE ssr.student_uid = ?
    ORDER BY sub.semester_level, sub.name
  `, [uid]);

  const [grievances] = await pool.query<any[]>(`
    SELECT ticket_id, category, status, created_at
    FROM grievance_ticket
    WHERE student_uid = ?
    ORDER BY created_at DESC
  `, [uid]);

  return {
    student,
    subjects,
    grievances,
    backlog_count: subjects.filter((s: any) => ['KT', 'SUPPLI'].includes(s.status)).length,
  };
}

export async function getAllStudents() {
  const [rows] = await pool.query<any[]>(`
    SELECT s.uid, s.email_id, s.current_semester, s.academic_year,
           COUNT(CASE WHEN ssr.status IN ('KT','SUPPLI') THEN 1 END) AS backlogs
    FROM student s
    LEFT JOIN student_subject_record ssr ON s.uid = ssr.student_uid
    WHERE s.academic_year != 'Alumni'
    GROUP BY s.uid
    ORDER BY s.uid
  `);
  return rows;
}

export async function getNoticesForClass() {
  const [rows] = await pool.query<any[]>(
    "SELECT * FROM notice_board WHERE target_audience IN ('INSTITUTE','BRANCH') ORDER BY created_at DESC LIMIT 20"
  );
  return rows;
}

export async function createClassNotice(title: string, tags?: string[]) {
  const [result] = await pool.query<any>(
    'INSERT INTO notice_board (title, target_audience, ai_filter_tags) VALUES (?, ?, ?)',
    [title, 'BRANCH', JSON.stringify(tags || [])]
  );
  return result.insertId;
}

export async function getProgressionReadiness(): Promise<any[]> {
  // Students who are ready to progress (no backlogs)
  const [rows] = await pool.query<any[]>(`
    SELECT s.uid, s.email_id, s.current_semester, s.academic_year
    FROM student s
    WHERE s.academic_year != 'Alumni'
      AND s.uid NOT IN (
        SELECT DISTINCT student_uid FROM student_subject_record
        WHERE status IN ('KT','SUPPLI')
      )
    ORDER BY s.uid
  `);
  return rows;
}
